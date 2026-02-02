// Note: Expo uses EXPO_PUBLIC_ prefix for environment variables
// that should be available in the client-side code

import { Platform } from 'react-native';

const getEnvVar = (key: string, defaultValue: string): string => {
    // @ts-ignore
    const value = process.env[key];
    return value || defaultValue;
};

// Android emulator requires 10.0.2.2 to access localhost
const LOCALHOST = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export const API_BASE_URL = getEnvVar('EXPO_PUBLIC_API_BASE_URL', LOCALHOST);

export const API_ENDPOINTS = {
    PING: '/ping',
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
};
