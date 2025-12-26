import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Dimensions, Linking } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from './MonoText';

interface LocationPermissionModalProps {
    visible: boolean;
    onClose?: () => void;
    onRequestPermission: () => void;
}

const { width } = Dimensions.get('window');

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
    visible,
    onClose,
    onRequestPermission,
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                            <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <Circle cx="12" cy="10" r="3" />
                        </Svg>
                    </View>

                    <MonoText size="l" weight="bold" style={styles.title}>
                        Location Required
                    </MonoText>

                    <MonoText size="m" color={colors.textLight} style={styles.message}>
                        To ensure smooth delivery tracking for customers, please enable location services for this app.
                    </MonoText>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={onRequestPermission}
                    >
                        <MonoText weight="bold" color={colors.white}>Enable Location</MonoText>
                    </TouchableOpacity>

                    {onClose && (
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={onClose}
                        >
                            <MonoText color={colors.textLight}>Cancel</MonoText>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.l,
    },
    content: {
        width: '100%',
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: spacing.xl,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${colors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    title: {
        marginBottom: spacing.s,
        textAlign: 'center',
    },
    message: {
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 24,
    },
    primaryButton: {
        width: '100%',
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    secondaryButton: {
        paddingVertical: 8,
    },
});
