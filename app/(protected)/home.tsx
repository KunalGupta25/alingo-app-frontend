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
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { rideService } from '../../services/rideService';

const C = {
    sheetBg: 'rgba(17,33,20,0.95)',       // #112114 with opacity for backdrop blur
    searchBg: 'rgba(14,129,33,0.1)',     // #0e8121 / 10%
    searchBorder: 'rgba(14,129,33,0.2)', // #0e8121 / 20%
    searchText: '#F1F5F9',               // slate-100
    searchPlaceholder: '#94A3B8',        // slate-400
    pill: 'rgba(17,33,20,0.8)',          // #112114 / 80%
    pillText: '#E2E8F0',                 // slate-200
    pillDot: '#0e8121',                  // primary #0e8121
    destText: '#F1F5F9',                 // slate-100
    destSub: '#64748B',                  // slate-500
    divider: 'rgba(14,129,33,0.1)',      // primary / 10%
    navBg: '#112114',                    // background-dark
    navActiveIcon: '#0e8121',            // primary #0e8121
    navInactiveIcon: '#64748B',          // slate-500
    navDivider: 'rgba(14,129,33,0.2)',   // primary / 20%
    suggestionBg: 'rgba(14,129,33,0.1)', // #0e8121 / 10% for hover state
    primary: '#0e8121',
    headerBg: 'rgba(17,33,20,0.6)',      // For the notification icon
};

const { height: SCREEN_H } = Dimensions.get('window');
const NAV_H = Platform.OS === 'ios' ? 84 : 68;
const SHEET_MIN = SCREEN_H * 0.20;
const SHEET_MAX = SCREEN_H * 0.85;
const ACTIVE_SHEET_MAX = SCREEN_H * 0.66;

