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
                colors={['#174A4C', '#0B1416']}
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
        backgroundColor: '#0B1416',
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
        color: '#4FD1C5',
        letterSpacing: 3,
        marginBottom: SPACING.md,
    },
    tagline: {
        fontSize: 20,
        fontWeight: '600',
        color: '#A3e635',
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: 16,
        color: '#FFFFFF',
        opacity: 0.8,
        textAlign: 'center',
        lineHeight: 24,
    },
    card: {
        backgroundColor: '#0B2728',
        borderTopLeftRadius: BORDER_RADIUS.xl * 1.5,
        borderTopRightRadius: BORDER_RADIUS.xl * 1.5,
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.xxl,
        paddingBottom: SPACING.xxl + SPACING.lg,
        minHeight: 320,
        borderTopWidth: 1,
        borderTopColor: 'rgba(79, 209, 197, 0.15)',
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: SPACING.sm,
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: '#8EB69B',
        marginBottom: SPACING.xl,
    },
    loginButton: {
        backgroundColor: '#4FD1C5',
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        marginBottom: SPACING.md,
        shadowColor: '#4FD1C5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    loginButtonText: {
        color: '#0B1416',
        fontSize: 18,
        fontWeight: 'bold',
    },
    signupButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#4FD1C5',
        borderRadius: BORDER_RADIUS.lg,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    signupButtonText: {
        color: '#4FD1C5',
        fontSize: 18,
        fontWeight: 'bold',
    },
    termsText: {
        fontSize: 13,
        color: '#8EB69B',
        textAlign: 'center',
        lineHeight: 20,
    },
    termsLink: {
        fontWeight: '600',
        color: '#A3e635',
    },
});
