import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Pressable, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import Svg, { Path, Polyline, Line, Rect, Circle, G } from 'react-native-svg';

import { Product } from '../../services/customer/product.service';
import { useCartStore } from '../../store/cart.store';
import { useToastStore } from '../../store/toast.store';

interface ProductCardProps {
    product: Product;
    variantSelected?: any; // Specific variant if exploded
    onPress?: (product: Product, variantId?: string) => void;
    style?: any;
}

export const ProductCard = ({ product, variantSelected, onPress, style }: ProductCardProps) => {
    const [imgError, setImgError] = useState<string | null>(null);
    const { addToCart, removeFromCart, getItemQuantity } = useCartStore();
    const { showToast } = useToastStore();

    // Use the specific variant passed from HomeScreen, or default to the first one
    const variant = variantSelected || (product as any).variants?.[0];
    const isOutOfStock = variant ? (variant.stock <= 0 || !variant.isAvailable) : false;

    // Standardize the item ID for cart operations
    const cartItemId = variant?._id || variant?.inventoryId || product._id;

    // Price Logic
    const inventoryPricing = variant?.pricing;
    const effectivePrice = inventoryPricing ? inventoryPricing.sellingPrice : (product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price);
    const originalPrice = inventoryPricing ? inventoryPricing.mrp : product.price;
    const hasDiscount = effectivePrice < originalPrice;

    const discountPercent = inventoryPricing
        ? (inventoryPricing.discount > 0 ? inventoryPricing.discount : (hasDiscount ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100) : 0))
        : (hasDiscount ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100) : 0);

    // Prioritize variant images over product images
    const variantImages = variant?.variant?.images;
    const productImage = (variantImages && variantImages.length > 0)
        ? variantImages[0]
        : (product.images?.length > 0 ? product.images[0] : product.image);
    const quantity = getItemQuantity(cartItemId);

    const handleAdd = () => {
        const success = addToCart({
            ...product,
            _id: cartItemId, // Ensure we use the specific variant ID in the cart
            name: product.name,
            image: productImage || '',
            price: originalPrice,
            discountPrice: effectivePrice,
            stock: variant?.stock || 0,
            quantity: variant?.variant ? {
                value: variant.variant.weightValue,
                unit: variant.variant.weightUnit
            } : undefined,
            formattedQuantity: variant?.variant ? `${variant.variant.weightValue} ${variant.variant.weightUnit}` : undefined
        } as any);
        
        if (!success) {
            const currentQuantity = getItemQuantity(cartItemId);
            if (currentQuantity >= (variant?.stock || 0)) {
                showToast('Maximum stock limit reached!');
            } else {
                showToast('Product is out of stock!');
            }
        }
    };

    const handleRemove = () => {
        removeFromCart(cartItemId);
    };

    return (
        <Pressable
            style={[styles.container, style]}
            onPress={() => onPress?.(product, variant?.inventoryId)}
        >
            <View style={styles.imageContainer}>
                <LinearGradient
                    colors={['#F8FAFC', '#F1F5F9']}
                    style={StyleSheet.absoluteFill}
                />
                {!imgError && productImage ? (
                    <Image
                        source={{ uri: productImage }}
                        style={styles.productImage}
                        resizeMode="contain"
                        onError={() => setImgError('Failed')}
                    />
                ) : (
                    <View style={[styles.placeholderIcon, styles.center]}>
                        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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

                {/* Rating Badge Overlay */}
                {product.rating && product.rating.count > 0 && (
                    <View style={styles.ratingOverlay}>
                        <Svg width="10" height="10" viewBox="0 0 24 24" fill="#FBBF24">
                            <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </Svg>
                        <MonoText size="xxs" weight="bold" style={{ marginLeft: 2 }}>{product.rating.average.toFixed(1)}</MonoText>
                    </View>
                )}
            </View>

            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <MonoText size="s" weight="bold" numberOfLines={1} style={styles.productName}>{product.name}</MonoText>
                    <MonoText size="xxs" color={colors.textLight} weight="medium">{product.brand}</MonoText>
                </View>

                {/* Short Description */}
                {(product.shortDescription || product.subCategory) && (
                    <MonoText size="xxs" color={colors.textLight} numberOfLines={1} style={styles.shortDesc}>
                        {product.shortDescription || product.subCategory}
                    </MonoText>
                )}

                {/* Unit / Pack Size */}
                <View style={styles.unitBadge}>
                    <MonoText size="xxs" weight="bold" color={colors.primary}>
                        {variant ? (() => {
                            const v = variant.variant;
                            if (!v.packSize || v.packSize === '1') return `${v.weightValue}${v.weightUnit}`;
                            const isMultiplier = /^\d+$/.test(v.packSize.trim());
                            if (isMultiplier) return `${v.packSize} × ${v.weightValue}${v.weightUnit}`;
                            const weightStr = `${v.weightValue}${v.weightUnit}`.replace(/\s/g, '').toLowerCase();
                            const packSizeStr = v.packSize.replace(/\s/g, '').toLowerCase();
                            if (packSizeStr === weightStr) return `${v.weightValue}${v.weightUnit}`;
                            return v.packSize;
                        })() : (product.formattedQuantity || product.unit)}
                    </MonoText>
                </View>

                <View style={styles.footer}>
                    <View style={styles.priceContainer}>
                        <MonoText size="m" weight="bold" color={colors.black}>₹{effectivePrice}</MonoText>
                        {hasDiscount && (
                            <MonoText size="xxs" style={styles.mrp}>₹{originalPrice}</MonoText>
                        )}
                        {(!isOutOfStock && variant?.stock > 0 && variant?.stock <= 10) && (
                            <MonoText size="xxs" weight="bold" color="#DC2626" style={{ marginTop: 2 }}>
                                Only {variant.stock} left
                            </MonoText>
                        )}
                    </View>

                    {/* Actions */}
                    <View style={styles.actionWrapper}>
                        {isOutOfStock ? (
                            <View style={styles.outOfStockText}>
                                <MonoText size="xxs" weight="bold" color={colors.error}>OUT OF STOCK</MonoText>
                            </View>
                        ) : quantity === 0 ? (
                            <TouchableOpacity activeOpacity={0.8} onPress={handleAdd}>
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    style={styles.addIconBtnGradient}
                                >
                                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <Line x1="12" y1="5" x2="12" y2="19" />
                                        <Line x1="5" y1="12" x2="19" y2="12" />
                                    </Svg>
                                </LinearGradient>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.quantityStepper}>
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    style={[StyleSheet.absoluteFill, { borderRadius: 10 }]}
                                />
                                <TouchableOpacity onPress={handleRemove} style={styles.stepperBtn}>
                                    <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="4">
                                        <Line x1="5" y1="12" x2="19" y2="12" />
                                    </Svg>
                                </TouchableOpacity>
                                <MonoText size="xs" weight="bold" color={colors.white}>{quantity}</MonoText>
                                <TouchableOpacity onPress={handleAdd} style={styles.stepperBtn}>
                                    <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="4">
                                        <Line x1="12" y1="5" x2="12" y2="19" />
                                        <Line x1="5" y1="12" x2="19" y2="12" />
                                    </Svg>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '48%',
        backgroundColor: colors.white,
        borderRadius: 20,
        marginBottom: spacing.m,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        ...Platform.select({
            ios: {
                shadowColor: '#64748B',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    imageContainer: {
        height: 120,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: spacing.s,
    },
    productImage: {
        width: '90%',
        height: '90%',
    },
    placeholderIcon: {
        opacity: 0.3,
    },
    discountBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#F43F5E',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
        zIndex: 10,
    },
    ratingOverlay: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(255,255,255,0.9)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    content: {
        padding: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 2,
    },
    productName: {
        flex: 1,
        color: '#1E293B',
    },
    shortDesc: {
        marginBottom: 6,
        opacity: 0.7,
    },
    unitBadge: {
        backgroundColor: `${colors.primary}12`,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 10,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 'auto',
    },
    priceContainer: {
        flex: 1,
    },
    mrp: {
        textDecorationLine: 'line-through',
        color: '#94A3B8',
        marginTop: -2,
    },
    actionWrapper: {
        marginLeft: 8,
    },
    addIconBtnGradient: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityStepper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingHorizontal: 4,
        height: 32,
        ...Platform.select({
            ios: {
                shadowColor: '#10B981',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
            },
            android: {
                elevation: 4,
            },
        }),
        overflow: 'hidden',
    },
    stepperBtn: {
        padding: 6,
    },
    outOfStockText: {
        paddingVertical: 4,
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    }
});
