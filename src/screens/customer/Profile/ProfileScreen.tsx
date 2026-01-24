import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform, Animated, Dimensions, Alert, Modal } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MonoText } from '../../../components/shared/MonoText';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useAuthStore } from '../../../store/authStore';
import { api } from '../../../services/core/api';
import { useHomeStore } from '../../../store/home.store';

// Custom Icons for Profile Menu
const ProfileIcons = {
    Edit: () => (
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </Svg>
    ),
    Wishlist: () => (
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </Svg>
    ),
    Orders: () => (
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <Polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <Line x1="12" y1="22.08" x2="12" y2="12" />
        </Svg>
    ),
    Privacy: () => (
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <Polyline points="9 12 11 14 15 10" />
        </Svg>
    ),
    Terms: () => (
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <Line x1="16" y1="2" x2="16" y2="6" />
            <Line x1="8" y1="2" x2="8" y2="6" />
            <Line x1="3" y1="10" x2="21" y2="10" />
        </Svg>
    ),
    Logout: () => (
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <Polyline points="16 17 21 12 16 7" />
            <Line x1="21" y1="12" x2="9" y2="12" />
        </Svg>
    ),
    ChevronRight: () => (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 18l6-6-6-6" />
        </Svg>
    )
};

// Simple components for the SVG needs
const Line = ({ x1, y1, x2, y2, ...props }: any) => <Path d={`M${x1} ${y1}L${x2} ${y2}`} {...props} />;
const Polyline = ({ points, ...props }: any) => <Path d={`M${points}`} {...props} />;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ProfileScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { user, logout, updateUser } = useAuthStore();
    const setTabBarVisible = useHomeStore(state => state.setTabBarVisible);
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const fetchLatestProfile = async () => {
                try {
                    const response = await api.get('auth/user');
                    const userData = response.data?.user;
                    if (userData) {
                        updateUser(userData);
                    }
                } catch (error) {
                    console.error('Failed to fetch latest profile:', error);
                }
            };

            fetchLatestProfile();
        }, [updateUser])
    );

    const menuItems = [
        { label: 'Edit Profile', icon: ProfileIcons.Edit, onPress: () => navigation.navigate('EditProfile') },
        { label: 'My Wishlist', icon: ProfileIcons.Wishlist, onPress: () => navigation.navigate('Wishlist') },
        { label: 'My Orders', icon: ProfileIcons.Orders, onPress: () => navigation.navigate('OrderHistory') },
        { label: 'Privacy Policy', icon: ProfileIcons.Privacy, onPress: () => navigation.navigate('PrivacyPolicy') },
        { label: 'Terms & Conditions', icon: ProfileIcons.Terms, onPress: () => navigation.navigate('Terms') },
    ];

    const handleLogout = async () => {
        setLogoutModalVisible(false);
        setTabBarVisible(true);
        setTimeout(() => logout(), 200);
    };

    const toggleLogoutModal = (visible: boolean) => {
        setLogoutModalVisible(visible);
        setTabBarVisible(!visible);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Simple Large Header */}
            <View style={[styles.header, { paddingTop: insets.top, paddingBottom: 30 }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M19 12H5" />
                            <Path d="M12 19l-7-7 7-7" />
                        </Svg>
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <MonoText size="l" weight="bold" color={colors.white}>My Profile</MonoText>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.profileSummary}>
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarGlow} />
                        <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <MonoText size="xl" weight="bold" color={colors.white} style={styles.avatarText}>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</MonoText>
                        </View>
                        <TouchableOpacity style={styles.editBadge} onPress={() => navigation.navigate('EditProfile')}>
                            <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <Path d="M12 20h9" />
                                <Path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </Svg>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.profileText}>
                        <MonoText size="xl" weight="bold" color={colors.white} style={styles.textGlow}>{user?.name || 'Guest User'}</MonoText>
                        <MonoText size="s" color={colors.white} style={[styles.textGlow, { opacity: 0.9, marginTop: 4 }]}>{user?.email || user?.phone || 'Set up your profile'}</MonoText>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {menuItems.map((item, index) => (
                    <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
                        <View style={styles.menuItemLeft}>
                            <item.icon />
                            <MonoText size="m" weight="medium" style={styles.menuLabel}>{item.label}</MonoText>
                        </View>
                        <ProfileIcons.ChevronRight />
                    </TouchableOpacity>
                ))}

                {/* Glassmorphism Logout Button */}
                <TouchableOpacity
                    style={styles.glassLogoutBtn}
                    onPress={() => toggleLogoutModal(true)}
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
                        style={styles.logoutGradient}
                    >
                        <ProfileIcons.Logout />
                        <MonoText weight="bold" color={colors.primary} size="m" style={{ marginLeft: 12 }}>Logout Account</MonoText>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>

            {/* Premium Logout Modal */}
            <Modal
                visible={logoutModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => toggleLogoutModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType="dark"
                        blurAmount={5}
                        reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
                    />
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => toggleLogoutModal(false)}
                    />
                    <View style={styles.modalContainer}>
                        <View style={styles.modalIcon}>
                            <ProfileIcons.Logout />
                        </View>
                        <MonoText size="l" weight="bold">Log Out?</MonoText>
                        <MonoText style={{ marginVertical: 15, textAlign: 'center', color: colors.textLight }}>
                            Are you sure you want to log out of your account?
                        </MonoText>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => toggleLogoutModal(false)}
                            >
                                <MonoText weight="bold" color={colors.text}>Cancel</MonoText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirm}
                                onPress={handleLogout}
                            >
                                <MonoText weight="bold" color={colors.white}>Log Out</MonoText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        backgroundColor: colors.primary,
        position: 'relative',
        overflow: 'hidden',
    },
    headerContent: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        zIndex: 20,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    profileSummary: {
        marginTop: 20,
        alignItems: 'center',
        zIndex: 10,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarGlow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        ...Platform.select({
            ios: {
                shadowColor: '#fff',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 15,
            },
            android: {
                elevation: 0, // Glow on android is tricky, using semi-transparent overlay
            },
        }),
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    avatarText: {
        textShadowColor: 'rgba(255, 255, 255, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    textGlow: {
        textShadowColor: 'rgba(255, 255, 255, 0.6)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.white,
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.primary,
        zIndex: 2,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    profileText: {
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: spacing.l,
        paddingTop: 10,
        paddingBottom: 40,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuLabel: {
        marginLeft: 15,
        color: colors.text,
    },
    glassLogoutBtn: {
        marginTop: 40,
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 71, 0, 0.2)',
    },
    logoutGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        position: 'absolute',
        top: '40%',
        left: '10%',
        right: '10%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
    },
    modalIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        width: '100%',
    },
    modalCancel: {
        flex: 1,
        height: 50,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalConfirm: {
        flex: 1,
        height: 50,
        backgroundColor: colors.primary,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
