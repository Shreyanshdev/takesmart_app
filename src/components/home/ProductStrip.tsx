import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform, Image } from 'react-native';
import { MonoText } from '../shared/MonoText';
import { SectionHeader } from './SectionHeader';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useCartStore } from '../../store/cart.store';
import { useToastStore } from '../../store/toast.store';
import { useWishlistStore } from '../../store/wishlist.store';
import { Product } from '../../services/customer/product.service';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');
const STRIP_CARD_WIDTH = 135;

interface ProductStripProps {
    title: string;
    subtitle?: string;
    products: any[];
    onProductPress: (product: Product, variantId?: string) => void;
    onSeeAll?: () => void;
}

export const StripProductCard = ({
    item,
    onPress,
    onAddToCart,
    onRemoveFromCart,
    style,
}: {
    item: any;
    onPress: () => void;
    onAddToCart: () => void;
    onRemoveFromCart: () => void;
    style?: any;
}) => {
    const image = item.images?.[0] || item.variant?.images?.[0];
    const hasDiscount = item.pricing && item.pricing.mrp > item.pricing.sellingPrice;
    const discountPercent = hasDiscount
        ? Math.round(((item.pricing.mrp - item.pricing.sellingPrice) / item.pricing.mrp) * 100)
        : 0;

    const cartItemId = item.inventoryId || item._id;
    const quantity = useCartStore(state => {
        const cartItem = state.items.find(i => (i.product.inventoryId || i.product._id) === cartItemId);
        return cartItem ? cartItem.quantity : 0;
    });

    const { isInWishlist, toggleWishlist } = useWishlistStore();
    const isFavorite = isInWishlist(cartItemId);
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

        if (!isFavorite) {
            useToastStore.getState().showToast('Product Added to Wishlist!');
        } else {
            useToastStore.getState().showToast('Product Removed from Wishlist!');
        }

        toggleWishlist(item, item.variant?._id || item.inventoryId);
    };

    return (
        <TouchableOpacity
            style={[styles.card, style]}
            onPress={onPress}
            activeOpacity={0.85}
        >
            {/* Image Wrapper (Gray Background) */}
            <View style={styles.imageWrapper}>
                {/* Bookmark Icon */}
                <TouchableOpacity
                    style={styles.bookmarkIcon}
                    onPress={handleWishlistToggle}
                    activeOpacity={0.7}
                >
                    <Animated.View style={animatedBookmarkStyle}>
                        <Svg width="22" height="22" viewBox="0 0 24 24" fill={isFavorite ? colors.error : 'none'} stroke={isFavorite ? colors.error : colors.textLight} strokeWidth="2">
                            <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </Svg>
                    </Animated.View>
                </TouchableOpacity>

                {/* Add Button Top Right */}
                {quantity > 0 ? (
                    <View style={styles.qtyContainerTopRight}>
                        <TouchableOpacity
                            style={styles.qtyBtnSmall}
                            onPress={(e) => {
                                e.stopPropagation();
                                onRemoveFromCart();
                            }}
                        >
                            <MonoText size="s" weight="bold" color={colors.white}>−</MonoText>
                        </TouchableOpacity>
                        <MonoText size="xs" weight="bold" color={colors.white}>{quantity}</MonoText>
                        <TouchableOpacity
                            style={styles.qtyBtnSmall}
                            onPress={(e) => {
                                e.stopPropagation();
                                onAddToCart();
                            }}
                        >
                            <MonoText size="s" weight="bold" color={colors.white}>+</MonoText>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.addButtonTopRight}
                        onPress={(e) => {
                            e.stopPropagation?.();
                            onAddToCart();
                        }}
                    >
                        <MonoText size="xs" weight="bold" color={colors.primary}>ADD</MonoText>
                    </TouchableOpacity>
                )}

                {/* Image */}
                <View style={styles.imageContainer}>
                    {image ? (
                        <Image
                            source={{ uri: image }}
                            style={styles.productImage}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={[styles.productImage, styles.placeholderImage]}>
                            <Svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={colors.border} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <Circle cx="8.5" cy="8.5" r="1.5" />
                                <Path d="M21 15l-5-5L5 21" />
                            </Svg>
                        </View>
                    )}
                </View>

                {/* Floating Variant Pill */}
                {item.variant && (
                    <View style={styles.floatingVariantPill}>
                        <MonoText size="xxs" weight="semiBold" color={colors.text}>
                            {item.variant.weightValue} {item.variant.weightUnit}
                        </MonoText>
                    </View>
                )}
            </View>

            {/* Info Section */}
            <View style={styles.infoContainer}>
                {/* Rating Row (Mocking if missing to match screenshot feel) */}
                {item.rating && item.rating.count > 0 && (
                    <View style={styles.ratingRow}>
                        <Svg width="14" height="14" viewBox="0 0 24 24" fill="#1E8C45">
                            <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </Svg>
                        <MonoText size="xs" weight="bold" color="#1E8C45" style={{ marginLeft: 2 }}>
                            {item.rating.average.toFixed(1)}
                        </MonoText>
                        <MonoText size="xs" color={colors.textLight} style={{ marginLeft: 4 }}>
                            ({item.rating.count})
                        </MonoText>
                    </View>
                )}

                {/* Product Name */}
                <MonoText size="s" weight="semiBold" numberOfLines={2} style={styles.productName}>
                    {item.name}
                </MonoText>

                {/* Discount Percentage */}
                {hasDiscount && discountPercent > 0 ? (
                    <MonoText size="xs" weight="bold" color="#1E8C45" style={styles.discountText}>
                        {discountPercent}% OFF
                    </MonoText>
                ) : (
                    <View style={{ height: 16, marginBottom: 4 }} />
                )}

                {/* MRP */}
                <MonoText size="xs" color={colors.textLight} style={styles.mrpText}>
                    {hasDiscount ? `₹${item.pricing?.mrp}` : ' '}
                </MonoText>

                {/* Selling Price */}
                <View style={styles.finalPriceRow}>
                    <MonoText size="m" weight="bold">
                        ₹{item.pricing?.sellingPrice || item.pricing?.mrp || 0}
                    </MonoText>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export const ProductStrip = ({ title, subtitle, products, onProductPress, onSeeAll }: ProductStripProps) => {
    const { addToCart, removeFromCart, getItemQuantity } = useCartStore();
    const { showToast } = useToastStore();

    const handleAddToCart = (product: any) => {
        const cartItemId = product.inventoryId || product._id;
        const productImage = product.variant?.images?.[0] || product.images?.[0];

        const success = addToCart({
            ...product,
            _id: cartItemId,
            name: product.name,
            image: productImage || '',
            images: productImage ? [productImage] : (product.images || []),
            price: product.pricing?.mrp || 0,
            discountPrice: product.pricing?.sellingPrice || 0,
            stock: product.stock || 0,
            quantity: product.variant ? {
                value: product.variant.weightValue,
                unit: product.variant.weightUnit
            } : undefined,
            formattedQuantity: product.variant ? `${product.variant.weightValue} ${product.variant.weightUnit}` : undefined
        } as any);

        if (!success) {
            const currentQty = getItemQuantity(cartItemId);
            if (currentQty >= (product.stock || 0)) {
                showToast('Maximum stock limit reached!');
            } else {
                showToast('Product is out of stock!');
            }
        }
    };

    const handleRemoveFromCart = (product: any) => {
        const cartItemId = product.inventoryId || product._id;
        if (cartItemId) {
            removeFromCart(cartItemId);
        }
    };

    if (!products || products.length === 0) return null;

    return (
        <View style={styles.container}>
            <SectionHeader title={title} subtitle={subtitle} onSeeAll={onSeeAll} />
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {products.map((product, index) => (
                    <StripProductCard
                        key={product.inventoryId || product._id || index}
                        item={product}
                        style={{ width: STRIP_CARD_WIDTH }}
                        onPress={() => onProductPress(product, product.inventoryId)}
                        onAddToCart={() => handleAddToCart(product)}
                        onRemoveFromCart={() => handleRemoveFromCart(product)}
                    />
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.l,
    },
    scrollContent: {
        paddingHorizontal: spacing.m,
        gap: 12,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9', // light border for rounded edge shape
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08, // Increased opacity
                shadowRadius: 4,
            },
            android: {
                elevation: 2, // Increased elevation
            },
        }),
    },
    imageWrapper: {
        width: '100%',
        height: 125, // Adjusted slightly to fit the padding
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
    },
    bookmarkIcon: {
        position: 'absolute',
        top: 6,
        left: 6,
        zIndex: 5,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 12,
        padding: 2,
    },
    addButtonTopRight: {
        position: 'absolute',
        top: 2, // Moved inside bounds for New Architecture touch safety
        right: 2,
        backgroundColor: colors.white,
        paddingHorizontal: 12,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    qtyContainerTopRight: {
        position: 'absolute',
        top: 2, // Moved inside bounds for New Architecture touch safety
        right: 2,
        backgroundColor: colors.primary,
        height: 32,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        paddingHorizontal: 6,
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    qtyBtnSmall: {
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    floatingVariantPill: {
        position: 'absolute',
        bottom: 2, // Moved inside bounds for New Architecture touch safety
        backgroundColor: colors.white,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
            },
            android: {
                elevation: 1,
            },
        }),
        zIndex: 10,
    },
    imageContainer: {
        width: '100%',
        height: '100%',
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
    },
    infoContainer: {
        paddingTop: 20, // Space for the floating pill
        paddingHorizontal: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    productName: {
        lineHeight: 18,
        height: 38, // Exactly 2 lines
        marginBottom: 6,
    },
    discountText: {
        marginBottom: 4,
    },
    mrpText: {
        textDecorationLine: 'line-through',
        marginBottom: 2,
    },
    finalPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    }
});
