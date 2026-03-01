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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { profileService, PublicProfile, ReviewItem } from '../../services/profileService';

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
    star: '#F4C430',
};

const ACTIVE_COLOR = '#4CAF82';

// ── Star display ──────────────────────────────────────────
const StarRow = ({ rating }: { rating: number }) => {
    const full = Math.floor(rating);
    const hasHalf = rating - full >= 0.5;
    const empty = 5 - full - (hasHalf ? 1 : 0);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            {[...Array(full)].map((_, i) => <Ionicons key={`f-${i}`} name="star" size={16} color={C.star} />)}
            {hasHalf && <Ionicons name="star-half" size={16} color={C.star} />}
            {[...Array(empty)].map((_, i) => <Ionicons key={`e-${i}`} name="star-outline" size={16} color={C.star} />)}
        </View>
    );
};

// ── Review card ───────────────────────────────────────────
const ReviewCard = ({ item }: { item: ReviewItem }) => {
    const date = item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
    return (
        <View style={s.reviewCard}>
            <View style={s.reviewTop}>
                <View style={{ flex: 1 }}>
                    <Text style={s.reviewerName}>{item.reviewer_name}</Text>
                    <Text style={s.reviewDate}>{date}</Text>
                </View>
                <StarRow rating={item.rating} />
            </View>
            {item.tags.length > 0 && (
                <View style={s.tagsRow}>
                    {item.tags.map(tag => (
                        <View key={tag} style={s.tag}>
                            <Text style={s.tagText}>{tag}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

// ── Screen ────────────────────────────────────────────────
export default function PublicProfileScreen() {
    const router = useRouter();
    const { user_id } = useLocalSearchParams<{ user_id: string }>();

    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user_id) return;
        (async () => {
            try {
                const [p, r] = await Promise.all([
                    profileService.getPublicProfile(user_id),
                    profileService.getUserReviews(user_id, 5),
                ]);
                setProfile(p);
                setReviews(r.reviews);
            } catch {
                Alert.alert('Error', 'Could not load profile.');
            } finally {
                setLoading(false);
            }
        })();
    }, [user_id]);

    if (loading) {
        return (
            <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator color={C.accent} size="large" />
            </View>
        );
    }

    if (!profile) return null;

    const isVerified = profile.verification_status === 'VERIFIED';

    return (
        <ScrollView style={s.root} contentContainerStyle={s.scroll}>

            {/* ── Header ─────────────────────────────────── */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={C.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Profile</Text>
            </View>

            {/* ── Identity ───────────────────────────────── */}
            <View style={s.identityCard}>
                <View style={s.avatar}>
                    <Text style={s.avatarText}>{profile.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>

                <View style={s.identityInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={s.fullName}>{profile.full_name}</Text>
                        {isVerified && (
                            <View style={s.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={14} color="#FFF" style={{ marginRight: 4 }} />
                                <Text style={s.verifiedText}>Verified</Text>
                            </View>
                        )}
                    </View>
                    <StarRow rating={profile.rating} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="star" size={14} color={C.star} />
                        <Text style={s.subText}> {profile.rating.toFixed(1)}  ·  </Text>
                        <Ionicons name="people" size={14} color={C.accent} />
                        <Text style={s.subText}> {profile.total_buddy_matches} matches</Text>
                    </View>
                </View>
            </View>

            {/* ── Stats ──────────────────────────────────── */}
            <View style={s.statsRow}>
                <View style={s.statCard}>
                    <Text style={s.statNum}>{profile.rides_completed}</Text>
                    <Text style={s.statLabel}>Rides{'\n'}Completed</Text>
                </View>
                <View style={[s.statCard, s.statCardMid]}>
                    <Text style={[s.statNum, { color: C.star }]}>{profile.rating.toFixed(1)}</Text>
                    <Text style={s.statLabel}>Average{'\n'}Rating</Text>
                </View>
                <View style={s.statCard}>
                    <Text style={s.statNum}>{profile.reviews_count}</Text>
                    <Text style={s.statLabel}>Reviews{'\n'}Received</Text>
                </View>
            </View>

            {/* ── Reviews ────────────────────────────────── */}
            <View style={s.section}>
                <Text style={s.sectionTitle}>⭐  Reviews</Text>
                {reviews.length === 0 ? (
                    <Text style={s.emptyText}>No reviews yet.</Text>
                ) : (
                    reviews.map((rev, i) => (
                        <View key={i}>
                            {i > 0 && <View style={s.divider} />}
                            <ReviewCard item={rev} />
                        </View>
                    ))
                )}
            </View>

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

    identityCard: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 20, marginBottom: 16,
        backgroundColor: C.card, borderRadius: 20,
        borderWidth: 1, borderColor: C.cardBorder,
        padding: 18, gap: 16,
    },
    avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.accentDark, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: C.accent, fontSize: 28, fontWeight: '700' },
    identityInfo: { flex: 1, gap: 6 },
    fullName: { color: C.text, fontSize: 20, fontWeight: '700' },
    verifiedBadge: { backgroundColor: 'rgba(76,175,130,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    verifiedText: { color: ACTIVE_COLOR, fontSize: 12, fontWeight: '700' },
    subText: { color: C.textMuted, fontSize: 13 },

    statsRow: {
        flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
        backgroundColor: C.card, borderRadius: 18,
        borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden',
    },
    statCard: { flex: 1, alignItems: 'center', paddingVertical: 18, gap: 4 },
    statCardMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.divider },
    statNum: { color: C.text, fontSize: 22, fontWeight: '800' },
    statLabel: { color: C.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 16 },

    section: {
        marginHorizontal: 20, marginBottom: 16,
        backgroundColor: C.card, borderRadius: 18,
        borderWidth: 1, borderColor: C.cardBorder,
        padding: 18, gap: 12,
    },
    sectionTitle: { color: C.accent, fontSize: 14, fontWeight: '700', letterSpacing: 0.4 },

    reviewCard: { paddingVertical: 10, gap: 8 },
    reviewTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    reviewerName: { color: C.text, fontSize: 14, fontWeight: '600' },
    reviewDate: { color: C.textMuted, fontSize: 12, marginTop: 2 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tag: {
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder,
    },
    tagText: { color: C.textMuted, fontSize: 12 },
    divider: { height: 1, backgroundColor: C.divider },
    emptyText: { color: C.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 8 },
});
