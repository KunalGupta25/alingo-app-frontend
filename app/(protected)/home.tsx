import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    PanResponder,
    Platform,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    LayoutAnimation,
    UIManager,
    ScrollView,
    Keyboard,
    Linking,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { rideService, decodePolyline } from '../../services/rideService';

const C = {
    sheetBg: '#0F3D3E',
    searchBg: '#134A4C',
    searchBorder: '#236567',
    searchText: '#E6F4F1',
    searchPlaceholder: '#7FA3A0',
    pill: '#134A4C',
    pillBorder: '#4FD1C5',
    pillText: '#E6F4F1',
    pillDot: '#A3E635',
    cardBorder: '#236567',
    destText: '#E6F4F1',
    destSub: '#8FAFA8',
    divider: '#236567',
    navBg: '#0F3D3E',
    navActiveIcon: '#A3E635',
    navInactiveIcon: '#5F6F73',
    suggestionBg: '#114244',
    primary: '#4FD1C5',
    headerBg: '#0F3D3E',
};

const { height: SCREEN_H } = Dimensions.get('window');
const NAV_H = Platform.OS === 'ios' ? 84 : 68;
const SHEET_MIN = SCREEN_H * 0.20;
const SHEET_MAX = SCREEN_H * 0.85;
const ACTIVE_SHEET_MAX = SCREEN_H * 0.66;

// ── Static recents (shown when search is empty) ───────────
const RECENTS = [
    { id: '1', name: 'Parul University', sub: 'Waghodia, Vadodara', icon: 'school' },
    { id: '2', name: 'Railway Station', sub: 'Main Junction, Center', icon: 'train' },
    { id: '3', name: 'D-Mart', sub: 'Hypermarket Outlet', icon: 'cart' },
    { id: '4', name: 'Inorbit Mall', sub: 'Shopping & Entertainment', icon: 'bag-handle' },
    { id: '5', name: 'Air Port', sub: 'International Terminal', icon: 'airplane' },
];

// ── 30km degree offset (~0.27° lat, ~0.32° lon at 23° N) ───
const KM30_LAT = 0.27;
const KM30_LON = 0.32;

