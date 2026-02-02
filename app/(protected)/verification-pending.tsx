import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { verificationService } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VerificationPendingScreen() {
    useEffect(() => {
        checkStatus();

        // Check status every 30 seconds
        const interval = setInterval(checkStatus, 30000);

        return () => clearInterval(interval);
    }, []);

    const checkStatus = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            if (!token) {
                router.replace('/auth/otp');
                return;
            }

            const { verification_status, rejection_reason } = await verificationService.getStatus(token);

            if (verification_status === 'VERIFIED') {
                // User is verified, navigate to home
                router.replace('/(protected)/home');
            } else if (verification_status === 'REJECTED') {
                // User was rejected, navigate back to verification with error
                router.replace({
                    pathname: '/(protected)/identity-verification',
                    params: { rejected: 'true', reason: rejection_reason },
                });
            } else if (verification_status === 'UNVERIFIED') {
                // User has not submitted verification yet
                router.replace('/(protected)/identity-verification');
            }
            // If PENDING, stay on this screen
        } catch (error) {
            console.error('Status check failed:', error);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>⏳</Text>
                </View>

                <Text style={styles.title}>Verification Pending</Text>

                <Text style={styles.subtitle}>
                    Your identity is under review
                </Text>

                <Text style={styles.info}>
                    Our team is reviewing your submitted documents. This usually takes 24-48 hours.
                    You'll be notified once verified.
                </Text>

                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#9eff00" />
                    <Text style={styles.loaderText}>Checking status...</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    icon: {
        fontSize: 60,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
        marginBottom: 16,
        textAlign: 'center',
    },
    info: {
        fontSize: 15,
        color: '#999',
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 320,
    },
    loaderContainer: {
        marginTop: 40,
        alignItems: 'center',
    },
    loaderText: {
        marginTop: 12,
        fontSize: 14,
        color: '#999',
    },
});
