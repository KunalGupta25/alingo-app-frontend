import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
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
    modalBg: '#0B2B26',
};

// ── Time picker helpers ───────────────────────────────────
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// Today's date as YYYY-MM-DD (used automatically)
const todayStr = () => new Date().toISOString().split('T')[0];

// ──────────────────────────────────────────────────────────
export default function CreateRideScreen() {
    const router = useRouter();

    // Destination
    const [destination, setDestination] = useState<{
        name: string; coordinates: [number, number];
    } | null>(null);
    const [destQuery, setDestQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);


    // Time state
    const [selHour, setSelHour] = useState(8);
    const [selMin, setSelMin] = useState(0);
    const [timeSet, setTimeSet] = useState(false);
    const [showTimeModal, setShowTimeModal] = useState(false);

    // Seats
    const [seats, setSeats] = useState(1);
    const [loading, setLoading] = useState(false);

    // ── Nominatim search ──────────────────────────────────
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
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!text.trim()) { setSuggestions([]); return; }
        debounceRef.current = setTimeout(() => searchDestination(text), 350);
    };

    const selectDest = (item: any) => {
        const name = item.display_name.split(',')[0];
        setDestination({ name, coordinates: [parseFloat(item.lon), parseFloat(item.lat)] });
        setDestQuery(name);
        setSuggestions([]);
    };

    // ── Formatted labels ──────────────────────────────────
    const timeLabel = timeSet
        ? `${String(selHour).padStart(2, '0')}:${String(selMin).padStart(2, '0')}`
        : 'Select time';

    // ── Confirm (date is always today) ────────────────────
    const isValid = !!destination && timeSet && seats >= 1;

    const handleConfirm = async () => {
        if (!isValid || !destination) return;
        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            let polyline = '';
            if (status === 'granted') {
                let pos = await Location.getLastKnownPositionAsync({});
                if (!pos) {
                    pos = await Promise.race([
                        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
                        new Promise<null>(r => setTimeout(() => r(null), 10000)),
                    ]) as any;
                }
                if (pos) {
                    polyline = await getOSRMPolyline(
                        pos.coords.latitude, pos.coords.longitude,
                        destination.coordinates[1], destination.coordinates[0],
                    );
                }
            }

            const result = await rideService.createRide({
                destination,
                ride_date: todayStr(),
                ride_time: `${String(selHour).padStart(2, '0')}:${String(selMin).padStart(2, '0')}`,
                max_seats: seats,
                route_polyline: polyline,
            });

            Alert.alert(
                '🚗 Ride Created!',
                `Your ride to ${result.destination} on ${result.ride_date} at ${result.ride_time} is now ACTIVE.`,
                [{ text: 'OK', onPress: () => router.replace('/home') }],
            );
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error ?? 'Failed to create ride.');
        } finally {
            setLoading(false);
        }
    };

    // ── Render ────────────────────────────────────────────
    return (
        <ScrollView style={s.root} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Text style={s.backText}>←</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>Create Ride</Text>
            </View>

            {/* ── Destination search ──────────────────────── */}
            <View style={s.section}>
                <Text style={s.label}>📍  Destination</Text>
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
                        <TouchableOpacity onPress={() => { setDestQuery(''); setDestination(null); setSuggestions([]); }}>
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
                                onPress={() => selectDest(item)}
                                activeOpacity={0.7}
                            >
                                <Text style={s.suggIcon}>📍</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.suggName} numberOfLines={1}>
                                        {item.display_name.split(',')[0]}
                                    </Text>
                                    <Text style={s.suggSub} numberOfLines={1}>
                                        {item.display_name.split(',').slice(1, 3).join(',')}
                                    </Text>
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


            {/* ── Time picker ─────────────────────────────── */}
            <View style={s.section}>
                <Text style={s.label}>🕐  Departure Time</Text>
                <TouchableOpacity style={s.pickerBtn} onPress={() => setShowTimeModal(true)}>
                    <Text style={[s.pickerBtnText, !timeSet && s.muted]}>{timeLabel}</Text>
                    <Text style={s.chevron}>›</Text>
                </TouchableOpacity>
            </View>

            {/* ── Seat selector ───────────────────────────── */}
            <View style={s.section}>
                <Text style={s.label}>💺  Available Seats</Text>
                <View style={s.seatsRow}>
                    <TouchableOpacity
                        style={[s.seatBtn, seats <= 1 && s.seatBtnOff]}
                        onPress={() => setSeats(v => Math.max(1, v - 1))}
                        disabled={seats <= 1}
                    >
                        <Text style={s.seatBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.seatsCount}>{seats}</Text>
                    <TouchableOpacity
                        style={[s.seatBtn, seats >= 4 && s.seatBtnOff]}
                        onPress={() => setSeats(v => Math.min(4, v + 1))}
                        disabled={seats >= 4}
                    >
                        <Text style={s.seatBtnText}>+</Text>
                    </TouchableOpacity>
                    <Text style={s.seatsHint}>max 4</Text>
                </View>
            </View>

            {/* ── Confirm ─────────────────────────────────── */}
            <TouchableOpacity
                style={[s.confirmBtn, (!isValid || loading) && s.confirmOff]}
                onPress={handleConfirm}
                disabled={!isValid || loading}
                activeOpacity={0.8}
            >
                {loading
                    ? <ActivityIndicator color={C.btnText} />
                    : <Text style={[s.confirmText, !isValid && { color: 'rgba(5,31,32,0.4)' }]}>Confirm Ride</Text>
                }
            </TouchableOpacity>

            {!isValid && (
                <Text style={s.hint}>Choose destination and departure time to continue</Text>
            )}


            {/* ── Time Modal ──────────────────────────────── */}
            <Modal visible={showTimeModal} transparent animationType="slide">
                <View style={s.modalOverlay}>
                    <View style={s.modalCard}>
                        <Text style={s.modalTitle}>Select Time</Text>

                        <View style={s.pickerRow}>
                            {/* Hour */}
                            <View style={[s.pickerCol, { flex: 1 }]}>
                                <Text style={s.colLabel}>Hour</Text>
                                <ScrollView style={s.colScroll} showsVerticalScrollIndicator={false}>
                                    {HOURS.map(h => (
                                        <TouchableOpacity key={h} style={[s.colItem, selHour === h && s.colItemSel]} onPress={() => setSelHour(h)}>
                                            <Text style={[s.colItemText, selHour === h && s.colItemTextSel]}>
                                                {String(h).padStart(2, '0')}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                            <Text style={s.timeSep}>:</Text>
                            {/* Minute */}
                            <View style={[s.pickerCol, { flex: 1 }]}>
                                <Text style={s.colLabel}>Min</Text>
                                <ScrollView style={s.colScroll} showsVerticalScrollIndicator={false}>
                                    {MINS.map(m => (
                                        <TouchableOpacity key={m} style={[s.colItem, selMin === m && s.colItemSel]} onPress={() => setSelMin(m)}>
                                            <Text style={[s.colItemText, selMin === m && s.colItemTextSel]}>
                                                {String(m).padStart(2, '0')}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        <TouchableOpacity style={s.modalConfirmBtn} onPress={() => { setTimeSet(true); setShowTimeModal(false); }}>
                            <Text style={s.modalConfirmText}>Set Time</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </ScrollView>
    );
}

// ── Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { paddingBottom: 56 },

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
        backgroundColor: 'rgba(142,182,155,0.1)', borderRadius: 10, padding: 12, gap: 8,
        borderWidth: 1, borderColor: 'rgba(142,182,155,0.25)',
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

    seatsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    seatBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accentDark, alignItems: 'center', justifyContent: 'center' },
    seatBtnOff: { opacity: 0.35 },
    seatBtnText: { color: '#fff', fontSize: 24, fontWeight: '600', lineHeight: 28 },
    seatsCount: { color: C.text, fontSize: 32, fontWeight: '700', minWidth: 36, textAlign: 'center' },
    seatsHint: { color: C.textMuted, fontSize: 12 },

    confirmBtn: { marginHorizontal: 20, marginTop: 12, backgroundColor: C.btnBg, borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
    confirmOff: { backgroundColor: C.btnDisabled },
    confirmText: { color: C.btnText, fontSize: 17, fontWeight: '700' },
    hint: { color: C.textMuted, fontSize: 13, textAlign: 'center', marginTop: 10 },

    // Modal
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
    timeSep: { color: C.accent, fontSize: 28, fontWeight: '700', alignSelf: 'center', marginTop: 24 },

    modalConfirmBtn: { backgroundColor: C.btnBg, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    modalConfirmText: { color: C.btnText, fontSize: 16, fontWeight: '700' },
});
