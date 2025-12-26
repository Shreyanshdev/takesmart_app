import React, { useState } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { PillButton } from '../../components/shared/PillButton';
import { PasswordBottomSheet } from '../../components/auth/PasswordBottomSheet';
import { authService } from '../../services/auth/auth.service';
import { useAuthStore } from '../../store/authStore';

export const PartnerLoginScreen = () => {
    const navigation = useNavigation<any>();
    const { login } = useAuthStore();
    const [email, setEmail] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleNext = () => {
        setPasswordVisible(true);
    };

    const handleLogin = async (password: string) => {
        setLoading(true);
        try {
            const response = await authService.loginPartner(email, password);
            // Get the user from response - deliveryPartner or user field
            const user = response.deliveryPartner || response.user;

            if (!user) {
                throw new Error('No user data received');
            }

            // Update auth store - this triggers navigation to PartnerTabs
            login(user);

            setLoading(false);
            setPasswordVisible(false);
            // Navigation happens automatically via RootNavigator when isAuthenticated becomes true
        } catch (error: any) {
            setLoading(false);
            Alert.alert('Login Failed', error.response?.data?.message || error.message || 'Invalid email or password');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Image
                            source={require('../../assets/images/lpp.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <MonoText size="xxl" weight="bold" color={colors.primary}>Partner Login</MonoText>
                        <MonoText size="m" color={colors.textLight} style={styles.subtitle}>
                            Welcome back, partner!
                        </MonoText>
                    </View>

                    <View style={styles.inputSection}>
                        <MonoText size="s" style={styles.label}>Email Address</MonoText>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="partner@lushandpure.com"
                            placeholderTextColor={colors.textLight}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <PillButton
                            title="NEXT"
                            onPress={handleNext}
                            disabled={!email}
                            loading={loading}
                            style={styles.button}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <PasswordBottomSheet
                visible={passwordVisible}
                onClose={() => setPasswordVisible(false)}
                onLogin={handleLogin}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.secondary, // Creamy White
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: spacing.l,
        justifyContent: 'center',
    },
    header: {
        marginBottom: spacing.xxl,
        alignItems: 'center',
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: spacing.m,
    },
    subtitle: {
        marginTop: spacing.s,
    },
    inputSection: {
        marginBottom: spacing.xl,
    },
    label: {
        marginBottom: spacing.s,
        marginLeft: spacing.xs,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.m,
        fontFamily: 'NotoSansMono-Regular',
        fontSize: 16,
        color: colors.text,
        backgroundColor: colors.white,
        marginBottom: spacing.xl,
    },
    button: {
        width: '100%',
    },
});
