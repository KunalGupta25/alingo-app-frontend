import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { profileService, MyProfile } from '../../services/profileService';
import { COLORS as C } from '../../constants/theme';

export default function EditProfileScreen() {
    const router = useRouter();

    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Editable fields
    const [bio, setBio] = useState('');
    const [available, setAvailable] = useState(false);
    const [bioChars, setBioChars] = useState(0);
    const [saving, setSaving] = useState(false);

    const loadProfile = useCallback(async () => {
        setLoading(true);
        try {
            const p = await profileService.getMyProfile();
            setProfile(p);
            setBio(p.bio ?? '');
            setAvailable(p.available_for_ride ?? false);
            setBioChars((p.bio ?? '').length);
        } catch {
            Alert.alert('Error', 'Could not load your profile details.');
            router.back();
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await profileService.updateProfile({ bio, available_for_ride: available });
            Alert.alert('Saved', 'Your profile has been updated.', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.error ?? 'Failed to save profile changes.');
        } finally {
            setSaving(false);
        }
    };

    if (loading || !profile) {
        return (
            <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator color={C.lightGreen} size="large" />
            </View>
        );
    }

    return (
        <View style={s.root}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Text style={s.backText}>←</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>Edit Profile</Text>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

                {/* ── Read-Only Identity Info ──────────────── */}
                <View style={s.card}>
                    <Text style={s.cardTitle}>Personal Info</Text>
                    <Text style={s.cardSub}>These fields cannot be changed here.</Text>

                    <View style={s.readOnlyField}>
                        <Text style={s.fieldLabel}>Full Name</Text>
                        <Text style={s.readOnlyText}>{profile.full_name || 'Not provided'}</Text>
                    </View>

                    <View style={s.readOnlyField}>
                        <Text style={s.fieldLabel}>Phone Number</Text>
                        <Text style={s.readOnlyText}>{profile.phone || 'Not provided'}</Text>
                    </View>
                </View>

                {/* ── Editable Section ─────────────────────── */}
                <View style={[s.card, { marginTop: 16 }]}>
                    <Text style={s.cardTitle}>About You</Text>

                    <Text style={s.fieldLabel}>Bio</Text>
                    <View style={s.bioWrap}>
                        <TextInput
                            style={s.bioInput}
                            value={bio}
                            onChangeText={t => { setBio(t); setBioChars(t.length); }}
                            placeholder="Tell riders about yourself…"
                            placeholderTextColor={C.textSecondary}
                            multiline
                            maxLength={150}
                        />
                        <Text style={[s.charCount, bioChars > 130 && { color: C.error }]}>
                            {bioChars}/150
                        </Text>
                    </View>

                    <View style={s.availRow}>
                        <View style={{ flex: 1, paddingRight: 16 }}>
                            <Text style={s.fieldLabel}>Available for Ride</Text>
                            <Text style={s.fieldSub}>Let others see you're ready to ride today on the Home screen and in search results.</Text>
                        </View>
                        <Switch
                            value={available}
                            onValueChange={setAvailable}
                            trackColor={{ false: C.dark as string, true: C.lightGreen }}
                            thumbColor={available ? '#fff' : C.textSecondary as string}
                        />
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Fixed Button */}
            <View style={s.bottomBar}>
                <TouchableOpacity
                    style={[s.saveBtn, saving && { opacity: 0.6 }]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.8}
                >
                    {saving ? (
                        <ActivityIndicator color="#051F20" />
                    ) : (
                        <Text style={s.saveBtnText}>Save Changes</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.primaryDark },
    scroll: { padding: 20, paddingBottom: 40 },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? 44 : 60,
        paddingHorizontal: 20, paddingBottom: 16, gap: 16,
        backgroundColor: C.primaryDark,
        borderBottomWidth: 1, borderBottomColor: C.dark,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    backText: { color: C.lightGreen, fontSize: 26, fontWeight: '600' },
    headerTitle: { color: C.text, fontSize: 22, fontWeight: '700' },

    card: {
        backgroundColor: C.mediumDark,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: C.dark,
        padding: 20,
    },
    cardTitle: { color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
    cardSub: { color: C.textSecondary, fontSize: 13, marginBottom: 16 },

    readOnlyField: {
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: C.dark,
        paddingBottom: 12,
    },
    readOnlyText: { color: C.text, fontSize: 16, marginTop: 4, fontWeight: '500' },

    fieldLabel: { color: C.lightGreen, fontSize: 13, fontWeight: '700', marginBottom: 8, letterSpacing: 0.4 },
    fieldSub: { color: C.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 18 },

    bioWrap: { backgroundColor: C.dark, borderRadius: 12, padding: 12, gap: 6, marginBottom: 20 },
    bioInput: { color: C.text, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
    charCount: { color: C.textSecondary, fontSize: 11, textAlign: 'right' },

    availRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

    bottomBar: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        backgroundColor: C.primaryDark,
        borderTopWidth: 1,
        borderTopColor: C.dark,
    },
    saveBtn: {
        backgroundColor: C.lightGreen,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveBtnText: { color: '#051F20', fontSize: 16, fontWeight: '700' },
});
