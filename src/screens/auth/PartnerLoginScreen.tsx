import React, { useState } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, Image, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { PasswordBottomSheet } from '../../components/auth/PasswordBottomSheet';
import { authService } from '../../services/auth/auth.service';
import { useAuthStore } from '../../store/authStore';

const { width, height } = Dimensions.get('window');

export const PartnerLoginScreen = () => {
    const navigation = useNavigation<any>();
    const { login } = useAuthStore();
    const [email, setEmail] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const isEmailValid = email.includes('@') && email.includes('.');

    const handleNext = () => {
        setPasswordVisible(true);
    };

    const handleLogin = async (password: string) => {
        setLoading(true);
        try {
            const response = await authService.loginPartner(email, password);
            const user = response.deliveryPartner || response.user;

            if (!user) {
                throw new Error('No user data received');
            }

            login(user);

            setLoading(false);
            setPasswordVisible(false);
        } catch (error: any) {
            setLoading(false);
            Alert.alert('Login Failed', error.response?.data?.message || error.message || 'Invalid email or password');
        }
    };

    return (
        <View style={styles.container}>
            {/* Gradient Background - Slightly different hue for partner */}
            <LinearGradient
                colors={['#FFF5F0', '#FFEDE6', '#FFF8F5']}
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
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <View style={styles.backButtonInner}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </View>
                    </TouchableOpacity>

                    <ScrollView
                        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.contentContainer}>
                            {/* Partner Badge */}
                            <View style={styles.partnerBadge}>
                                <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                                    <Rect x="3" y="3" width="18" height="18" rx="2" stroke={colors.primary} strokeWidth="2" />
                                    <Path d="M9 12l2 2 4-4" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                                <MonoText size="xs" weight="bold" color={colors.primary}>
                                    PARTNER PORTAL
                                </MonoText>
                            </View>

                            {/* Title Section */}
                            <View style={styles.titleSection}>
                                <MonoText size="xxl" weight="bold" color={colors.text} style={styles.title}>
                                    Welcome Back{'\n'}Partner!
                                </MonoText>
                                <MonoText size="s" color={colors.textLight} style={styles.subtitle}>
                                    Login to manage your deliveries
                                </MonoText>
                            </View>

                            {/* Email Input Section */}
                            <View style={styles.inputSection}>
                                <MonoText size="xs" weight="bold" color={colors.textLight} style={styles.inputLabel}>
                                    EMAIL ADDRESS
                                </MonoText>
                                <View style={styles.emailInputWrapper}>
                                    <View style={styles.emailIcon}>
                                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <Path d="M22 6l-10 7L2 6" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </Svg>
                                    </View>
                                    <TextInput
                                        style={styles.emailInput}
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="partner@takesmart.com"
                                        placeholderTextColor="#D1D5DB"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    {isEmailValid && (
                                        <View style={styles.validIcon}>
                                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <Circle cx="12" cy="12" r="10" fill={colors.success} />
                                                <Path d="M8 12l2.5 2.5L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </Svg>
                                        </View>
                                    )}
                                </View>

                                {/* Next Button (Liquid) */}
                                {/* Continue Button - Glass Style */}
                                <TouchableOpacity
                                    style={styles.continueBtn}
                                    onPress={handleNext}
                                    disabled={!isEmailValid || loading}
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
                                            {loading ? 'Verifying...' : 'Continue'}
                                        </MonoText>
                                        {!loading && (
                                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 8 }}>
                                                <Path d="M5 12h14M12 5l7 7-7 7" stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </Svg>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* Footer - CollapsibleTabBar Style */}
            <View style={styles.footerContainer}>
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="light"
                    blurAmount={20}
                    reducedTransparencyFallbackColor={colors.white}
                />
                <View style={styles.footerContent}>
                    <TouchableOpacity
                        style={styles.customerLink}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <MonoText size="s" color={colors.textLight}>
                            Not a partner?{' '}
                        </MonoText>
                        <MonoText size="s" color={colors.primary} weight="bold">
                            Customer Login
                        </MonoText>
                    </TouchableOpacity>
                </View>
            </View>

            <PasswordBottomSheet
                visible={passwordVisible}
                onClose={() => setPasswordVisible(false)}
                onLogin={handleLogin}
                loading={loading}
            />
        </View >
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
    // Back Button
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 16,
        left: 16,
        zIndex: 10,
    },
    backButtonInner: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    // Decorative blur circles
    blurCircle: {
        position: 'absolute',
        borderRadius: 999,
    },
    blurCircle1: {
        width: 300,
        height: 300,
        backgroundColor: `${colors.primary}12`,
        top: -100,
        left: -100,
    },
    blurCircle2: {
        width: 200,
        height: 200,
        backgroundColor: `${colors.primary}10`,
        bottom: 50,
        right: -50,
    },
    // Content Layout
    contentContainer: {
        marginTop: spacing.xl,
    },
    // Partner Badge
    partnerBadge: {
        flexDirection: 'row',
        alignSelf: 'flex-start',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.xs,
        borderRadius: 20,
        marginBottom: spacing.l,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    // Title Section
    titleSection: {
        marginBottom: 40,
    },
    title: {
        fontSize: 36,
        lineHeight: 44,
        letterSpacing: -0.5,
        marginBottom: spacing.s,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
    },
    // Input Section
    inputSection: {
        marginBottom: spacing.xl,
    },
    inputLabel: {
        marginBottom: spacing.m,
        marginLeft: spacing.xs,
        letterSpacing: 0.5,
    },
    emailInputWrapper: {
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
    emailIcon: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${colors.primary}10`,
        borderRadius: 12,
        marginRight: spacing.s,
    },
    emailInput: {
        flex: 1,
        height: '100%',
        fontFamily: 'NotoSansMono-Medium',
        fontSize: 16,
        color: colors.text,
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
    // Customer Section (Footer)
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    footerContent: {
        height: Platform.OS === 'ios' ? 85 : 70,
        paddingBottom: Platform.OS === 'ios' ? 20 : 10,
        paddingTop: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    customerLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.s,
    },
});
