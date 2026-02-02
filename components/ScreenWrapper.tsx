import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TouchableWithoutFeedback,
    Keyboard,
    View,
    ScrollView,
    ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

interface ScreenWrapperProps {
    children: React.ReactNode;
    style?: ViewStyle;
    contentContainerStyle?: ViewStyle;
    scrollable?: boolean;
    dismissKeyboard?: boolean;
    headerComponent?: React.ReactNode;
}

export default function ScreenWrapper({
    children,
    style,
    contentContainerStyle,
    scrollable = false,
    dismissKeyboard = true,
    headerComponent,
}: ScreenWrapperProps) {
    const Container = (dismissKeyboard ? TouchableWithoutFeedback : View) as React.ComponentType<any>;
    const containerProps = dismissKeyboard ? { onPress: Keyboard.dismiss } : {};

    const WrapperContent = (
        <View style={[styles.innerContainer, style]}>
            {headerComponent}
            {children}
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
            >
                <Container {...containerProps}>
                    <View style={styles.contentContainer}>
                        {scrollable ? (
                            <ScrollView
                                contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                            >
                                {WrapperContent}
                            </ScrollView>
                        ) : (
                            WrapperContent
                        )}
                    </View>
                </Container>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    innerContainer: {
        flex: 1,
    },
});
