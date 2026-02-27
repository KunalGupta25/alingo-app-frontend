import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { authService } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlert from '../../components/CustomAlert';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../context/AuthContext';

export default function OTPScreen() {
    const router = useRouter();
    const { signIn } = useAuth();
    const params = useLocalSearchParams();
    const { phone, type } = params;

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const inputs = useRef<Array<TextInput | null>>([]);
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const startCountdown = useCallback(() => {
        setCountdown(30);
        const tick = () => {
            setCountdown(prev => {
                if (prev <= 1) return 0;
                countdownRef.current = setTimeout(tick, 1000);
                return prev - 1;
            });
        };
        countdownRef.current = setTimeout(tick, 1000);
    }, []);

    useEffect(() => () => { if (countdownRef.current) clearTimeout(countdownRef.current); }, []);
    const [alert, setAlert] = useState<{
        visible: boolean;
        type: 'success' | 'error' | 'info';
        title: string;
        message: string;
        onConfirm?: () => void;
    }>({
        visible: false,
        type: 'info',
        title: '',
        message: '',
    });

    const showAlert = (type: 'success' | 'error' | 'info', title: string, message: string, onConfirm?: () => void) => {
        setAlert({ visible: true, type, title, message, onConfirm });
    };

    const handleOtpChange = (text: string, index: number) => {
        // Handle paste: if more than 1 char spread digits across remaining cells
        if (text.length > 1) {
            const digits = text.replace(/[^0-9]/g, '').slice(0, 6);
            const newOtp = [...otp];
            for (let i = 0; i < digits.length && index + i < 6; i++) {
                newOtp[index + i] = digits[i];
            }
            setOtp(newOtp);
            const lastFilled = Math.min(index + digits.length, 5);
            inputs.current[lastFilled]?.focus();
            return;
        }
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        if (text && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleResend = async () => {
        if (countdown > 0 || resendLoading) return;
        setResendLoading(true);
        try {
            const response = await authService.sendOTP(phone as string, type as 'login' | 'signup');
            showAlert('success', 'OTP Resent', `New code: ${response.otp}`);
            startCountdown();
        } catch (err: any) {
            showAlert('error', 'Resend Failed', err?.response?.data?.error ?? 'Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    const verifyOtp = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            showAlert('error', 'Invalid OTP', 'Please enter a valid 6-digit verification code');
            return;
        }

        setLoading(true);
        Keyboard.dismiss();

        try {
            console.log('Verifying OTP for:', phone, otpString);

            // If signup, we might need to send profile data? 
            // The previous implementation likely sent profile data during signup OR verified OTP first.
            // Assuming standard flow: Verify OTP -> Receive Token -> Update Profile if needed or just login.

            // However, looking at the previous session, signup stored data in AsyncStorage 'signup_profile_data'
            // We should probably check that.

            let profileData = null;
            if (type === 'signup') {
                const storedData = await AsyncStorage.getItem('signup_profile_data');
                if (storedData) {
                    profileData = JSON.parse(storedData);
                }
            }

            const response = await authService.verifyOTP(
                phone as string,
                otpString,
                // Pass profile data if it's signup? The API service likely handles this or we need to modify it.
                // Assuming verifyOTP signature is verifyOTP(phone, code, profileData?)
                profileData
            );

            console.log('Verification successful:', response);

            if (response.token) {
                await signIn(response, response.token);
            }

            showAlert('success', 'Success', 'Phone number verified successfully!');

        } catch (error: any) {
            console.error('Error verifying OTP:', error);
            const errorMessage = error.response?.data?.error || 'Failed to verify OTP. Please try again.';
            showAlert('error', 'Verification Failed', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenWrapper scrollable>
            <LinearGradient
                colors={[COLORS.primaryDark, COLORS.dark, COLORS.mediumDark]}
                style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.logo}>ALINGO.</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.title}>Verification</Text>
                <Text style={styles.subtitle}>
                    Enter the code sent to {phone}
                </Text>

                <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref: TextInput | null) => { if (ref) inputs.current[index] = ref; }}
                            style={[
                                styles.otpInput,
                                digit ? styles.otpInputFilled : null,
                            ]}
                            value={digit}
                            onChangeText={(text) => handleOtpChange(text, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            keyboardType="number-pad"
                            maxLength={1}
                            selectTextOnFocus
                        />
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={verifyOtp}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Verifying...' : 'Verify'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.resendContainer}>
                    <Text style={styles.resendText}>Didn't receive code? </Text>
                    {resendLoading ? (
                        <ActivityIndicator size="small" color={COLORS.primaryDark} />
                    ) : countdown > 0 ? (
                        <Text style={styles.resendText}>Resend in {countdown}s</Text>
                    ) : (
                        <TouchableOpacity onPress={handleResend}>
                            <Text style={styles.resendLink}>Resend</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <CustomAlert
                visible={alert.visible}
                type={alert.type}
                title={alert.title}
                message={alert.message}
                onClose={() => setAlert({ ...alert, visible: false })}
                primaryButton={{
                    text: 'OK',
                    onPress: () => {
                        if (alert.onConfirm) {
                            alert.onConfirm();
                        }
                    }
                }}
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingTop: SPACING.lg,
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.lg,
    },
    backButton: {
        marginBottom: SPACING.md,
    },
    backText: {
        fontSize: 16,
        color: COLORS.lightGreen,
        fontWeight: '600',
    },
    logo: {
        fontSize: 36,
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
        flex: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.inputText,
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.inputText,
        opacity: 0.8,
        marginBottom: SPACING.xxl,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xl,
    },
    otpInput: {
        width: 45,
        height: 55,
        backgroundColor: COLORS.inputBackground,
        borderRadius: BORDER_RADIUS.md,
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        color: COLORS.inputText,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    otpInputFilled: {
        borderColor: COLORS.button,
        backgroundColor: '#fff',
    },
    button: {
        backgroundColor: COLORS.button,
        borderRadius: BORDER_RADIUS.md,
        paddingVertical: SPACING.md + 6,
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
        marginTop: SPACING.xl,
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
