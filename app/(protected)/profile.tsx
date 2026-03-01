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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { profileService, MyProfile, RideHistoryItem } from '../../services/profileService';

// ── Palette ───────────────────────────────────────────────
const C = {
    bg: '#0b1416',
    card: '#0F3D3E',
    cardBorder: 'rgba(79, 209, 197, 0.15)',
    accent: '#4fd1c5',
    accentDark: 'rgba(79, 209, 197, 0.2)',
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.5)',
    divider: 'rgba(79, 209, 197, 0.12)',
    navActiveIcon: '#A3E635',
    navInactiveIcon: '#5F6F73',
    btnBg: '#A3e635',
    btnText: '#0b1416',
    danger: '#E07070',
    star: '#F4C430',
    inputBg: 'rgba(11, 20, 22, 0.5)',
};

const ACTIVE_COLOR = '#4CAF82';
const STATUS_COLORS: Record<string, string> = {
    ACTIVE: '#4CAF82',
    COMPLETED: 'rgba(255,255,255,0.35)',
};

// ── Stars helper ──────────────────────────────────────────
const Stars = ({ rating }: { rating: number }) => {
    const full = Math.floor(rating);
    const hasHalf = rating - full >= 0.5;
    const empty = 5 - full - (hasHalf ? 1 : 0);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            {[...Array(full)].map((_, i) => <Ionicons key={`f-${i}`} name="star" size={14} color={C.star} />)}
            {hasHalf && <Ionicons name="star-half" size={14} color={C.star} />}
            {[...Array(empty)].map((_, i) => <Ionicons key={`e-${i}`} name="star-outline" size={14} color={C.star} />)}
            <Text style={{ color: C.textMuted, fontSize: 13, marginLeft: 4 }}> {rating.toFixed(1)}</Text>
        </View>
    );
};

// ── Ride row ──────────────────────────────────────────────
const RideRow = ({ item, onPress }: { item: RideHistoryItem; onPress: () => void }) => (
    <TouchableOpacity style={s.rideRow} onPress={onPress} activeOpacity={0.6}>
        <View style={{ flex: 1, gap: 3 }}>
            <Text style={s.rideDestName} numberOfLines={1}>{item.destination_name || '—'}</Text>
            <Text style={s.rideMeta}>
                {item.ride_date}{'  ·  '}{item.ride_time}{'  ·  '}
                {item.participant_count} rider{item.participant_count !== 1 ? 's' : ''}
            </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[s.statusBadge, { borderColor: STATUS_COLORS[item.status] ?? C.cardBorder }]}>
                <Text style={[s.statusText, { color: STATUS_COLORS[item.status] ?? C.textMuted }]}>
                    {item.status}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
        </View>
    </TouchableOpacity>
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
        <View style={s.root}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

                {/* ── Header ─────────────────────────────────── */}
                <View style={s.header}>
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
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Ionicons name="checkmark-circle" size={14} color={ACTIVE_COLOR} />
                                        <Text style={s.verifiedText}>Verified</Text>
                                    </View>
                                </View>
                            )}
                            {profile.gender && (
                                <Text style={{ color: C.textMuted, fontSize: 13, textTransform: 'capitalize' }}>
                                    • {profile.gender}
                                </Text>
                            )}
                        </View>
                        <Stars rating={profile.rating} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="people" size={14} color={C.textMuted} />
                            <Text style={s.matchText}>{profile.total_buddy_matches} buddy matches</Text>
                        </View>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="list" size={18} color={C.accent} />
                        <Text style={s.sectionTitle}>Ride History</Text>
                    </View>
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
                                <RideRow item={item} onPress={() => router.push({ pathname: '/(protected)/ride-details', params: { ride_id: item.ride_id } })} />
                            </View>
                        ))
                    )}
                </View>

                {/* ── Settings (Button) ──────────────────────── */}
                <TouchableOpacity
                    style={s.editProfileBtn}
                    onPress={() => router.push('/(protected)/settings')}
                    activeOpacity={0.8}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="settings-outline" size={16} color={C.text} />
                        <Text style={s.editProfileBtnText}>Settings</Text>
                    </View>
                </TouchableOpacity>

                {/* ── Logout ─────────────────────────────────── */}
                <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                    <Text style={s.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <View style={{ height: 80 }} />
            </ScrollView>

            {/* ── Bottom nav bar ── */}
            <LinearGradient colors={['#0A1E1F', '#071213']} style={s.navBar}>
                <TouchableOpacity style={s.navItem} onPress={() => router.replace('/home')}>
                    <Ionicons name="home" size={24} color={C.navInactiveIcon} />
                </TouchableOpacity>
                <TouchableOpacity style={s.navItem}>
                    <View style={s.navIconWrap}>
                        <Ionicons name="person" size={24} color={C.navActiveIcon} />
                    </View>
                </TouchableOpacity>
            </LinearGradient>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { paddingBottom: 40 },

    // Nav Bar
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
        borderTopColor: 'rgba(79,209,197,0.12)',
    },
    navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 56 },
    navIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingTop: Platform.OS === 'android' ? 44 : 60,
        paddingHorizontal: 20, paddingBottom: 20,
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
