import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('userToken');
    return { Authorization: `Bearer ${token}` };
};

export const reviewService = {
    createReview: async (payload: {
        ride_id: string;
        reviewee_id: string;
        rating: number;   // 1-5
        tags: string[];
    }) => {
        const headers = await getAuthHeader();
        const response = await api.post('/reviews/create', payload, { headers });
        return response.data as { message: string };
    },
};
