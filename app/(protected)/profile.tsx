import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { profileService, MyProfile, RideHistoryItem } from '../../services/profileService';

// ── Palette ───────────────────────────────────────────────
const C = {
    bg: '#051F20',
    card: '#0B2B26',
    cardBorder: 'rgba(142,182,155,0.15)',
    accent: '#8EB69B',
    accentDark: '#235347',
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.5)',
    divider: 'rgba(142,182,155,0.12)',
    btnBg: '#8EB69B',
    btnText: '#051F20',
    danger: '#E07070',
    star: '#F4C430',
    inputBg: '#163832',
};

const ACTIVE_COLOR = '#4CAF82';
const STATUS_COLORS: Record<string, string> = {
    ACTIVE: '#4CAF82',
    COMPLETED: 'rgba(255,255,255,0.35)',
};

// ── Stars helper ──────────────────────────────────────────
const Stars = ({ rating }: { rating: number }) => {
    const full = Math.floor(rating);
    const empty = 5 - full;
    return (
        <Text style={{ color: C.star, fontSize: 14 }}>
            {'★'.repeat(full)}{'☆'.repeat(empty)}
            <Text style={{ color: C.textMuted, fontSize: 13 }}> {rating.toFixed(1)}</Text>
        </Text>
    );
};

// ── Ride row ──────────────────────────────────────────────
const RideRow = ({ item }: { item: RideHistoryItem }) => (
    <View style={s.rideRow}>
        <View style={{ flex: 1, gap: 3 }}>
            <Text style={s.rideDestName} numberOfLines={1}>{item.destination_name || '—'}</Text>
            <Text style={s.rideMeta}>
                {item.ride_date}{'  ·  '}{item.ride_time}{'  ·  '}
                {item.participant_count} rider{item.participant_count !== 1 ? 's' : ''}
            </Text>
        </View>
        <View style={[s.statusBadge, { borderColor: STATUS_COLORS[item.status] ?? C.cardBorder }]}>
            <Text style={[s.statusText, { color: STATUS_COLORS[item.status] ?? C.textMuted }]}>
                {item.status}
            </Text>
        </View>
    </View>
);

