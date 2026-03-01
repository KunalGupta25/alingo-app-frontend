import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { authService } from '../../services/api';
import CustomAlert from '../../components/CustomAlert';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function LoginScreen() {
    const router = useRouter();
    const [countryCode, setCountryCode] = React.useState('+91');
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
        Keyboard.dismiss();

        if (!phone || phone.length < 10) {
            showAlert('error', 'Invalid Phone Number', 'Please enter a valid phone number');
            return;
        }

        if (!countryCode || !countryCode.startsWith('+')) {
            showAlert('error', 'Invalid Country Code', 'Please enter a valid country code starting with +');
            return;
        }

        const formattedPhone = `${countryCode}${phone}`;

        setLoading(true);
        try {
            const response = await authService.sendOTP(formattedPhone, 'login');

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
                <Text style={styles.title}>Welcome Back!</Text>
                <Text style={styles.subtitle}>Login to continue your journey</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone Number</Text>
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
                            style={styles.phoneInput}
                            placeholder="1234567890"
                            placeholderTextColor="#999"
                            value={phone}
                            onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                            keyboardType="phone-pad"
                            maxLength={10}
                            returnKeyType="done"
                            onSubmitEditing={handleSendOTP}
                        />
                    </View>
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
        minHeight: 400,
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
        marginBottom: SPACING.xl,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4FD1C5',
        marginBottom: SPACING.sm,
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
