import React, { useState, useRef } from 'react';
import { View, StyleSheet, Image, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { authService } from '../../services/auth/auth.service';
import { logger } from '../../utils/logger';

const { width, height } = Dimensions.get('window');

export const CustomerLoginScreen = () => {
    const navigation = useNavigation<any>();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<TextInput | null>(null);

    const handlePhoneChange = (text: string) => {
        // Only allow digits and max 10 characters
        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
        setPhoneNumber(cleaned);
    };

    const isPhoneValid = phoneNumber.length === 10;

    const handleSendOtp = async () => {
        setLoading(true);
        try {
            const response = await authService.sendOtp(phoneNumber);
            if (response && response.verificationId) {
                setLoading(false);
                navigation.navigate('OTPScreen', {
                    phoneNumber,
                    verificationId: response.verificationId
                });
            } else {
                throw new Error('No verification ID received');
            }
        } catch (error) {
            setLoading(false);
            logger.error('Send OTP error:', error);
            Alert.alert('Error', 'Failed to send OTP. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            {/* Gradient Background */}
            <LinearGradient
                colors={['#FFF8F0', '#FFFDD0', '#FFF5E6']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Decorative Blur Circles */}
            <View style={[styles.blurCircle, styles.blurCircle1]} />
            <View style={[styles.blurCircle, styles.blurCircle2]} />


            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.contentContainer}>
                            {/* Customer Badge */}
                            <View style={styles.customerBadge}>
                                <MonoText size="xs" weight="bold" color={colors.primary}>
                                    LOG IN
                                </MonoText>
                            </View>

                            {/* Welcome Section */}
                            <View style={styles.welcomeSection}>
                                <MonoText size="xxl" weight="bold" color={colors.text} style={styles.welcomeTitle}>
                                    Order groceries{'\n'}in minutes
                                </MonoText>
                                <MonoText size="s" color={colors.textLight} style={styles.welcomeSubtitle}>
                                    Login/Sign up to place your order
                                </MonoText>
                            </View>

                            {/* Phone Input Section */}
                            <View style={styles.inputSection}>
                                <View style={styles.phoneInputContainer}>
                                    <MonoText size="xs" weight="bold" color={colors.textLight} style={styles.phoneLabel}>
                                        MOBILE NUMBER
                                    </MonoText>
                                    <View style={styles.inputWrapper}>
                                        <View style={styles.countryCode}>
                                            <MonoText style={styles.flagText}>🇮🇳</MonoText>
                                            <MonoText weight="bold" color={colors.text}>+91</MonoText>
                                        </View>
                                        <TextInput
                                            ref={inputRef}
                                            style={styles.phoneInput}
                                            value={phoneNumber}
                                            onChangeText={handlePhoneChange}
                                            placeholder="00000 00000"
                                            placeholderTextColor="#D1D5DB"
                                            keyboardType="number-pad"
                                            maxLength={10}
                                        />
                                        {phoneNumber.length === 10 && (
                                            <View style={styles.validIcon}>
                                                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                    <Circle cx="12" cy="12" r="10" fill={colors.success} />
                                                    <Path d="M8 12l2.5 2.5L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </Svg>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Continue/Send OTP Button - Glass Style */}
                                <TouchableOpacity
                                    style={styles.continueBtn}
                                    onPress={() => handleSendOtp().catch(() => Alert.alert('Error', 'Failed to send OTP'))}
                                    disabled={!isPhoneValid || loading}
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
                                            {loading ? 'Sending OTP...' : 'Continue'}
                                        </MonoText>
                                        {!loading && (
                                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 8 }}>
                                                <Path d="M5 12h14M12 5l7 7-7 7" stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </Svg>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>

                            {/* Delivery Partner Link */}
                            <View style={styles.partnerSection}>
                                <TouchableOpacity
                                    style={styles.partnerLink}
                                    onPress={() => navigation.navigate('PartnerLogin')}
                                    activeOpacity={0.7}
                                >
                                    <MonoText size="s" color={colors.textLight}>
                                        Are you a delivery partner?{' '}
                                    </MonoText>
                                    <MonoText size="s" color={colors.primary} weight="bold">
                                        Login Here
                                    </MonoText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.secondary,
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing.xl,
    },
    // Decorative blur circles
    blurCircle: {
        position: 'absolute',
        borderRadius: 999,
    },
    blurCircle1: {
        width: 300,
        height: 300,
        backgroundColor: `${colors.primary}15`,
        top: -100,
        right: -50,
    },
    blurCircle2: {
        width: 200,
        height: 200,
        backgroundColor: '#FF6B2B10',
        bottom: 50,
        left: -50,
    },
    // Content Layout
    contentContainer: {
        marginTop: spacing.xl,
    },
    // Customer Badge
    customerBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.8)',
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.xs,
        borderRadius: 20,
        marginBottom: spacing.l,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    // Welcome
    welcomeSection: {
        marginBottom: 40,
    },
    welcomeTitle: {
        fontSize: 36,
        lineHeight: 44,
        letterSpacing: -0.5,
        marginBottom: spacing.s,
    },
    welcomeSubtitle: {
        fontSize: 16,
        lineHeight: 24,
    },
    // Input Section
    inputSection: {
        marginBottom: spacing.xl,
    },
    phoneInputContainer: {
        marginBottom: spacing.l,
    },
    phoneLabel: {
        marginBottom: spacing.m,
        marginLeft: spacing.xs,
        letterSpacing: 0.5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 64,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: spacing.m,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 16,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    countryCode: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: spacing.m,
        borderRightWidth: 1,
        borderRightColor: '#F0F0F0',
        marginRight: spacing.m,
    },
    flagText: {
        fontSize: 20,
        marginRight: 6,
    },
    phoneInput: {
        flex: 1,
        fontFamily: 'NotoSansMono-Medium',
        fontSize: 18,
        color: colors.text,
        letterSpacing: 1.5,
        height: '100%',
    },
    validIcon: {
        marginLeft: spacing.s,
    },
    // Liquid Button
    continueBtn: {
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 71, 0, 0.2)',
    },
    buttonGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    buttonGloss: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    // Partner Section
    partnerSection: {
        marginTop: spacing.xl,
        alignItems: 'center',
    },
    partnerLink: {
        padding: spacing.s,
        flexDirection: 'row',
        alignItems: 'center',
    },
});
