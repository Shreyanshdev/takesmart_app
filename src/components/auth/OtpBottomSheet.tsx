import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming, withRepeat } from 'react-native-reanimated';
import { BlurBottomSheet } from '../shared/BlurBottomSheet';
import { MonoText } from '../shared/MonoText';
import { PillButton } from '../shared/PillButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface OtpBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    phoneNumber: string;
    onVerify: (otp: string) => Promise<void>;
    onResend: () => Promise<void>;
}

export const OtpBottomSheet: React.FC<OtpBottomSheetProps> = ({
    visible,
    onClose,
    phoneNumber,
    onVerify,
    onResend,
}) => {
    const [otp, setOtp] = useState(['', '', '', '']);
    const [timer, setTimer] = useState(120);
    const [error, setError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const inputs = React.useRef<Array<TextInput | null>>([]);
    const shake = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            setTimer(120);
            setOtp(['', '', '', '']);
            setError(null);
        }
    }, [visible]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (visible && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [visible, timer]);

    const handleOtpChange = (value: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError(null); // Clear error on typing

        if (value && index < 3) {
            inputs.current[index + 1]?.focus();
        }

        if (index === 3 && value) {
            // Optional: Auto-verify
        }
    };

    const handleBackspace = (key: string, index: number) => {
        if (key === 'Backspace') {
            if (!otp[index] && index > 0) {
                inputs.current[index - 1]?.focus();
            }
        }
    }

    const triggerShake = () => {
        shake.value = withSequence(
            withTiming(-10, { duration: 50 }),
            withRepeat(withTiming(10, { duration: 100 }), 5, true),
            withTiming(0, { duration: 50 })
        );
    };

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: shake.value }],
        };
    });

    const handleVerify = async () => {
        const otpString = otp.join('');
        if (otpString.length < 4) return;

        setIsVerifying(true);
        setError(null);

        try {
            await onVerify(otpString);
            // If success, parent closes modal
        } catch (err: any) {
            // Failure flow
            setError('Invalid OTP. Please try again.');
            triggerShake();
            setOtp(['', '', '', '']); // Clear inputs
            inputs.current[0]?.focus(); // Focus first input
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0) return;
        setIsResending(true);
        try {
            await onResend();
            setTimer(120);
            setError(null);
        } catch (err) {
            // Error handled in parent mostly, but we can show something
        } finally {
            setIsResending(false);
        }
    };

    return (
        <BlurBottomSheet visible={visible} onClose={onClose}>
            <View style={styles.container}>
                <MonoText size="l" weight="bold" style={styles.title}>VERIFY NUMBER</MonoText>
                <MonoText size="s" color={colors.textLight} style={styles.subtitle}>
                    OTP sent to +91 {phoneNumber}
                </MonoText>

                <TouchableOpacity onPress={onClose} style={styles.wrongNumberBtn}>
                    <MonoText size="xs" color={colors.primary} weight="medium">Wrong number? Go back</MonoText>
                </TouchableOpacity>

                <Animated.View style={[styles.otpContainer, animatedStyle]}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => { inputs.current[index] = ref; }}
                            style={[styles.otpInput, error && styles.otpInputError]}
                            value={digit}
                            onChangeText={(text) => handleOtpChange(text, index)}
                            onKeyPress={({ nativeEvent }) => handleBackspace(nativeEvent.key, index)}
                            keyboardType="number-pad"
                            maxLength={1}
                            selectTextOnFocus
                            editable={!isVerifying}
                        />
                    ))}
                </Animated.View>

                {error && (
                    <MonoText size="s" color={colors.error} style={styles.errorText}>
                        {error}
                    </MonoText>
                )}

                <View style={styles.resendContainer}>
                    <TouchableOpacity onPress={handleResend} disabled={timer > 0 || isResending}>
                        <MonoText size="s" color={timer > 0 ? colors.textLight : colors.primary} weight={timer > 0 ? 'regular' : 'bold'}>
                            {timer > 0 ? `Resend OTP in ${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')}` : (isResending ? 'Sending...' : 'Resend OTP')}
                        </MonoText>
                    </TouchableOpacity>
                </View>

                <PillButton
                    title="VERIFY & CONTINUE"
                    onPress={handleVerify}
                    disabled={otp.some(d => !d) || isVerifying}
                    loading={isVerifying}
                    style={styles.button}
                />
            </View>
        </BlurBottomSheet>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: spacing.s,
    },
    title: {
        marginBottom: spacing.xs,
    },
    subtitle: {
        marginBottom: spacing.xl,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.m,
        paddingHorizontal: spacing.l,
    },
    otpInput: {
        width: 55,
        height: 60,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 24,
        fontFamily: 'NotoSansMono-Regular',
        color: colors.text,
        backgroundColor: colors.background,
    },
    otpInputError: {
        borderColor: colors.error,
        backgroundColor: `${colors.error}10`,
    },
    errorText: {
        textAlign: 'center',
        marginBottom: spacing.m,
    },
    resendContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    wrongNumberBtn: {
        alignSelf: 'center',
        marginBottom: spacing.m,
        paddingVertical: spacing.xs,
    },
    button: {
        width: '80%',
        alignSelf: 'center',
        marginTop: spacing.s,
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
        borderRadius: 25,
    },
});
