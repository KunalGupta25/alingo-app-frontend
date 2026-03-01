import React, { useState } from 'react';
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
import { reviewService } from '../../services/reviewService';

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
    btnBg: '#A3e635',
    btnText: '#0b1416',
    btnDisabled: 'rgba(163, 230, 53, 0.3)',
    star: '#F4C430',
    starEmpty: 'rgba(255,255,255,0.2)',
};

const AVAILABLE_TAGS = [
    'On time', 'Friendly', 'Safe ride', 'Good driver', 'Comfortable', 'Punctual',
];

// ── Participant review card ────────────────────────────────
function ParticipantCard({
    participant,
    onSubmit,
    submitted,
}: {
    participant: { user_id: string; name: string };
    onSubmit: (reviewee_id: string, rating: number, tags: string[]) => Promise<void>;
    submitted: boolean;
}) {
    const [rating, setRating] = useState(0);
    const [tags, setTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const toggleTag = (tag: string) =>
        setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

    const handleSubmit = async () => {
        if (rating === 0) { Alert.alert('Select a rating', 'Please pick at least 1 star.'); return; }
        setLoading(true);
        await onSubmit(participant.user_id, rating, tags);
        setLoading(false);
    };

    if (submitted) {
        return (
            <View style={s.card}>
                <View style={s.cardTop}>
                    <View style={s.avatar}>
                        <Text style={s.avatarText}>{participant.name?.[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                    <Text style={s.participantName}>{participant.name}</Text>
                    <Text style={s.submittedBadge}>✅ Reviewed</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={s.card}>
            {/* Name row */}
            <View style={s.cardTop}>
                <View style={s.avatar}>
                    <Text style={s.avatarText}>{participant.name?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <Text style={s.participantName}>{participant.name}</Text>
            </View>

            {/* Stars */}
            <View style={s.starsRow}>
                {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity key={n} onPress={() => setRating(n)} activeOpacity={0.7}>
                        <Text style={[s.star, { color: n <= rating ? C.star : C.starEmpty }]}>★</Text>
                    </TouchableOpacity>
                ))}
                {rating > 0 && <Text style={s.ratingLabel}>{rating}/5</Text>}
            </View>

            {/* Tags */}
            <View style={s.tagsRow}>
                {AVAILABLE_TAGS.map(tag => (
                    <TouchableOpacity
                        key={tag}
                        style={[s.tagChip, tags.includes(tag) && s.tagChipSel]}
                        onPress={() => toggleTag(tag)}
                        activeOpacity={0.7}
                    >
                        <Text style={[s.tagText, tags.includes(tag) && s.tagTextSel]}>{tag}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Submit */}
            <TouchableOpacity
                style={[s.submitBtn, (loading || rating === 0) && s.submitBtnOff]}
                onPress={handleSubmit}
                disabled={loading || rating === 0}
                activeOpacity={0.8}
            >
                {loading
                    ? <ActivityIndicator color={C.btnText} />
                    : <Text style={[s.submitBtnText, rating === 0 && { color: 'rgba(5,31,32,0.35)' }]}>
                        Submit Review
                    </Text>
                }
            </TouchableOpacity>
        </View>
    );
}

// ── Screen ────────────────────────────────────────────────
export default function ReviewScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ ride_id: string; participants: string }>();

    const rideId = params.ride_id ?? '';
    const participants: Array<{ user_id: string; name: string }> =
        params.participants ? JSON.parse(params.participants) : [];

    // Track which user_ids have been reviewed
    const [submitted, setSubmitted] = useState<Set<string>>(new Set());

    const handleSubmit = async (reviewee_id: string, rating: number, tags: string[]) => {
        try {
            await reviewService.createReview({ ride_id: rideId, reviewee_id, rating, tags });
            setSubmitted(prev => new Set(prev).add(reviewee_id));
        } catch (err: any) {
            const msg = err?.response?.data?.error ?? 'Failed to submit review.';
            Alert.alert('Error', msg);
            throw err;  // propagate so loading stops
        }
    };

    const allSubmitted = participants.length > 0 && participants.every(p => submitted.has(p.user_id));

    return (
        <ScrollView style={s.root} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={s.header}>
                <Text style={s.headerTitle}>Rate your Buddies</Text>
                <Text style={s.headerSub}>Your ride is complete! Leave a review for your co-passengers.</Text>
            </View>

            {participants.length === 0 ? (
                <View style={s.emptyCard}>
                    <Text style={s.emptyIcon}>🚗</Text>
                    <Text style={s.emptyTitle}>No passengers to review</Text>
                    <Text style={s.emptyBody}>Nobody joined your ride this time.</Text>
                </View>
            ) : (
                participants.map(p => (
                    <ParticipantCard
                        key={p.user_id}
                        participant={p}
                        onSubmit={handleSubmit}
                        submitted={submitted.has(p.user_id)}
                    />
                ))
            )}

            {/* Done button */}
            <TouchableOpacity
                style={[s.doneBtn, !allSubmitted && participants.length > 0 && s.doneBtnSecondary]}
                onPress={() => router.replace('/home')}
                activeOpacity={0.8}
            >
                <Text style={[
                    s.doneBtnText,
                    (!allSubmitted && participants.length > 0) && s.doneBtnTextSecondary,
                ]}>
                    {allSubmitted || participants.length === 0 ? '🏠 Back to Home' : 'Skip & Go Home'}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

// ── Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { paddingBottom: 56 },

    header: {
        paddingTop: Platform.OS === 'android' ? 44 : 60,
        paddingHorizontal: 20, paddingBottom: 24,
    },
    headerTitle: { color: C.text, fontSize: 26, fontWeight: '800', marginBottom: 6 },
    headerSub: { color: C.textMuted, fontSize: 14, lineHeight: 20 },

    // ── Participant card ──
    card: {
        marginHorizontal: 20, marginBottom: 16,
        backgroundColor: C.card, borderRadius: 18,
        borderWidth: 1, borderColor: C.cardBorder,
        padding: 16, gap: 12,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: C.accentDark, alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: C.accent, fontSize: 18, fontWeight: '700' },
    participantName: { color: C.text, fontSize: 16, fontWeight: '600', flex: 1 },
    submittedBadge: { color: '#4CAF82', fontSize: 13, fontWeight: '700' },

    // Stars
    starsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    star: { fontSize: 34 },
    ratingLabel: { color: C.textMuted, fontSize: 13, marginLeft: 4 },

    // Tags
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tagChip: {
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1,
        borderColor: C.cardBorder,
        backgroundColor: 'transparent',
    },
    tagChipSel: { backgroundColor: C.accentDark, borderColor: C.accent },
    tagText: { color: C.textMuted, fontSize: 13 },
    tagTextSel: { color: C.accent, fontWeight: '600' },

    // Submit per-person
    submitBtn: {
        backgroundColor: C.btnBg, borderRadius: 12,
        paddingVertical: 14, alignItems: 'center',
    },
    submitBtnOff: { backgroundColor: C.btnDisabled },
    submitBtnText: { color: C.btnText, fontSize: 15, fontWeight: '700' },

    // Empty state
    emptyCard: {
        margin: 20, backgroundColor: C.card, borderRadius: 18,
        borderWidth: 1, borderColor: C.cardBorder,
        padding: 40, alignItems: 'center', gap: 10,
    },
    emptyIcon: { fontSize: 44 },
    emptyTitle: { color: C.text, fontSize: 18, fontWeight: '700' },
    emptyBody: { color: C.textMuted, fontSize: 14, textAlign: 'center' },

    // Done button
    doneBtn: {
        margin: 20, backgroundColor: C.btnBg,
        borderRadius: 14, paddingVertical: 18, alignItems: 'center',
    },
    doneBtnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.cardBorder },
    doneBtnText: { color: C.btnText, fontSize: 16, fontWeight: '700' },
    doneBtnTextSecondary: { color: 'rgba(255,255,255,0.7)' },
});
