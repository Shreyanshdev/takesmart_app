import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Image, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, {
    useAnimatedStyle,
    withTiming,
    useSharedValue,
    withSpring,
    withSequence
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import Svg, { Path } from 'react-native-svg';
import { useCartStore } from '../../store/cart.store';
import { useHomeStore } from '../../store/home.store';

const { width } = Dimensions.get('window');

// Premium Green Palette
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

    // Cart State
    const { items: cartItems } = useCartStore();
    const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    // Get up to 3 latest product images
    const cartImages = [...cartItems]
        .reverse()
        .slice(0, 3)
        .map(item => item.product.images?.[0])
        .filter(img => !!img);

    // Animation values
    const translateY = useSharedValue(100);
    const scale = useSharedValue(1);

    useEffect(() => {
        // Entry animation
        if (cartItemCount > 0) {
            // In modal/detail mode (showWithTabBar=false), we want it to stay at its base position (0)
            // In home mode (showWithTabBar=true), it responsive to tab bar visibility
            const targetY = showWithTabBar ? (isTabBarVisible ? 0 : 70) : 0;
            translateY.value = withSpring(targetY, {
                damping: 15,
                stiffness: 100
            });
        } else {
            translateY.value = withTiming(100);
        }
    }, [isTabBarVisible, cartItemCount, showWithTabBar]);

    useEffect(() => {
        // Pulse animation on item count change
        if (cartItemCount > 0) {
            scale.value = withSequence(
                withTiming(1.05, { duration: 100 }),
                withSpring(1, { damping: 12, stiffness: 200 })
            );
        }
    }, [cartItemCount]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { scale: scale.value }
        ],
        opacity: withTiming(cartItemCount > 0 ? 1 : 0),
    }));

    if (cartItemCount === 0) return null;

    const handleCartPress = () => {
        if (onPress) {
            onPress();
        } else {
            navigation.navigate('Checkout', { showAddressModal: true });
        }
    };

    const containerStyle = [
        styles.container,
        { bottom: Platform.OS === 'ios' ? (showWithTabBar ? 95 : 30) : (showWithTabBar ? 85 : 20) },
        offsetBottom !== undefined && { bottom: offsetBottom },
        animatedStyle
    ];

    return (
        <Animated.View style={containerStyle}>
            <TouchableOpacity
                style={styles.cartPill}
                onPress={handleCartPress}
                activeOpacity={0.9}
            >
                {/* Product Image Stack */}
                <View style={styles.imageStack}>
                    {cartImages.map((img, index) => (
                        <View
                            key={`cart-img-${index}`}
                            style={[
                                styles.imageWrapper,
                                { zIndex: 10 - index, marginLeft: index === 0 ? 0 : -20 }
                            ]}
                        >
                            <Image
                                source={{ uri: img }}
                                style={styles.productImg}
                                resizeMode="cover"
                            />
                        </View>
                    ))}
                </View>

                {/* Cart Info */}
                <View style={styles.infoContainer}>
                    <MonoText size="m" weight="bold" color={colors.white}>View cart</MonoText>
                    <MonoText size="s" color={colors.white} style={styles.itemCountText}>
                        {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
                    </MonoText>
                </View>

                {/* Chevron */}
                <View style={styles.chevronContainer}>
                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="3">
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
        left: spacing.m,
        right: spacing.m,
        zIndex: 1000,
        alignItems: 'center',
    },
    cartPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CART_GREEN,
        height: 60,
        borderRadius: 30,
        paddingHorizontal: 12,
        paddingRight: 8,
        maxWidth: width * 0.9,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    imageStack: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    imageWrapper: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: CART_GREEN,
        backgroundColor: colors.white,
        overflow: 'hidden',
    },
    productImg: {
        width: '100%',
        height: '100%',
    },
    infoContainer: {
        justifyContent: 'center',
        marginHorizontal: 6,
    },
    itemCountText: {
        opacity: 0.9,
        marginTop: -2,
    },
    chevronContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: DARK_GREEN,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
    },
});
