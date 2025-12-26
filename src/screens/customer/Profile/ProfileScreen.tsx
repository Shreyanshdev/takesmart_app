import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, ActivityIndicator, Alert, StatusBar, Platform, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, Polyline, Line, G } from 'react-native-svg';
import { BlurView } from '@react-native-community/blur';
import { MonoText } from '../../../components/shared/MonoText';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useAuthStore } from '../../../store/authStore';
import { api } from '../../../services/core/api';
import { storage } from '../../../services/core/storage';
import { logger } from '../../../utils/logger';

const APP_VERSION = "0.0.1";

// Icons 
const Icons = {
    Back: () => (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M19 12H5" />
            <Path d="M12 19l-7-7 7-7" />
        </Svg>
    ),
    User: () => (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <Circle cx="12" cy="7" r="4" />
        </Svg>
    ),
    Mail: () => (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <Polyline points="22,6 12,13 2,6" />
        </Svg>
    ),
    Phone: () => (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </Svg>
    ),
    MapPin: () => (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <Circle cx="12" cy="10" r="3" />
        </Svg>
    ),
    CreditCard: () => (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <Line x1="1" y1="10" x2="23" y2="10" />
        </Svg>
    ),
    Shield: () => (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </Svg>
    ),
    ChevronRight: () => (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="9 18 15 12 9 6" />
        </Svg>
    ),
    LogOut: () => (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <Polyline points="16 17 21 12 16 7" />
            <Line x1="21" y1="12" x2="9" y2="12" />
        </Svg>
    )
};

// Helper for rect since it's not exported by default sometimes or requires destructuring
const Rect = ({ x, y, width, height, rx, ry }: any) => (
    <Path d={`M${Number(x) + Number(rx)} ${y} h${width - 2 * rx} a${rx} ${rx} 0 0 1 ${rx} ${rx} v${height - 2 * ry} a${rx} ${rx} 0 0 1 -${rx} ${rx} h-${width - 2 * rx} a${rx} ${rx} 0 0 1 -${rx} -${rx} v-${height - 2 * ry} a${rx} ${rx} 0 0 1 ${rx} -${rx} z`} />
    // Fallback path attempt for rect if Rect component issues occur, but Svg usually has Rect. 
    // Let's use <Path> to be safe if 'react-native-svg' Rect import is flaky in some envs, 
    // but standard lib has it. I'll stick to Path for the CreditCard Rect to be 100% safe.
    // Rect path mock: 
);

const CreditCardIcon = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
        <Line x1="1" y1="10" x2="23" y2="10" />
    </Svg>
);


const LogoutModal = ({ visible, onClose, onConfirm }: { visible: boolean, onClose: () => void, onConfirm: () => void }) => (
    <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
    >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalIconBg}>
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <Polyline points="16 17 21 12 16 7" />
                        <Line x1="21" y1="12" x2="9" y2="12" />
                    </Svg>
                </View>
                <MonoText size="l" weight="bold" style={styles.modalTitle}>Log Out?</MonoText>
                <MonoText size="m" color={colors.textLight} style={styles.modalText}>
                    Are you sure you want to log out of your account?
                </MonoText>

                <View style={styles.modalActions}>
                    <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={onClose}>
                        <MonoText weight="bold" color={colors.text}>Cancel</MonoText>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalBtn, styles.logoutBtn]} onPress={onConfirm}>
                        <MonoText weight="bold" color={colors.white}>Log Out</MonoText>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

