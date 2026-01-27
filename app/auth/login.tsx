import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { authService } from '../../services/api';
import CustomAlert from '../../components/CustomAlert';

export default function LoginScreen() {
    const router = useRouter();
    const [phone, setPhone] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [alert, setAlert] = React.useState<{
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

    const handleSendOTP = async () => {
        if (!phone || phone.length < 10) {
            showAlert('error', 'Invalid Phone Number', 'Please enter a valid phone number with country code (e.g., +1234567890)');
            return;
        }

        const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

        setLoading(true);
        try {
            const response = await authService.sendOTP(formattedPhone);

            console.log('OTP sent:', response.otp);
            showAlert(
                'success',
                'OTP Sent!',
                `Your verification code is: ${response.otp}\n\n(Development mode: In production, you'll receive this via SMS)`,
                () => {
                    router.push({
                        pathname: '/auth/otp',
                        params: { phone: formattedPhone, type: 'login' }
                    });
                }
            );
        } catch (error: any) {
            console.error('Error sending OTP:', error);

            let errorTitle = 'Error';
            let errorMessage = 'Failed to send OTP. Please try again.';

            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.message === 'Network Error') {
                errorTitle = 'Connection Error';
                errorMessage = 'Unable to connect to server. Please check your internet connection.';
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
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.logo}>ALINGO.</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.title}>Welcome Back!</Text>
                    <Text style={styles.subtitle}>Login to continue your journey</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="+1234567890"
                            placeholderTextColor="#999"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            maxLength={17}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSendOTP}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? 'Sending OTP...' : 'Send OTP'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/auth/signup')}>
                            <Text style={styles.footerLink}>Sign up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

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
        paddingBottom: SPACING.xxl + SPACING.lg,
        minHeight: 400,
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
        marginBottom: SPACING.xl,
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
