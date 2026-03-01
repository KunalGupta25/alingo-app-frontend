import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { rideService, decodePolyline } from '../../services/rideService';

// ── Palette ──────────────────────────────────────────────
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
    approved: '#4CAF82',
    pending: '#F4C430',
    rejected: '#E07070',
};

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: '#4CAF82',
    COMPLETED: C.accent,
    CANCELLED: C.danger,
    APPROVED: '#4CAF82',
    PENDING: '#F4C430',
    REJECTED: '#E07070',
};

type RideDetail = {
    ride_id: string;
    status: string;
    destination_name: string;
    destination_coords: number[];
    ride_date: string;
    ride_time: string;
    max_seats: number;
    route_polyline: string;
    creator_id: string;
    creator_name: string;
    participants: Array<{ user_id: string; name: string; phone?: string; status: string }>;
    gender_preference: string;
    created_at: string;
};

export default function RideDetailsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { ride_id } = useLocalSearchParams<{ ride_id: string }>();

    const [ride, setRide] = useState<RideDetail | null>(null);
    const [routePoints, setRoutePoints] = useState<{ latitude: number; longitude: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!ride_id) return;
        (async () => {
            try {
                const data = await rideService.getRideDetail(ride_id);
                setRide(data);
                if (data.route_polyline) {
                    setRoutePoints(decodePolyline(data.route_polyline));
                }
            } catch {
                Alert.alert('Error', 'Could not load ride details.');
                router.back();
            } finally {
                setLoading(false);
            }
        })();
    }, [ride_id]);

    if (loading || !ride) {
        return (
            <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator color={C.accent} size="large" />
            </View>
        );
    }

    const approvedParticipants = ride.participants.filter(p => p.status === 'APPROVED');

    return (
        <View style={s.root}>
            {/* ── Header ── */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={C.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Ride Details</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Status Badge ── */}
                <View style={s.statusRow}>
                    <View style={[s.statusBadge, { borderColor: STATUS_COLORS[ride.status] || C.cardBorder }]}>
                        <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[ride.status] || C.textMuted }]} />
                        <Text style={[s.statusText, { color: STATUS_COLORS[ride.status] || C.textMuted }]}>{ride.status}</Text>
                    </View>
                    <Text style={s.rideIdText}>#{ride.ride_id.slice(-6).toUpperCase()}</Text>
                </View>

                {/* ── Destination Card ── */}
                <View style={s.card}>
                    <View style={s.infoRow}>
                        <Ionicons name="location" size={22} color={C.accent} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={s.infoLabel}>DESTINATION</Text>
                            <Text style={s.infoValue}>{ride.destination_name}</Text>
                        </View>
                    </View>

                    <View style={s.cardDivider} />

                    <View style={{ flexDirection: 'row', gap: 20 }}>
                        <View style={s.infoRow}>
                            <Ionicons name="calendar-outline" size={20} color={C.accent} />
                            <View style={{ marginLeft: 10 }}>
                                <Text style={s.infoLabel}>DATE</Text>
                                <Text style={s.infoValue}>{ride.ride_date}</Text>
                            </View>
                        </View>
                        <View style={s.infoRow}>
                            <Ionicons name="time-outline" size={20} color={C.accent} />
                            <View style={{ marginLeft: 10 }}>
                                <Text style={s.infoLabel}>TIME</Text>
                                <Text style={s.infoValue}>{ride.ride_time}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={s.cardDivider} />

                    <View style={{ flexDirection: 'row', gap: 20 }}>
                        <View style={s.infoRow}>
                            <Ionicons name="people-outline" size={20} color={C.accent} />
                            <View style={{ marginLeft: 10 }}>
                                <Text style={s.infoLabel}>MAX SEATS</Text>
                                <Text style={s.infoValue}>{ride.max_seats}</Text>
                            </View>
                        </View>
                        <View style={s.infoRow}>
                            <Ionicons name="male-female-outline" size={20} color={C.accent} />
                            <View style={{ marginLeft: 10 }}>
                                <Text style={s.infoLabel}>PREFERENCE</Text>
                                <Text style={s.infoValue}>{ride.gender_preference}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── Route Map ── */}
                {routePoints.length > 0 && (
                    <View style={s.card}>
                        <Text style={s.sectionTitle}>Route</Text>
                        <View style={s.mapContainer}>
                            <MapView
                                style={s.map}
                                initialRegion={{
                                    latitude: routePoints[Math.floor(routePoints.length / 2)].latitude,
                                    longitude: routePoints[Math.floor(routePoints.length / 2)].longitude,
                                    latitudeDelta: 0.08,
                                    longitudeDelta: 0.08,
                                }}
                                scrollEnabled={false}
                                zoomEnabled={false}
                                pitchEnabled={false}
                                rotateEnabled={false}
                            >
                                <Marker coordinate={routePoints[0]} pinColor={C.btnBg} title="Start" />
                                <Marker coordinate={routePoints[routePoints.length - 1]} pinColor={C.accent} title="Destination" />
                                <Polyline
                                    coordinates={routePoints}
                                    strokeColor={C.btnBg}
                                    strokeWidth={4}
                                    geodesic
                                />
                            </MapView>
                        </View>
                    </View>
                )}

                {/* ── Creator ── */}
                <View style={s.card}>
                    <Text style={s.sectionTitle}>Created By</Text>
                    <TouchableOpacity
                        style={s.participantRow}
                        onPress={() => ride.creator_id !== user?.user_id && router.push({ pathname: '/public-profile', params: { user_id: ride.creator_id } })}
                        activeOpacity={ride.creator_id === user?.user_id ? 1 : 0.6}
                    >
                        <View style={s.participantAvatar}>
                            <Ionicons name="person" size={20} color="#E6F4F1" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.participantName}>
                                {ride.creator_id === user?.user_id ? 'You' : ride.creator_name}
                            </Text>
                            <Text style={s.participantRole}>Creator</Text>
                        </View>
                        {ride.creator_id !== user?.user_id && (
                            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                        )}
                    </TouchableOpacity>
                </View>

                {/* ── Participants ── */}
                <View style={s.card}>
                    <Text style={s.sectionTitle}>Participants ({approvedParticipants.length})</Text>
                    {approvedParticipants.length > 0 ? (
                        approvedParticipants.map((p, idx) => (
                            <React.Fragment key={p.user_id}>
                                {idx > 0 && <View style={s.cardDivider} />}
                                <TouchableOpacity
                                    style={s.participantRow}
                                    onPress={() => p.user_id !== user?.user_id && router.push({ pathname: '/public-profile', params: { user_id: p.user_id } })}
                                    activeOpacity={p.user_id === user?.user_id ? 1 : 0.6}
                                >
                                    <View style={s.participantAvatar}>
                                        <Ionicons name="person" size={20} color="#E6F4F1" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.participantName}>
                                            {p.user_id === user?.user_id ? 'You' : (p.name?.replace(/^\/+/, '') || 'Unknown')}
                                        </Text>
                                        <Text style={s.participantRole}>Passenger</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        {p.user_id !== user?.user_id && p.phone && (
                                            <TouchableOpacity
                                                onPress={() => Linking.openURL(`tel:${p.phone}`)}
                                                style={s.callBtn}
                                            >
                                                <Ionicons name="call" size={16} color={C.btnText} />
                                            </TouchableOpacity>
                                        )}
                                        {p.user_id !== user?.user_id && (
                                            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </React.Fragment>
                        ))
                    ) : (
                        <Text style={s.emptyText}>No participants joined this ride.</Text>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

// ── Styles ───────────────────────────────────────────────
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

    // Status
    statusRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
    },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
        borderWidth: 1.5,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
    rideIdText: { fontSize: 13, fontWeight: '600', color: C.textMuted },

    // Card
    card: {
        backgroundColor: C.card, borderRadius: 16, padding: 18,
        borderWidth: 1, borderColor: C.cardBorder, marginBottom: 16,
    },
    cardDivider: { height: 1, backgroundColor: C.divider, marginVertical: 14 },

    // Info
    infoRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    infoLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8 },
    infoValue: { fontSize: 15, fontWeight: '600', color: C.text, marginTop: 2 },

    // Section Title
    sectionTitle: { fontSize: 14, fontWeight: '700', color: C.accent, marginBottom: 14, letterSpacing: 0.5 },

    // Map
    mapContainer: {
        height: 180, borderRadius: 12, overflow: 'hidden',
        borderWidth: 1, borderColor: C.cardBorder,
    },
    map: { width: '100%', height: '100%' },

    // Participants
    participantRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    participantAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: C.accentDark, alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
    },
    participantName: { fontSize: 15, fontWeight: '600', color: C.text },
    participantRole: { fontSize: 12, color: C.textMuted, marginTop: 1 },
    callBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: C.btnBg, alignItems: 'center', justifyContent: 'center',
    },
    emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center', paddingVertical: 12 },
});
