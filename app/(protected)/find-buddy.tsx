import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { rideService, getOSRMPolyline } from '../../services/rideService';

// ── Palette ───────────────────────────────────────────────
const C = {
    bg: '#051F20',
    card: '#0B2B26',
    cardBorder: 'rgba(142,182,155,0.15)',
    accent: '#8EB69B',
    accentDark: '#235347',
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.5)',
    inputBg: '#163832',
    placeholder: 'rgba(255,255,255,0.4)',
    divider: 'rgba(142,182,155,0.12)',
    btnBg: '#8EB69B',
    btnText: '#051F20',
    btnDisabled: 'rgba(142,182,155,0.3)',
    star: '#F4C430',
    modalBg: '#0B2B26',
};

// Today's date as YYYY-MM-DD (rides are always for today)
const todayStr = () => new Date().toISOString().split('T')[0];

export default function FindBuddyScreen() {
    const router = useRouter();

    // Destination
    const [destination, setDestination] = useState<{
        name: string; coordinates: [number, number];
    } | null>(null);
    const [destQuery, setDestQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Search results
    const [results, setResults] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);

    // ── Nominatim destination search ──────────────────────
    const searchDestination = useCallback(async (text: string) => {
        if (!text.trim()) { setSuggestions([]); return; }
        setSearching(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=6&addressdetails=1&dedupe=1`,
                { headers: { 'Accept-Language': 'en', 'User-Agent': 'AlingoApp/1.0' } },
            );
            setSuggestions(await res.json());
        } catch { setSuggestions([]); }
        finally { setSearching(false); }
    }, []);

    const handleDestChange = (text: string) => {
        setDestQuery(text);
        setDestination(null);
        setResults(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!text.trim()) { setSuggestions([]); return; }
        debounceRef.current = setTimeout(() => searchDestination(text), 350);
    };

    const selectDest = (item: any) => {
        const name = item.display_name.split(',')[0];
        setDestination({ name, coordinates: [parseFloat(item.lon), parseFloat(item.lat)] });
        setDestQuery(name);
        setSuggestions([]);
        setResults(null);
    };

    // ── Search handler ────────────────────────────────────
    const isReady = !!destination;

    const handleSearch = async () => {
        if (!isReady || !destination) return;
        setLoading(true);
        setResults(null);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            let userLng = 0, userLat = 0;

            if (status === 'granted') {
                const pos = await Location.getLastKnownPositionAsync({});
                if (pos) {
                    userLat = pos.coords.latitude;
                    userLng = pos.coords.longitude;
                }
            }

            // Best-effort polyline for better matching
            let polyline = '';
            if (userLat && userLng) {
                polyline = await getOSRMPolyline(
                    userLat, userLng,
                    destination.coordinates[1],
                    destination.coordinates[0],
                );
            }

            const matches = await rideService.searchRides({
                user_location: [userLng, userLat],
                ride_date: todayStr(),
                route_polyline: polyline,
            });

            setResults(matches);
        } catch (err: any) {
            Alert.alert('Search failed', err?.response?.data?.error ?? 'Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Star rating renderer ──────────────────────────────
    const renderStars = (rating: number) => {
        const full = Math.floor(rating);
        const half = rating - full >= 0.5;
        const empty = 5 - full - (half ? 1 : 0);
        return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
    };

    // ── Render ────────────────────────────────────────────
    return (
        <View style={s.root}>
            <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                        <Text style={s.backText}>←</Text>
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Find a Buddy</Text>
                </View>

                {/* ── Destination search ──────────────────── */}
                <View style={s.section}>
                    <Text style={s.label}>📍  Where are you going?</Text>
                    <View style={s.searchBar}>
                        <TextInput
                            style={s.searchInput}
                            placeholder="Search destination…"
                            placeholderTextColor={C.placeholder}
                            value={destQuery}
                            onChangeText={handleDestChange}
                            autoCorrect={false}
                        />
                        {searching && <ActivityIndicator size="small" color={C.accent} />}
                        {destQuery.length > 0 && !searching && (
                            <TouchableOpacity onPress={() => { setDestQuery(''); setDestination(null); setSuggestions([]); setResults(null); }}>
                                <Text style={s.clearBtn}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {suggestions.length > 0 && (
                        <View style={s.suggBox}>
                            {suggestions.map((item, i) => (
                                <TouchableOpacity
                                    key={item.place_id ?? i}
                                    style={[s.suggItem, i < suggestions.length - 1 && s.suggDivider]}
                                    onPress={() => selectDest(item)} activeOpacity={0.7}
                                >
                                    <Text style={s.suggIcon}>📍</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.suggName} numberOfLines={1}>{item.display_name.split(',')[0]}</Text>
                                        <Text style={s.suggSub} numberOfLines={1}>{item.display_name.split(',').slice(1, 3).join(',')}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {destination && (
                        <View style={s.confirmedCard}>
                            <Text>✅</Text>
                            <Text style={s.confirmedText}>{destination.name}</Text>
                        </View>
                    )}
                </View>


                {/* ── Search button ────────────────────────── */}
                <TouchableOpacity
                    style={[s.searchBtn, (!isReady || loading) && s.searchBtnOff]}
                    onPress={handleSearch}
                    disabled={!isReady || loading}
                    activeOpacity={0.8}
                >
                    {loading
                        ? <ActivityIndicator color={C.btnText} />
                        : <Text style={[s.searchBtnText, !isReady && { color: 'rgba(5,31,32,0.4)' }]}>🔍  Find Buddies</Text>
                    }
                </TouchableOpacity>

                {isReady && !loading && (
                    <Text style={s.hint}>Searching within 500m of your location</Text>
                )}

                {/* ── Results ──────────────────────────────── */}
                {results !== null && (
                    <View style={s.resultsSection}>
                        <Text style={s.resultsHeader}>
                            {results.length > 0
                                ? `${results.length} ride${results.length > 1 ? 's' : ''} found`
                                : 'No rides found nearby'}
                        </Text>

                        {results.length === 0 && (
                            <View style={s.emptyCard}>
                                <Text style={s.emptyIcon}>🚗</Text>
                                <Text style={s.emptyTitle}>No buddies yet!</Text>
                                <Text style={s.emptyBody}>
                                    No active rides within 500m for this date.{'\n'}
                                    Be the first to create one!
                                </Text>
                            </View>
                        )}

                        {results.map((item, i) => (
                            <View key={item.ride_id} style={[s.rideCard, i > 0 && { marginTop: 10 }]}>
                                {/* Top row */}
                                <View style={s.rideCardTop}>
                                    <View style={s.avatarCircle}>
                                        <Text style={s.avatarText}>
                                            {item.creator_name?.[0]?.toUpperCase() ?? '?'}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.creatorName}>{item.creator_name}</Text>
                                        <Text style={[s.stars, { color: C.star }]}>
                                            {renderStars(item.creator_rating)}{' '}
                                            <Text style={s.ratingNum}>{item.creator_rating.toFixed(1)}</Text>
                                        </Text>
                                    </View>
                                    <View style={s.timeBadge}>
                                        <Text style={s.timeBadgeText}>{item.ride_time}</Text>
                                    </View>
                                </View>

                                {/* Details row */}
                                <View style={s.rideCardDetails}>
                                    <View style={s.detailItem}>
                                        <Text style={s.detailIcon}>📍</Text>
                                        <Text style={s.detailText} numberOfLines={1}>{item.destination_name}</Text>
                                    </View>
                                    <View style={s.detailRow}>
                                        <View style={s.detailItem}>
                                            <Text style={s.detailIcon}>📏</Text>
                                            <Text style={s.detailText}>
                                                {item.distance_meters < 1000
                                                    ? `${item.distance_meters}m away`
                                                    : `${(item.distance_meters / 1000).toFixed(1)}km away`}
                                            </Text>
                                        </View>
                                        <View style={s.detailItem}>
                                            <Text style={s.detailIcon}>💺</Text>
                                            <Text style={s.detailText}>{item.available_seats} seat{item.available_seats !== 1 ? 's' : ''} free</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>


        </View>
    );
}

// ── Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { paddingBottom: 40 },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? 44 : 60,
        paddingHorizontal: 20, paddingBottom: 20, gap: 16,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    backText: { color: C.accent, fontSize: 26, fontWeight: '600' },
    headerTitle: { color: C.text, fontSize: 22, fontWeight: '700' },

    section: { marginHorizontal: 20, marginBottom: 20 },
    label: { color: C.accent, fontSize: 13, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5 },

    searchBar: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.inputBg, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 14, gap: 8,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    searchInput: { flex: 1, color: C.text, fontSize: 15 },
    clearBtn: { color: C.accent, fontSize: 16, fontWeight: '600' },

    suggBox: {
        marginTop: 6, backgroundColor: C.card,
        borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden',
    },
    suggItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
    suggDivider: { borderBottomWidth: 1, borderBottomColor: C.divider },
    suggIcon: { fontSize: 14 },
    suggName: { color: C.text, fontSize: 14, fontWeight: '500' },
    suggSub: { color: C.textMuted, fontSize: 12, marginTop: 1 },

    confirmedCard: {
        marginTop: 8, flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(142,182,155,0.1)', borderRadius: 10,
        padding: 12, gap: 8, borderWidth: 1, borderColor: 'rgba(142,182,155,0.25)',
    },
    confirmedText: { color: C.accent, fontSize: 14, fontWeight: '600', flex: 1 },

    pickerBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.inputBg, borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 16,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    pickerBtnText: { flex: 1, color: C.text, fontSize: 15 },
    muted: { color: C.placeholder },
    chevron: { color: C.accent, fontSize: 20 },

    searchBtn: { marginHorizontal: 20, backgroundColor: C.btnBg, borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
    searchBtnOff: { backgroundColor: C.btnDisabled },
    searchBtnText: { color: C.btnText, fontSize: 17, fontWeight: '700' },
    hint: { color: C.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 },

    // Results
    resultsSection: { marginHorizontal: 20, marginTop: 24 },
    resultsHeader: { color: C.accent, fontSize: 14, fontWeight: '700', marginBottom: 14, letterSpacing: 0.5 },

    emptyCard: {
        backgroundColor: C.card, borderRadius: 16, padding: 32,
        alignItems: 'center', gap: 10,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    emptyIcon: { fontSize: 40 },
    emptyTitle: { color: C.text, fontSize: 18, fontWeight: '700' },
    emptyBody: { color: C.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },

    rideCard: {
        backgroundColor: C.card, borderRadius: 16,
        borderWidth: 1, borderColor: C.cardBorder,
        overflow: 'hidden',
    },
    rideCardTop: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, gap: 12,
        borderBottomWidth: 1, borderBottomColor: C.divider,
    },
    avatarCircle: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: C.accentDark, alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: C.accent, fontSize: 18, fontWeight: '700' },
    creatorName: { color: C.text, fontSize: 15, fontWeight: '600' },
    stars: { fontSize: 13, marginTop: 2 },
    ratingNum: { color: C.textMuted, fontWeight: '400' },
    timeBadge: {
        backgroundColor: C.accentDark, borderRadius: 8,
        paddingHorizontal: 10, paddingVertical: 6,
    },
    timeBadgeText: { color: C.accent, fontSize: 13, fontWeight: '700' },

    rideCardDetails: { padding: 14, gap: 8 },
    detailRow: { flexDirection: 'row', gap: 20 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    detailIcon: { fontSize: 13 },
    detailText: { color: C.textMuted, fontSize: 13, flex: 1 },

    // Date Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: C.modalBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 48 : 24 },
    modalTitle: { color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
    pickerRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    pickerCol: { flex: 1, alignItems: 'center' },
    colLabel: { color: C.textMuted, fontSize: 12, marginBottom: 6 },
    colScroll: { height: 160 },
    colItem: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, minWidth: 52, alignItems: 'center' },
    colItemSel: { backgroundColor: C.accentDark },
    colItemText: { color: C.textMuted, fontSize: 16 },
    colItemTextSel: { color: C.accent, fontWeight: '700' },
    modalConfirmBtn: { backgroundColor: C.btnBg, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    modalConfirmText: { color: C.btnText, fontSize: 16, fontWeight: '700' },
});
