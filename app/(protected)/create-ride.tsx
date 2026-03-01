import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { rideService, getOSRMPolyline, decodePolyline } from '../../services/rideService';
// @ts-ignore
import DateTimePicker from '@react-native-community/datetimepicker';

const C = {
    bg: '#0b1416',
    card: '#0F3D3E',
    cardBorder: 'rgba(79, 209, 197, 0.15)',
    accent: '#4fd1c5',
    accentDark: 'rgba(79, 209, 197, 0.2)',
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.6)',
    inputBg: 'rgba(11, 20, 22, 0.5)',
    btnBg: '#A3e635',
    btnText: '#0b1416',
    divider: 'rgba(79, 209, 197, 0.12)',
    placeholder: 'rgba(255,255,255,0.4)',
};

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function CreateRideScreen() {
    const router = useRouter();

    // Destination Search
    const [destination, setDestination] = useState<{
        name: string; coordinates: [number, number];
    } | null>(null);
    const [destQuery, setDestQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [routePoints, setRoutePoints] = useState<{ latitude: number, longitude: number }[]>([]);
    const [originRegion, setOriginRegion] = useState<{ latitude: number, longitude: number } | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Departure Time
    const [timeType, setTimeType] = useState<'Now' | 'Schedule'>('Now');
    const [scheduleTime, setScheduleTime] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);

    // Seats
    const [seats, setSeats] = useState(1);

    // Gender Preference
    const [genderPref, setGenderPref] = useState<'Male' | 'Female' | 'Any'>('Any');

    const [loading, setLoading] = useState(false);

    // ── Nominatim destination search ──────────────────────
    const searchDestination = useCallback(async (text: string) => {
        if (!text.trim()) { setSuggestions([]); return; }
        setSearching(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&addressdetails=1&dedupe=1`,
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

    const selectDest = async (item: any) => {
        const name = item.display_name.split(',')[0];
        const destLat = parseFloat(item.lat);
        const destLon = parseFloat(item.lon);

        setDestination({ name, coordinates: [destLon, destLat] });
        setDestQuery(name);
        setSuggestions([]);

        // Fetch polyline for preview immediately
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                let pos = await Location.getLastKnownPositionAsync({});
                if (!pos) pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
                if (pos) {
                    setOriginRegion({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                    const polyStr = await getOSRMPolyline(pos.coords.latitude, pos.coords.longitude, destLat, destLon);
                    const pts = decodePolyline(polyStr);
                    setRoutePoints(pts);
                }
            }
        } catch (e) {
            console.log('Preview map route failed', e);
        }
    };

    // ── Submit ─────────────────────────────────────────────
    const isValid = !!destination && seats >= 1;

    const handlePostRide = async () => {
        if (!isValid || !destination) return;
        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            let polyline = '';
            if (status === 'granted') {
                let pos = await Location.getLastKnownPositionAsync({});
                if (!pos) pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
                if (pos) {
                    polyline = await getOSRMPolyline(
                        pos.coords.latitude, pos.coords.longitude,
                        destination.coordinates[1], destination.coordinates[0],
                    );
                }
            }

            // Figure out time string
            let rideTimeStr = '';
            if (timeType === 'Now') {
                const now = new Date();
                rideTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            } else {
                rideTimeStr = `${String(scheduleTime.getHours()).padStart(2, '0')}:${String(scheduleTime.getMinutes()).padStart(2, '0')}`;
            }

            const result = await rideService.createRide({
                destination,
                ride_date: todayStr(),
                ride_time: rideTimeStr,
                max_seats: seats,
                route_polyline: polyline,
                gender_preference: genderPref,
            });

            Alert.alert(
                'Ride Created!',
                `Your ride to ${result.destination} is now ACTIVE.`,
                [{ text: 'OK', onPress: () => router.replace('/home') }],
            );
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error ?? 'Failed to create ride.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={s.root}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={C.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Offer a Ride</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                {/* ── LOCATION ── */}
                <View style={s.card}>
                    <View style={s.routeRow}>
                        <View style={s.routeLine}>
                            <View style={s.dotOrigin} />
                            <View style={s.verticalLine} />
                            <View style={s.dotDest} />
                        </View>
                        <View style={s.routeInputs}>
                            <View style={s.inputWrap}>
                                <Text style={s.inputLabel}>Origin</Text>
                                <Text style={s.originDisplay}>Current Location</Text>
                            </View>
                            <View style={s.routeDivider} />
                            <View style={s.inputWrap}>
                                <Text style={s.inputLabel}>Destination</Text>
                                <TextInput
                                    style={s.destInput}
                                    placeholder="Search destination..."
                                    placeholderTextColor={C.textMuted}
                                    value={destQuery}
                                    onChangeText={handleDestChange}
                                />
                                {searching && <ActivityIndicator size="small" color={C.accent} style={s.searchSpinner} />}
                            </View>
                        </View>
                    </View>

                    {suggestions.length > 0 && (
                        <View style={s.suggBox}>
                            {suggestions.map((item, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[s.suggItem, i < suggestions.length - 1 && s.suggDivider]}
                                    onPress={() => selectDest(item)}
                                >
                                    <View>
                                        <Text style={s.suggName} numberOfLines={1}>{item.display_name.split(',')[0]}</Text>
                                        <Text style={s.suggSub} numberOfLines={1}>{item.display_name.split(',').slice(1, 3).join(',')}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* ── DEPARTURE TIME ── */}
                <View style={s.card}>
                    <Text style={s.cardTitle}>Departure Time</Text>
                    <View style={s.segmentGroup}>
                        <TouchableOpacity
                            style={[s.segmentBtn, timeType === 'Now' && s.segmentActive]}
                            onPress={() => setTimeType('Now')}
                        >
                            <Text style={[s.segmentText, timeType === 'Now' && s.segmentTextActive]}>Now</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.segmentBtn, timeType === 'Schedule' && s.segmentActive]}
                            onPress={() => setTimeType('Schedule')}
                        >
                            <Text style={[s.segmentText, timeType === 'Schedule' && s.segmentTextActive]}>Schedule</Text>
                        </TouchableOpacity>
                    </View>

                    {timeType === 'Schedule' && (
                        <TouchableOpacity style={s.timePickerBtn} onPress={() => setShowPicker(true)}>
                            <Text style={s.timePickerLabel}>Select Time</Text>
                            <Text style={s.timePickerVal}>
                                {scheduleTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </TouchableOpacity>
                    )}
                    {(showPicker && Platform.OS !== 'ios') && (
                        <DateTimePicker
                            value={scheduleTime}
                            mode="time"
                            is24Hour={true}
                            display="default"
                            onChange={(event: any, selectedDate: any) => {
                                setShowPicker(Platform.OS === 'ios');
                                if (selectedDate) setScheduleTime(selectedDate);
                            }}
                        />
                    )}
                    {(showPicker && Platform.OS === 'ios') && (
                        <View style={{ marginTop: 10 }}>
                            <DateTimePicker
                                value={scheduleTime}
                                mode="time"
                                is24Hour={true}
                                display="spinner"
                                onChange={(event: any, selectedDate: any) => selectedDate && setScheduleTime(selectedDate)}
                            />
                        </View>
                    )}
                </View>

                {/* ── SEATS ── */}
                <View style={s.card}>
                    <View style={s.rowBetween}>
                        <Text style={s.cardTitle}>Available Seats</Text>
                        <View style={s.stepper}>
                            <TouchableOpacity style={s.stepBtn} onPress={() => setSeats(Math.max(1, seats - 1))}>
                                <Text style={s.stepSymbol}>-</Text>
                            </TouchableOpacity>
                            <Text style={s.stepVal}>{seats}</Text>
                            <TouchableOpacity style={s.stepBtn} onPress={() => setSeats(Math.min(4, seats + 1))}>
                                <Text style={s.stepSymbol}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* ── GENDER PREFERENCE ── */}
                <View style={s.card}>
                    <Text style={s.cardTitle}>Gender Preference</Text>
                    <Text style={s.cardSubtitle}>Who do you prefer to ride with?</Text>
                    <View style={s.segmentGroup}>
                        {(['Male', 'Female', 'Any'] as const).map(tab => {
                            const active = genderPref === tab;
                            return (
                                <TouchableOpacity
                                    key={tab}
                                    style={[s.segmentBtn, active && s.segmentActive]}
                                    onPress={() => setGenderPref(tab)}
                                >
                                    <Text style={[s.segmentText, active && s.segmentTextActive]}>
                                        {tab === 'Any' ? '👥' : tab === 'Male' ? '♂' : '♀'} {tab}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ── ROUTE PREVIEW ── */}
                {destination && (
                    <View style={s.card}>
                        <Text style={s.cardTitle}>Route Preview</Text>
                        <Text style={s.cardSubtitle}>from Current Location to {destination.name}</Text>
                        <View style={s.mapContainer}>
                            {originRegion ? (
                                <MapView
                                    style={s.map}
                                    initialRegion={{
                                        latitude: originRegion.latitude,
                                        longitude: originRegion.longitude,
                                        latitudeDelta: 0.1,
                                        longitudeDelta: 0.1,
                                    }}
                                    showsUserLocation={true}
                                >
                                    {routePoints.length > 0 && (
                                        <Polyline
                                            coordinates={routePoints}
                                            strokeColor="#A3e635" // btnBg
                                            strokeWidth={4}
                                        />
                                    )}
                                    <Marker
                                        coordinate={{ latitude: destination.coordinates[1], longitude: destination.coordinates[0] }}
                                        pinColor={C.accent}
                                    />
                                </MapView>
                            ) : (
                                <View style={s.mapPlaceholderInner}>
                                    <ActivityIndicator color={C.accent} />
                                    <Text style={s.mapText}>Loading Route...</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

            </ScrollView>

            {/* ── POST RIDE BUTTON ── */}
            <View style={s.footer}>
                <TouchableOpacity
                    style={[s.submitBtn, (!isValid || loading) && s.submitDisabled]}
                    onPress={handlePostRide}
                    disabled={!isValid || loading}
                >
                    {loading ? (
                        <ActivityIndicator color={C.btnText} />
                    ) : (
                        <Text style={s.submitText}>Post Ride</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: Platform.OS === 'android' ? 44 : 60,
        paddingHorizontal: 20, paddingBottom: 16, backgroundColor: C.bg,
    },
    backBtn: { padding: 4 },
    backIcon: { fontSize: 26, fontWeight: '600', color: C.text },
    headerTitle: { fontSize: 20, fontWeight: '700', color: C.text },

    scroll: { padding: 20, paddingBottom: 100 },

    card: {
        backgroundColor: C.card, borderRadius: 16, padding: 18, marginBottom: 16,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 14 },
    cardSubtitle: { fontSize: 13, color: C.textMuted, marginTop: -10, marginBottom: 14 },

    routeRow: { flexDirection: 'row' },
    routeLine: { width: 30, alignItems: 'center', paddingVertical: 10 },
    dotOrigin: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent, borderWidth: 2, borderColor: C.accentDark },
    verticalLine: { flex: 1, width: 2, backgroundColor: C.divider, marginVertical: 4 },
    dotDest: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.text },

    routeInputs: { flex: 1 },
    inputWrap: { paddingVertical: 4 },
    inputLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    originDisplay: { fontSize: 15, fontWeight: '500', color: C.text, paddingVertical: 8 },
    destInput: { fontSize: 15, fontWeight: '500', color: C.text, paddingVertical: 8 },
    routeDivider: { height: 1, backgroundColor: C.divider, marginVertical: 8 },
    searchSpinner: { position: 'absolute', right: 10, top: 30 },

    suggBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: C.divider, paddingTop: 8 },
    suggItem: { paddingVertical: 12 },
    suggDivider: { borderBottomWidth: 1, borderBottomColor: C.divider },
    suggName: { fontSize: 14, fontWeight: '600', color: C.text },
    suggSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },

    segmentGroup: { flexDirection: 'row', backgroundColor: C.inputBg, borderRadius: 10, padding: 4, borderWidth: 1, borderColor: C.cardBorder },
    segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    segmentActive: { backgroundColor: C.accentDark },
    segmentText: { fontSize: 14, fontWeight: '600', color: C.textMuted },
    segmentTextActive: { color: C.text, fontWeight: '700' },

    timePickerBtn: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 16, backgroundColor: C.inputBg, padding: 16, borderRadius: 12,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    timePickerLabel: { fontSize: 14, fontWeight: '500', color: C.text },
    timePickerVal: { fontSize: 15, fontWeight: '700', color: C.accent },

    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 10, borderWidth: 1, borderColor: C.cardBorder },
    stepBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    stepSymbol: { fontSize: 20, fontWeight: '500', color: C.accent },
    stepVal: { width: 24, textAlign: 'center', fontSize: 16, fontWeight: '700', color: C.text },

    mapContainer: { height: 160, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.cardBorder, backgroundColor: C.inputBg },
    map: { width: '100%', height: '100%' },
    mapPlaceholderInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    mapText: { fontSize: 13, fontWeight: '600', color: C.textMuted },

    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: C.card, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        borderTopWidth: 1, borderTopColor: C.divider,
    },
    submitBtn: { backgroundColor: C.btnBg, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    submitDisabled: { opacity: 0.5 },
    submitText: { color: C.text, fontSize: 16, fontWeight: '700' },
});
