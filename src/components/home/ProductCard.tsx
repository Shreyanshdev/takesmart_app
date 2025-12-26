import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Pressable } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import Svg, { Path, Polyline, Line, Rect, Circle } from 'react-native-svg';

import { Product } from '../../services/customer/product.service';
import { useCartStore } from '../../store/cart.store'; // Import Store

interface ProductCardProps {
    product: Product;
    isSubscriptionEligible?: boolean;
    subscriptionOnly?: boolean; // New Prop
    onSubscribe?: (product: Product) => void;
    onPress?: (product: Product) => void;
    style?: any;
}

import { useSubscriptionCartStore } from '../../store/subscriptionCart.store';

// ... (existing helper function if any)

export const ProductCard = ({ product, isSubscriptionEligible = false, subscriptionOnly = false, onSubscribe, onPress, style }: ProductCardProps) => {
    const [imgError, setImgError] = useState<string | null>(null);
    const { addToCart, removeFromCart, getItemQuantity } = useCartStore();

    // Check Status in Subscription Cart
    const subCartItems = useSubscriptionCartStore(state => state.items);
    const isSubscribed = subCartItems.some(item => item.product._id === product._id);

    // Price Logic
    const effectivePrice = product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price;
    const originalPrice = product.price;
    const hasDiscount = effectivePrice < originalPrice;
    const discountPercent = hasDiscount ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100) : 0;
    const productImage = product.images?.length > 0 ? product.images[0] : product.image;

    const quantity = getItemQuantity(product._id);

    return (
        <Pressable
            style={[styles.container, style]}
            onPress={() => onPress?.(product)}
        >
            <View style={styles.imageContainer}>
                {!imgError && productImage ? (
                    <Image
                        source={{ uri: productImage }}
                        style={styles.productImage}
                        resizeMode="contain"
                        onError={() => setImgError('Failed')}
                    />
                ) : (
                    <View style={[styles.placeholderIcon, styles.center]}>
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <Circle cx="8.5" cy="8.5" r="1.5" />
                            <Polyline points="21 15 16 10 5 21" />
                        </Svg>
                    </View>
                )}

                {/* Discount Badge */}
                {hasDiscount && (
                    <View style={styles.discountBadge}>
                        <MonoText size="xxs" weight="bold" color={colors.white}>{discountPercent}% OFF</MonoText>
                    </View>
                )}

                {/* Subscription Badge */}
                {isSubscriptionEligible && (
                    <View style={[styles.subBadge, isSubscribed && styles.subBadgeActive]}>
                        <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <Polyline points="17 1 21 5 17 9" />
                            <Path d="M3 11V9a4 4 0 0 1 4-4h14" />
                            <Polyline points="7 23 3 19 7 15" />
                            <Path d="M21 13v2a4 4 0 0 1-4 4H3" />
                        </Svg>
                    </View>
                )}
            </View>

            <View style={styles.content}>
                <MonoText size="s" weight="bold" numberOfLines={1} style={styles.productName}>{product.name}</MonoText>

                {/* Unit Badge */}
                <View style={styles.unitBadge}>
                    <MonoText size="xs" weight="bold" color={colors.textLight}>
                        {product.formattedQuantity || (product.quantity ? `${product.quantity.value} ${product.quantity.unit}` : product.unit)}
                    </MonoText>
                </View>

                <View style={styles.midRow}>
                    <View style={styles.priceContainer}>
                        <MonoText size="m" weight="bold" color={colors.black}>₹{effectivePrice}</MonoText>
                        {hasDiscount && (
                            <MonoText size="xs" style={styles.mrp}>₹{originalPrice}</MonoText>
                        )}
                    </View>
                </View>

                {/* Actions: Grid Layout */}
                <View style={styles.actions}>
                    {!subscriptionOnly && (
                        <>
                            {/* Add / Counter Button */}
                            {quantity === 0 ? (
                                <TouchableOpacity style={[styles.actionBtn, styles.addBtn]} onPress={() => addToCart(product)}>
                                    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <Line x1="12" y1="5" x2="12" y2="19" />
                                        <Line x1="5" y1="12" x2="19" y2="12" />
                                    </Svg>
                                </TouchableOpacity>
                            ) : (
                                <View style={[styles.actionBtn, styles.qtyContainer]}>
                                    <TouchableOpacity onPress={() => removeFromCart(product._id)} style={styles.qtyControl}>
                                        <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                                            <Line x1="5" y1="12" x2="19" y2="12" />
                                        </Svg>
                                    </TouchableOpacity>
                                    <MonoText size="xs" weight="bold">{quantity}</MonoText>
                                    <TouchableOpacity onPress={() => addToCart(product)} style={styles.qtyControl}>
                                        <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                                            <Line x1="12" y1="5" x2="12" y2="19" />
                                            <Line x1="5" y1="12" x2="19" y2="12" />
                                        </Svg>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    )}

                    {/* Subscribe Button (Compact or Full) - Only if Eligible */}
                    {isSubscriptionEligible && (
                        <TouchableOpacity
                            style={[
                                styles.actionBtn,
                                styles.subBtn,
                                subscriptionOnly && { flex: 1, backgroundColor: colors.primary }, // Full width if only sub
                                isSubscribed && styles.subBtnActive,
                            ]}
                            onPress={() => onSubscribe?.(product)}
                        >
                            {subscriptionOnly ? (
                                <MonoText size="xs" weight="bold" color={colors.white}>Subscribe Now</MonoText>
                            ) : (
                                <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2">
                                    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <Polyline points="17 8 12 3 7 8" />
                                    <Line x1="12" y1="3" x2="12" y2="15" />
                                </Svg>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '48%',
        backgroundColor: colors.white,
        borderRadius: 16,
        marginBottom: spacing.m,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    imageContainer: {
        height: 140, // Slightly taller
        backgroundColor: '#FAFAFA',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: spacing.s,
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    discountBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#ef4444',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        zIndex: 10,
    },
    subBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: colors.primary, // Yellow
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    content: {
        padding: spacing.s,
    },
    productName: {
        marginBottom: 4,
    },
    unitBadge: {
        backgroundColor: '#F3F4F6',
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 4,
    },
    midRow: {
        marginVertical: spacing.xs,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    mrp: {
        textDecorationLine: 'line-through',
        color: colors.textLight,
        fontSize: 11,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: spacing.s,
    },
    actionBtn: {
        flex: 1,
        height: 36,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    addBtn: {
        backgroundColor: '#F3F4F6',
    },
    qtyContainer: {
        backgroundColor: '#F3F4F6',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    qtyControl: {
        padding: 4,
    },
    subBtn: {
        flex: 0.4, // Compact button for sub
        backgroundColor: colors.primary, // Yellow by default
    },
    subBtnActive: {
        backgroundColor: colors.black, // Black when added to subscription cart
    },
    subBadgeActive: {
        backgroundColor: colors.black, // Black when in cart
    },
    placeholderIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    }
});
