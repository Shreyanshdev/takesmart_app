import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { userService } from '../../services/customer/user.service';
import { useBranchStore } from '../../store/branch.store';
import { logger } from '../../utils/logger';

const { width, height } = Dimensions.get('window');

export const CompleteProfileScreen = () => {
    const navigation = useNavigation<any>();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const setShouldShowAddressModal = useBranchStore(state => state.setShouldShowAddressModal);

    const isNameValid = name.trim().length >= 2;
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isFormValid = isNameValid && isEmailValid;

    const handleSubmit = async () => {
        if (!isFormValid) return;

        setLoading(true);
        try {
            await userService.updateProfile({ name, email });

            // Update local auth store so UI reflects name immediately
            const { useAuthStore } = require('../../store/authStore');
            const currentUser = useAuthStore.getState().user;
            if (currentUser) {
                useAuthStore.getState().login({ ...currentUser, name, email });
            }

            // Set flag to show address modal once on home
            setShouldShowAddressModal(true);
            navigation.replace('MainTabs', { screen: 'Home' });
        } catch (error) {
            logger.error('Complete Profile error:', error);
            Alert.alert('Error', 'Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Background Gradient */}
            <LinearGradient
                colors={['#FFFFFF', '#FFF4E6', '#FFFFFF']}
                style={styles.gradient}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
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
                            {/* Profile Badge */}
                            <View style={styles.profileBadge}>
                                <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                                    <Circle cx="12" cy="8" r="4" stroke={colors.primary} strokeWidth="2" />
                                    <Path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" />
                                </Svg>
                                <MonoText size="xs" weight="bold" color={colors.primary}>
                                    PROFILE SETUP
                                </MonoText>
                            </View>

                            {/* Title Section */}
                            <View style={styles.titleSection}>
                                <MonoText size="xxl" weight="bold" color={colors.text} style={styles.title}>
                                    Complete Your{'\n'}Profile
                                </MonoText>
                                <MonoText size="s" color={colors.textLight} style={styles.subtitle}>
                                    Just a few details to get things moving
                                </MonoText>
                            </View>

                            {/* Form Section */}
                            <View style={styles.formSection}>
                                {/* Name Input */}
                                <View style={styles.inputWrapper}>
                                    <MonoText size="xs" weight="bold" color={colors.textLight} style={styles.inputLabel}>
                                        FULL NAME
                                    </MonoText>
                                    <View style={styles.inputContainer}>
                                        <View style={styles.inputIcon}>
                                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <Circle cx="12" cy="7" r="4" stroke={colors.primary} strokeWidth="2" />
                                                <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </Svg>
                                        </View>
                                        <TextInput
                                            style={styles.input}
                                            value={name}
                                            onChangeText={setName}
                                            placeholder="Enter your full name"
                                            placeholderTextColor="#D1D5DB"
                                            autoCapitalize="words"
                                            autoCorrect={false}
                                        />
                                        {isNameValid && (
                                            <View style={styles.validIcon}>
                                                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                    <Circle cx="12" cy="12" r="10" fill={colors.success} />
                                                    <Path d="M8 12l2.5 2.5L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </Svg>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Email Input */}
                                <View style={styles.inputWrapper}>
                                    <MonoText size="xs" weight="bold" color={colors.textLight} style={styles.inputLabel}>
                                        EMAIL ADDRESS
                                    </MonoText>
                                    <View style={styles.inputContainer}>
                                        <View style={styles.inputIcon}>
                                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <Path d="M22 6l-10 7L2 6" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </Svg>
                                        </View>
                                        <TextInput
                                            style={styles.input}
                                            value={email}
                                            onChangeText={setEmail}
                                            placeholder="your.email@example.com"
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
                                </View>

                                {/* Submit Button (Glass Style) */}
                                <TouchableOpacity
                                    style={styles.submitBtn}
                                    onPress={handleSubmit}
                                    disabled={!isFormValid || loading}
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
                                            {loading ? 'CREATING PROFILE...' : 'START SHOPPING'}
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
    contentContainer: {
        marginTop: spacing.xl,
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
    // Profile Badge
    profileBadge: {
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
    // Form Section
    formSection: {
        marginBottom: spacing.xl,
    },
    inputWrapper: {
        marginBottom: spacing.l,
    },
    inputLabel: {
        marginBottom: spacing.m,
        marginLeft: spacing.xs,
        letterSpacing: 0.5,
    },
    inputContainer: {
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
    inputIcon: {
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
    validIcon: {
        marginLeft: spacing.s,
    },
    // Submit Button
    submitBtn: {
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
});