// ── Screen ────────────────────────────────────────────────
export default function ProfileScreen() {
    const router = useRouter();
    const { signOut } = useAuth();

    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [rides, setRides] = useState<{ created: RideHistoryItem[]; joined: RideHistoryItem[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'created' | 'joined'>('created');
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [p, r] = await Promise.all([
                profileService.getMyProfile(),
                profileService.getMyRides(),
            ]);
            setProfile(p);
            setRides(r);
        } catch {
            Alert.alert('Error', 'Could not load profile.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleLogout = () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out', style: 'destructive',
                    onPress: async () => {
                        await signOut();
                    },
                },
            ],
        );
    };

    if (loading) {
        return (
            <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator color={C.accent} size="large" />
            </View>
        );
    }

    if (!profile) return null;

    const isVerified = profile.verification_status === 'VERIFIED';
    const ridesToShow = tab === 'created' ? (rides?.created ?? []) : (rides?.joined ?? []);

    return (
        <ScrollView style={s.root} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

            {/* ── Header ─────────────────────────────────── */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Text style={s.backText}>←</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>My Profile</Text>
            </View>

            {/* ── Avatar + Identity ──────────────────────── */}
            <View style={s.identityCard}>
                <View style={s.avatar}>
                    <Text style={s.avatarText}>{profile.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={s.fullName}>{profile.full_name || 'Alingo User'}</Text>
                        {isVerified && (
                            <View style={s.verifiedBadge}>
                                <Text style={s.verifiedText}>✅ Verified</Text>
                            </View>
                        )}
                        {profile.gender && (
                            <Text style={{ color: C.textMuted, fontSize: 13, textTransform: 'capitalize' }}>
                                • {profile.gender}
                            </Text>
                        )}
                    </View>
                    <Stars rating={profile.rating} />
                    <Text style={s.matchText}>🤝 {profile.total_buddy_matches} buddy matches</Text>
                </View>
            </View>

            {/* ── Stats row ──────────────────────────────── */}
            <View style={s.statsRow}>
                <View style={s.statCard}>
                    <Text style={s.statNum}>{profile.rides_completed}</Text>
                    <Text style={s.statLabel}>Rides{'\n'}Completed</Text>
                </View>
                <View style={[s.statCard, s.statCardMid]}>
                    <Text style={s.statNum}>{profile.reviews_count}</Text>
                    <Text style={s.statLabel}>Reviews{'\n'}Received</Text>
                </View>
                <View style={s.statCard}>
                    <Text style={[s.statNum, { color: C.star }]}>{profile.rating.toFixed(1)}</Text>
                    <Text style={s.statLabel}>Average{'\n'}Rating</Text>
                </View>
            </View>

            {/* ── Ride history tabs ──────────────────────── */}
            <View style={s.section}>
                <Text style={s.sectionTitle}>📋  Ride History</Text>
                <View style={s.tabRow}>
                    <TouchableOpacity
                        style={[s.tab, tab === 'created' && s.tabActive]}
                        onPress={() => setTab('created')}
                    >
                        <Text style={[s.tabText, tab === 'created' && s.tabTextActive]}>
                            Created ({rides?.created.length ?? 0})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[s.tab, tab === 'joined' && s.tabActive]}
                        onPress={() => setTab('joined')}
                    >
                        <Text style={[s.tabText, tab === 'joined' && s.tabTextActive]}>
                            Joined ({rides?.joined.length ?? 0})
                        </Text>
                    </TouchableOpacity>
                </View>

                {ridesToShow.length === 0 ? (
                    <Text style={s.emptyText}>No rides yet.</Text>
                ) : (
                    ridesToShow.map((item, i) => (
                        <View key={item.ride_id}>
                            {i > 0 && <View style={s.divider} />}
                            <RideRow item={item} />
                        </View>
                    ))
                )}
            </View>

            {/* ── Edit section (Button) ──────────────────────── */}
            <TouchableOpacity
                style={s.editProfileBtn}
                onPress={() => router.push('/(protected)/edit-profile')}
                activeOpacity={0.8}
            >
                <Text style={s.editProfileBtnText}>✏️ Edit Profile</Text>
            </TouchableOpacity>

            {/* ── Logout ─────────────────────────────────── */}
            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                <Text style={s.logoutText}>Log Out</Text>
            </TouchableOpacity>

            <View style={{ height: 48 }} />
        </ScrollView>
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

    // Identity card
    identityCard: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 20, marginBottom: 16,
        backgroundColor: C.card, borderRadius: 20,
        borderWidth: 1, borderColor: C.cardBorder,
        padding: 18, gap: 16,
    },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.accentDark, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: C.accent, fontSize: 26, fontWeight: '700' },
    fullName: { color: C.text, fontSize: 18, fontWeight: '700' },
    verifiedBadge: { backgroundColor: 'rgba(76,175,130,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    verifiedText: { color: ACTIVE_COLOR, fontSize: 12, fontWeight: '700' },
    matchText: { color: C.textMuted, fontSize: 13 },

    // Stats row
    statsRow: {
        flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
        backgroundColor: C.card, borderRadius: 18,
        borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden',
    },
    statCard: { flex: 1, alignItems: 'center', paddingVertical: 18, gap: 4 },
    statCardMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.divider },
    statNum: { color: C.text, fontSize: 22, fontWeight: '800' },
    statLabel: { color: C.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 16 },

    // Section
    section: {
        marginHorizontal: 20, marginBottom: 16,
        backgroundColor: C.card, borderRadius: 18,
        borderWidth: 1, borderColor: C.cardBorder,
        padding: 18, gap: 12,
    },
    sectionTitle: { color: C.accent, fontSize: 14, fontWeight: '700', letterSpacing: 0.4 },

    // Ride history tabs
    tabRow: { flexDirection: 'row', gap: 8 },
    tab: {
        flex: 1, alignItems: 'center', paddingVertical: 9,
        borderRadius: 10, borderWidth: 1, borderColor: C.cardBorder,
    },
    tabActive: { backgroundColor: C.accentDark, borderColor: C.accent },
    tabText: { color: C.textMuted, fontSize: 13, fontWeight: '600' },
    tabTextActive: { color: C.accent },

    rideRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
    rideDestName: { color: C.text, fontSize: 14, fontWeight: '600' },
    rideMeta: { color: C.textMuted, fontSize: 12 },
    statusBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    statusText: { fontSize: 11, fontWeight: '700' },
    divider: { height: 1, backgroundColor: C.divider },
    emptyText: { color: C.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 12 },

    // Edit Profile Button
    editProfileBtn: {
        marginHorizontal: 20, marginBottom: 16,
        backgroundColor: C.card, borderRadius: 16,
        borderWidth: 1, borderColor: C.cardBorder,
        paddingVertical: 18, alignItems: 'center',
    },
    editProfileBtnText: { color: C.text, fontSize: 16, fontWeight: '700' },

    // Logout
    logoutBtn: { marginHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: C.danger, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
    logoutText: { color: C.danger, fontSize: 15, fontWeight: '700' },
});
