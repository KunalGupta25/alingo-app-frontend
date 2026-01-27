import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
    onClose: () => void;
    primaryButton?: {
        text: string;
        onPress: () => void;
    };
    secondaryButton?: {
        text: string;
        onPress: () => void;
    };
}

export default function CustomAlert({
    visible,
    title,
    message,
    type = 'info',
    onClose,
    primaryButton,
    secondaryButton
}: CustomAlertProps) {
    const getIcon = () => {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✕';
            default:
                return 'ⓘ';
        }
    };

    const getIconColor = () => {
        switch (type) {
            case 'success':
                return '#4CAF50';
            case 'error':
                return '#f44336';
            default:
                return COLORS.lightGreen;
        }
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.alertContainer}>
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: getIconColor() }]}>
                        <Text style={styles.icon}>{getIcon()}</Text>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>{title}</Text>

                    {/* Message */}
                    <Text style={styles.message}>{message}</Text>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        {secondaryButton && (
                            <TouchableOpacity
                                style={[styles.button, styles.secondaryButton]}
                                onPress={() => {
                                    secondaryButton.onPress();
                                    onClose();
                                }}
                            >
                                <Text style={styles.secondaryButtonText}>{secondaryButton.text}</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.button, styles.primaryButton]}
                            onPress={() => {
                                if (primaryButton) {
                                    primaryButton.onPress();
                                }
                                onClose();
                            }}
                        >
                            <Text style={styles.primaryButtonText}>
                                {primaryButton?.text || 'OK'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    alertContainer: {
        backgroundColor: COLORS.mediumDark,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.xxl,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    icon: {
        fontSize: 32,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: COLORS.text,
        opacity: 0.8,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        lineHeight: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: SPACING.md,
        width: '100%',
    },
    button: {
        flex: 1,
        paddingVertical: SPACING.md + 2,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: COLORS.lightGreen,
    },
    primaryButtonText: {
        color: COLORS.inputText,
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.lightGreen,
    },
    secondaryButtonText: {
        color: COLORS.lightGreen,
        fontSize: 16,
        fontWeight: '600',
    },
});
