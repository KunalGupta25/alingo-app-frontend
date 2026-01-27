import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../../constants/theme';

export default function HomeScreen() {
    const router = useRouter();
    const [user, setUser] = React.useState<any>(null);

    React.useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
    };

    const handleLogout = async () => {
        await AsyncStorage.clear();
        router.replace('/');
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[COLORS.primaryDark, COLORS.dark, COLORS.mediumDark]}
                style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.content}>
                <Text style={styles.logo}>ALINGO.</Text>
                <Text style={styles.title}>Welcome Home!</Text>

                {user && (
                    <View style={styles.userInfo}>
                        <Text style={styles.infoText}>Phone: {user.phone}</Text>
                        <Text style={styles.infoText}>Status: {user.verification_status}</Text>
                    </View>
                )}

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
    },
    logo: {
        fontSize: 48,
        fontWeight: 'bold',
        color: COLORS.text,
        letterSpacing: 2,
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: 28,
        fontWeight: '600',
        color: COLORS.lightGreen,
        marginBottom: SPACING.lg,
    },
    userInfo: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: SPACING.lg,
        borderRadius: 12,
        marginBottom: SPACING.xl,
    },
    infoText: {
        color: COLORS.text,
        fontSize: 16,
        marginBottom: SPACING.sm,
    },
    logoutButton: {
        backgroundColor: COLORS.lightGreen,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: 12,
    },
    logoutText: {
        color: COLORS.button,
        fontSize: 18,
        fontWeight: '600',
    },
});
