import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { userService } from '../../services/userService';

// ── Palette ───────────────────────────────────────────────
const C = {
    sheetBg: '#8EB69B',
    searchBg: '#235347',
    searchText: '#FFFFFF',
    searchPlaceholder: 'rgba(255,255,255,0.6)',
    pill: '#163832',
    pillText: '#FFFFFF',
    pillDot: '#8EB69B',
    destText: '#163832',
    divider: 'rgba(22,56,50,0.15)',
    navBg: '#8EB69B',
    navActiveIcon: '#163832',
    navInactiveIcon: 'rgba(22,56,50,0.4)',
    navDivider: 'rgba(22,56,50,0.12)',
    suggestionBg: '#FFFFFF',
    suggestionBorder: 'rgba(22,56,50,0.1)',
};

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_MIN = SCREEN_H * 0.50;
const SHEET_MAX = SCREEN_H * 0.80;

// ── Static recents (shown when search is empty) ───────────
const RECENTS = [
    { id: '1', name: 'Parul University' },
    { id: '2', name: 'Railway Station' },
    { id: '3', name: 'D-Mart' },
    { id: '4', name: 'Mall' },
    { id: '5', name: 'Air Port' },
];

// ── 30km degree offset (~0.27° lat, ~0.32° lon at 23° N) ───
const KM30_LAT = 0.27;
const KM30_LON = 0.32;

// ── Component ─────────────────────────────────────────────
export default function HomeScreen() {
    const router = useRouter();

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
    const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'profile'>('home');

    // Bottom sheet
    const sheetH = useRef(new Animated.Value(SHEET_MIN)).current;
    const lastH = useRef(SHEET_MIN);

    // ── Init ───────────────────────────────────────────────
    useEffect(() => { requestLocation(); }, []);

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
        Animated.spring(sheetH, {
            toValue: SHEET_MIN,
            useNativeDriver: false,
            tension: 60, friction: 10,
        }).start();
        lastH.current = SHEET_MIN;
    };

    // ── Pan responder for sheet ────────────────────────────
    const pan = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
            onPanResponderMove: (_, g) => {
                const next = lastH.current - g.dy;
                sheetH.setValue(Math.min(SHEET_MAX, Math.max(SHEET_MIN, next)));
            },
            onPanResponderRelease: (_, g) => {
                const next = lastH.current - g.dy;
                const snapTo = next > (SHEET_MIN + SHEET_MAX) / 2 ? SHEET_MAX : SHEET_MIN;
                lastH.current = snapTo;
                Animated.spring(sheetH, {
                    toValue: snapTo, useNativeDriver: false,
                    tension: 60, friction: 10,
                }).start();
            },
        })
    ).current;

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

            {/* ── Location pill ──────────────────────────── */}
            <View style={s.pillWrap} pointerEvents="box-none">
                <View style={s.pill}>
                    <View style={s.pillDot} />
                    <Text style={s.pillText} numberOfLines={1}>{locationLabel}</Text>
                </View>
            </View>

            {/* ── Bottom sheet ───────────────────────────── */}
            <Animated.View style={[s.sheet, { height: sheetH }]}>

                {/* Drag handle */}
                <View {...pan.panHandlers} style={s.handleWrap}>
                    <View style={s.handle} />
                </View>

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

                {/* Dynamic suggestions OR static recents */}
                {suggestions.length > 0 ? (
                    <FlatList
                        data={suggestions}
                        keyExtractor={item => item.place_id?.toString() ?? item.display_name}
                        style={s.list}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item, index }) => (
                            <TouchableOpacity
                                style={[s.destRow, index < suggestions.length - 1 && s.destDivider]}
                                onPress={() => handleSelectSuggestion(item)}
                                activeOpacity={0.6}
                            >
                                <Text style={s.pinIcon}>📍</Text>
                                <View style={s.destInfo}>
                                    <Text style={s.destName} numberOfLines={1}>
                                        {item.display_name.split(',')[0]}
                                    </Text>
                                    <Text style={s.destSub} numberOfLines={1}>
                                        {item.display_name.split(',').slice(1, 3).join(',')}
                                    </Text>
                                </View>
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
                                <Text style={s.clockIcon}>🕐</Text>
                                <Text style={s.destName}>{d.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={{ flex: 1 }} />

                {/* Bottom nav bar */}
                <View style={s.navBar}>
                    <TouchableOpacity style={s.navItem} onPress={() => setActiveTab('home')}>
                        <View style={[s.navIconWrap, activeTab === 'home' && s.navIconWrapActive]}>
                            <Text style={[s.navIcon, activeTab === 'home' && s.navIconActive]}>⌂</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.navItem} onPress={() => setActiveTab('chat')}>
                        <Text style={[s.navIconRaw, activeTab === 'chat' && s.navIconActiveRaw]}>💬</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.navItem} onPress={() => setActiveTab('profile')}>
                        <Text style={[s.navIconRaw, activeTab === 'profile' && s.navIconActiveRaw]}>👤</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
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

    pillWrap: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 44 : 60,
        left: 20, right: 20,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.pill,
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 12,
        gap: 8,
    },
    pillDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.pillDot },
    pillText: { color: C.pillText, fontSize: 15, fontWeight: '500', flex: 1 },

    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
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
        borderRadius: 14,
        marginHorizontal: 16,
        marginBottom: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 10,
    },
    searchIcon: { fontSize: 16 },
    searchInput: { flex: 1, fontSize: 15, color: C.searchText, fontWeight: '400' },
    clearBtn: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600' },

    list: { paddingHorizontal: 8 },

    destRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 14,
        gap: 14,
    },
    destDivider: { borderBottomWidth: 1, borderBottomColor: C.divider },
    clockIcon: { fontSize: 16, opacity: 0.7 },
    pinIcon: { fontSize: 16 },
    destInfo: { flex: 1 },
    destName: { fontSize: 14, color: C.destText, fontWeight: '500' },
    destSub: { fontSize: 12, color: 'rgba(22,56,50,0.55)', marginTop: 1 },

    emptyWrap: { alignItems: 'center', paddingVertical: 20 },
    emptyText: { color: 'rgba(22,56,50,0.5)', fontSize: 14 },

    navBar: {
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
});
