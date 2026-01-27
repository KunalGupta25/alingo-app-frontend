import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/config';
import { SignupRequest, LoginRequest, AuthResponse } from '../types';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// API Services
export const authService = {
    ping: async () => {
        const response = await api.get(API_ENDPOINTS.PING);
        return response.data;
    },

    sendOTP: async (phone: string) => {
        const response = await api.post('/auth/otp/send', { phone });
        return response.data;
    },

    verifyOTP: async (phone: string, otp: string) => {
        const response = await api.post('/auth/otp/verify', { phone, otp });
        return response.data;
    },

    signup: async (data: { firebase_token: string }) => {
        const response = await api.post(API_ENDPOINTS.SIGNUP, data);
        return response.data;
    },

    login: async (data: { firebase_token: string }) => {
        const response = await api.post(API_ENDPOINTS.LOGIN, data);
        return response.data;
    },
};

export default api;
