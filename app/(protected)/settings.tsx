import React, { useState, useEffect, useCallback } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';

// ── Palette (matches app theme) ──────────────────────────
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
    danger: '#E07070',
    inputBg: 'rgba(11, 20, 22, 0.5)',
    switchTrack: '#1a4a4c',
    switchTrackActive: '#3d9e8f',
};

// ── Section Header ───────────────────────────────────────
const SectionHeader = ({ title }: { title: string }) => (
    <Text style={s.sectionHeader}>{title}</Text>
);

// ── Row Component ────────────────────────────────────────
type RowProps = {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    rightText?: string;
    onPress?: () => void;
    showChevron?: boolean;
    toggle?: { value: boolean; onToggle: (val: boolean) => void };
    danger?: boolean;
};

const SettingsRow = ({ icon, label, rightText, onPress, showChevron = true, toggle, danger }: RowProps) => (
    <TouchableOpacity
        style={s.row}
        onPress={toggle ? undefined : onPress}
        activeOpacity={toggle ? 1 : 0.6}
        disabled={!onPress && !toggle}
    >
        <View style={[s.iconWrap, danger && { backgroundColor: 'rgba(224, 112, 112, 0.15)' }]}>
            <Ionicons name={icon} size={20} color={danger ? C.danger : C.accent} />
        </View>
        <Text style={[s.rowLabel, danger && { color: C.danger }]}>{label}</Text>
        <View style={s.rowRight}>
            {rightText && <Text style={s.rowRightText}>{rightText}</Text>}
            {toggle ? (
                <Switch
                    value={toggle.value}
                    onValueChange={toggle.onToggle}
                    trackColor={{ false: C.switchTrack, true: C.switchTrackActive }}
                    thumbColor={toggle.value ? C.accent : '#6b8a8d'}
                />
            ) : showChevron ? (
                <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
            ) : null}
        </View>
    </TouchableOpacity>
);

