import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';
import { MonoText } from '../shared/MonoText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useCartStore } from '../../store/cart.store';
import { useToastStore } from '../../store/toast.store';
import { Product } from '../../services/customer/product.service';
import Icon from 'react-native-vector-icons/Feather';
import { StripProductCard } from './ProductStrip';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

const ZigZagBorder = ({ color }: { color: string }) => {
    const patternWidth = 18;
    const height = 8;
    const count = Math.ceil(width / patternWidth);

    let d = `M0,0`;
    for (let i = 0; i < count; i++) {
        d += ` L${i * patternWidth + patternWidth / 2},${height}`;
        d += ` L${(i + 1) * patternWidth},0`;
    }
    d += ` L${width},0 Z`;

    return (
        <View style={{ height, width: '100%', marginTop: -1 }}>
            <Svg height={height} width={width} viewBox={`0 0 ${width} ${height}`}>
                <Path d={d} fill={color} />
            </Svg>
        </View>
    );
};

interface BrandSpotlightProps {
    title: string;
    brandName: string;
    brandLogo?: string;
    backgroundColor?: string;
    products: any[];
    onProductPress: (product: Product, variantId?: string) => void;
    onSeeAll?: () => void;
}

export const BrandSpotlight = ({
    title,
    brandName,
    brandLogo,
    backgroundColor = '#FFF8E1',
    products,
    onProductPress,
    onSeeAll,
}: BrandSpotlightProps) => {
    const { addToCart, getItemQuantity, removeFromCart } = useCartStore();
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
        } as any);

        if (!success) {
            showToast('Maximum stock limit reached!');
        }
    };

    const handleRemoveFromCart = (product: any) => {
        const cartItemId = product.inventoryId || product._id;
        if (cartItemId) {
            removeFromCart(cartItemId);
        }
    };

    if (!products || products.length === 0) return null;

    // Use a vivid default gradient if background color isn't provided or is the default beige
    const isDefaultBg = !backgroundColor || backgroundColor === '#FFF8E1';
    const gradientColors = isDefaultBg
        ? ['#FFD200', '#F7971E'] // Vivid yellow-orange for Mega Sale vibe
        : [backgroundColor, backgroundColor]; // Fallback if admin forces a solid color

    return (
        <View style={styles.wrapper}>
            <LinearGradient colors={gradientColors} style={styles.container}>
                {/* Brand Header */}
                <View style={styles.brandHeader}>
                    <View style={styles.logoSlot}>
                        {brandLogo && (
                            <FastImage
                                source={{ uri: brandLogo }}
                                style={styles.brandLogo}
                                resizeMode={FastImage.resizeMode.contain}
                            />
                        )}
                    </View>
                    
                    <View style={styles.brandInfo}>
                        <MonoText size="xl" weight="bold" style={styles.headerText}>
                            {title ? title.toUpperCase() : `FROM ${brandName.toUpperCase()}`}
                        </MonoText>
                        <View style={styles.badgeContainer}>
                            <MonoText size="xxs" weight="bold" color={colors.white} style={styles.badgeText}>
                                SPONSORED
                            </MonoText>
                        </View>
                    </View>

                    <View style={styles.seeAllSlot}>
                        {onSeeAll && (
                            <TouchableOpacity onPress={onSeeAll} style={styles.seeAllBtn}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <MonoText size="xs" weight="bold" color={colors.white} style={{ marginRight: 2 }}>SEE ALL</MonoText>
                                    <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <Path d="M9 18l6-6-6-6" />
                                    </Svg>
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Products */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {products.map((product, index) => (
                        <StripProductCard
                            key={product.inventoryId || product._id || index}
                            item={product}
                            style={{ width: 135 }}
                            onPress={() => onProductPress(product, product.inventoryId)}
                            onAddToCart={() => handleAddToCart(product)}
                            onRemoveFromCart={() => handleRemoveFromCart(product)}
                        />
                    ))}
                </ScrollView>
            </LinearGradient>
            <ZigZagBorder color={gradientColors[1]} />
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        marginBottom: spacing.l,
    },
    container: {
        width: '100%',
        paddingTop: spacing.xl,
        paddingBottom: spacing.s,
    },
    brandHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.m,
        marginBottom: spacing.l,
    },
    logoSlot: {
        width: 60,
        alignItems: 'flex-start',
    },
    seeAllSlot: {
        width: 80,
        alignItems: 'flex-end',
    },
    brandLogo: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: colors.white,
    },
    brandInfo: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        fontStyle: 'italic',
        color: '#1A1A1A',
        textShadowColor: 'rgba(255,255,255,0.6)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
        textAlign: 'center',
        lineHeight: 28,
    },
    badgeContainer: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
    },
    badgeText: {
        letterSpacing: 1,
    },
    seeAllBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 12,
        height: 30,
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    scrollContent: {
        paddingHorizontal: spacing.m,
        gap: 12,
        paddingBottom: 4,
    },
});
