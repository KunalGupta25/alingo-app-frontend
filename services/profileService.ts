import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('userToken');
    return { Authorization: `Bearer ${token}` };
};

export type MyProfile = {
    user_id: string;
    phone: string;
    full_name: string;
    bio: string;
    rating: number;
    total_buddy_matches: number;
    available_for_ride: boolean;
    verification_status: string;
    rides_completed: number;
    reviews_count: number;
};

export type RideHistoryItem = {
    ride_id: string;
    destination_name: string;
    ride_date: string;
    ride_time: string;
    status: string;
    participant_count: number;
    role: string;
};

export type ReviewItem = {
    rating: number;
    tags: string[];
    created_at: string;
    reviewer_name: string;
};

export type PublicProfile = {
    user_id: string;
    full_name: string;
    rating: number;
    total_buddy_matches: number;
    verification_status: string;
    rides_completed: number;
    reviews_count: number;
};

export const profileService = {
    getMyProfile: async (): Promise<MyProfile> => {
        const headers = await getAuthHeader();
        const res = await api.get('/users/me', { headers });
        return res.data;
    },

    updateProfile: async (data: { bio?: string; available_for_ride?: boolean }) => {
        const headers = await getAuthHeader();
        const res = await api.patch('/users/profile', data, { headers });
        return res.data as { message: string };
    },

    getMyRides: async (): Promise<{ created: RideHistoryItem[]; joined: RideHistoryItem[] }> => {
        const headers = await getAuthHeader();
        const res = await api.get('/users/me/rides', { headers });
        return res.data;
    },

    getPublicProfile: async (user_id: string): Promise<PublicProfile> => {
        const headers = await getAuthHeader();
        const res = await api.get(`/users/${user_id}`, { headers });
        return res.data;
    },

    getUserReviews: async (user_id: string, limit = 5, offset = 0): Promise<{ reviews: ReviewItem[]; total: number }> => {
        const headers = await getAuthHeader();
        const res = await api.get(`/users/${user_id}/reviews`, { headers, params: { limit, offset } });
        return res.data;
    },
};
