import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Platform, KeyboardAvoidingView, ScrollView, Alert, Dimensions, StatusBar, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming, withRepeat } from 'react-native-reanimated';
import { SafeBlurView as BlurView } from '../../components/shared/SafeBlurView';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { authService } from '../../services/auth/auth.service';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type OTPRouteProp = RouteProp<{ params: { phoneNumber: string, verificationId: string } }, 'params'>;

export const OTPScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<OTPRouteProp>();
    const insets = useSafeAreaInsets();
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

            // Update Auth State - This will trigger RootNavigator to switch to MainTabs automatically
            useAuthStore.getState().login(userProfile);

            // For new users without a name, navigate to CompleteProfile after the stack switch
            if (!userProfile.name) {
                setTimeout(() => {
                    navigation.navigate('CompleteProfile');
                }, 500);
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

            {/* Background Layer */}
            <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
                <LinearGradient
                    colors={['#DEFCE1', '#FFFFFF']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 0.6 }}
                />
                <View style={styles.patternContainer}>
                    <Image
                        source={require('../../assets/loadscreen/bgimage.jpg')}
                        style={[styles.patternImage, { opacity: 0.1 }]}
                        resizeMode="repeat"
                    />
                    <LinearGradient
                        colors={['rgba(255,255,255,0)', '#FFFFFF']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.45 }}
                    />
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                {/* Back Button */}
                <TouchableOpacity
                    style={[styles.backButton, { top: insets.top + spacing.s }]}
                    onPress={() => navigation.goBack()}
                >
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2">
                        <Path d="M19 12H5M12 19l-7-7 7-7" />
                    </Svg>
                </TouchableOpacity>

                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.contentContainer}>
                        {/* Title Section */}
                        <View style={styles.headerSection}>
                            <MonoText style={styles.title}>
                                Verify Your{'\n'}Number
                            </MonoText>
                            <MonoText style={styles.subtitle}>
                                We've sent a 4-digit code to{'\n'}
                                <MonoText weight="bold" color={colors.text}>+91 {phoneNumber}</MonoText>
                            </MonoText>
                        </View>

                        {/* OTP Input Section */}
                        <Animated.View style={[styles.otpRow, animatedStyle]}>
                            {otp.map((digit, index) => (
                                <View key={index} style={styles.otpInputWrapper}>
                                    <TextInput
                                        ref={(ref) => { inputs.current[index] = ref; }}
                                        style={[styles.otpInput, error ? styles.otpInputError : null]}
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

                        {/* Verify Button - Glass Style */}
                        <TouchableOpacity
                            style={[styles.verifyBtn, (otp.some(d => !d) || loading) && styles.disabledBtn]}
                            onPress={handleVerifyOtp}
                            disabled={otp.some(d => !d) || loading}
                            activeOpacity={0.8}
                        >
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={15}
                                reducedTransparencyFallbackColor="white"
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
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    patternContainer: {
        ...StyleSheet.absoluteFill,
        overflow: 'hidden',
    },
    patternImage: {
        width: '100%',
        height: '100%',
        transform: [{ scale: 3 }],
    },
    keyboardView: {
        flex: 1,
    },
    backButton: {
        position: 'absolute',
        left: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing.xl,
        justifyContent: 'center',
    },
    contentContainer: {
        width: '100%',
        alignItems: 'center',
    },
    headerSection: {
        marginBottom: 40,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        lineHeight: 40,
        fontWeight: '900',
        color: '#1A1A1A',
        marginBottom: spacing.s,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
        color: '#666666',
        textAlign: 'center',
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.m,
        marginBottom: 20,
    },
    otpInputWrapper: {
        width: 64,
        height: 72,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    otpInput: {
        fontSize: 28,
        fontFamily: 'NotoSansMono-Bold',
        color: colors.text,
        width: '100%',
        textAlign: 'center',
    },
    otpInputError: {
        borderColor: colors.error,
        borderWidth: 2,
    },
    errorText: {
        textAlign: 'center',
        marginBottom: 20,
    },
    timerSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    verifyBtn: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 71, 0, 0.2)',
    },
    disabledBtn: {
        opacity: 0.5,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    buttonGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
