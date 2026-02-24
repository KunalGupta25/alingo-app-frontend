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

// ── Ride API ──────────────────────────────────────────────
export const rideService = {
    createRide: async (payload: {
        destination: { name: string; coordinates: [number, number] };
        ride_date: string;
        ride_time: string;
        max_seats: number;
        route_polyline: string;
    }) => {
        const headers = await getAuthHeader();
        const response = await api.post('/rides/create', payload, { headers });
        return response.data;
    },

    searchRides: async (payload: {
        user_location: [number, number];   // [lng, lat]
        ride_date: string;             // 'YYYY-MM-DD'
        route_polyline: string;
    }) => {
        const headers = await getAuthHeader();
        const response = await api.post('/rides/search', payload, { headers });
        return response.data as Array<{
            ride_id: string;
            creator_name: string;
            creator_rating: number;
            distance_meters: number;
            available_seats: number;
            ride_time: string;
            destination_name: string;
        }>;
    },
};