// ── Component ─────────────────────────────────────────────
export default function HomeScreen() {
    const router = useRouter();
    const { user } = useAuth();

    // Location
    const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [locationLabel, setLocationLabel] = useState('Locating…');
    const mapRef = useRef<MapView>(null);

    // Selected destination marker
    const [destMarker, setDestMarker] = useState<{ latitude: number; longitude: number; name: string } | null>(null);

    // Search
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Nav
    // Nav
    const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'profile'>('home');

    // Active ride (for Complete Ride button)
    const [activeRide, setActiveRide] = useState<{
        ride_id: string;
        destination_name: string;
        ride_time: string;
        participants: Array<{ user_id: string; name: string; phone?: string; status: string }>;
        completion_votes: number;
        majority_needed: number;
        is_creator: boolean;
        creator_id: string;
        route_polyline?: string;
    } | null>(null);
    const [activeRideRoute, setActiveRideRoute] = useState<{ latitude: number, longitude: number }[]>([]);
    const [completing, setCompleting] = useState(false);
    const [respondingTo, setRespondingTo] = useState<string | null>(null); // user_id being approved/rejected

    // Availability toggle
    const [available, setAvailable] = useState(false);
    const [togglingAvail, setTogglingAvail] = useState(false);

    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [canceling, setCanceling] = useState(false);

    const [activeRideExpanded, setActiveRideExpanded] = useState(false);

    const toggleActiveRide = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setActiveRideExpanded(prev => !prev);
    };

    const handleAvailToggle = async (val: boolean) => {
        setTogglingAvail(true);
        try {
            await userService.updateAvailability(val);
            setAvailable(val);
        } catch {
            /* silent — keep old value */
        } finally {
            setTogglingAvail(false);
        }
    };

    // Search Sheet Keyboard handling
    const [keyboardH, setKeyboardH] = useState(0);

    useEffect(() => {
        const k1 = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setKeyboardH(e.endCoordinates.height);
        });
        const k2 = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setKeyboardH(0);
        });
        return () => { k1.remove(); k2.remove(); };
    }, []);

    const [searchFocused, setSearchFocused] = useState(false);

    // ── Init ───────────────────────────────────────────────
    useEffect(() => { requestLocation(); fetchMyActiveRide(); fetchMyRequests(); loadAvailability(); }, []);

    const loadAvailability = async () => {
        try {
            const me = await userService.getMe();
            setAvailable(me.available_for_ride ?? false);
        } catch { /* silent */ }
    };

    const fetchMyActiveRide = async () => {
        try {
            const data = await rideService.getMyActiveRide();
            setActiveRide(data.ride as any);
            if (data.ride?.route_polyline) {
                setActiveRideRoute(decodePolyline(data.ride.route_polyline));
            } else {
                setActiveRideRoute([]);
            }
        } catch { /* ignore — user may not have a ride */ }
    };

    const fetchMyRequests = async () => {
        try {
            const data = await rideService.getMyRequests();
            setPendingRequests(data.requests || []);
        } catch { /* ignore */ }
    };

    const handleCancelRide = async () => {
        if (!activeRide) return;
        import('react-native').then(({ Alert }) => {
            Alert.alert('Cancel Ride', 'Are you sure you want to cancel this ride?', [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel', style: 'destructive',
                    onPress: async () => {
                        setCanceling(true);
                        try {
                            await rideService.cancelRide(activeRide.ride_id);
                            setActiveRide(null);
                            fetchMyRequests();
                        } catch (e: any) {
                            const msg = e?.response?.data?.error ?? 'Failed to cancel ride.';
                            Alert.alert('Error', msg);
                        } finally {
                            setCanceling(false);
                        }
                    }
                }
            ]);
        });
    };

    const handleCompleteRide = async () => {
        if (!activeRide) return;
        setCompleting(true);
        try {
            const res = await rideService.completeRide(activeRide.ride_id);
            if (res.status === 'COMPLETED') {
                setActiveRide(null);
                // Build list of approved participants to review (exclude self)
                const myUserId = user?.user_id;
                const reviewees = activeRide.participants
                    .filter(p => p.status === 'APPROVED' && p.user_id !== myUserId)
                    .map(p => ({ user_id: p.user_id, name: p.name }));
                router.push({
                    pathname: '/review',
                    params: {
                        ride_id: activeRide.ride_id,
                        participants: JSON.stringify(reviewees),
                    },
                });
            } else {
                // Vote recorded, not yet majority
                fetchMyActiveRide();
            }
        } catch (e: any) {
            const msg = e?.response?.data?.error ?? 'Failed to complete ride.';
            import('react-native').then(({ Alert }) => Alert.alert('Error', msg));
        } finally {
            setCompleting(false);
        }
    };

    const handleRespond = async (targetUserId: string, action: 'APPROVE' | 'REJECT') => {
        if (!activeRide) return;
        setRespondingTo(targetUserId);
        try {
            await rideService.respondRide(activeRide.ride_id, targetUserId, action);
            fetchMyActiveRide();
        } catch (e: any) {
            const msg = e?.response?.data?.error ?? 'Action failed.';
            import('react-native').then(({ Alert }) => Alert.alert('Error', msg));
        } finally {
            setRespondingTo(null);
        }
    };

    const requestLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationLabel('Location permission denied');
                return;
            }

            // Fast path: last known (works immediately on emulator with mock)
            let pos = await Location.getLastKnownPositionAsync({});
            if (!pos) {
                pos = await Promise.race([
                    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
                    new Promise<null>(r => setTimeout(() => r(null), 10000)),
                ]) as any;
            }

            if (!pos) {
                setLocationLabel('Set location in emulator (⋮ → Location)');
                return;
            }

            const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            setUserCoords(coords);

            // Pan map
            const region = { ...coords, latitudeDelta: 0.015, longitudeDelta: 0.015 };
            mapRef.current?.animateToRegion(region, 800);

            // ── Reverse geocode to get real place name ──
            try {
                const [place] = await Location.reverseGeocodeAsync(coords);
                if (place) {
                    // Build a readable label: neighbourhood / street, city
                    const parts = [
                        place.name,
                        place.street,
                        place.subregion || place.city,
                    ].filter(Boolean);
                    setLocationLabel(parts.length ? parts[0]! : 'Your current location');
                } else {
                    setLocationLabel('Your current location');
                }
            } catch {
                setLocationLabel('Your current location');
            }

            // Best-effort backend update
            try { await userService.updateLocation(coords.latitude, coords.longitude); }
            catch { /* silent */ }

        } catch {
            setLocationLabel('Unable to get location');
        }
    };

    const centerOnUser = () => {
        if (userCoords && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: userCoords.latitude,
                longitude: userCoords.longitude,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
            }, 800);
        } else {
            requestLocation();
        }
    };

    // ── Nominatim place search (30 km bounding box) ────────
    const searchPlaces = useCallback(async (text: string) => {
        if (!text.trim()) {
            setSuggestions([]);
            return;
        }

        setSearching(true);
        try {
            // Centre the viewbox on the user's location if available, else skip bounding
            const baseCoords = userCoords ?? { latitude: 23.0, longitude: 72.5 }; // Gujarat fallback
            const { latitude: lat, longitude: lon } = baseCoords;

            // Nominatim viewbox: left,top,right,bottom  (lon-,lat+,lon+,lat-)
            const viewbox = `${lon - KM30_LON},${lat + KM30_LAT},${lon + KM30_LON},${lat - KM30_LAT}`;

            const url =
                `https://nominatim.openstreetmap.org/search` +
                `?q=${encodeURIComponent(text)}` +
                `&format=json` +
                `&limit=8` +
                `&bounded=1` +                  // restrict to viewbox
                `&viewbox=${viewbox}` +
                `&addressdetails=1` +
                `&dedupe=1`;

            const res = await fetch(url, {
                headers: { 'Accept-Language': 'en', 'User-Agent': 'AlingoApp/1.0' },
            });
            const data = await res.json();
            setSuggestions(data);
        } catch {
            setSuggestions([]);
        } finally {
            setSearching(false);
        }
    }, [userCoords]);

    // Debounce the search as user types (300ms)
    const handleQueryChange = (text: string) => {
        setQuery(text);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!text.trim()) { setSuggestions([]); return; }
        debounceRef.current = setTimeout(() => searchPlaces(text), 300);
    };

    // Tap a suggestion → Redirect to Find Buddy with params
    const handleSelectSuggestion = (item: any) => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const name = item.display_name.split(',')[0];

        // Collapse keyboard and reset search
        Keyboard.dismiss();
        setQuery('');
        setSuggestions([]);

        // Route to Find Buddy passing location data
        router.push({
            pathname: '/find-buddy',
            params: {
                destLat: lat,
                destLon: lon,
                destName: name,
            }
        });
    };

    // ── Render ─────────────────────────────────────────────
    const defaultRegion = {
        latitude: activeRideRoute.length > 0 ? activeRideRoute[0].latitude : 23.0258,
        longitude: activeRideRoute.length > 0 ? activeRideRoute[0].longitude : 72.5873,
        latitudeDelta: activeRideRoute.length > 0 ? 0.05 : 0.08,
        longitudeDelta: activeRideRoute.length > 0 ? 0.05 : 0.08,
    };

    return (
        <View style={s.root}>

            {/* Full-screen dark green map */}
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                initialRegion={defaultRegion}
                showsUserLocation
                showsMyLocationButton={false}
                showsCompass={false}
                customMapStyle={darkGreenStyle}
            >
                {/* Regular destination marker drop */}
                {destMarker && (
                    <Marker
                        coordinate={{ latitude: destMarker.latitude, longitude: destMarker.longitude }}
                        title={destMarker.name}
                        pinColor="#8EB69B"
                    />
                )}

                {/* Active Ride Route Overlay */}
                {activeRideRoute.length > 0 && (
                    <>
                        <Marker coordinate={activeRideRoute[activeRideRoute.length - 1]} pinColor={C.primary} title="Destination" />
                        <Polyline
                            coordinates={activeRideRoute}
                            strokeColor={C.pillDot}
                            strokeWidth={4}
                            geodesic={true}
                        />
                    </>
                )}
            </MapView>

            {/* ── Map Controls ───────────────────────────── */}
            <View style={s.mapControlsWrap} pointerEvents="box-none">
                <TouchableOpacity style={s.mapControlBtn} onPress={centerOnUser} activeOpacity={0.8}>
                    <Ionicons name="locate" size={24} color={C.primary} />
                </TouchableOpacity>
            </View>

            {/* ── Header Area ──────────────────────────── */}
            <View style={s.headerWrap} pointerEvents="box-none">
                <View style={s.headerTopRow}>
                    <View style={s.headerGreetingWrap}>
                        <Text style={s.greetingText}>
                            Hello {user?.full_name?.split(' ')[0] || 'Rider'}!
                        </Text>
                    </View>
                    <TouchableOpacity style={s.notificationBtn}>
                        <Ionicons name="notifications" size={24} color="#E6F4F1" />
                    </TouchableOpacity>
                </View>

                {/* Pickup Pill */}
                <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity style={s.pill}>
                        <Ionicons name="radio-button-on" size={16} color={C.pillDot} style={{ marginRight: -2 }} />
                        <Text style={s.pillText} numberOfLines={1}>
                            <Text style={{ fontWeight: '400' }}>Pickup: </Text>
                            <Text style={{ fontWeight: '800' }}>{locationLabel !== 'Locating…' ? locationLabel : 'Searching...'}</Text>
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={C.pillDot} style={{ marginTop: -2 }} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Bottom sheet ───────────────────────────── */}

            {activeRide ? (
                // ── Active Ride Sheet (Dynamic Height) ───
                <LinearGradient colors={['#133839', '#091A1B']} style={[s.sheet, { maxHeight: ACTIVE_SHEET_MAX, paddingBottom: 16 }]}>
                    <TouchableOpacity onPress={toggleActiveRide} style={s.handleWrap} activeOpacity={0.8}>
                        <View style={s.handle} />
                    </TouchableOpacity>

                    {activeRideExpanded ? (
                        <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                            {/* Header */}
                            <View style={s.expandedHeaderRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.expandedTitle} numberOfLines={1}>Trip to {activeRide.destination_name.split(',')[0]}</Text>
                                    <Text style={s.expandedId}>ID: #RC-{activeRide.ride_id.slice(-4).toUpperCase()}</Text>
                                </View>
                                <TouchableOpacity style={s.expandedCompleteBtn} onPress={handleCompleteRide} disabled={completing}>
                                    {completing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.expandedCompleteText}>Complete</Text>}
                                </TouchableOpacity>
                            </View>

                            {/* Group Chat Action */}
                            <TouchableOpacity
                                style={s.groupChatBtn}
                                activeOpacity={0.8}
                                onPress={() => router.push({ pathname: '/ride-chat', params: { ride_id: activeRide.ride_id, dest: activeRide.destination_name } })}
                            >
                                <Ionicons name="chatbubbles" size={20} color="#0B1416" />
                                <Text style={s.groupChatText}>Open Group Chat</Text>
                            </TouchableOpacity>

                            {/* Info Card */}
                            <View style={s.infoCard}>
                                <View style={s.infoRow}>
                                    <Ionicons name="time-outline" size={20} color={C.primary} style={{ marginTop: 2 }} />
                                    <View>
                                        <Text style={s.infoLabel}>TIME</Text>
                                        <Text style={s.infoValue}>{activeRide.ride_time}</Text>
                                    </View>
                                </View>
                                <View style={s.infoRow}>
                                    <Ionicons name="location-outline" size={20} color={C.primary} style={{ marginTop: 2 }} />
                                    <View>
                                        <Text style={s.infoLabel}>DESTINATION</Text>
                                        <Text style={s.infoValue}>{activeRide.destination_name}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Map Preview */}
                            {activeRideRoute.length > 0 && (
                                <View style={{ height: 160, borderRadius: 12, overflow: 'hidden', marginTop: 16, borderWidth: 1, borderColor: C.cardBorder }}>
                                    <MapView
                                        style={{ flex: 1 }}
                                        initialRegion={{
                                            latitude: activeRideRoute[0].latitude,
                                            longitude: activeRideRoute[0].longitude,
                                            latitudeDelta: 0.05,
                                            longitudeDelta: 0.05,
                                        }}
                                        pitchEnabled={false}
                                        rotateEnabled={false}
                                        scrollEnabled={false}
                                        zoomEnabled={false}
                                    >
                                        <Marker coordinate={activeRideRoute[0]} pinColor={C.pillDot} />
                                        <Marker coordinate={activeRideRoute[activeRideRoute.length - 1]} pinColor={C.primary} />
                                        <Polyline
                                            coordinates={activeRideRoute}
                                            strokeColor={C.pillDot}
                                            strokeWidth={4}
                                        />
                                    </MapView>
                                </View>
                            )}

                            {/* Participants */}
                            <Text style={s.sectionTitle}>PARTICIPANTS</Text>
                            {activeRide.participants && activeRide.participants.length > 0 ? (
                                activeRide.participants.map(p => (
                                    <View key={p.user_id} style={s.participantCard}>
                                        <View style={s.participantAvatar}><Ionicons name="person" size={20} color="#E6F4F1" /></View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.participantName}>
                                                {p.user_id === user?.user_id
                                                    ? 'You'
                                                    : (p.name?.replace(/^\/+/, '') || 'Unknown User')}
                                            </Text>
                                            <Text style={s.participantRole}>
                                                {p.user_id === activeRide.creator_id
                                                    ? 'Creator'
                                                    : (p.status === 'APPROVED' ? 'Passenger' : p.status)}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 12 }}>
                                            {p.user_id !== user?.user_id && p.phone && (
                                                <TouchableOpacity onPress={() => Linking.openURL(`tel:${p.phone}`)}>
                                                    <View style={s.callBtnWrap}>
                                                        <Ionicons name="call" size={18} color="#0B1416" />
                                                    </View>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={s.emptyListText}>Just you so far...</Text>
                            )}

                            {/* Pending Requests */}
                            {activeRide.is_creator && (
                                <>
                                    <Text style={[s.sectionTitle, { marginTop: 16 }]}>PENDING REQUESTS</Text>
                                    {activeRide.participants.filter(p => p.status === 'PENDING').length > 0 ? (
                                        activeRide.participants.filter(p => p.status === 'PENDING').map(p => (
                                            <View key={p.user_id} style={s.participantCard}>
                                                <View style={s.participantAvatar}><Ionicons name="person" size={20} color="#E6F4F1" /></View>
                                                <Text style={[s.participantName, { flex: 1 }]}>{p.name}</Text>
                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                    <TouchableOpacity style={s.approveBtnMini} onPress={() => handleRespond(p.user_id, 'APPROVE')} disabled={respondingTo === p.user_id}>
                                                        <Ionicons name="checkmark" size={16} color="#ffffff" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={s.rejectBtnMini} onPress={() => handleRespond(p.user_id, 'REJECT')} disabled={respondingTo === p.user_id}>
                                                        <Ionicons name="close" size={16} color="#ffffff" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))
                                    ) : (
                                        <View style={s.emptyPendingCard}>
                                            <Ionicons name="people-circle" size={32} color={C.searchPlaceholder} style={{ marginBottom: 4 }} />
                                            <Text style={s.emptyPendingText}>No pending requests at the moment</Text>
                                        </View>
                                    )}
                                </>
                            )}

                            {/* Cancel Ride */}
                            {activeRide.is_creator && (
                                <TouchableOpacity style={s.bigCancelBtn} onPress={handleCancelRide} disabled={canceling}>
                                    {canceling ? <ActivityIndicator size="small" color="#E07070" /> : (
                                        <>
                                            <Ionicons name="close-circle" size={20} color="#E07070" style={{ marginRight: 8 }} />
                                            <Text style={s.bigCancelText}>Cancel Ride</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    ) : (
                        <TouchableOpacity activeOpacity={0.9} onPress={toggleActiveRide} style={s.minimizedWrap}>
                            <View style={s.minHeaderRow}>
                                <Text style={s.minTitle}>YOUR ACTIVE RIDE</Text>
                                <View style={s.onTripBadge}><Text style={s.onTripText}>ON TRIP</Text></View>
                            </View>

                            <View style={s.minRowMain}>
                                <View style={{ flex: 1 }}>
                                    <View style={s.minDestWrap}>
                                        <Ionicons name="location" size={16} color={C.primary} style={{ marginRight: 6 }} />
                                        <Text style={s.minDestText} numberOfLines={2}>{activeRide.destination_name}</Text>
                                    </View>
                                    <View style={s.minStatsWrap}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Ionicons name="time" size={14} color="#E6F4F1" />
                                            <Text style={s.minStatText}>{activeRide.ride_time}</Text>
                                        </View>
                                        <Text style={s.minStatDot}> • </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Ionicons name="people" size={14} color="#E6F4F1" />
                                            <Text style={s.minStatText}>{activeRide.completion_votes}/{activeRide.majority_needed} votes</Text>
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity style={s.minCompleteBtn} onPress={handleCompleteRide} disabled={completing}>
                                    {completing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.minCompleteText}>Complete</Text>}
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    )}
                </LinearGradient>
            ) : (
                // ── Location Search Sheet (Dynamic bounds) ───
                <LinearGradient
                    colors={['#133839', '#091A1B']}
                    style={[
                        s.sheet,
                        keyboardH > 0
                            ? { top: Platform.OS === 'ios' ? 100 : 80, bottom: keyboardH, maxHeight: undefined }
                            : searchFocused
                                ? { bottom: NAV_H, maxHeight: SCREEN_H * 0.66, paddingBottom: 24, paddingTop: 16 }
                                : { bottom: NAV_H, maxHeight: SCREEN_H * 0.45, paddingBottom: 24, paddingTop: 16 }
                    ]}
                >
                    {/* Search bar */}
                    <View style={s.searchBar}>
                        <Ionicons name="search" size={20} color={C.primary} />
                        <TextInput
                            style={s.searchInput}
                            placeholder="Where are you going?"
                            placeholderTextColor={C.searchPlaceholder}
                            value={query}
                            onChangeText={handleQueryChange}
                            onFocus={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setSearchFocused(true);
                            }}
                            onBlur={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setSearchFocused(false);
                            }}
                            returnKeyType="search"
                            clearButtonMode="while-editing"
                            autoCorrect={false}
                        />
                        {searching && (
                            <ActivityIndicator size="small" color={C.searchText} />
                        )}
                        {query.length > 0 && !searching && (
                            <TouchableOpacity onPress={() => { setQuery(''); setSuggestions([]); }}>
                                <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.6)" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Destinations Title */}
                    {!query && (
                        <Text style={s.sectionHeader}>FREQUENT DESTINATIONS</Text>
                    )}

                    {/* Dynamic suggestions OR static recents */}
                    {suggestions.length > 0 ? (
                        <FlatList
                            data={suggestions}
                            keyExtractor={item => item.place_id?.toString() ?? item.display_name}
                            style={s.list}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item, index }) => (
                                <TouchableOpacity
                                    style={[s.destRow, index < suggestions.length - 1 && s.destDivider, { backgroundColor: 'transparent' }]}
                                    onPress={() => handleSelectSuggestion(item)}
                                    activeOpacity={0.6}
                                >
                                    <View style={s.iconWrap}><Ionicons name="location" size={20} color={C.primary} /></View>
                                    <View style={s.destInfo}>
                                        <Text style={s.destName} numberOfLines={1}>
                                            {item.display_name.split(',')[0]}
                                        </Text>
                                        <Text style={s.destSub} numberOfLines={1}>
                                            {item.display_name.split(',').slice(1, 3).join(',')}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={C.primary} style={{ opacity: 0.5 }} />
                                </TouchableOpacity>
                            )}
                        />
                    ) : query.length > 0 && !searching ? (
                        <View style={s.emptyWrap}>
                            <Text style={s.emptyText}>No places found within 30 km</Text>
                        </View>
                    ) : (
                        // Static recents when search is empty
                        <View style={s.list}>
                            {RECENTS.map((d, i) => (
                                <TouchableOpacity
                                    key={d.id}
                                    style={[s.destRow, i < RECENTS.length - 1 && s.destDivider, { backgroundColor: 'transparent' }]}
                                    activeOpacity={0.6}
                                >
                                    <View style={s.iconWrap}>
                                        <Ionicons name={d.icon as any} size={20} color={C.primary} />
                                    </View>
                                    <View style={s.destInfo}>
                                        <Text style={s.destName}>{d.name}</Text>
                                        <Text style={s.destSub}>{d.sub}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={C.primary} style={{ opacity: 0.5 }} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* ── Availability Toggle ── */}
                    <View style={s.availRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="radio-button-on" size={16} color="#8EB69B" style={{ marginRight: 6 }} />
                            <Text style={s.availLabel}>Available for rides</Text>
                        </View>
                        <Switch
                            value={available}
                            onValueChange={handleAvailToggle}
                            disabled={togglingAvail}
                            trackColor={{ false: 'rgba(142,182,155,0.2)', true: '#8EB69B' }}
                            thumbColor={available ? '#051F20' : '#8EB69B'}
                        />
                    </View>

                    {/* ── Pending Requests Banner (participant) ───── */}
                    {pendingRequests.length > 0 && (
                        <View style={s.pendingRequestsBanner}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <Ionicons name="hourglass-outline" size={16} color="#E6BB73" style={{ marginRight: 6 }} />
                                <Text style={s.pendingRequestsTitle}>My Pending Requests ({pendingRequests.length})</Text>
                            </View>
                            {pendingRequests.map(req => (
                                <View key={req.ride_id} style={s.pendingReqRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                                        <Ionicons name="arrow-forward" size={14} color={C.destText} style={{ marginRight: 4 }} />
                                        <Text style={s.pendingReqDest} numberOfLines={1}>{req.destination_name}</Text>
                                    </View>
                                    <Text style={s.pendingReqStatus}>{req.my_status}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </LinearGradient>
            )
            }

            {/* ── Bottom nav bar (always visible, outside the sheet) ─── */}
            <LinearGradient colors={['#0A1E1F', '#071213']} style={s.navBar}>
                <TouchableOpacity style={s.navItem} onPress={() => setActiveTab('home')}>
                    <View style={s.navIconWrap}>
                        <Ionicons name="home" size={24} color={activeTab === 'home' ? C.navActiveIcon : C.navInactiveIcon} />
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={s.navItem} onPress={() => router.push('/profile')}>
                    <Ionicons name="person" size={24} color={activeTab === 'profile' ? C.navActiveIcon : C.navInactiveIcon} />
                </TouchableOpacity>
            </LinearGradient>
        </View >
    );
}

// ── Dark green map theme ──────────────────────────────────
const darkGreenStyle = [
    { elementType: 'geometry', stylers: [{ color: '#0B1416' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#4FD1C5' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0B1416' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1F6F6B' }, { lightness: -40 }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0B1416' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1F6F6B' }, { lightness: -20 }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#0B1416' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0B1416' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#0B1416' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#0B1416' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0B1416' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#0B1416' }] },
];

// ── Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0B1416' },

    headerWrap: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 44 : 60,
        left: 20, right: 20,
        gap: 16,
    },
    mapControlsWrap: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 140 : 156,
        right: 20,
        alignItems: 'flex-end',
        gap: 12,
    },
    mapControlBtn: {
        width: 48, height: 48,
        borderRadius: 24,
        backgroundColor: '#0B2728',
        borderWidth: 1, borderColor: 'rgba(79, 209, 197, 0.2)',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    headerGreetingWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    greetingText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#E6F4F1',
    },
    notificationBtn: {
        backgroundColor: 'transparent', // let the gradient through
        width: 44, height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.pill,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1, borderColor: C.pillBorder,
        gap: 8,
    },
    pillLocationIcon: { color: C.pillDot, fontSize: 16 },
    pillText: { color: C.pillText, fontSize: 14, fontWeight: '500' },
    pillChevronIcon: { color: C.pillDot, fontSize: 18, marginTop: -6 },

    sheet: {
        position: 'absolute', bottom: NAV_H, left: 0, right: 0,
        // gradient applied
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },

    handleWrap: { alignItems: 'center', paddingVertical: 12 },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(22,56,50,0.35)' },

    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.searchBg,
        borderWidth: 1,
        borderColor: C.searchBorder,
        borderRadius: 14,
        marginHorizontal: 16,
        marginBottom: 24,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 10,
    },
    searchIcon: { fontSize: 16, color: C.primary },
    searchInput: { flex: 1, fontSize: 16, color: C.searchText, fontWeight: '400' },
    clearBtn: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600' },

    sectionHeader: {
        fontSize: 11,
        fontWeight: '700',
        color: C.primary,
        letterSpacing: 1.5,
        paddingHorizontal: 24,
        marginBottom: 12,
        textTransform: 'uppercase',
    },

    list: { paddingHorizontal: 16 },

    destRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 14,
        marginBottom: 8,
    },
    destDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    iconWrap: {
        backgroundColor: 'transparent',
        width: 36, height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clockIcon: { fontSize: 18, color: C.primary },
    pinIcon: { fontSize: 18, color: C.primary },
    destInfo: { flex: 1, justifyContent: 'center' },
    destName: { fontSize: 15, color: C.destText, fontWeight: '600', marginBottom: 2 },
    destSub: { fontSize: 13, color: C.destSub },
    chevronIcon: { color: C.primary, fontSize: 24, fontWeight: '300', opacity: 0.5 },

    emptyWrap: { alignItems: 'center', paddingVertical: 20 },
    emptyText: { color: C.searchPlaceholder, fontSize: 14 },

    navBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 32,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 28 : 16,
        borderTopWidth: 1,
        borderTopColor: C.divider,
        // gradient applied
    },
    navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 56 },
    navIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    navIcon: { fontSize: 24, color: C.navInactiveIcon },
    navIconActive: { color: C.navActiveIcon, fontSize: 28 },
    navIconRaw: { fontSize: 22, opacity: 0.4 },
    navIconActiveRaw: { opacity: 1 },

    // ── Dynamic Active Ride Sheet Styles ───────────────────
    minimizedWrap: { paddingHorizontal: 20, paddingBottom: 16 },
    minHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    minTitle: { color: C.primary, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
    onTripBadge: { backgroundColor: 'rgba(14,129,33,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(14,129,33,0.2)' },
    onTripText: { color: C.primary, fontSize: 11, fontWeight: '700' },

    minRowMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    minDestWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8, paddingRight: 16 },
    minDestIcon: { color: C.primary, fontSize: 16, marginTop: 2 },
    minDestText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
    minStatsWrap: { flexDirection: 'row', alignItems: 'center' },
    minStatText: { color: '#8EB69B', fontSize: 12 },
    minStatDot: { color: '#64748B', fontSize: 12, marginHorizontal: 6 },
    minCompleteBtn: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
    minCompleteText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

    expandedHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    expandedTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 4 },
    expandedId: { color: C.primary, fontSize: 13, fontWeight: '500' },
    expandedCompleteBtn: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginLeft: 16 },
    expandedCompleteText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    groupChatBtn: {
        backgroundColor: '#4FD1C5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
        marginTop: 16,
    },
    groupChatText: {
        color: '#0B1416',
        fontWeight: '700',
        fontSize: 15,
    },
    infoCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 24, gap: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    infoIcon: { fontSize: 18, color: '#8EB69B', width: 24, textAlign: 'center' },
    infoLabel: { color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    infoValue: { color: '#E2E8F0', fontSize: 15, fontWeight: '500' },

    sectionTitle: { color: '#64748B', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 16 },
    participantCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 12 },
    participantAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    participantAvatarText: { fontSize: 20 },
    participantName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
    participantRole: { color: '#8EB69B', fontSize: 12, marginTop: 2 },
    chatIcon: { fontSize: 20, color: C.primary },
    emptyListText: { color: '#64748B', fontSize: 14, fontStyle: 'italic', marginBottom: 24 },
    callBtnWrap: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#4FD1C5',
        alignItems: 'center', justifyContent: 'center'
    },
    emptyPendingCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 32, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)', marginBottom: 24 },
    emptyPendingIcon: { fontSize: 32, color: 'rgba(14,129,33,0.3)', marginBottom: 12 },
    emptyPendingText: { color: '#64748B', fontSize: 14, textAlign: 'center' },

    approveBtnMini: { backgroundColor: C.primary, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    approveBtnTextTiny: { color: '#FFF', fontSize: 14, fontWeight: '700' },
    rejectBtnMini: { backgroundColor: 'rgba(180,60,60,0.2)', borderWidth: 1, borderColor: 'rgba(180,60,60,0.4)', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    rejectBtnTextTiny: { color: '#E07070', fontSize: 14, fontWeight: '700' },

    bigCancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(180,60,60,0.05)', borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: 'rgba(180,60,60,0.3)', marginTop: 12, marginBottom: 20 },
    bigCancelIcon: { color: '#E07070', fontSize: 18, fontWeight: '700' },
    bigCancelText: { color: '#E07070', fontSize: 16, fontWeight: '700' },

    // ── Pending requests banner ─────────────────────
    pendingRequestsBanner: {
        backgroundColor: '#0B2B26',
        borderTopWidth: 1, borderTopColor: 'rgba(142,182,155,0.2)',
        paddingHorizontal: 16, paddingVertical: 12, gap: 8,
    },
    pendingRequestsTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    pendingReqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pendingReqDest: { color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1, marginRight: 8 },
    pendingReqStatus: { color: '#8EB69B', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },

    // ── Availability toggle ──────────────────────────
    availRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(22,56,50,0.7)',
        paddingHorizontal: 16, paddingVertical: 10,
        borderTopWidth: 1, borderTopColor: 'rgba(142,182,155,0.2)',
    },
    availLabel: { color: '#8EB69B', fontSize: 13, fontWeight: '600' },

    // ── Manage requests panel ─────────────────────
    managePanel: {
        backgroundColor: '#0B2B26',
        borderTopWidth: 1, borderTopColor: 'rgba(142,182,155,0.2)',
        paddingHorizontal: 12, paddingVertical: 10, gap: 8,
    },
    managePanelTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginBottom: 4 },
    manageRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    manageName: { color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 },
    approveBtn: {
        backgroundColor: '#8EB69B', borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 6,
    },
    approveBtnText: { color: '#051F20', fontSize: 12, fontWeight: '700' },
    rejectBtn: {
        backgroundColor: 'rgba(180,60,60,0.2)', borderRadius: 8,
        borderWidth: 1, borderColor: 'rgba(180,60,60,0.4)',
        paddingHorizontal: 10, paddingVertical: 6,
    },
    rejectBtnText: { color: '#E07070', fontSize: 13, fontWeight: '700' },

});
