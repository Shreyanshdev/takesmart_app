import React, { useState, useRef } from 'react';
import { View, StyleSheet, Image, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { PillButton } from '../../components/shared/PillButton';
import { OtpBottomSheet } from '../../components/auth/OtpBottomSheet';
import { authService } from '../../services/auth/auth.service';
import { logger } from '../../utils/logger';

export const CustomerLoginScreen = () => {
    const navigation = useNavigation<any>();
    const [phoneNumber, setPhoneNumber] = useState(new Array(10).fill(''));
    const [otpVisible, setOtpVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verificationId, setVerificationId] = useState<string | null>(null);
    const inputs = useRef<Array<TextInput | null>>([]);

    const handlePhoneChange = (text: string, index: number) => {
        const newPhone = [...phoneNumber];
        newPhone[index] = text;
        setPhoneNumber(newPhone);

        if (text && index < 9) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleBackspace = (key: string, index: number) => {
        if (key === 'Backspace') {
            // If current box is empty, move to previous
            if (!phoneNumber[index] && index > 0) {
                inputs.current[index - 1]?.focus();
            }
            // Optional enhancement: If user wants to clear previous digit immediately when backspacing on empty box
            // We can leave it as just moving focus for safety
        }
    }

    const isPhoneValid = phoneNumber.every(d => d !== '');

    const handleSendOtp = async () => {
        setLoading(true); // This loading affects the main screen button
        try {
            const response = await authService.sendOtp(phoneNumber.join(''));
            if (response && response.verificationId) {
                setVerificationId(response.verificationId);
                setLoading(false);
                setOtpVisible(true);
            } else {
                throw new Error('No verification ID received');
            }
        } catch (error) {
            setLoading(false);
            logger.error('Send OTP error:', error);
            // Re-throw so OtpBottomSheet knows it failed if called via Resend
            throw error;
        }
    };

    const handleVerifyOtp = async (otp: string) => {
        if (!verificationId) {
            Alert.alert('Error', 'Session expired. Please request OTP again.');
            throw new Error('Session expired');
        }

        try {
            await authService.verifyOtp(phoneNumber.join(''), otp, verificationId);
            setOtpVisible(false);

            // Login successful code...
            const { useAuthStore } = require('../../store/authStore');
            const { userService } = require('../../services/customer/user.service');
            const userProfile = await userService.getProfile().catch(() => ({ _id: 'temp', phone: phoneNumber.join('') }));

            const { storage } = require('../../services/core/storage');
            await storage.setUser(userProfile);

            useAuthStore.getState().login(userProfile);
        } catch (error) {
            logger.error('Verify OTP error:', error);
            // Throw error to trigger Shake/Clear in BottomSheet
            throw error;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Customer Badge */}
                    <View style={styles.customerBadge}>
                        <MonoText size="xs" weight="bold" color={colors.primary}>
                            CUSTOMER
                        </MonoText>
                    </View>

                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/images/lpp.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <MonoText size="l" weight="bold" style={styles.tagline}>
                            Pure Dairy, Pure Life
                        </MonoText>
                    </View>

                    {/* Welcome Text */}
                    <View style={styles.welcomeSection}>
                        <MonoText size="xl" weight="bold" color={colors.text}>
                            Welcome!
                        </MonoText>
                        <MonoText size="s" color={colors.textLight} style={{ marginTop: 4 }}>
                            Order fresh dairy products delivered to your doorstep
                        </MonoText>
                    </View>

                    <View style={styles.inputSection}>
                        <View style={styles.phoneLabelRow}>
                            <View style={styles.countryCode}>
                                <MonoText size="m" weight="bold" color={colors.white}>+91</MonoText>
                            </View>
                            <MonoText size="s" color={colors.textLight} style={styles.enterText}>Enter Mobile Number</MonoText>
                        </View>

                        <View style={styles.phoneInputContainer}>
                            {phoneNumber.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    ref={(ref) => { inputs.current[index] = ref; }}
                                    style={styles.phoneInput}
                                    value={digit}
                                    onChangeText={(text) => handlePhoneChange(text, index)}
                                    onKeyPress={({ nativeEvent }) => handleBackspace(nativeEvent.key, index)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    selectTextOnFocus
                                />
                            ))}
                        </View>

                        <PillButton
                            title="SEND OTP"
                            onPress={() => handleSendOtp().catch(() => Alert.alert('Error', 'Failed to send OTP'))}
                            disabled={!isPhoneValid}
                            loading={loading}
                            style={styles.button}
                        />
                    </View>

                    {/* Delivery Partner Link - Minimalistic */}
                    <View style={styles.partnerSection}>
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <MonoText size="xs" color={colors.textLight} style={styles.dividerText}>
                                Are you a delivery partner?
                            </MonoText>
                            <View style={styles.dividerLine} />
                        </View>
                        <TouchableOpacity
                            style={styles.partnerLink}
                            onPress={() => navigation.navigate('PartnerLogin')}
                        >
                            <MonoText size="s" color={colors.textLight} weight="medium">
                                Partner Login →
                            </MonoText>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <OtpBottomSheet
                visible={otpVisible}
                onClose={() => setOtpVisible(false)}
                phoneNumber={phoneNumber.join('')}
                onVerify={handleVerifyOtp}
                onResend={handleSendOtp}
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
    logoContainer: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: spacing.m,
    },
    tagline: {
        textAlign: 'center',
        color: colors.primary,
    },
    inputSection: {
        marginBottom: spacing.xl,
    },
    phoneLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    countryCode: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.s,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: spacing.s,
    },
    enterText: {
        marginTop: 2,
    },
    phoneInputContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
    },
    phoneInput: {
        width: 30, // Adjusted for 10 digits
        height: 40,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        textAlign: 'center',
        fontSize: 16,
        fontFamily: 'NotoSansMono-Regular',
        color: colors.text,
        backgroundColor: colors.white,
        padding: 0,
    },
    button: {
        width: '80%',
        alignSelf: 'center',
        marginTop: spacing.m,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        borderRadius: 25,
    },
    customerBadge: {
        alignSelf: 'center',
        backgroundColor: `${colors.primary}15`,
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.xs,
        borderRadius: 20,
        marginBottom: spacing.m,
    },
    welcomeSection: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    partnerSection: {
        marginTop: spacing.xl,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    dividerText: {
        marginHorizontal: spacing.s,
    },
    partnerLink: {
        alignItems: 'center',
        padding: spacing.s,
    },
});