export const ProfileScreen = () => {
    const navigation = useNavigation<any>();
    const { user, logout, updateUser } = useAuthStore();

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);

    // Fetch latest profile from backend on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/auth/user');
                const userData = response.data.user;
                if (userData) {
                    // Update local state with fetched data
                    setName(userData.name || '');
                    setEmail(userData.email || '');
                    // Update store and storage with latest data
                    updateUser({ name: userData.name, email: userData.email });
                    await storage.setUser({ ...user, ...userData });
                }
            } catch (error) {
                logger.error('Failed to fetch profile:', error);
                // Fallback to stored user data
                if (user) {
                    setName(user.name || '');
                    setEmail(user.email || '');
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, []);

    useEffect(() => {
        if (user && !isLoading) {
            setName(user.name || '');
            setEmail(user.email || '');
        }
    }, [user, isLoading]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.put('/profile', { name, email });
            updateUser({ name, email });
            const currentUser = await storage.getUser();
            // Fallback: If no user in storage, use the current name/email/phone from store/state
            const updatedUser = currentUser ? { ...currentUser, name, email } : { ...user, name, email };
            await storage.setUser(updatedUser);
            Alert.alert("Success", "Profile updated successfully");
        } catch (error) {
            logger.error('Profile update error:', error);
            Alert.alert("Error", "Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        setLogoutModalVisible(false);
        setTimeout(() => {
            logout();
        }, 200);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Glass Header */}
            <View style={styles.header}>
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="light"
                    blurAmount={20}
                    reducedTransparencyFallbackColor="white"
                />

                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Icons.Back />
                    </TouchableOpacity>

                    {/* Profile Info on Right */}
                    <View style={styles.headerProfile}>
                        <View style={styles.headerTextInfo}>
                            <MonoText size="m" weight="bold">{name || 'Guest User'}</MonoText>
                            <MonoText size="xs" color={colors.textLight}>{user?.phone || ''}</MonoText>
                        </View>
                        <View style={styles.avatarContainer}>
                            <MonoText size="m" weight="bold" color={colors.white}>
                                {name ? name.charAt(0).toUpperCase() : 'U'}
                            </MonoText>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Editable Form */}
                <View style={styles.section}>
                    <MonoText size="m" weight="bold" style={styles.sectionTitle}>Personal Details</MonoText>

                    <View style={styles.inputGroup}>
                        <MonoText size="xs" color={colors.textLight} style={styles.label}>Full Name</MonoText>
                        <View style={styles.inputContainer}>
                            <Icons.User />
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your name"
                                placeholderTextColor={colors.textLight}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <MonoText size="xs" color={colors.textLight} style={styles.label}>Email Address</MonoText>
                        <View style={styles.inputContainer}>
                            <Icons.Mail />
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter your email"
                                placeholderTextColor={colors.textLight}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={[styles.inputGroup, { opacity: 0.7 }]}>
                        <MonoText size="xs" color={colors.textLight} style={styles.label}>Phone Number</MonoText>
                        <View style={[styles.inputContainer, { backgroundColor: '#F5F5F5', borderColor: 'transparent' }]}>
                            <Icons.Phone />
                            <TextInput
                                style={[styles.input, { color: colors.textLight }]}
                                value={user?.phone || ''}
                                editable={false}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? <ActivityIndicator color={colors.white} /> : <MonoText weight="bold" color={colors.white}>Save Changes</MonoText>}
                    </TouchableOpacity>
                </View>

                {/* Additional Info Section */}
                <View style={styles.section}>
                    <MonoText size="m" weight="bold" style={styles.sectionTitle}>Additional Info</MonoText>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AddressSelection')}>
                        <View style={styles.menuIconBg}>
                            <Icons.MapPin />
                        </View>
                        <MonoText style={styles.menuText}>My Addresses</MonoText>
                        <Icons.ChevronRight />
                    </TouchableOpacity>


                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('SubscriptionHistory')}>
                        <View style={[styles.menuIconBg, { backgroundColor: '#E0F2FE' }]}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <Circle cx="12" cy="12" r="10" />
                                <Polyline points="12 6 12 12 16 14" />
                            </Svg>
                        </View>
                        <MonoText style={styles.menuText}>Subscription History</MonoText>
                        <Icons.ChevronRight />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('PrivacyPolicy')}>
                        <View style={styles.menuIconBg}>
                            <Icons.Shield />
                        </View>
                        <MonoText style={styles.menuText}>Privacy Policy</MonoText>
                        <Icons.ChevronRight />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Feedback')}>
                        <View style={[styles.menuIconBg, { backgroundColor: '#F0F9FF' }]}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </Svg>
                        </View>
                        <MonoText style={styles.menuText}>Share Feedback</MonoText>
                        <Icons.ChevronRight />
                    </TouchableOpacity>
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutRow} onPress={() => setLogoutModalVisible(true)}>
                    <Icons.LogOut />
                    <MonoText weight="bold" color={colors.error}>Log Out</MonoText>
                </TouchableOpacity>

                {/* Version Info */}
                <View style={styles.versionContainer}>
                    <MonoText size="xs" color={colors.textLight}>App Version {APP_VERSION}</MonoText>
                </View>

            </ScrollView>

            <LogoutModal
                visible={logoutModalVisible}
                onClose={() => setLogoutModalVisible(false)}
                onConfirm={handleLogout}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        backgroundColor: 'rgba(255,255,255,0.8)',
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 50,
        paddingBottom: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        overflow: 'hidden',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.m,
    },
    headerProfile: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s,
    },
    headerTextInfo: {
        alignItems: 'flex-end',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.m,
    },
    avatarContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.m,
    },
    profileInfo: {
        flex: 1,
    },
    content: {
        padding: spacing.l,
        paddingTop: spacing.m,
    },
    section: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.m,
        marginBottom: spacing.l,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: {
        marginBottom: spacing.m,
    },
    inputGroup: {
        marginBottom: spacing.m,
    },
    label: {
        marginBottom: 6,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: spacing.m,
        height: 50,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    input: {
        flex: 1,
        marginLeft: spacing.s,
        fontSize: 15,
        color: colors.text,
    },
    saveBtn: {
        backgroundColor: colors.black,
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.s,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.m + 4,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    menuIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0FDF4', // Light green matches theme
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.m,
    },
    menuText: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
        fontWeight: '500',
    },
    logoutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.s,
        padding: spacing.m,
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
        marginBottom: spacing.xl,
    },
    versionContainer: {
        alignItems: 'center',
        paddingBottom: spacing.xl,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.l,
    },
    modalContent: {
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: spacing.l,
        width: '100%',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    modalIconBg: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.m,
    },
    modalTitle: {
        marginBottom: spacing.xs,
    },
    modalText: {
        textAlign: 'center',
        marginBottom: spacing.l,
    },
    modalActions: {
        flexDirection: 'row',
        gap: spacing.m,
        width: '100%',
    },
    modalBtn: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtn: {
        backgroundColor: '#F3F4F6',
    },
    logoutBtn: {
        backgroundColor: colors.error,
    }
});
