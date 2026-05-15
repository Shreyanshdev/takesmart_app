import React, { useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    Image,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Dimensions,
    StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SafeBlurView as BlurView } from '../../components/shared/SafeBlurView';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { authService } from '../../services/auth/auth.service';
import { logger } from '../../utils/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const CustomerLoginScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<TextInput | null>(null);

    const handlePhoneChange = (text: string) => {
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

            {/* Background Layer */}
            <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
                {/* 1. Base Top Color Gradient */}
                <LinearGradient
                    colors={['#DEFCE1', 'rgba(255,255,255,0)']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 0.6 }}
                />

                {/* 2. Pattern Image Layer */}
                <View style={[StyleSheet.absoluteFill, { opacity: 0.06 }]}>
                    <Image
                        source={require('../../assets/loadscreen/bgimage.jpg')}
                        style={styles.patternImage}
                        resizeMode="repeat"
                    />
                </View>

                {/* 3. Bottom White Fade (Ensures content readability) */}
                <LinearGradient
                    colors={['rgba(255,255,255,0)', '#FFFFFF']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 0.5 }}
                />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.m }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header Logo */}
                    <View style={styles.header}>
                        <Image
                            source={require('../../assets/login/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    <View style={styles.contentContainer}>
                        {/* Welcome Section */}
                        <View style={styles.welcomeSection}>
                            <MonoText style={styles.welcomeTitle}>
                                Fresh Groceries{'\n'}in Minutes
                            </MonoText>
                            <MonoText style={styles.welcomeSubtitle}>
                                Enter your mobile number to proceed
                            </MonoText>
                        </View>

                        {/* Phone Input Section */}
                        <View style={styles.inputSection}>
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

                            {/* Continue Button - Glass Style */}
                            <TouchableOpacity
                                style={[styles.continueBtn, !isPhoneValid && styles.disabledBtn]}
                                onPress={() => handleSendOtp()}
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
                                        {loading ? 'Sending OTP...' : 'Send OTP'}
                                    </MonoText>
                                    {!loading && (
                                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 8 }}>
                                            <Path d="M5 12h14M12 5l7 7-7 7" stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </Svg>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        {/* Footer Section */}
                        <View style={styles.footer}>
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing.xl,
        justifyContent: 'center', // Center vertically
    },
    header: {
        marginTop: 2,
        marginBottom: 110,
        alignItems: 'center',
        transform: [{ scale: 3 }]
    },
    logo: {
        width: 160,
        height: 60,
    },
    contentContainer: {
        width: '100%',
    },
    welcomeSection: {
        marginBottom: 40,
        alignItems: 'center', // Center content horizontally
    },
    welcomeTitle: {
        fontSize: 32,
        lineHeight: 40,
        fontWeight: '900',
        color: '#1A1A1A',
        marginBottom: spacing.s,
        textAlign: 'center', // Center text
    },
    welcomeSubtitle: {
        fontSize: 16,
        lineHeight: 24,
        color: '#666666',
        textAlign: 'center', // Center text
    },
    inputSection: {
        marginBottom: spacing.xl,
        width: '100%',
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
        marginBottom: spacing.l,
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
    continueBtn: {
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
        paddingHorizontal: 20,
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
        paddingBottom: spacing.xl,
    },
    partnerLink: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.s,
    },
});

