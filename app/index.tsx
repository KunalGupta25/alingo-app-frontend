import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            {/* Background Gradient */}
            <LinearGradient
                colors={[COLORS.primaryDark, COLORS.dark, COLORS.mediumDark]}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Content */}
            <View style={styles.content}>
                {/* Logo Section */}
                <View style={styles.logoContainer}>
                    <Text style={styles.logo}>ALINGO.</Text>
                    <Text style={styles.tagline}>Find Your Ride Buddy</Text>
                    <Text style={styles.subtitle}>
                        Connect with verified riders{'\n'}Share your journey safely
                    </Text>
                </View>

                {/* Bottom Card with Buttons */}
                <View style={styles.card}>
                    <Text style={styles.welcomeTitle}>Welcome!</Text>
                    <Text style={styles.welcomeSubtitle}>
                        Join our community of verified riders
                    </Text>

                    {/* Login Button */}
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={() => router.push('/auth/login')}
                    >
                        <Text style={styles.loginButtonText}>Login</Text>
                    </TouchableOpacity>

                    {/* Signup Button */}
                    <TouchableOpacity
                        style={styles.signupButton}
                        onPress={() => router.push('/auth/signup')}
                    >
                        <Text style={styles.signupButtonText}>Create Account</Text>
                    </TouchableOpacity>

                    <Text style={styles.termsText}>
                        By continuing, you agree to our{'\n'}
                        <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                        <Text style={styles.termsLink}>Privacy Policy</Text>
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
    },
    logoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: SPACING.xxl * 2,
    },
    logo: {
        fontSize: 56,
        fontWeight: 'bold',
        color: COLORS.text,
        letterSpacing: 3,
        marginBottom: SPACING.md,
    },
    tagline: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.lightGreen,
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    card: {
        backgroundColor: COLORS.lightGreen,
        borderTopLeftRadius: BORDER_RADIUS.xl * 1.5,
        borderTopRightRadius: BORDER_RADIUS.xl * 1.5,
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.xxl,
        paddingBottom: SPACING.xxl + SPACING.lg,
        minHeight: 320,
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.inputText,
        marginBottom: SPACING.sm,
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: COLORS.inputText,
        opacity: 0.8,
        marginBottom: SPACING.xl,
    },
    loginButton: {
        backgroundColor: COLORS.button,
        borderRadius: BORDER_RADIUS.md,
        paddingVertical: SPACING.md + 6,
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    loginButtonText: {
        color: COLORS.buttonText,
        fontSize: 18,
        fontWeight: '600',
    },
    signupButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: COLORS.button,
        borderRadius: BORDER_RADIUS.md,
        paddingVertical: SPACING.md + 4,
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    signupButtonText: {
        color: COLORS.button,
        fontSize: 18,
        fontWeight: '600',
    },
    termsText: {
        fontSize: 13,
        color: COLORS.inputText,
        textAlign: 'center',
        opacity: 0.7,
        lineHeight: 20,
    },
    termsLink: {
        fontWeight: '600',
        opacity: 1,
    },
});
