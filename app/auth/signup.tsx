import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { authService } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlert from '../../components/CustomAlert';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function SignupScreen() {
    const router = useRouter();
    const [countryCode, setCountryCode] = useState('+91');
    const [formData, setFormData] = useState({
        fullName: '',
        age: '',
        gender: '',
        phone: '',
        bio: '',
    });

    // Refs for input focus chaining
    const ageRef = useRef<TextInput>(null);
    const phoneRef = useRef<TextInput>(null);
    const bioRef = useRef<TextInput>(null);

    const [loading, setLoading] = useState(false);
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

    const validatePhoneNumber = (phone: string): boolean => {
        const cleaned = phone.replace(/[^\d]/g, '');
        return cleaned.length >= 10 && cleaned.length <= 15;
    };

    const handleSendOTP = async () => {
        Keyboard.dismiss();
        // Validate all fields
        if (!formData.fullName.trim()) {
            showAlert('error', 'Missing Information', 'Please enter your full name');
            return;
        }

        if (!formData.age) {
            showAlert('error', 'Missing Information', 'Please enter your age');
            return;
        }

        const age = parseInt(formData.age);
        if (isNaN(age) || age < 18) {
            showAlert('error', 'Age Restriction', 'You must be at least 18 years old to sign up');
            return;
        }

        if (age > 120) {
            showAlert('error', 'Invalid Age', 'Please enter a valid age');
            return;
        }

        if (!formData.gender) {
            showAlert('error', 'Missing Information', 'Please select your gender');
            return;
        }

        if (!countryCode || !countryCode.startsWith('+')) {
            showAlert('error', 'Invalid Country Code', 'Please enter a valid country code starting with +');
            return;
        }

        if (!formData.phone.trim()) {
            showAlert('error', 'Missing Information', 'Please enter your phone number');
            return;
        }

        if (!validatePhoneNumber(formData.phone)) {
            showAlert(
                'error',
                'Invalid Phone Number',
                'Please enter a valid phone number'
            );
            return;
        }

        const formattedPhone = `${countryCode}${formData.phone}`;

        setLoading(true);
        try {
            await AsyncStorage.setItem('signup_profile_data', JSON.stringify({
                fullName: formData.fullName,
                age: formData.age,
                gender: formData.gender,
                bio: formData.bio,
            }));

            const response = await authService.sendOTP(formattedPhone, 'signup');

            console.log('OTP sent:', response.otp);
            showAlert(
                'success',
                'OTP Sent!',
                `Your verification code is: ${response.otp}\n\n(Development mode: In production, you'll receive this via SMS)`,
                () => {
                    router.push({
                        pathname: '/auth/otp',
                        params: { phone: formattedPhone, type: 'signup' }
                    });
                }
            );
        } catch (error: any) {
            console.error('Error sending OTP:', error);

            let errorTitle = 'Error';
            let errorMessage = 'Failed to send OTP. Please try again.';

            if (error.response?.data?.error) {
                const serverError = error.response.data.error;

                if (serverError.includes('already exists')) {
                    errorTitle = 'Account Exists';
                    errorMessage = 'An account with this phone number already exists. Please login instead.';
                } else if (serverError.includes('Invalid phone number')) {
                    errorTitle = 'Invalid Phone Number';
                    errorMessage = 'Please enter a valid phone number with country code (e.g., +1234567890)';
                } else {
                    errorMessage = serverError;
                }
            } else if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
                errorTitle = 'Connection Error';
                errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';
            }

            showAlert('error', errorTitle, errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenWrapper scrollable>
            <LinearGradient
                colors={['#174A4C', '#0B1416']}
                style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.logo}>ALINGO.</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join our ride-sharing community</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="John Doe"
                        placeholderTextColor="#999"
                        value={formData.fullName}
                        onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                        returnKeyType="next"
                        onSubmitEditing={() => ageRef.current?.focus()}
                        blurOnSubmit={false}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, styles.halfInput]}>
                        <Text style={styles.label}>Age *</Text>
                        <TextInput
                            ref={ageRef}
                            style={styles.input}
                            placeholder="25"
                            placeholderTextColor="#999"
                            value={formData.age}
                            onChangeText={(text) => setFormData({ ...formData, age: text.replace(/[^0-9]/g, '') })}
                            keyboardType="numeric"
                            maxLength={3}
                            returnKeyType="done"
                        />
                    </View>

                    <View style={[styles.inputGroup, styles.halfInput]}>
                        <Text style={styles.label}>Gender *</Text>
                        <View style={styles.genderContainer}>
                            {['Male', 'Female'].map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={[
                                        styles.genderButton,
                                        formData.gender === option && styles.genderButtonActive
                                    ]}
                                    onPress={() => setFormData({ ...formData, gender: option })}
                                >
                                    <Text style={[
                                        styles.genderText,
                                        formData.gender === option && styles.genderTextActive
                                    ]}>{option}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone Number *</Text>
                    <View style={styles.phoneInputContainer}>
                        <View style={styles.countryCodeContainer}>
                            <TextInput
                                style={styles.countryCodeInput}
                                value={countryCode}
                                onChangeText={setCountryCode}
                                keyboardType="phone-pad"
                                maxLength={5}
                            />
                        </View>
                        <TextInput
                            ref={phoneRef}
                            style={styles.phoneInput}
                            placeholder="1234567890"
                            placeholderTextColor="#999"
                            value={formData.phone}
                            onChangeText={(text) => setFormData({ ...formData, phone: text.replace(/[^0-9]/g, '') })}
                            keyboardType="phone-pad"
                            maxLength={10}
                            returnKeyType="next"
                            onSubmitEditing={() => bioRef.current?.focus()}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Bio (Optional)</Text>
                    <TextInput
                        ref={bioRef}
                        style={[styles.input, styles.textArea]}
                        placeholder="Tell us about yourself..."
                        placeholderTextColor="#999"
                        value={formData.bio}
                        onChangeText={(text) => setFormData({ ...formData, bio: text })}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{formData.bio.length}/150</Text>
                </View>

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSendOTP}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Sending OTP...' : 'Next Step'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => router.push('/auth/login')}>
                        <Text style={styles.footerLink}>Login</Text>
                    </TouchableOpacity>
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
        color: '#4FD1C5',
        fontWeight: '600',
    },
    logo: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#4FD1C5',
        letterSpacing: 2,
    },
    card: {
        backgroundColor: '#0B2728',
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.xxl,
        paddingBottom: SPACING.xxl + SPACING.lg,
        minHeight: 500,
        flex: 1,
        borderTopWidth: 1,
        borderTopColor: 'rgba(79, 209, 197, 0.15)',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: 16,
        color: '#8EB69B',
        marginBottom: SPACING.xxl,
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4FD1C5',
        marginBottom: SPACING.xs,
    },
    phoneInputContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: 'rgba(79, 209, 197, 0.2)',
        overflow: 'hidden',
    },
    countryCodeContainer: {
        paddingHorizontal: SPACING.md,
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: 'rgba(79, 209, 197, 0.2)',
    },
    countryCodeInput: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        paddingVertical: SPACING.md,
    },
    phoneInput: {
        flex: 1,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        fontSize: 16,
        color: '#FFFFFF',
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        fontSize: 16,
        color: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(79, 209, 197, 0.2)',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: SPACING.md,
    },
    charCount: {
        fontSize: 12,
        color: '#8EB69B',
        textAlign: 'right',
        marginTop: SPACING.xs,
    },
    row: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    halfInput: {
        flex: 1,
    },
    genderContainer: {
        flexDirection: 'row',
        gap: SPACING.md,
        height: 50,
    },
    genderButton: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(79, 209, 197, 0.2)',
    },
    genderButtonActive: {
        backgroundColor: '#4FD1C5',
        borderColor: '#4FD1C5',
    },
    genderText: {
        fontSize: 16,
        color: '#8EB69B',
    },
    genderTextActive: {
        color: '#0B1416',
        fontWeight: '700',
    },
    button: {
        backgroundColor: '#4FD1C5',
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        marginTop: SPACING.md,
        shadowColor: '#4FD1C5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#0B1416',
        fontSize: 18,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACING.xxl,
        marginBottom: SPACING.xl,
    },
    footerText: {
        fontSize: 14,
        color: '#8EB69B',
    },
    footerLink: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#A3e635',
    },
});
