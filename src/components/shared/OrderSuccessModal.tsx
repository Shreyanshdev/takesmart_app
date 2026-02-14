import React, { useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Dimensions,
    Animated as RNAnimated,
    Modal,
    TouchableWithoutFeedback,
    ActivityIndicator,
} from 'react-native';
import { colors } from '../../theme/colors';
import { MonoText } from './MonoText';
import Svg, { Path, Line } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface OrderSuccessModalProps {
    visible: boolean;
    type: 'success' | 'error' | 'loading';
    title: string;
    message: string;
    primaryButtonText: string;
    secondaryButtonText?: string;
    onPrimaryPress: () => void;
    onSecondaryPress?: () => void;
    onClose: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
    visible,
    type,
    title,
    message,
    primaryButtonText,
    secondaryButtonText,
    onPrimaryPress,
    onSecondaryPress,
    onClose,
}) => {
    const iconScale = useRef(new RNAnimated.Value(0)).current;
    const iconRotate = useRef(new RNAnimated.Value(0)).current;
    const button1Opacity = useRef(new RNAnimated.Value(0)).current;
    const button2Opacity = useRef(new RNAnimated.Value(0)).current;
    const backdropOpacity = useRef(new RNAnimated.Value(0)).current;

    useEffect(() => {
        console.log('OrderSuccessModal visibility changed:', visible, 'type:', type, 'title:', title);
        if (visible) {
            // Reset and start animations
            iconScale.setValue(0);
            iconRotate.setValue(0);
            button1Opacity.setValue(0);
            button2Opacity.setValue(0);
            backdropOpacity.setValue(0);

            // Fade in backdrop
            RNAnimated.timing(backdropOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Start animations sequentially
            RNAnimated.sequence([
                // Icon animation
                RNAnimated.parallel([
                    RNAnimated.spring(iconScale, {
                        toValue: 1,
                        tension: 50,
                        friction: 7,
                        useNativeDriver: true,
                    }),
                    RNAnimated.timing(iconRotate, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ]),
                // Button animations
                RNAnimated.parallel([
                    RNAnimated.timing(button1Opacity, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    RNAnimated.timing(button2Opacity, {
                        toValue: 1,
                        duration: 300,
                        delay: 100,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();
        } else {
            // Fade out backdrop
            RNAnimated.timing(backdropOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, title, type]);

    const iconRotation = iconRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // Don't render if title is empty (invalid state)
    if (!title || !visible) {
        return null;
    }

    const renderIcon = () => {
        if (type === 'loading') {
            return (
                <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}10` }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            );
        }

        const iconColor = type === 'success' ? colors.primary : '#EF4444';
        const bgColor = type === 'success' ? `${colors.primary}20` : '#EF444420';

        return (
            <RNAnimated.View
                style={[
                    styles.iconContainer,
                    { backgroundColor: bgColor },
                    {
                        transform: [
                            { scale: iconScale },
                            { rotate: type === 'success' ? iconRotation : '0deg' },
                        ],
                    },
                ]}
            >
                {type === 'success' ? (
                    <Svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <Path
                            d="M20 6L9 17L4 12"
                            stroke={iconColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                ) : (
                    <Svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <Line
                            x1="18"
                            y1="6"
                            x2="6"
                            y2="18"
                            stroke={iconColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                        <Line
                            x1="6"
                            y1="6"
                            x2="18"
                            y2="18"
                            stroke={iconColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                    </Svg>
                )}
            </RNAnimated.View>
        );
    };

    // Determine if modal can be dismissed (only errors should be dismissible via back/tap)
    const isDismissible = type === 'error';

    const handleBackdropPress = () => {
        // Only allow backdrop dismiss for errors
        if (isDismissible) {
            onClose();
        }
    };

    const handleRequestClose = () => {
        // Only allow hardware back button to close for errors
        if (isDismissible) {
            onClose();
        }
        // Do nothing for loading/success - user must use the buttons
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleRequestClose}
        >
            <TouchableWithoutFeedback onPress={handleBackdropPress}>
                <RNAnimated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                    <TouchableWithoutFeedback>
                        <View style={styles.container}>
                            <View style={styles.modalContent}>
                                {/* Icon */}
                                {renderIcon()}

                                {/* Title */}
                                <MonoText size="xl" weight="bold" style={styles.title}>
                                    {title}
                                </MonoText>

                                {/* Message */}
                                <MonoText size="m" color={colors.textLight} style={styles.message}>
                                    {message}
                                </MonoText>

                                {/* Buttons - Hide during loading */}
                                {type !== 'loading' && (
                                    <View style={styles.buttonsContainer}>
                                        {/* Primary Button */}
                                        <RNAnimated.View style={[styles.buttonWrapper, { opacity: button1Opacity }]}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.button,
                                                    styles.primaryButton,
                                                    { backgroundColor: type === 'success' ? colors.primary : '#EF4444' },
                                                ]}
                                                onPress={onPrimaryPress}
                                                activeOpacity={0.8}
                                            >
                                                <MonoText size="m" weight="bold" color={colors.white}>
                                                    {primaryButtonText}
                                                </MonoText>
                                            </TouchableOpacity>
                                        </RNAnimated.View>

                                        {/* Secondary Button */}
                                        {secondaryButtonText && onSecondaryPress && (
                                            <RNAnimated.View style={[styles.buttonWrapper, { opacity: button2Opacity }]}>
                                                <TouchableOpacity
                                                    style={[styles.button, styles.secondaryButton]}
                                                    onPress={onSecondaryPress}
                                                    activeOpacity={0.8}
                                                >
                                                    <MonoText size="m" weight="bold" color={colors.primary}>
                                                        {secondaryButtonText}
                                                    </MonoText>
                                                </TouchableOpacity>
                                            </RNAnimated.View>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </RNAnimated.View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '100%',
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.3,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 10 },
            },
            android: {
                elevation: 10,
            },
        }),
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        textAlign: 'center',
        marginBottom: 12,
    },
    message: {
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    buttonsContainer: {
        width: '100%',
        gap: 12,
    },
    buttonWrapper: {
        width: '100%',
    },
    button: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
            },
            android: {
                elevation: 4,
            },
        }),
    },
    primaryButton: {
        // backgroundColor set dynamically
    },
    secondaryButton: {
        backgroundColor: colors.white,
        borderWidth: 2,
        borderColor: colors.primary,
    },
});

export default OrderSuccessModal;
