import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { verificationService } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenWrapper from '../../components/ScreenWrapper';
import CustomAlert from '../../components/CustomAlert';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

export default function IdentityVerificationScreen() {
    const router = useRouter();
    const cameraRef = useRef<CameraView>(null);
    const [documentType, setDocumentType] = useState('');
    const [documentImage, setDocumentImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [faceImage, setFaceImage] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

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

    const pickDocumentImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setDocumentImage(result.assets[0]);
        }
    };

    const captureFaceImage = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                showAlert('error', 'Permission Required', 'Camera access is needed for face verification');
                return;
            }
        }
        setShowCamera(true);
    };

    const handleCameraCapture = async () => {
        if (!cameraRef.current) return;

        try {
            const photo = await cameraRef.current.takePictureAsync();
            setFaceImage(photo);
            setShowCamera(false);
        } catch (error) {
            console.error(error);
            setShowCamera(false);
            showAlert('error', 'Capture Failed', 'Failed to take photo');
        }
    };

    const handleLogout = async () => {
        try {
            await AsyncStorage.clear();
            router.replace('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handleSubmit = async () => {
        if (!documentType || !documentImage || !faceImage) {
            showAlert('error', 'Missing Information', 'Please complete all fields (Document Type, Document Image, and Face Photo)');
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                showAlert('error', 'Session Expired', 'Please login again', () => {
                    router.replace('/auth/login');
                });
                return;
            }

            await verificationService.submitVerification({
                documentType,
                documentImage: {
                    uri: documentImage.uri,
                    type: 'image/jpeg',
                    name: 'document.jpg'
                },
                faceImage: {
                    uri: faceImage.uri,
                    type: 'image/jpeg',
                    name: 'face.jpg'
                },
                token
            });

            showAlert('success', 'Submitted!', 'Verification submitted successfully! Please wait for admin approval.', () => {
                router.replace('/(protected)/verification-pending');
            });

        } catch (error: any) {
            console.error('Submission error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to submit verification. Please try again.';
            showAlert('error', 'Submission Failed', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (showCamera) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black' }}>
                <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front">
                    <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 50, alignItems: 'center' }}>
                        <TouchableOpacity
                            style={{
                                width: 70,
                                height: 70,
                                borderRadius: 35,
                                backgroundColor: 'white',
                                borderWidth: 5,
                                borderColor: COLORS.lightGreen,
                            }}
                            onPress={handleCameraCapture}
                        />
                        <TouchableOpacity
                            style={{ marginTop: 20 }}
                            onPress={() => setShowCamera(false)}
                        >
                            <Text style={{ color: 'white', fontSize: 16 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </CameraView>
            </View>
        );
    }

    return (
        <ScreenWrapper scrollable>
            <View style={styles.header}>
                <Text style={styles.title}>Identity Verification</Text>
                <Text style={styles.subtitle}>Please verify your identity to continue.</Text>
            </View>

            <View style={styles.card}>
                {/* Document Type */}
                <Text style={styles.label}>Document Type</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={documentType}
                        onValueChange={setDocumentType}
                        style={styles.picker}
                    >
                        <Picker.Item label="Select Document Type..." value="" />
                        <Picker.Item label="College ID" value="College ID" />
                        <Picker.Item label="Government ID" value="Government ID" />
                        <Picker.Item label="Employee ID" value="Employee ID" />
                    </Picker>
                </View>

                {/* Document Image */}
                <Text style={styles.label}>Upload Document</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={pickDocumentImage}>
                    {documentImage ? (
                        <Image source={{ uri: documentImage.uri }} style={styles.image} resizeMode="cover" />
                    ) : (
                        <View style={styles.placeholder}>
                            <Text style={styles.uploadText}>Tap to Upload ID</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Face Image */}
                <Text style={styles.label}>Selfie Verification</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={captureFaceImage}>
                    {faceImage ? (
                        <Image source={{ uri: faceImage.uri }} style={styles.image} resizeMode="cover" />
                    ) : (
                        <View style={styles.placeholder}>
                            <Text style={styles.uploadText}>Tap to Take Selfie</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, (!documentType || !documentImage || !faceImage) && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading || !documentType || !documentImage || !faceImage}
                >
                    <Text style={styles.buttonText}>{loading ? 'Submitting...' : 'Submit Verification'}</Text>
                </TouchableOpacity>
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
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.lg,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.text,
        opacity: 0.7,
    },
    card: {
        flex: 1,
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xxl,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    pickerContainer: {
        backgroundColor: COLORS.inputBackground,
        borderRadius: BORDER_RADIUS.md,
        overflow: 'hidden',
    },
    picker: {
        height: 55,
    },
    uploadBox: {
        height: 200,
        backgroundColor: COLORS.inputBackground,
        borderRadius: BORDER_RADIUS.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadText: {
        color: COLORS.lightGreen,
        fontWeight: '600',
        marginTop: SPACING.sm,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    button: {
        backgroundColor: COLORS.button,
        borderRadius: BORDER_RADIUS.md,
        paddingVertical: SPACING.lg,
        alignItems: 'center',
        marginTop: SPACING.xxl,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: COLORS.buttonText,
        fontSize: 18,
        fontWeight: '600',
    },
});
