import { initializeApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper to safely access Expo environment variables
const getEnvVar = (key: string, defaultValue: string = ''): string => {
    const value = (process.env as any)[key];
    return value || defaultValue;
};

// Firebase configuration from environment variables
// Note: Expo requires EXPO_PUBLIC_ prefix for client-accessible env vars
export const firebaseConfig = {
    apiKey: getEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY'),
    authDomain: getEnvVar('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnvVar('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: getEnvVar('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnvVar('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnvVar('EXPO_PUBLIC_FIREBASE_APP_ID'),
    measurementId: getEnvVar('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID'),
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with React Native persistence
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
export const db = getFirestore(app);

// Note: For React Native with Expo, Firebase Phone Auth works best on web
// For native devices, you'll need to configure reCAPTCHA or use a custom backend
