import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';

export type UserStatus = 'VERIFIED' | 'PENDING' | 'REJECTED' | 'UNVERIFIED';

export type UserData = {
    user_id: string;
    phone: string;
    profileComplete?: boolean;
    verification_status: UserStatus;
    token?: string;
    full_name?: string;
};

type AuthContextType = {
    user: UserData | null;
    isLoaded: boolean;
    signIn: (userData: UserData, token: string) => Promise<void>;
    signOut: () => Promise<void>;
    updateUser: (updates: Partial<UserData>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserData | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        // Load initial state
        const loadUser = async () => {
            try {
                const storedUser = await AsyncStorage.getItem('user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (e) {
                console.error('Failed to load user', e);
            } finally {
                setIsLoaded(true);
            }
        };
        loadUser();
    }, []);

    const signIn = async (userData: UserData, token: string) => {
        try {
            await AsyncStorage.setItem('userToken', token);
            await AsyncStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
        } catch (e) {
            console.error('Failed to sign in', e);
        }
    };

    const signOut = async () => {
        try {
            await AsyncStorage.multiRemove(['userToken', 'user', 'userId']);
            setUser(null);
            router.replace('/auth/login');
        } catch (e) {
            console.error('Failed to sign out', e);
        }
    };

    const updateUser = async (updates: Partial<UserData>) => {
        if (!user) return;
        const updatedUser = { ...user, ...updates };
        try {
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
        } catch (e) {
            console.error('Failed to update user context', e);
        }
    };

    // Route Guards Middleware
    useEffect(() => {
        if (!isLoaded) return;

        const inAuthGroup = segments[0] === 'auth';
        const inProtectedGroup = segments[0] === '(protected)';
        const isRoot = !segments.length || segments[0] === 'index';

        if (!user) {
            // Unauthenticated: Can only access root or auth group
            if (inProtectedGroup) {
                router.replace('/auth/login');
            }
        } else {
            // Authenticated: Strict routing based on state
            const isVerified = user.verification_status === 'VERIFIED';
            const isPending = user.verification_status === 'PENDING';

            // Allow them to stay on welcome page momentarily if they just opened app,
            // but normally we push them entirely to the right place.
            // If they are on an auth screen, boot them out.
            if (inAuthGroup || isRoot) {
                if (isVerified) {
                    router.replace('/(protected)/home');
                } else if (isPending) {
                    router.replace('/(protected)/verification-pending');
                } else {
                    router.replace('/(protected)/identity-verification');
                }
            } else if (inProtectedGroup) {
                // If they are in the protected zone, verify their clearance
                const currentRoute = segments.join('/');

                if (isVerified) {
                    // Fully verified: Cannot go to verification screens
                    if (currentRoute === '(protected)/identity-verification' || currentRoute === '(protected)/verification-pending') {
                        router.replace('/(protected)/home');
                    }
                } else if (isPending) {
                    // Pending verification: Must be on pending screen
                    if (currentRoute !== '(protected)/verification-pending') {
                        router.replace('/(protected)/verification-pending');
                    }
                } else {
                    // Not verified (REJECTED/UNVERIFIED): Must be on identity verification screen
                    if (currentRoute !== '(protected)/identity-verification') {
                        router.replace('/(protected)/identity-verification');
                    }
                }
            }
        }
    }, [user, segments, isLoaded]);

    return (
        <AuthContext.Provider value={{ user, isLoaded, signIn, signOut, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
