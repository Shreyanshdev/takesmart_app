import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Platform,
    StatusBar,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/core/socket.service';

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
    const { user, logout } = useAuthStore();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const partnerName = user?.name || 'Partner';
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
                isPrimary ? styles.headerPrimary : styles.headerWhite
            ]}>
                {showProfile ? (
                    <View style={styles.greetingRow}>
                        <View style={styles.profileCircle}>
                            <MonoText size="m" weight="bold" color={colors.white}>
                                {partnerName.charAt(0).toUpperCase()}
                            </MonoText>
                        </View>
                        <View style={styles.greetingText}>
                            <MonoText size="xs" color={isPrimary ? colors.text : colors.textLight}>
                                Hello,
                            </MonoText>
                            <MonoText size="l" weight="bold" color={isPrimary ? colors.black : colors.text}>
                                {partnerName}
                            </MonoText>
                        </View>
                    </View>
                ) : (
                    <MonoText size="xl" weight="bold" color={isPrimary ? colors.black : colors.text}>
                        {title}
                    </MonoText>
                )}

                <TouchableOpacity
                    style={[
                        styles.logoutButton,
                        isPrimary ? styles.logoutButtonPrimary : styles.logoutButtonWhite
                    ]}
                    onPress={() => setShowLogoutModal(true)}
                    activeOpacity={0.7}
                >
                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isPrimary ? colors.error : colors.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <Path d="M16 17l5-5-5-5" />
                        <Path d="M21 12H9" />
                    </Svg>
                    <MonoText size="xs" weight="semiBold" color={colors.error} style={{ marginLeft: 4 }}>
                        Logout
                    </MonoText>
                </TouchableOpacity>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + spacing.m : 50,
        paddingBottom: spacing.m,
        paddingHorizontal: spacing.m,
    },
    headerPrimary: {
        backgroundColor: colors.primary,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
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
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.s,
        borderWidth: 2,
        borderColor: colors.white,
    },
    greetingText: {
        justifyContent: 'center',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
        borderRadius: 20,
    },
    logoutButtonPrimary: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    logoutButtonWhite: {
        backgroundColor: `${colors.error}10`,
        borderWidth: 1,
        borderColor: `${colors.error}30`,
    },
    // Modal styles
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