// ── Screen ───────────────────────────────────────────────
export default function SettingsScreen() {
    const router = useRouter();
    const { user, signOut } = useAuth();

    const [profile, setProfile] = useState<{ full_name?: string; phone?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [pushNotifs, setPushNotifs] = useState(true);

    const loadProfile = useCallback(async () => {
        setLoading(true);
        try {
            const p = await profileService.getMyProfile();
            setProfile(p);
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadProfile(); }, [loadProfile]);

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: () => signOut() },
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This action is permanent and cannot be undone. All your data will be deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: () => Alert.alert('Contact Support', 'Please contact support to delete your account.'),
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

    return (
        <View style={s.root}>
            {/* ── Header ── */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={C.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Settings</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Profile Card ── */}
                <View style={s.profileCard}>
                    <View style={s.avatar}>
                        <Ionicons name="person" size={28} color={C.accent} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={s.profileName}>{profile?.full_name || 'Alingo User'}</Text>
                        <Text style={s.profileSub}>{user?.phone || ''}</Text>
                    </View>
                </View>
                <TouchableOpacity style={s.editProfileBtn} onPress={() => router.push('/edit-profile')}>
                    <Text style={s.editProfileText}>Edit Profile</Text>
                </TouchableOpacity>

                {/* ── ACCOUNT ── */}
                <SectionHeader title="ACCOUNT" />
                <View style={s.card}>
                    <SettingsRow icon="card-outline" label="Payment Methods" onPress={() => Alert.alert('Coming Soon', 'Payment methods will be available in a future update.')} />
                    <View style={s.rowDivider} />
                    <SettingsRow icon="time-outline" label="Ride History" onPress={() => router.push('/profile')} />
                </View>

                {/* ── PREFERENCES ── */}
                <SectionHeader title="PREFERENCES" />
                <View style={s.card}>
                    <SettingsRow
                        icon="notifications-outline"
                        label="Push Notifications"
                        showChevron={false}
                        toggle={{ value: pushNotifs, onToggle: setPushNotifs }}
                    />
                    <View style={s.rowDivider} />
                    <SettingsRow icon="map-outline" label="Map & Navigation" onPress={() => Alert.alert('Coming Soon', 'Map preferences coming in a future update.')} />
                    <View style={s.rowDivider} />
                    <SettingsRow icon="globe-outline" label="Language" rightText="English" onPress={() => Alert.alert('Language', 'Only English is supported currently.')} />
                </View>

                {/* ── SECURITY & PRIVACY ── */}
                <SectionHeader title="SECURITY & PRIVACY" />
                <View style={s.card}>
                    <SettingsRow icon="lock-closed-outline" label="Change Password" onPress={() => Alert.alert('Coming Soon', 'Password management coming in a future update.')} />
                    <View style={s.rowDivider} />
                    <SettingsRow icon="shield-checkmark-outline" label="Two-Factor Authentication" onPress={() => Alert.alert('Coming Soon', '2FA coming in a future update.')} />
                    <View style={s.rowDivider} />
                    <SettingsRow icon="eye-off-outline" label="Privacy Settings" onPress={() => Alert.alert('Coming Soon', 'Privacy controls coming in a future update.')} />
                </View>

                {/* ── SUPPORT & LEGAL ── */}
                <SectionHeader title="SUPPORT & LEGAL" />
                <View style={s.card}>
                    <SettingsRow icon="help-circle-outline" label="Help Center" onPress={() => Alert.alert('Help', 'Contact us at support@alingo.app')} />
                    <View style={s.rowDivider} />
                    <SettingsRow icon="headset-outline" label="Contact Support" onPress={() => Linking.openURL('mailto:support@alingo.app')} />
                    <View style={s.rowDivider} />
                    <SettingsRow icon="document-text-outline" label="Terms & Privacy Policy" onPress={() => Alert.alert('Terms', 'Terms of Service and Privacy Policy will be available soon.')} />
                </View>

                {/* ── Log Out ── */}
                <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
                    <Ionicons name="log-out-outline" size={20} color={C.text} style={{ marginRight: 8 }} />
                    <Text style={s.logoutText}>Log Out</Text>
                </TouchableOpacity>

                {/* ── Delete Account ── */}
                <TouchableOpacity style={s.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.7}>
                    <Text style={s.deleteText}>Delete Account</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: Platform.OS === 'android' ? 44 : 60,
        paddingHorizontal: 20, paddingBottom: 16, backgroundColor: C.bg,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: C.text },
    scroll: { paddingHorizontal: 20, paddingBottom: 40 },

    // Profile Card
    profileCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.card, borderRadius: 16, padding: 18,
        borderWidth: 1, borderColor: C.cardBorder, marginBottom: 12,
    },
    avatar: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: C.accentDark, alignItems: 'center', justifyContent: 'center',
    },
    profileName: { fontSize: 18, fontWeight: '700', color: C.text },
    profileSub: { fontSize: 13, color: C.textMuted, marginTop: 2 },
    editProfileBtn: {
        backgroundColor: C.card, borderRadius: 12, paddingVertical: 13,
        alignItems: 'center', borderWidth: 1, borderColor: C.accent, marginBottom: 24,
    },
    editProfileText: { fontSize: 15, fontWeight: '700', color: C.accent },

    // Section
    sectionHeader: {
        fontSize: 12, fontWeight: '700', color: C.accent, letterSpacing: 1.2,
        marginBottom: 10, marginTop: 8, paddingLeft: 4,
    },

    // Card
    card: {
        backgroundColor: C.card, borderRadius: 16, overflow: 'hidden',
        borderWidth: 1, borderColor: C.cardBorder, marginBottom: 20,
    },

    // Row
    row: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 15, paddingHorizontal: 16,
    },
    iconWrap: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: C.accentDark, alignItems: 'center', justifyContent: 'center',
        marginRight: 14,
    },
    rowLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: C.text },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rowRightText: { fontSize: 14, color: C.accent, fontWeight: '500' },
    rowDivider: { height: 1, backgroundColor: C.divider, marginLeft: 66 },

    // Logout
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: C.card, borderRadius: 14, paddingVertical: 16,
        borderWidth: 1, borderColor: C.cardBorder, marginTop: 8,
    },
    logoutText: { fontSize: 16, fontWeight: '700', color: C.text },

    // Delete
    deleteBtn: { alignItems: 'center', marginTop: 16 },
    deleteText: { fontSize: 15, fontWeight: '600', color: C.danger },
});
