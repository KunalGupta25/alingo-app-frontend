// Note: Expo uses EXPO_PUBLIC_ prefix for environment variables
// that should be available in the client-side code

// Use type assertion for Expo's process.env
const getEnvVar = (key: string, defaultValue: string): string => {
    const value = (process.env as any)[key];
    return value || defaultValue;
};

export const API_BASE_URL = getEnvVar('EXPO_PUBLIC_API_BASE_URL', 'http://localhost:8000');

export const API_ENDPOINTS = {
    PING: '/ping',
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
};