// ── Static recents (shown when search is empty) ───────────
const RECENTS = [
    { id: '1', name: 'Parul University', sub: 'Waghodia, Vadodara', icon: '🎓' },
    { id: '2', name: 'Railway Station', sub: 'Main Junction, Center', icon: '🚆' },
    { id: '3', name: 'D-Mart', sub: 'Hypermarket Outlet', icon: '🛒' },
    { id: '4', name: 'Inorbit Mall', sub: 'Shopping & Entertainment', icon: '🛍️' },
    { id: '5', name: 'Air Port', sub: 'International Terminal', icon: '✈️' },
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
        participants: Array<{ user_id: string; name: string; status: string }>;
        completion_votes: number;
        majority_needed: number;
        is_creator: boolean;
        creator_id: string;
    } | null>(null);
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

    // Tap a suggestion → place marker, pan map, collapse sheet
    const handleSelectSuggestion = (item: any) => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const name = item.display_name.split(',')[0];

        setDestMarker({ latitude: lat, longitude: lon, name });
        setQuery(name);
        setSuggestions([]);

        mapRef.current?.animateToRegion({
            latitude: lat,
            longitude: lon,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
        }, 600);

        // Collapse sheet to show the map
        Keyboard.dismiss();
    };

    // ── Render ─────────────────────────────────────────────
    const defaultRegion = {
        latitude: 23.0258, longitude: 72.5873,   // Vadodara (near Parul Uni)
        latitudeDelta: 0.08, longitudeDelta: 0.08,
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
                {destMarker && (
                    <Marker
                        coordinate={{ latitude: destMarker.latitude, longitude: destMarker.longitude }}
                        title={destMarker.name}
                        pinColor="#8EB69B"
                    />
                )}
            </MapView>

            {/* ── Header Area ──────────────────────────── */}
            <View style={s.headerWrap} pointerEvents="box-none">
                <View style={s.headerTopRow}>
                    <View style={s.headerGreetingWrap}>
                        <View style={s.headerCarIcon}>
                            <Text style={{ fontSize: 18 }}>🚘</Text>
                        </View>
                        <Text style={s.greetingText}>
                            Hello {user?.full_name?.split(' ')[0] || 'Rider'}! 🚗
                        </Text>
                    </View>
                    <TouchableOpacity style={s.notificationBtn}>
                        <Text style={{ fontSize: 20 }}>🔔</Text>
                    </TouchableOpacity>
                </View>

                {/* Pickup Pill */}
                <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity style={s.pill}>
                        <Text style={s.pillLocationIcon}>⦿</Text>
                        <Text style={s.pillText} numberOfLines={1}>
                            Pickup: {locationLabel !== 'Locating…' ? locationLabel : 'Searching...'}
                        </Text>
                        <Text style={s.pillChevronIcon}>⌄</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Bottom sheet ───────────────────────────── */}

            {activeRide ? (
                // ── Active Ride Sheet (Dynamic Height) ───
                <View style={[s.sheet, { maxHeight: ACTIVE_SHEET_MAX, paddingBottom: 16 }]}>
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

                            {/* Info Card */}
                            <View style={s.infoCard}>
                                <View style={s.infoRow}>
                                    <Text style={s.infoIcon}>🕒</Text>
                                    <View>
                                        <Text style={s.infoLabel}>TIME</Text>
                                        <Text style={s.infoValue}>{activeRide.ride_time}</Text>
                                    </View>
                                </View>
                                <View style={s.infoRow}>
                                    <Text style={s.infoIcon}>📍</Text>
                                    <View>
                                        <Text style={s.infoLabel}>DESTINATION</Text>
                                        <Text style={s.infoValue}>{activeRide.destination_name}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Participants */}
                            <Text style={s.sectionTitle}>PARTICIPANTS</Text>
                            {activeRide.participants && activeRide.participants.length > 0 ? (
                                activeRide.participants.map(p => (
                                    <View key={p.user_id} style={s.participantCard}>
                                        <View style={s.participantAvatar}><Text style={s.participantAvatarText}>👤</Text></View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.participantName}>{p.user_id === activeRide.creator_id ? 'You (Creator)' : p.name}</Text>
                                            <Text style={s.participantRole}>{p.status === 'APPROVED' ? 'Passenger' : p.status}</Text>
                                        </View>
                                        <Text style={s.chatIcon}>💬</Text>
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
                                                <View style={s.participantAvatar}><Text style={s.participantAvatarText}>👤</Text></View>
                                                <Text style={[s.participantName, { flex: 1 }]}>{p.name}</Text>
                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                    <TouchableOpacity style={s.approveBtnMini} onPress={() => handleRespond(p.user_id, 'APPROVE')} disabled={respondingTo === p.user_id}>
                                                        <Text style={s.approveBtnTextTiny}>✓</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={s.rejectBtnMini} onPress={() => handleRespond(p.user_id, 'REJECT')} disabled={respondingTo === p.user_id}>
                                                        <Text style={s.rejectBtnTextTiny}>✕</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))
                                    ) : (
                                        <View style={s.emptyPendingCard}>
                                            <Text style={s.emptyPendingIcon}>👥+</Text>
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
                                            <Text style={s.bigCancelIcon}>✕</Text>
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
                                        <Text style={s.minDestIcon}>📍</Text>
                                        <Text style={s.minDestText} numberOfLines={2}>{activeRide.destination_name}</Text>
                                    </View>
                                    <View style={s.minStatsWrap}>
                                        <Text style={s.minStatText}>🕒 {activeRide.ride_time}</Text>
                                        <Text style={s.minStatDot}> • </Text>
                                        <Text style={s.minStatText}>👥 {activeRide.completion_votes}/{activeRide.majority_needed} votes</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={s.minCompleteBtn} onPress={handleCompleteRide} disabled={completing}>
                                    {completing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.minCompleteText}>Complete</Text>}
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                // ── Location Search Sheet (Dynamic bounds) ───
                <View
                    style={[
                        s.sheet,
                        keyboardH > 0
                            ? { top: Platform.OS === 'ios' ? 100 : 80, bottom: keyboardH, maxHeight: undefined }
                            : { bottom: NAV_H, maxHeight: SCREEN_H * 0.45, paddingBottom: 24, paddingTop: 16 }
                    ]}
                >
                    {/* Search bar */}
                    <View style={s.searchBar}>
                        <Text style={s.searchIcon}>🔍</Text>
                        <TextInput
                            style={s.searchInput}
                            placeholder="Where are you going?"
                            placeholderTextColor={C.searchPlaceholder}
                            value={query}
                            onChangeText={handleQueryChange}
                            returnKeyType="search"
                            clearButtonMode="while-editing"
                            autoCorrect={false}
                        />
                        {searching && (
                            <ActivityIndicator size="small" color={C.searchText} />
                        )}
                        {query.length > 0 && !searching && (
                            <TouchableOpacity onPress={() => { setQuery(''); setSuggestions([]); }}>
                                <Text style={s.clearBtn}>✕</Text>
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
                                    <View style={s.iconWrap}><Text style={s.pinIcon}>📍</Text></View>
                                    <View style={s.destInfo}>
                                        <Text style={s.destName} numberOfLines={1}>
                                            {item.display_name.split(',')[0]}
                                        </Text>
                                        <Text style={s.destSub} numberOfLines={1}>
                                            {item.display_name.split(',').slice(1, 3).join(',')}
                                        </Text>
                                    </View>
                                    <Text style={s.chevronIcon}>›</Text>
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
                                    style={[s.destRow, i < RECENTS.length - 1 && s.destDivider]}
                                    activeOpacity={0.6}
                                >
                                    <View style={s.iconWrap}>
                                        <Text style={s.clockIcon}>{d.icon}</Text>
                                    </View>
                                    <View style={s.destInfo}>
                                        <Text style={s.destName}>{d.name}</Text>
                                        <Text style={s.destSub}>{d.sub}</Text>
                                    </View>
                                    <Text style={s.chevronIcon}>›</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* ── Availability Toggle ── */}
                    <View style={s.availRow}>
                        <Text style={s.availLabel}>🟢 Available for rides</Text>
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
                            <Text style={s.pendingRequestsTitle}>⏳ My Pending Requests ({pendingRequests.length})</Text>
                            {pendingRequests.map(req => (
                                <View key={req.ride_id} style={s.pendingReqRow}>
                                    <Text style={s.pendingReqDest} numberOfLines={1}>→ {req.destination_name}</Text>
                                    <Text style={s.pendingReqStatus}>{req.my_status}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* ── Bottom nav bar (always visible, outside the sheet) ─── */}
            <View style={s.navBar}>
                <TouchableOpacity style={s.navItem} onPress={() => setActiveTab('home')}>
                    <View style={[s.navIconWrap, activeTab === 'home' && s.navIconWrapActive]}>
                        <Text style={[s.navIcon, activeTab === 'home' && s.navIconActive]}>⌂</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={s.navItem} onPress={() => router.push('/create-ride')}>
                    <Text style={s.navIconRaw}>🚗</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.navItem} onPress={() => router.push('/find-buddy')}>
                    <Text style={s.navIconRaw}>💬</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.navItem} onPress={() => router.push('/profile')}>
                    <Text style={s.navIconRaw}>👤</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Dark green map theme ──────────────────────────────────
const darkGreenStyle = [
    { elementType: 'geometry', stylers: [{ color: '#0B2B26' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8EB69B' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#051F20' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#163832' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#051F20' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#235347' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#051F20' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#051F20' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#163832' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#163832' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0B2B26' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#235347' }] },
];

// ── Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0B2B26' },

    headerWrap: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 44 : 60,
        left: 20, right: 20,
        gap: 16,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerGreetingWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerCarIcon: {
        backgroundColor: C.primary,
        width: 40, height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
    },
    greetingText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFFFFF',
        textShadowColor: 'rgba(5, 31, 32, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    notificationBtn: {
        backgroundColor: C.headerBg,
        width: 44, height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(14,129,33,0.3)',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.pill,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1, borderColor: 'rgba(14,129,33,0.3)',
        gap: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8,
    },
    pillLocationIcon: { color: C.primary, fontSize: 16 },
    pillText: { color: C.pillText, fontSize: 14, fontWeight: '500' },
    pillChevronIcon: { color: '#94A3B8', fontSize: 18, marginTop: -6 },

    sheet: {
        position: 'absolute', bottom: NAV_H, left: 0, right: 0,
        backgroundColor: C.sheetBg,
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
        paddingHorizontal: 8,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 14,
    },
    destDivider: { /* removed bottom border, relying on spacing for sleek look */ },
    iconWrap: {
        backgroundColor: 'rgba(14,129,33,0.15)',
        width: 36, height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clockIcon: { fontSize: 18 },
    pinIcon: { fontSize: 18 },
    destInfo: { flex: 1, justifyContent: 'center' },
    destName: { fontSize: 15, color: C.destText, fontWeight: '600', marginBottom: 2 },
    destSub: { fontSize: 13, color: C.destSub },
    chevronIcon: { color: '#475569', fontSize: 24, fontWeight: '300' },

    emptyWrap: { alignItems: 'center', paddingVertical: 20 },
    emptyText: { color: 'rgba(22,56,50,0.5)', fontSize: 14 },

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
        borderTopColor: C.navDivider,
        backgroundColor: C.navBg,
    },
    navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 56 },
    navIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    navIconWrapActive: { backgroundColor: C.navActiveIcon },
    navIcon: { fontSize: 22, color: C.navInactiveIcon },
    navIconActive: { color: '#FFFFFF' },
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
