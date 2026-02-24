import { Stack } from 'expo-router';

import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
    return (
        <AuthProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="auth/login" />
                <Stack.Screen name="auth/signup" />
                <Stack.Screen name="auth/otp" />
                <Stack.Screen name="(protected)/home" />
                <Stack.Screen name="(protected)/create-ride" />
                <Stack.Screen name="(protected)/find-buddy" />
                <Stack.Screen name="(protected)/review" />
                <Stack.Screen name="(protected)/profile" />
                <Stack.Screen name="(protected)/public-profile" />
                <Stack.Screen name="(protected)/identity-verification" />
                <Stack.Screen name="(protected)/verification-pending" />
            </Stack>
        </AuthProvider>
    );
}
