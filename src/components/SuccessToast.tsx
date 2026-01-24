import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    withSequence,
    runOnJS,
} from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { MonoText } from './shared/MonoText';
import { useToastStore } from '../store/toast.store';

const { width } = Dimensions.get('window');

export const SuccessToast = () => {
    const { visible, message, type, hideToast } = useToastStore();
    const translateY = useSharedValue(-100);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            opacity.value = withSpring(1);
            translateY.value = withSpring(60, { damping: 15, stiffness: 100 });

            // Auto hide after 2 seconds
            const timer = setTimeout(() => {
                hideToast();
            }, 2500);

            return () => clearTimeout(timer);
        } else {
            opacity.value = withSpring(0);
            translateY.value = withSpring(-100);
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    const getBorderColor = () => {
        if (type === 'success') {
            return 'rgba(239, 68, 68, 0.2)';
        } else if (type === 'warning') {
            return 'rgba(245, 158, 11, 0.2)';
        }
        return 'rgba(16, 185, 129, 0.2)';
    };

    return (
        <Animated.View style={[styles.container, { borderColor: getBorderColor() }, animatedStyle]}>
            <BlurView
                style={StyleSheet.absoluteFill}
                blurType="light"
                blurAmount={15}
                reducedTransparencyFallbackColor="white"
            />
            <View style={styles.content}>
                <View style={[
                    styles.iconContainer,
                    type === 'success' && styles.iconContainerSuccess,
                    type === 'warning' && styles.iconContainerWarning,
                    type === 'info' && styles.iconContainerInfo
                ]}>
                    {type === 'success' ? (
                        // Heart icon for wishlist/success messages
                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="#EF4444" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </Svg>
                    ) : type === 'warning' ? (
                        // Warning triangle for stock limit messages
                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <Line x1="12" y1="9" x2="12" y2="13" stroke="#FFFFFF" strokeWidth="2.5" />
                            <Line x1="12" y1="17" x2="12.01" y2="17" stroke="#FFFFFF" strokeWidth="2.5" />
                        </Svg>
                    ) : (
                        // Info circle for general messages
                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <Circle cx="12" cy="12" r="10" />
                            <Line x1="12" y1="8" x2="12" y2="12" />
                            <Line x1="12" y1="16" x2="12.01" y2="16" />
                        </Svg>
                    )}
                </View>
                <MonoText size="s" weight="bold" color={colors.text} style={styles.message}>
                    {message}
                </MonoText>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: spacing.l,
        right: spacing.l,
        height: 54,
        borderRadius: 27,
        overflow: 'hidden',
        zIndex: 10000,
        elevation: 10000,
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.m,
    },
    iconContainer: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.s,
    },
    iconContainerSuccess: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    iconContainerWarning: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
    },
    iconContainerInfo: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
    },
    message: {
        flex: 1,
    },
});
