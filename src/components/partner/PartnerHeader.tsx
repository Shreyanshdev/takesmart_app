import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Platform,
    StatusBar,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/core/socket.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PartnerHeaderProps {
    title?: string;
    showProfile?: boolean;
    variant?: 'primary' | 'white';
}

export const PartnerHeader: React.FC<PartnerHeaderProps> = ({
    title,
    showProfile = true,
    variant = 'primary',
}) => {
    const insets = useSafeAreaInsets();
    const { user, logout } = useAuthStore();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const partnerName = user?.name || 'Valued Partner';
    const isPrimary = variant === 'primary';

    const handleLogout = () => {
        // Disconnect socket before logout
        socketService.disconnect();
        logout();
        setShowLogoutModal(false);
    };

    return (
        <>
            <View style={[
                styles.header,
                isPrimary ? styles.headerPrimary : styles.headerWhite,
                { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : insets.top + (Platform.OS === 'ios' ? 10 : 0) }
            ]}>
                <View style={styles.headerInner}>
                    {showProfile ? (
                        <View style={styles.greetingRow}>
                            <View style={styles.profileCircle}>
                                <MonoText size="l" weight="bold" color={isPrimary ? colors.primary : colors.white}>
                                    {partnerName.charAt(0).toUpperCase()}
                                </MonoText>
                            </View>
                            <View style={styles.greetingText}>
                                <MonoText
                                    size="s"
                                    color={isPrimary ? `${colors.white}CC` : colors.textLight}
                                    style={styles.greetingSub}
                                >
                                    Hello,
                                </MonoText>
                                <MonoText
                                    size="xl"
                                    weight="bold"
                                    color={isPrimary ? colors.white : colors.text}
                                    style={styles.greetingMain}
                                >
                                    {partnerName}
                                </MonoText>
                            </View>
                        </View>
                    ) : (
                        <MonoText
                            size="l"
                            weight="bold"
                            color={isPrimary ? colors.white : colors.text}
                            style={styles.title}
                        >
                            {title}
                        </MonoText>
                    )}

                    <TouchableOpacity
                        onPress={() => setShowLogoutModal(true)}
                        activeOpacity={0.7}
                    >
                        <View style={[
                            styles.logoutButton,
                            isPrimary ? styles.logoutButtonPrimary : styles.logoutButtonWhite
                        ]}>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isPrimary ? colors.white : colors.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <Path d="M16 17l5-5-5-5" />
                                <Path d="M21 12H9" />
                            </Svg>
                            <MonoText
                                size="xs"
                                weight="semiBold"
                                color={isPrimary ? colors.white : colors.error}
                                style={{ marginLeft: 4 }}
                            >
                                Logout
                            </MonoText>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Logout Confirmation Modal */}
            <Modal
                visible={showLogoutModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowLogoutModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Icon */}
                        <View style={styles.modalIconContainer}>
                            <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth="2">
                                <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <Path d="M16 17l5-5-5-5" />
                                <Path d="M21 12H9" />
                            </Svg>
                        </View>

                        {/* Title */}
                        <MonoText size="l" weight="bold" style={styles.modalTitle}>
                            Logout
                        </MonoText>

                        {/* Message */}
                        <MonoText size="s" color={colors.textLight} style={styles.modalMessage}>
                            Are you sure you want to logout?{'\n'}You will need to login again to continue deliveries.
                        </MonoText>

                        {/* Buttons */}
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowLogoutModal(false)}
                                activeOpacity={0.7}
                            >
                                <MonoText size="s" weight="semiBold" color={colors.text}>
                                    Cancel
                                </MonoText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={handleLogout}
                                activeOpacity={0.7}
                            >
                                <MonoText size="s" weight="bold" color={colors.white}>
                                    Yes, Logout
                                </MonoText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    header: {
        zIndex: 100,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingBottom: spacing.m,
        paddingHorizontal: spacing.m,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    headerInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerPrimary: {
        backgroundColor: colors.primary,
    },
    headerWhite: {
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    greetingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    profileCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.s,
    },
    greetingText: {
        justifyContent: 'center',
    },
    greetingSub: {
        lineHeight: 18,
    },
    greetingMain: {
        lineHeight: 24,
    },
    title: {
        fontSize: 20,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
        borderRadius: 20,
    },
    logoutButtonPrimary: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    logoutButtonWhite: {
        backgroundColor: `${colors.error}10`,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.l,
    },
    modalContent: {
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: spacing.l,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
    },
    modalIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: `${colors.error}15`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.m,
    },
    modalTitle: {
        marginBottom: spacing.xs,
    },
    modalMessage: {
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.l,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: spacing.s,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: colors.error,
        alignItems: 'center',
    },
});
