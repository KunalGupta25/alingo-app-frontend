import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('userToken');
    return { Authorization: `Bearer ${token}` };
};

export const userService = {
    getMe: async () => {
        const headers = await getAuthHeader();
        const response = await api.get('/users/me', { headers });
        return response.data;
    },

    updateAvailability: async (available: boolean) => {
        const headers = await getAuthHeader();
        const response = await api.patch(
            '/users/availability',
            { available_for_ride: available },
            { headers },
        );
        return response.data;
    },

    updateLocation: async (latitude: number, longitude: number) => {
        const headers = await getAuthHeader();
        const response = await api.patch(
            '/users/location',
            { latitude, longitude },
            { headers },
        );
        return response.data;
    },
};
