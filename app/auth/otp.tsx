import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { authService } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OTPScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { phone, type } = params; // type is 'login' or 'signup'

    const [otp, setOtp] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleVerifyOTP = async () => {
        if (!otp || otp.length !== 6) {
            Alert.alert('Error', 'Please enter a valid 6-digit OTP');
            return;
        }

        setLoading(true);
        try {
            // Verify OTP with backend
            const verifyResponse = await authService.verifyOTP(phone as string, otp);

            if (!verifyResponse.verified) {
                Alert.alert('Error', verifyResponse.error || 'Invalid OTP');
                return;
            }

            console.log('OTP verified successfully');

            // After OTP verification, create a temporary token
            // In production, backend should return a session token after OTP verification
            const tempToken = `verified_${phone}_${Date.now()}`;

            // Call signup or login endpoint
            let response;
            if (type === 'signup') {
                // For signup, retrieve the stored profile data
                const profileData = await AsyncStorage.getItem('signup_profile_data');

                if (profileData) {
                    console.log('Signup with profile data:', JSON.parse(profileData));
                    // TODO: Send profile data to backend in the future
                }

                response = await authService.signup({ firebase_token: tempToken });

                // Clear the temporary profile data
                await AsyncStorage.removeItem('signup_profile_data');
            } else {
                response = await authService.login({ firebase_token: tempToken });
            }

            // Store user data
            await AsyncStorage.setItem('user', JSON.stringify(response));
            await AsyncStorage.setItem('user_id', response.user_id);

            // Navigate based on verification status
            if (response.verification_status === 'VERIFIED') {
                router.replace('/(protected)/home');
            } else {
                Alert.alert(
                    type === 'signup' ? 'Account Created!' : 'Login Successful',
                    'Your account is pending admin verification. You will be notified once verified.',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.replace('/'),
                        },
                    ]
                );
            }
        } catch (error: any) {
            console.error('Error verifying OTP:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to verify OTP. Please try again.';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        try {
            const response = await authService.sendOTP(phone as string);
            Alert.alert(
                'OTP Sent!',
                `Your new OTP is: ${response.otp}\n\n(Development mode)`,
                [{ text: 'OK' }]
            );
        } catch (error: any) {
            Alert.alert('Error', 'Failed to resend OTP');
        }
    };

    return (
        <View style={styles.container}>
            {/* Background Gradient */}
            <LinearGradient
                colors={[COLORS.primaryDark, COLORS.dark, COLORS.mediumDark]}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Logo */}
            <View style={styles.logoContainer}>
                <Text style={styles.logo}>ALINGO.</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
                <Text style={styles.title}>Enter OTP</Text>
                <Text style={styles.subtitle}>
                    We've sent a code to {phone}
                </Text>

                {/* OTP Input */}
                <TextInput
                    style={styles.input}
                    placeholder="000000"
                    placeholderTextColor="#999"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                />

                {/* Verify Button */}
                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleVerifyOTP}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={COLORS.buttonText} />
                    ) : (
                        <Text style={styles.buttonText}>Verify OTP</Text>
                    )}
                </TouchableOpacity>

                {/* Resend Link */}
                <TouchableOpacity
                    style={styles.resendContainer}
                    onPress={handleResend}
                >
                    <Text style={styles.resendText}>Didn't receive code? </Text>
                    <Text style={styles.resendLink}>Resend</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    logoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        fontSize: 48,
        fontWeight: 'bold',
        color: COLORS.text,
        letterSpacing: 2,
    },
    card: {
        backgroundColor: COLORS.lightGreen,
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.xxl,
        paddingBottom: SPACING.xxl + SPACING.lg,
        minHeight: 400,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.inputText,
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.inputText,
        marginBottom: SPACING.xl,
    },
    input: {
        backgroundColor: COLORS.inputBackground,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.lg,
        fontSize: 32,
        color: COLORS.inputText,
        marginBottom: SPACING.lg,
        fontWeight: 'bold',
        textAlign: 'center',
        letterSpacing: 8,
    },
    button: {
        backgroundColor: COLORS.button,
        borderRadius: BORDER_RADIUS.md,
        paddingVertical: SPACING.md + 4,
        alignItems: 'center',
        marginTop: SPACING.md,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: COLORS.buttonText,
        fontSize: 18,
        fontWeight: '600',
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACING.lg,
    },
    resendText: {
        color: COLORS.inputText,
        fontSize: 15,
    },
    resendLink: {
        color: COLORS.primaryDark,
        fontSize: 15,
        fontWeight: 'bold',
    },
});
