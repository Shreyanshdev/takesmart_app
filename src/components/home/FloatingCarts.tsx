import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import Svg, { Path, Polyline, Circle } from 'react-native-svg';
import { useCartStore } from '../../store/cart.store';
import { useSubscriptionCartStore } from '../../store/subscriptionCart.store';
import { useHomeStore } from '../../store/home.store';

const { width } = Dimensions.get('window');

export const FloatingCarts = () => {
    const navigation = useNavigation<any>();
    const isTabBarVisible = useHomeStore(state => state.isTabBarVisible);

    // Regular Cart (Green)
    const { items: cartItems, getTotalPrice: getCartTotal } = useCartStore();
    const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const cartTotal = getCartTotal();

    // Subscription Cart (Red)
    const { items: subItems } = useSubscriptionCartStore();
    const subItemCount = subItems.length;

    // Animation
    const translateY = useSharedValue(0);

    useEffect(() => {
        // If tab bar is visible (bottom 0), carts should be higher (e.g., bottom 80).
        // If tab bar is hidden (translated down), carts should move down to fill space (bottom 20).
        // But user said: "floating like if bottom bar collapse slightly below according bottombar state they also move"
        // This usually means they stick to the tab bar top.
        // Let's assume TabBar height is ~80px.
        translateY.value = withTiming(isTabBarVisible ? 0 : 60, { duration: 300 });
    }, [isTabBarVisible]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    if (cartItemCount === 0 && subItemCount === 0) return null;

    // Regular Cart Press
    const handleCartPress = () => {
        navigation.navigate('AddressSelection', { mode: 'cart' });
    };

    // Subscription Cart Press
    const handleSubPress = () => {
        if (subItems.length > 0) {
            navigation.navigate('AddressSelection', {
                mode: 'subscription',
                subscriptionItems: subItems
            });
        }
    };

    const hasBoth = cartItemCount > 0 && subItemCount > 0;

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            {/* Subscription Cart Indicator (Red) */}
            {subItemCount > 0 && (
                <TouchableOpacity
                    style={[
                        styles.cartPill,
                        styles.subPill,
                        hasBoth ? styles.halfWidth : styles.centeredHalf
                    ]}
                    onPress={handleSubPress}
                    activeOpacity={0.9}
                >
                    <View style={styles.iconRow}>
                        <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2">
                            <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            <Polyline points="23 4 23 10 17 10" />
                        </Svg>
                        <MonoText size="xs" weight="bold" color={colors.white}>{subItemCount} Items</MonoText>
                    </View>
                </TouchableOpacity>
            )}

            {/* Regular Cart Indicator (Green) */}
            {cartItemCount > 0 && (
                <TouchableOpacity
                    style={[
                        styles.cartPill,
                        styles.regPill,
                        hasBoth ? styles.halfWidth : styles.centeredHalf
                    ]}
                    onPress={handleCartPress}
                    activeOpacity={0.9}
                >
                    <View style={styles.iconRow}>
                        <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2">
                            <Circle cx="9" cy="21" r="1" />
                            <Circle cx="20" cy="21" r="1" />
                            <Path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </Svg>
                        <MonoText size="xs" weight="bold" color={colors.white}>{cartItemCount} Items | ₹{cartTotal}</MonoText>
                    </View>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 70, // Initial position above TabBar
        left: spacing.m,
        right: spacing.m,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.m,
        zIndex: 100,
    },
    cartPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 24, // More rounded as requested
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    halfWidth: {
        flex: 1,
    },
    centeredHalf: {
        width: '50%',
        alignSelf: 'center',
        marginHorizontal: 'auto', // For centering in flex container (though alignSelf works)
        left: '25%', // Hack to center absolutely if needed, but in flex row justifyContent center works better.
        // Actually, since container is 'space-between', if only one item, it sits on left. 
        // We need to override container behavior or use margin. 
        // Let's rely on margins or flex properties. 
        // Actually simplest way: if !hasBoth, set container logic to justify-center? 
        // But styles are static.
        // Let's use 'width: 50%' and 'marginLeft: auto', 'marginRight: auto'
        marginLeft: 'auto',
        marginRight: 'auto',
    },
    subPill: {
        backgroundColor: '#EF4444',
    },
    regPill: {
        backgroundColor: colors.success,
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
});
