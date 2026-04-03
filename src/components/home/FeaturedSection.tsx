import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { MonoText } from '../shared/MonoText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useCartStore } from '../../store/cart.store';
import { useToastStore } from '../../store/toast.store';
import { Product } from '../../services/customer/product.service';
import { StripProductCard } from './ProductStrip';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

const WavyBorderTop = ({ color }: { color: string }) => {
    // A soft wave pattern for the top border
    return (
        <View style={{ height: 20, width: '100%', marginBottom: -1 }}>
            <Svg height="20" width={width} viewBox={`0 0 ${width} 20`} preserveAspectRatio="none">
                <Path d={`M0,20 C${width * 0.25},0 ${width * 0.75},0 ${width},20 L0,20 Z`} fill={color} />
            </Svg>
        </View>
    );
};

const WavyBorderBottom = ({ color }: { color: string }) => {
    // A soft wave pattern for the bottom border, flipped
    return (
        <View style={{ height: 20, width: '100%', marginTop: -1 }}>
            <Svg height="20" width={width} viewBox={`0 0 ${width} 20`} preserveAspectRatio="none">
                <Path d={`M0,0 C${width * 0.25},20 ${width * 0.75},20 ${width},0 L0,0 Z`} fill={color} />
            </Svg>
        </View>
    );
};

interface FeaturedSectionProps {
    title: string;
    subtitle?: string;
    backgroundColor?: string; // Optional hex for solid color
    gradientColors?: [string, string]; // Optional dual hex for gradient
    products: any[];
    onProductPress: (product: Product, variantId?: string) => void;
    onSeeAll?: () => void;
}

export const FeaturedSection = ({
    title,
    subtitle,
    backgroundColor,
    gradientColors,
    products,
    onProductPress,
    onSeeAll,
}: FeaturedSectionProps) => {
    const { addToCart, removeFromCart } = useCartStore();
    const { showToast } = useToastStore();

    if (!products || products.length === 0) return null;

    // Use provided gradient, or derive one from the background color, or use a default soft purple "Featured" vibe
    const bgColors = gradientColors || (backgroundColor ? [backgroundColor, backgroundColor] : ['#E0E7FF', '#C7D2FE']);

    // Improved dark background detection (simple check for very light colors)
    const isLightBg = (color: string) => {
        const lightColors = ['#FFFFFF', '#FFF8E1', '#F8FAFC', '#FAFAFA', '#F1F5F9', '#E0E7FF', '#F0F9FF', '#F5F5F5'];
        return lightColors.includes(color.toUpperCase());
    };

    const isDarkBg = !isLightBg(bgColors[0]);
    const textColor = isDarkBg ? colors.primary : '#111827';
    const subtextColor = isDarkBg ? 'rgba(64, 17, 17, 0.8)' : colors.textLight;

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

    return (
        <View style={styles.wrapper}>
            <WavyBorderTop color={bgColors[0]} />
            <LinearGradient colors={bgColors} style={styles.container}>
                {/* Header Section */}
                <View style={styles.header}>
                    <View style={styles.titleContainer}>
                        <MonoText size="xl" weight="bold" color={textColor} style={styles.title}>
                            {title}
                        </MonoText>
                        {subtitle && (
                            <MonoText size="s" color={subtextColor} style={styles.subtitle}>
                                {subtitle}
                            </MonoText>
                        )}
                    </View>
                    {onSeeAll && (
                        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllBtn}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <MonoText size="s" weight="bold" color={textColor} style={{ marginRight: 2 }}>SEE ALL</MonoText>
                                <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <Path d="M9 18l6-6-6-6" />
                                </Svg>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Horizontal Product List */}
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
            <WavyBorderBottom color={bgColors[1] || bgColors[0]} />
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        marginVertical: spacing.l, // Space out from standard sections
    },
    container: {
        width: '100%',
        paddingVertical: spacing.m,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.m,
        marginBottom: spacing.m,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        letterSpacing: -0.5,
    },
    subtitle: {
        marginTop: 2,
    },
    seeAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingLeft: 8,
    },
    scrollContent: {
        paddingHorizontal: spacing.m,
        gap: spacing.m,
        paddingBottom: spacing.s, // Slight shadow clearance
    }
});
