import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from './MonoText';

interface PillButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline';
    loading?: boolean;
    onPress: () => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const PillButton: React.FC<PillButtonProps> = ({
    title,
    variant = 'primary',
    loading = false,
    onPress,
    style,
    disabled,
    ...props
}) => {
    const scale = useSharedValue(1);

    const getBackgroundColor = () => {
        if (disabled) return colors.disabled;
        switch (variant) {
            case 'primary': return colors.primary;
            case 'secondary': return colors.secondary;
            case 'outline': return 'transparent';
            default: return colors.primary;
        }
    };

    const getTextColor = () => {
        if (disabled) return colors.textLight;
        switch (variant) {
            case 'primary': return colors.white;
            case 'secondary': return colors.primary;
            case 'outline': return colors.primary;
            default: return colors.white;
        }
    };

    const handlePressIn = () => {
        scale.value = withSpring(0.95);
        ReactNativeHapticFeedback.trigger('impactLight', {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false,
        });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    return (
        <AnimatedTouchableOpacity
            style={[
                styles.container,
                { backgroundColor: getBackgroundColor() },
                variant === 'outline' && styles.outline,
                animatedStyle,
                style,
            ]}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            activeOpacity={0.9}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <MonoText size="m" weight="bold" color={getTextColor()}>
                    {title}
                </MonoText>
            )}
        </AnimatedTouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    outline: {
        borderWidth: 1,
        borderColor: colors.primary,
    },
});
