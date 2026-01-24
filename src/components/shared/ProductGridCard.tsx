import React from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    Platform
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { MonoText } from './MonoText';
import { Product } from '../../services/customer/product.service';
import { useWishlistStore } from '../../store/wishlist.store';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    interpolateColor
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const GRID_CARD_WIDTH = (width - 48) / 2;

interface ProductGridCardProps {
    product: Product;
    variant: any;
    quantity: number;
    onPress: (product: Product, variantId?: string) => void;
    onAddToCart: (product: Product, variant: any) => void;
    onRemoveFromCart: (cartItemId: string) => void;
    width?: number;
    isSoldOut?: boolean;
}

export const ProductGridCard: React.FC<ProductGridCardProps> = ({
    product,
    variant,
    quantity,
    onPress,
    onAddToCart,
    onRemoveFromCart,
    width: manualWidth,
    isSoldOut = false
}) => {
    const cartItemId = variant?._id || variant?.inventoryId || product._id;
    const pricing = variant?.pricing;
    const variantInfo = variant?.variant;
    const productImage = variantInfo?.images?.[0] || product.images?.[0] || product.image;

    const { isInWishlist, toggleWishlist } = useWishlistStore();
    const isFavorite = isInWishlist(cartItemId);

    // Animation for bookmark toggle
    const scale = useSharedValue(1);

    const animatedBookmarkStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const handleWishlistToggle = (e: any) => {
        e.stopPropagation();
        scale.value = withSequence(
            withSpring(1.4),
            withSpring(1)
        );

        const { useToastStore } = require('../../store/toast.store');
        if (!isFavorite) {
            useToastStore.getState().showToast('Product Added to Wishlist!');
        } else {
            useToastStore.getState().showToast('Product Removed from Wishlist!');
        }

        toggleWishlist(product, variant?._id || variant?.inventoryId);
    };

    const hasDiscount = pricing && pricing.sellingPrice < pricing.mrp;
    const discountPercent = hasDiscount
        ? Math.round(((pricing.mrp - pricing.sellingPrice) / pricing.mrp) * 100)
        : 0;

    const formatVariant = () => {
        if (!variantInfo) return '';
        if (variantInfo.packSize && variantInfo.packSize !== '1') {
            const isMultiplier = /^\d+$/.test(variantInfo.packSize.trim());
            if (isMultiplier && variantInfo.weightValue) {
                return `${variantInfo.packSize} × ${variantInfo.weightValue} ${variantInfo.weightUnit}`;
            }
            return variantInfo.packSize;
        }
        return variantInfo.weightValue ? `${variantInfo.weightValue} ${variantInfo.weightUnit}` : '';
    };

    return (
        <TouchableOpacity
            key={cartItemId}
            style={[
                styles.productCard,
                manualWidth ? { width: manualWidth } : { width: GRID_CARD_WIDTH },
                isSoldOut && styles.soldOutCard
            ]}
            onPress={() => onPress(product, variant?._id || variant?.inventoryId)}
            activeOpacity={0.9}
        >
            {/* Image Container with Neoglassmorphism Effect */}
            <View style={styles.imageContainer}>
                {productImage ? (
                    <Image source={{ uri: productImage }} style={styles.productImage} resizeMode="contain" />
                ) : (
                    <View style={[styles.productImage, styles.placeholderImage]}>
                        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="1.5">
                            <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                        </Svg>
                    </View>
                )}

                {/* top-left Bookmark (Interactive) */}
                <TouchableOpacity
                    style={styles.bookmarkBtn}
                    onPress={handleWishlistToggle}
                    activeOpacity={0.7}
                >
                    <Animated.View style={animatedBookmarkStyle}>
                        <Svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? colors.error : 'none'} stroke={isFavorite ? colors.error : colors.textLight} strokeWidth="2">
                            <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </Svg>
                    </Animated.View>
                </TouchableOpacity>

                {/* Variant Badge */}
                {variantInfo && (
                    <View style={styles.variantBadge}>
                        <MonoText size="xxs" weight="bold" color={colors.white}>
                            {formatVariant()}
                        </MonoText>
                    </View>
                )}

                {/* Sold Out Badge */}
                {isSoldOut ? (
                    <View style={styles.soldOutBadge}>
                        <MonoText size="xs" weight="bold" color="#DC2626">
                            SOLD OUT
                        </MonoText>
                    </View>
                ) : (variant?.stock > 0 && variant?.stock <= 10) && (
                    <View style={styles.lowStockBadge}>
                        <MonoText size="xs" weight="bold" color="#DC2626">
                            Only {variant.stock} left
                        </MonoText>
                    </View>
                )}
            </View>

            {/* Product Info Section */}
            <View style={styles.infoContainer}>
                {/* Product Name */}
                <MonoText size="s" weight="bold" numberOfLines={2}>
                    {product.name}
                </MonoText>

                {/* Rating Section - Premium Style */}
                <View style={styles.ratingRow}>
                    <Svg width="12" height="12" viewBox="0 0 24 24" fill={colors.success} stroke={colors.success}>
                        <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
                    </Svg>
                    <MonoText size="xs" weight="bold" color={colors.success} style={{ marginLeft: 4 }}>
                        {product.rating?.average || 4.2}
                    </MonoText>
                    <MonoText size="xxs" color={colors.textLight} style={{ marginLeft: 4 }}>
                        ({product.rating?.count || 120})
                    </MonoText>
                </View>

                {/* Short Description */}
                {product.shortDescription && (
                    <MonoText size="xs" color={colors.textLight} numberOfLines={2} style={{ marginTop: 2 }}>
                        {product.shortDescription}
                    </MonoText>
                )}

                {/* Discount Badge and Divider */}
                {discountPercent > 0 && (
                    <View style={styles.discountRow}>
                        <MonoText size="xs" weight="bold" color={colors.success}>
                            {discountPercent}% OFF
                        </MonoText>
                        <View style={styles.dashedLineContainer}>
                            <Svg height="1" width="100%">
                                <Path
                                    d="M0 0.5H1000"
                                    stroke="#CBD5E1"
                                    strokeWidth="1"
                                    strokeDasharray="4,4"
                                />
                            </Svg>
                        </View>
                    </View>
                )}

                {/* Price and Action Row - Built for stability */}
                <View style={styles.footerRow}>
                    <View style={styles.priceColumn}>
                        {pricing && (
                            <>
                                {hasDiscount && (
                                    <MonoText size="xxs" color={colors.textLight} style={styles.strikePrice}>
                                        ₹{pricing.mrp}
                                    </MonoText>
                                )}
                                <MonoText size="s" weight="bold" color={colors.text}>
                                    ₹{pricing.sellingPrice}
                                </MonoText>
                            </>
                        )}
                    </View>

                    {/* Add/Qty Button - hidden when sold out */}
                    {!isSoldOut && (quantity > 0 ? (
                        <View style={styles.qtyContainer}>
                            <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onRemoveFromCart(cartItemId);
                                }}
                            >
                                <MonoText size="m" weight="bold" color={colors.primary}>−</MonoText>
                            </TouchableOpacity>
                            <MonoText size="s" weight="bold" style={styles.qtyText}>{quantity}</MonoText>
                            <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onAddToCart(product, variant);
                                }}
                            >
                                <MonoText size="m" weight="bold" color={colors.primary}>+</MonoText>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={(e) => {
                                e.stopPropagation();
                                onAddToCart(product, variant);
                            }}
                        >
                            <MonoText size="xs" weight="bold" color={colors.primary}>ADD</MonoText>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    productCard: {
        marginBottom: 20,
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 8,
        // Neoglassmorphism effect on the entire card
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    soldOutCard: {
        opacity: 0.6,
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    bookmarkBtn: {
        position: 'absolute',
        top: 8,
        left: 8,
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
    },
    variantBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    infoContainer: {
        padding: 8,
        paddingBottom: 12,
    },
    addBtn: {
        width: 72,
        height: 32,
        backgroundColor: `${colors.primary}10`,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyContainer: {
        width: 72,
        height: 32,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: `${colors.primary}10`,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: colors.primary,
        paddingHorizontal: 4,
    },
    qtyBtn: {
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyText: {
        minWidth: 16,
        textAlign: 'center',
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    discountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    dashedLineContainer: {
        flex: 1,
        height: 1,
        marginLeft: 8,
        justifyContent: 'center',
    },
    priceColumn: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    strikePrice: {
        textDecorationLine: 'line-through',
        fontSize: 10,
    },
    soldOutBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    lowStockBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FECACA',
        zIndex: 1,
    },
});
