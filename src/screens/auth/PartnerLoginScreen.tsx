import React, { useState } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, Image, Dimensions, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SafeBlurView as BlurView } from '../../components/shared/SafeBlurView';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { authService } from '../../services/auth/auth.service';
import { useAuthStore } from '../../store/authStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const PartnerLoginScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { login } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const isEmailValid = email.includes('@') && email.includes('.');

    const handleLogin = async () => {
        if (!isEmailValid || !password) return;

        setLoading(true);
        try {
            const response = await authService.loginPartner(email, password);
            const user = response.deliveryPartner || response.user;

            if (!user) {
                throw new Error('No user data received');
            }

            login(user);
            setLoading(false);
        } catch (error: any) {
            setLoading(false);
            Alert.alert('Login Failed', error.response?.data?.message || error.message || 'Invalid email or password');
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
                        {/* Partner Portal Badge */}
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
                            <MonoText style={styles.title}>
                                Welcome Back{'\n'}Partner!
                            </MonoText>
                            <MonoText style={styles.subtitle}>
                                Login to manage your deliveries
                            </MonoText>
                        </View>

                        {/* Input Section */}
                        <View style={styles.inputSection}>
                            <View style={styles.inputWrapper}>
                                <View style={styles.iconContainer}>
                                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <Path d="M22 6l-10 7L2 6" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </Svg>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="partner@takesmart.com"
                                    placeholderTextColor="#D1D5DB"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>

                            <View style={styles.inputWrapper}>
                                <View style={styles.iconContainer}>
                                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </Svg>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="••••••••"
                                    placeholderTextColor="#D1D5DB"
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <Circle cx="12" cy="12" r="3" />
                                        {!showPassword && <Line x1="1" y1="1" x2="23" y2="23" />}
                                    </Svg>
                                </TouchableOpacity>
                            </View>

                            {/* Login Button - Glass Style */}
                            <TouchableOpacity
                                style={[styles.loginBtn, (!isEmailValid || !password) && styles.disabledBtn]}
                                onPress={handleLogin}
                                disabled={!isEmailValid || !password || loading}
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
                                        {loading ? 'Logging in...' : 'Login Now'}
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
        justifyContent: 'center',
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
        alignItems: 'center',
    },
    partnerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.xs,
        borderRadius: 20,
        marginBottom: spacing.l,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    titleSection: {
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
    inputSection: {
        width: '100%',
        marginBottom: spacing.xl,
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
    iconContainer: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${colors.primary}10`,
        borderRadius: 12,
        marginRight: spacing.s,
    },
    input: {
        flex: 1,
        height: '100%',
        fontFamily: 'NotoSansMono-Medium',
        fontSize: 16,
        color: colors.text,
    },
    eyeIcon: {
        padding: spacing.s,
    },
    loginBtn: {
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 71, 0, 0.2)',
        marginTop: spacing.m,
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
        marginTop: 20,
        alignItems: 'center',
        paddingBottom: spacing.xl,
    },
    customerLink: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.s,
    },
});
