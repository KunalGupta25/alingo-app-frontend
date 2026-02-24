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
        minHeight: 500, // Increased minHeight for better scroll feel
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
        marginBottom: SPACING.xl,
    },
    inputGroup: {
        marginBottom: SPACING.lg, // Slightly improved spacing
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.inputText,
        marginBottom: SPACING.xs, // Tighter label spacing
    },
    phoneInputContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.inputBackground,
        borderRadius: BORDER_RADIUS.md,
        overflow: 'hidden',
    },
    countryCodeContainer: {
        width: 70,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: 'rgba(0,0,0,0.1)',
    },
    countryCodeInput: {
        fontSize: 16,
        color: COLORS.inputText,
        fontWeight: '600',
        textAlign: 'center',
        paddingVertical: SPACING.md + 2,
    },
    phoneInput: {
        flex: 1,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md + 2,
        fontSize: 16,
        color: COLORS.inputText,
    },
    input: {
        backgroundColor: COLORS.inputBackground,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md + 2,
        fontSize: 16,
        color: COLORS.inputText,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: SPACING.md,
    },
    charCount: {
        fontSize: 12,
        color: COLORS.inputText,
        opacity: 0.6,
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
        height: 50, // Fixed height for alignment
    },
    genderButton: {
        flex: 1,
        backgroundColor: COLORS.inputBackground,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    genderButtonActive: {
        backgroundColor: COLORS.lightGreen,
        borderColor: COLORS.button,
    },
    genderText: {
        fontSize: 16,
        color: COLORS.inputText,
        opacity: 0.7,
    },
    genderTextActive: {
        color: COLORS.button, // Fixed color
        fontWeight: '600',
        opacity: 1,
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
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACING.lg,
        marginBottom: SPACING.xl, // Add bottom padding for better scroll end
    },
    footerText: {
        color: COLORS.inputText,
        fontSize: 15,
    },
    footerLink: {
        color: COLORS.primaryDark,
        fontSize: 15,
        fontWeight: 'bold',
    },
});
