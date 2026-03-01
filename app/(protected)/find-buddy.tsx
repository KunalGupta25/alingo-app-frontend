import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { rideService, getOSRMPolyline } from '../../services/rideService';

// ── Palette ───────────────────────────────────────────────
const C = {
    bg: '#0b1416',
    card: '#0F3D3E',
    cardBorder: 'rgba(79, 209, 197, 0.1)',
    accent: '#4fd1c5',
    accentDark: 'rgba(79, 209, 197, 0.2)',
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.6)',
    inputBg: 'rgba(11, 20, 22, 0.5)',
    btnBg: '#A3e635',
    btnText: '#0b1416',
    btnDisabled: 'rgba(163, 230, 53, 0.3)',
    star: '#F4C430',
    placeholder: 'rgba(255,255,255,0.4)',
    divider: 'rgba(79, 209, 197, 0.12)',
    modalBg: '#0F3D3E',
};

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function FindBuddyScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Extracted from router params passed by home.tsx
    const destName = (params.destName as string) || 'Choose Destination';
    const destLat = parseFloat(params.destLat as string);
    const destLon = parseFloat(params.destLon as string);

    // Gender Filter state
    const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');

    // Search results states
    const [results, setResults] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [requestStates, setRequestStates] = useState<Record<string, string>>({});

    const handleRequestJoin = async (ride_id: string) => {
        setRequestStates(prev => ({ ...prev, [ride_id]: 'loading' }));
        try {
            await rideService.requestRide(ride_id);
            setRequestStates(prev => ({ ...prev, [ride_id]: 'PENDING' }));
        } catch (err: any) {
            const msg = err?.response?.data?.error ?? 'Could not send request.';
            Alert.alert('Request failed', msg);
            setRequestStates(prev => ({ ...prev, [ride_id]: 'idle' }));
        }
    };

    // ── Search on load or filter change ───────────────────
    useEffect(() => {
        if (!destLat || !destLon || isNaN(destLat)) return;
        runSearch();
    }, [genderFilter, destLat, destLon]);

    const runSearch = async () => {
        setLoading(true);
        setResults(null);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            let userLng = 0, userLat = 0;

            if (status === 'granted') {
                let pos = await Location.getLastKnownPositionAsync({});
                if (!pos) pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
                if (pos) {
                    userLat = pos.coords.latitude;
                    userLng = pos.coords.longitude;
                }
            }

            let polyline = '';
            if (userLat && userLng) {
                polyline = await getOSRMPolyline(userLat, userLng, destLat, destLon);
            }

            // Using the rideService search endpoint
            const matches = await rideService.searchRides({
                user_location: [userLng, userLat],
                ride_date: todayStr(),
                route_polyline: polyline,
                gender_filter: genderFilter,
            });

            setResults(matches);
        } catch (err: any) {
            Alert.alert('Search failed', err?.response?.data?.error ?? 'Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (rating: number) => '★'.repeat(Math.ceil(rating));

    return (
        <View style={s.root}>
            {/* ── Fixed Header ── */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={C.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle} numberOfLines={1}>{destName}</Text>
                <TouchableOpacity style={s.filterBtn}>
                    <Ionicons name="options" size={24} color={C.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Route Selection Fields ── */}
                <View style={s.routeBox}>
                    <View style={s.routeField}>
                        <Ionicons name="locate" size={20} color={C.accent} style={{ marginRight: 8 }} />
                        <Text style={s.routeText}>Current Location</Text>
                    </View>
                    <View style={[s.routeField, { marginTop: 8 }]}>
                        <Ionicons name="search" size={20} color={C.textMuted} style={{ marginRight: 8 }} />
                        <Text style={[s.routeText, { color: '#fff' }]} numberOfLines={1}>{destName}</Text>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Ionicons name="close-circle-outline" size={20} color={C.textMuted} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Gender Filter ── */}
                <View style={s.genderSection}>
                    <Text style={s.sectionSubtitle}>FILTER BY GENDER</Text>
                    <View style={s.genderTabs}>
                        {(['All', 'Male', 'Female'] as const).map(tab => {
                            const active = genderFilter === tab;
                            return (
                                <TouchableOpacity
                                    key={tab}
                                    onPress={() => setGenderFilter(tab)}
                                    style={[s.genderTab, active && s.genderTabActive]}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons
                                            name={tab === 'All' ? 'people' : tab === 'Male' ? 'man' : 'woman'}
                                            size={16}
                                            color={active ? C.btnText : C.textMuted}
                                        />
                                        <Text style={[s.genderTabText, active && s.genderTabTextActive]}>
                                            {tab}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ── Available Rides List ── */}
                <Text style={s.sectionTitle}>Available Rides</Text>
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
                                    No active rides within 2km for this date.{'\n'}
                                    Be the first to create one!
                                </Text>
                                <TouchableOpacity
                                    style={s.createRideBtn}
                                    onPress={() => router.push('/create-ride')}
                                >
                                    <Text style={s.createRideBtnText}>Offer a Ride</Text>
                                </TouchableOpacity>
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
                                    <TouchableOpacity
                                        style={{ flex: 1 }}
                                        onPress={() => item.creator_id && router.push({ pathname: '/public-profile', params: { user_id: item.creator_id } })}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[s.creatorName, { textDecorationLine: 'underline' }]}>{item.creator_name}</Text>
                                        <Text style={[s.stars, { color: C.star }]}>
                                            {renderStars(item.creator_rating)}{' '}
                                            <Text style={s.ratingNum}>{item.creator_rating.toFixed(1)}</Text>
                                        </Text>
                                    </TouchableOpacity>
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

                                {/* ── Join Request Button ───────────────────── */}
                                {(() => {
                                    const rs = requestStates[item.ride_id] ?? 'idle';
                                    const cfg: Record<string, { label: string; style: any; textStyle: any; disabled: boolean }> = {
                                        idle: { label: '🚗 Request to Join', style: s.joinBtn, textStyle: s.joinBtnText, disabled: false },
                                        loading: { label: '…', style: s.joinBtn, textStyle: s.joinBtnText, disabled: true },
                                        PENDING: { label: '⏳ Pending', style: s.joinBtnPending, textStyle: s.joinBtnTextMuted, disabled: true },
                                        APPROVED: { label: '✅ Joined', style: s.joinBtnApproved, textStyle: s.joinBtnTextApproved, disabled: true },
                                        REJECTED: { label: '✗ Rejected', style: s.joinBtnRejected, textStyle: s.joinBtnTextRejected, disabled: true },
                                    };
                                    const { label, style, textStyle, disabled } = cfg[rs];
                                    return (
                                        <View style={s.joinBtnWrap}>
                                            <TouchableOpacity
                                                style={[s.joinBtnBase, style]}
                                                onPress={() => handleRequestJoin(item.ride_id)}
                                                disabled={disabled}
                                                activeOpacity={0.8}
                                            >
                                                {rs === 'loading'
                                                    ? <ActivityIndicator size="small" color={C.btnText} />
                                                    : <Text style={[s.joinBtnBaseText, textStyle]}>{label}</Text>
                                                }
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })()}
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
    backIcon: { color: C.accent, fontSize: 26, fontWeight: '600' },
    headerTitle: { color: C.text, fontSize: 22, fontWeight: '700', flex: 1, textAlign: 'center' },
    filterBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    filterIcon: { color: C.accent, fontSize: 22 },

    routeBox: { marginHorizontal: 20, marginBottom: 20 },
    routeField: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.inputBg, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 14, gap: 10,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    routeIconAim: { color: C.accent, fontSize: 18 },
    routeIconSearch: { fontSize: 16 },
    routeText: { color: C.textMuted, fontSize: 15, flex: 1 },
    routeClose: { color: C.accent, fontSize: 16, fontWeight: '600', paddingHorizontal: 4 },

    genderSection: { marginHorizontal: 20, marginBottom: 24 },
    sectionSubtitle: { color: C.accent, fontSize: 13, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 },
    genderTabs: { flexDirection: 'row', backgroundColor: C.inputBg, borderRadius: 12, padding: 4 },
    genderTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    genderTabActive: { backgroundColor: C.accentDark },
    genderTabText: { color: C.textMuted, fontSize: 14, fontWeight: '600' },
    genderTabTextActive: { color: C.text, fontWeight: '700' },

    sectionTitle: { color: C.text, fontSize: 20, fontWeight: '700', marginHorizontal: 20 },

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
    createRideBtn: { marginTop: 12, backgroundColor: C.btnBg, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12 },
    createRideBtnText: { color: C.btnText, fontSize: 15, fontWeight: '700' },

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

    // ── Join button ──────────────────────────────────────
    joinBtnWrap: { paddingHorizontal: 14, paddingBottom: 14 },
    joinBtnBase: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    joinBtnBaseText: { fontSize: 14, fontWeight: '700' },

    // idle / loading
    joinBtn: { backgroundColor: C.btnBg },
    joinBtnText: { color: C.btnText },

    // PENDING
    joinBtnPending: { backgroundColor: 'rgba(142,182,155,0.12)', borderWidth: 1, borderColor: C.cardBorder },
    joinBtnTextMuted: { color: C.textMuted },

    // APPROVED
    joinBtnApproved: { backgroundColor: 'rgba(46,139,87,0.2)', borderWidth: 1, borderColor: '#2E8B57' },
    joinBtnTextApproved: { color: '#4CAF82' },

    // REJECTED
    joinBtnRejected: { backgroundColor: 'rgba(180,60,60,0.15)', borderWidth: 1, borderColor: 'rgba(180,60,60,0.4)' },
    joinBtnTextRejected: { color: '#E07070' },
});
