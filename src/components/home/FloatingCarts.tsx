import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, {
    useAnimatedStyle,
    withTiming,
    useSharedValue,
    withSpring,
    withSequence
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { MonoText } from '../shared/MonoText';
import Svg, { Path, Circle } from 'react-native-svg';
import { useCartStore } from '../../store/cart.store';
import { useHomeStore } from '../../store/home.store';

const CART_GREEN = '#2E7D32';
const DARK_GREEN = '#1B5E20';

export interface FloatingCartsProps {
    showWithTabBar?: boolean;
    offsetBottom?: number;
    onPress?: () => void;
}

export const FloatingCarts: React.FC<FloatingCartsProps> = ({
    showWithTabBar = true,
    offsetBottom,
    onPress
}) => {
    const navigation = useNavigation<any>();
    const isTabBarVisible = useHomeStore(state => state.isTabBarVisible);

    const { items: cartItems } = useCartStore();
    const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    const translateX = useSharedValue(200);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);

    useEffect(() => {
        if (cartItemCount > 0) {
            translateX.value = withSpring(0, { damping: 20, stiffness: 150 });
        } else {
            translateX.value = withTiming(200, { duration: 300 });
        }
    }, [cartItemCount]);

    useEffect(() => {
        const dropOffset = Platform.OS === 'ios' ? 14 : 10;
        translateY.value = withTiming(isTabBarVisible ? 0 : dropOffset, { duration: 300 });
    }, [isTabBarVisible]);

    useEffect(() => {
        if (cartItemCount > 0) {
            scale.value = withSequence(
                withTiming(1.03, { duration: 100 }),
                withSpring(1, { damping: 12, stiffness: 200 })
            );
        }
    }, [cartItemCount]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value }
        ],
    }));

    const handleCartPress = () => {
        if (onPress) {
            onPress();
        } else {
            navigation.navigate('Checkout', { showAddressModal: true });
        }
    };

    const defaultBottom = Platform.OS === 'ios' ? (showWithTabBar ? 34 : 20) : (showWithTabBar ? 20 : 10);

    return (
        <Animated.View style={[
            styles.container,
            { bottom: offsetBottom !== undefined ? offsetBottom : defaultBottom },
            animatedStyle
        ]}>
            <TouchableOpacity
                style={styles.cartPill}
                onPress={handleCartPress}
                activeOpacity={0.9}
            >
                <View style={styles.cartIconWrapper}>
                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <Circle cx="9" cy="21" r="1" />
                        <Circle cx="20" cy="21" r="1" />
                        <Path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </Svg>
                </View>

                <View style={styles.infoContainer}>
                    <MonoText size="s" weight="bold" color={colors.white}>View cart</MonoText>
                    <MonoText size="xs" color={colors.white} style={styles.itemCountText}>
                        {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
                    </MonoText>
                </View>

                <View style={styles.chevronContainer}>
                    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="3">
                        <Path d="M9 18l6-6-6-6" />
                    </Svg>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 0,
        zIndex: 1000,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: -4, height: 6 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
            },
            android: { elevation: 8 },
        }),
    },
    cartPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CART_GREEN,
        height: 56,                  // Smaller overall height
        borderTopLeftRadius: 28,     // Matches new height for perfect half-circle
        borderBottomLeftRadius: 28,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        paddingLeft: 8,              // Tighter padding
        paddingRight: 12,
    },
    cartIconWrapper: {
        width: 38,                   // Smaller icon circle
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    infoContainer: {
        justifyContent: 'center',
        marginHorizontal: 4,
    },
    itemCountText: {
        opacity: 0.9,
        marginTop: -1,
    },
    chevronContainer: {
        width: 28,                   // Smaller chevron circle
        height: 28,
        borderRadius: 14,
        backgroundColor: DARK_GREEN,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
});