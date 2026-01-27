import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { authService } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlert from '../../components/CustomAlert';

export default function SignupScreen() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: '',
        age: '',
        gender: '',
        phone: '',
        bio: '',
    });
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
        const cleaned = phone.replace(/[^\d+]/g, '');
        if (!cleaned.startsWith('+')) return false;
        const digits = cleaned.substring(1);
        return digits.length >= 10 && digits.length <= 15;
    };

    const handleSendOTP = async () => {
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

        if (!formData.phone.trim()) {
            showAlert('error', 'Missing Information', 'Please enter your phone number');
            return;
        }

        if (!validatePhoneNumber(formData.phone)) {
            showAlert(
                'error',
                'Invalid Phone Number',
                'Please enter a valid international phone number starting with + (e.g., +1234567890)'
            );
            return;
        }

        const formattedPhone = formData.phone.startsWith('+') ? formData.phone : `+${formData.phone}`;

        setLoading(true);
        try {
            await AsyncStorage.setItem('signup_profile_data', JSON.stringify({
                fullName: formData.fullName,
                age: formData.age,
                gender: formData.gender,
                bio: formData.bio,
            }));

            const response = await authService.sendOTP(formattedPhone);

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
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <LinearGradient
                colors={[COLORS.primaryDark, COLORS.dark, COLORS.mediumDark]}
                style={StyleSheet.absoluteFillObject}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.logo}>ALINGO.</Text>
                </View>

                {/* Card */}
                <View style={styles.card}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join our ride-sharing community</Text>

                    {/* Full Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your full name"
                            placeholderTextColor="#999"
                            value={formData.fullName}
                            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                        />
                    </View>

                    {/* Age */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Age *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Your age"
                            placeholderTextColor="#999"
                            value={formData.age}
                            onChangeText={(text) => setFormData({ ...formData, age: text })}
                            keyboardType="number-pad"
                            maxLength={2}
                        />
                    </View>

                    {/* Gender */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Gender *</Text>
                        <View style={styles.genderContainer}>
                            <TouchableOpacity
                                style={[styles.genderButton, formData.gender === 'Male' && styles.genderButtonActive]}
                                onPress={() => setFormData({ ...formData, gender: 'Male' })}
                            >
                                <Text style={[styles.genderButtonText, formData.gender === 'Male' && styles.genderButtonTextActive]}>
                                    Male
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.genderButton, formData.gender === 'Female' && styles.genderButtonActive]}
                                onPress={() => setFormData({ ...formData, gender: 'Female' })}
                            >
                                <Text style={[styles.genderButtonText, formData.gender === 'Female' && styles.genderButtonTextActive]}>
                                    Female
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.genderButton, formData.gender === 'Other' && styles.genderButtonActive]}
                                onPress={() => setFormData({ ...formData, gender: 'Other' })}
                            >
                                <Text style={[styles.genderButtonText, formData.gender === 'Other' && styles.genderButtonTextActive]}>
                                    Other
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Phone Number */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="+1234567890"
                            placeholderTextColor="#999"
                            value={formData.phone}
                            onChangeText={(text) => setFormData({ ...formData, phone: text })}
                            keyboardType="phone-pad"
                            maxLength={17}
                        />
                    </View>

                    {/* Bio */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Bio (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Tell us about yourself..."
                            placeholderTextColor="#999"
                            value={formData.bio}
                            onChangeText={(text) => setFormData({ ...formData, bio: text })}
                            multiline
                            numberOfLines={3}
                            maxLength={150}
                        />
                        <Text style={styles.charCount}>{formData.bio.length}/150</Text>
                    </View>

                    {/* Send OTP Button */}
                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSendOTP}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? 'Sending OTP...' : 'Send OTP'}
                        </Text>
                    </TouchableOpacity>

                    {/* Login Link */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/auth/login')}>
                            <Text style={styles.footerLink}>Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Custom Alert */}
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
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: SPACING.xl,
    },
    header: {
        paddingTop: SPACING.xxl + SPACING.lg,
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
        paddingBottom: SPACING.xxl,
        minHeight: 600,
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
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.inputText,
        marginBottom: SPACING.sm,
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
        minHeight: 80,
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
    genderContainer: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    genderButton: {
        flex: 1,
        backgroundColor: COLORS.inputBackground,
        borderRadius: BORDER_RADIUS.md,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    genderButtonActive: {
        backgroundColor: COLORS.button,
        borderColor: COLORS.button,
    },
    genderButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.inputText,
    },
    genderButtonTextActive: {
        color: COLORS.buttonText,
    },
    button: {
        backgroundColor: COLORS.button,
        borderRadius: BORDER_RADIUS.md,
        paddingVertical: SPACING.md + 6,
        alignItems: 'center',
        marginTop: SPACING.xl,
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
