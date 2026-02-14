import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Platform, KeyboardAvoidingView, ScrollView, Alert, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming, withRepeat } from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { MonoText } from '../../components/shared/MonoText';
import { authService } from '../../services/auth/auth.service';


const { width } = Dimensions.get('window');

type OTPRouteProp = RouteProp<{ params: { phoneNumber: string, verificationId: string } }, 'params'>;

export const OTPScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<OTPRouteProp>();
    const { phoneNumber, verificationId: initialVerificationId } = route.params;

    const [otp, setOtp] = useState(['', '', '', '']);
    const [verificationId, setVerificationId] = useState(initialVerificationId);
    const [timer, setTimer] = useState(120);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);

    const inputs = useRef<Array<TextInput | null>>([]);
    const shake = useSharedValue(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleOtpChange = (value: string, index: number) => {
        const cleanedValue = value.replace(/[^0-9]/g, '');
        const newOtp = [...otp];
        newOtp[index] = cleanedValue;
        setOtp(newOtp);
        setError(null);

        if (cleanedValue && index < 3) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleBackspace = (key: string, index: number) => {
        if (key === 'Backspace') {
            if (!otp[index] && index > 0) {
                inputs.current[index - 1]?.focus();
            }
        }
    };

    const triggerShake = () => {
        shake.value = withSequence(
            withTiming(-10, { duration: 50 }),
            withRepeat(withTiming(10, { duration: 100 }), 5, true),
            withTiming(0, { duration: 50 })
        );
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shake.value }],
    }));

    const handleVerifyOtp = async () => {
        const otpString = otp.join('');
        if (otpString.length < 4) return;

        setLoading(true);
        setError(null);

        try {
            await authService.verifyOtp(phoneNumber, otpString, verificationId);

            // Authentication Success Logic
            const { useAuthStore } = require('../../store/authStore');
            const { userService } = require('../../services/customer/user.service');
            const userProfile = await userService.getProfile().catch(() => ({ _id: 'temp', phone: phoneNumber }));

            const { storage } = require('../../services/core/storage');
            await storage.setUser(userProfile);

            useAuthStore.getState().login(userProfile);

            if (!userProfile.name) {
                navigation.replace('CompleteProfile');
            } else {
                const { useBranchStore } = require('../../store/branch.store');
                useBranchStore.getState().setShouldShowAddressModal(true);
                navigation.replace('MainTabs', { screen: 'Home' });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
            triggerShake();
            setOtp(['', '', '', '']);
            inputs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (timer > 0 || isResending) return;
        setIsResending(true);
        try {
            const response = await authService.sendOtp(phoneNumber);
            if (response && response.verificationId) {
                setVerificationId(response.verificationId);
                setTimer(120);
                setError(null);
                setOtp(['', '', '', '']);
                inputs.current[0]?.focus();
                Alert.alert('Success', 'OTP has been resent');
            }
        } catch (err: any) {
            Alert.alert('Error', 'Failed to resend OTP');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient
                colors={['#FFF8F0', '#FFFDD0', '#FFF5E6']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <SafeAreaView style={styles.safeArea}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2">
                        <Path d="M19 12H5M12 19l-7-7 7-7" />
                    </Svg>
                </TouchableOpacity>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.headerSection}>
                            <MonoText size="xxl" weight="bold" color={colors.text} style={styles.title}>
                                Verify Your{'\n'}Number
                            </MonoText>
                            <MonoText size="s" color={colors.textLight} style={styles.subtitle}>
                                We've sent a 4-digit code to{'\n'}
                                <MonoText weight="bold" color={colors.text}>+91 {phoneNumber}</MonoText>
                            </MonoText>
                        </View>

                        <Animated.View style={[styles.otpRow, animatedStyle]}>
                            {otp.map((digit, index) => (
                                <View key={index} style={styles.otpInputWrapper}>
                                    <TextInput
                                        ref={(ref) => { inputs.current[index] = ref; }}
                                        style={[styles.otpInput, error && styles.otpInputError]}
                                        value={digit}
                                        onChangeText={(text) => handleOtpChange(text, index)}
                                        onKeyPress={({ nativeEvent }) => handleBackspace(nativeEvent.key, index)}
                                        keyboardType="number-pad"
                                        maxLength={1}
                                        selectTextOnFocus
                                        editable={!loading}
                                    />
                                </View>
                            ))}
                        </Animated.View>

                        {error && (
                            <MonoText size="xs" color={colors.error} style={styles.errorText}>
                                {error}
                            </MonoText>
                        )}

                        <View style={styles.timerSection}>
                            {timer > 0 ? (
                                <MonoText size="s" color={colors.textLight}>
                                    Resend OTP in <MonoText color={colors.primary} weight="bold">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</MonoText>
                                </MonoText>
                            ) : (
                                <TouchableOpacity onPress={handleResendOtp} disabled={isResending}>
                                    <MonoText size="s" color={colors.primary} weight="bold">
                                        {isResending ? 'Resending...' : 'Resend OTP'}
                                    </MonoText>
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity
                            style={[styles.verifyBtn, (otp.some(d => !d) || loading) && styles.disabledBtn]}
                            onPress={handleVerifyOtp}
                            disabled={otp.some(d => !d) || loading}
                        >
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={15}
                            />
                            <LinearGradient
                                colors={['rgba(255, 71, 0, 0.1)', 'rgba(255, 71, 0, 0.05)']}
                                style={styles.buttonGradient}
                            >
                                <MonoText weight="bold" color={colors.primary} size="m">
                                    {loading ? 'Verifying...' : 'Verify & Proceed'}
                                </MonoText>
                            </LinearGradient>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.secondary },
    gradient: { ...StyleSheet.absoluteFillObject },
    safeArea: { flex: 1 },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 16,
        marginTop: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    scrollContent: { padding: 24, flexGrow: 1, justifyContent: 'center' },
    headerSection: { marginBottom: 40 },
    title: { fontSize: 32, marginBottom: 12 },
    subtitle: { fontSize: 16, lineHeight: 24 },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    otpInputWrapper: {
        width: (width - 48 - 60) / 4,
        height: 70,
        backgroundColor: colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    otpInput: {
        flex: 1,
        textAlign: 'center',
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
    },
    otpInputError: { borderColor: colors.error },
    errorText: { textAlign: 'center', marginBottom: 20 },
    timerSection: { alignItems: 'center', marginBottom: 40 },
    verifyBtn: {
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 71, 0, 0.2)',
    },
    disabledBtn: { opacity: 0.5 },
    buttonGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
