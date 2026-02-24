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

    sendOTP: async (phone: string, type: 'login' | 'signup' = 'login') => {
        const response = await api.post('/auth/otp/send', { phone, type });
        return response.data;
    },

    verifyOTP: async (phone: string, otp: string, profileData?: any) => {
        const response = await api.post('/auth/otp/verify', { phone, otp, ...profileData });
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

// Verification Services
export const verificationService = {
    submitVerification: async (data: {
        documentType: string;
        documentImage: { uri: string; type: string; name: string };
        faceImage: { uri: string; type: string; name: string };
        token: string;
    }) => {
        const formData = new FormData();
        formData.append('document_type', data.documentType);
        formData.append('document_image', data.documentImage as any);
        formData.append('face_image', data.faceImage as any);

        const response = await api.post('/api/verification/submit', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${data.token}`,
            },
        });
        return response.data;
    },

    getStatus: async (token: string) => {
        const response = await api.get('/api/verification/status', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return response.data;
    },
};

export default api;
