import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle, DimensionValue, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withRepeat,
    withTiming,
    useSharedValue,
    interpolate,
    Easing
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

interface SkeletonItemProps {
    width: DimensionValue;
    height: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export const SkeletonItem = ({ width, height, borderRadius = 4, style }: SkeletonItemProps) => {
    const shimmerProgress = useSharedValue(0);

    useEffect(() => {
        shimmerProgress.value = withRepeat(
            withTiming(1, {
                duration: 1500,
                easing: Easing.bezier(0.4, 0, 0.6, 1),
            }),
            -1,
            false
        );
    }, [shimmerProgress]);

    const animatedStyle = useAnimatedStyle(() => {
        const translateX = interpolate(
            shimmerProgress.value,
            [0, 1],
            [-200, 200]
        );
        return {
            transform: [{ translateX }],
        };
    });

    return (
        <View
            style={[
                styles.container,
                { width, height, borderRadius },
                style
            ]}
        >
            <AnimatedLinearGradient
                colors={['transparent', 'rgba(255, 255, 255, 0.4)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFill, animatedStyle]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#E2E8F0',
        overflow: 'hidden',
    },
});
