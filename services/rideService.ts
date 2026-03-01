import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('userToken');
    return { Authorization: `Bearer ${token}` };
};

// ── OSRM free routing (no API key) ───────────────────────
export const getOSRMPolyline = async (
    startLat: number, startLng: number,
    destLat: number, destLng: number,
): Promise<string> => {
    try {
        const url =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${startLng},${startLat};${destLng},${destLat}` +
            `?overview=full&geometries=polyline`;

        const res = await fetch(url, {
            headers: { 'User-Agent': 'AlingoApp/1.0' },
        });
        const data = await res.json();

        if (data.code === 'Ok' && data.routes?.length) {
            return data.routes[0].geometry;   // encoded polyline string
        }
        return '';
    } catch {
        return '';   // polyline is optional - don't fail ride creation
    }
};

// ── Decode OSRM polyline string to Coordinates array ──────
export const decodePolyline = (t: string, e: number = 5): { latitude: number, longitude: number }[] => {
    let n = 0, o = 0, s = 0, l = 0, r = 0, h = t.length, i: { latitude: number, longitude: number }[] = [], d = Math.pow(10, e);

    // Extracted out variables for TS compiler happiness
    let latOffset = 0;
    let lngOffset = 0;

    for (; s < h;) {
        for (r = 0, l = 0; n = t.charCodeAt(s++) - 63, l |= (31 & n) << r, r += 5, n >= 32;);
        let a = 1 & l ? ~(l >> 1) : l >> 1; latOffset += a;
        for (r = 0, l = 0; n = t.charCodeAt(s++) - 63, l |= (31 & n) << r, r += 5, n >= 32;);
        let c = 1 & l ? ~(l >> 1) : l >> 1; lngOffset += c;

        i.push({ latitude: latOffset / d, longitude: lngOffset / d });
    }
    return i;
};

// ── Ride API ──────────────────────────────────────────────
export const rideService = {
    createRide: async (payload: {
        destination: { name: string; coordinates: [number, number] };
        ride_date: string;
        ride_time: string;
        max_seats: number;
        route_polyline: string;
        gender_preference?: string;
    }) => {
        const headers = await getAuthHeader();
        const response = await api.post('/rides/create', payload, { headers });
        return response.data;
    },

    searchRides: async (payload: {
        user_location: [number, number];
        ride_date: string;
        route_polyline: string;
        gender_filter?: string;
    }) => {
        const headers = await getAuthHeader();
        const response = await api.post('/rides/search', payload, { headers });
        return response.data as Array<{
            ride_id: string;
            creator_id: string;
            creator_name: string;
            creator_rating: number;
            distance_meters: number;
            available_seats: number;
            ride_time: string;
            destination_name: string;
        }>;
    },

    requestRide: async (ride_id: string) => {
        const headers = await getAuthHeader();
        const response = await api.post('/rides/request', { ride_id }, { headers });
        return response.data as { message: string };
    },

    respondRide: async (ride_id: string, user_id: string, action: 'APPROVE' | 'REJECT') => {
        const headers = await getAuthHeader();
        const response = await api.post('/rides/respond', { ride_id, user_id, action }, { headers });
        return response.data as { message: string };
    },

    completeRide: async (ride_id: string) => {
        const headers = await getAuthHeader();
        const response = await api.post('/rides/complete', { ride_id }, { headers });
        return response.data as { message: string; status?: string; votes?: number; needed?: number };
    },

    cancelRide: async (ride_id: string) => {
        const headers = await getAuthHeader();
        const response = await api.post('/rides/cancel', { ride_id }, { headers });
        return response.data as { message: string };
    },

    getMyActiveRide: async () => {
        const headers = await getAuthHeader();
        const response = await api.get('/rides/my-active', { headers });
        return response.data as {
            ride: null | {
                ride_id: string;
                ride_time: string;
                destination_name: string;
                max_seats: number;
                participants: Array<{ user_id: string; name: string; phone?: string; status: string }>;
                completion_votes: number;
                majority_needed: number;
                is_creator: boolean;
                creator_id: string;
                route_polyline?: string;
            };
        };
    },

    getMyRequests: async () => {
        const headers = await getAuthHeader();
        const response = await api.get('/rides/my-requests', { headers });
        return response.data as {
            requests: Array<{
                ride_id: string;
                ride_time: string;
                destination_name: string;
                creator_name: string;
                creator_id: string;
                my_status: 'PENDING' | 'APPROVED' | 'REJECTED';
            }>;
        };
    },

    getRideDetail: async (ride_id: string) => {
        const headers = await getAuthHeader();
        const response = await api.get('/rides/detail', { headers, params: { ride_id } });
        return response.data as {
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
    },
};


