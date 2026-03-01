import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function CustomSplashScreen() {
    return (
        <LinearGradient
            colors={['#1A3E39', '#0B1C1A']}
            style={styles.container}
        >
            <View style={styles.content}>
                <View style={styles.logoWrapper}>
                    <Text style={styles.logoText}>ALINGO<Text style={styles.dot}>.</Text></Text>
                    <View style={styles.line} />
                </View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoWrapper: {
        alignItems: 'center',
    },
    logoText: {
        fontSize: 56,
        fontWeight: '900',
        color: '#D4E8CD',
        letterSpacing: 2,
    },
    dot: {
        color: '#A3D9A5',
    },
    line: {
        width: '100%',
        height: 1.5,
        backgroundColor: '#D4E8CD',
        marginTop: 6,
    }
});
