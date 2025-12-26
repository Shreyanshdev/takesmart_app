import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Image, Dimensions, ScrollView, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import Svg, { Path, Polyline, Line, Circle } from 'react-native-svg';
import { Product } from '../../services/customer/product.service';
import { useCartStore } from '../../store/cart.store';

const { width, height } = Dimensions.get('window');

interface ProductDetailsModalProps {
    visible: boolean;
    product: Product | null;
    onClose: () => void;
    onSubscribePress?: (product: Product) => void;
}

export const ProductDetailsModal = ({ visible, product, onClose, onSubscribePress }: ProductDetailsModalProps) => {
    const [activeSlide, setActiveSlide] = useState(0);
    const insets = useSafeAreaInsets();
    const { addToCart, removeFromCart, getItemQuantity } = useCartStore();

    if (!product) return null;

    const quantity = getItemQuantity(product._id);
    const images = product.images && product.images.length > 0
        ? product.images
        : (product.image ? [product.image] : []);

    // Price Logic
    const effectivePrice = product.discountPrice && product.discountPrice < product.price
        ? product.discountPrice
        : product.price;

    const handleSubscribe = () => {
        onClose();
        setTimeout(() => {
            onSubscribePress?.(product);
        }, 300); // Small delay for smooth transition
    };

    const renderImageItem = ({ item }: { item: string }) => (
        <View style={styles.slide}>
            <Image source={{ uri: item }} style={styles.image} resizeMode="contain" />
        </View>
    );

    // Prepare Details Data (Mock if missing)
    const nutrients = product.nutrients || { "Protein": "3.2g", "Fat": "4.5g", "Carbs": "4.7g" };
    const shelfLife = product.shelfLife || "2 Days (Refrigerated)";
    const storage = product.storageTemp || "Below 4°C";

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} onPress={onClose}>
                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType="dark"
                        blurAmount={10}
                        reducedTransparencyFallbackColor="black"
                    />
                </TouchableOpacity>

                <View style={styles.modalContent}>
                    {/* Header Pill */}
                    <View style={styles.pillContainer}>
                        <View style={styles.pill} />
                        {/* ABSOLUTE CLOSE BUTTON */}
                        <TouchableOpacity style={styles.closeIconBtn} onPress={onClose}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <Line x1="18" y1="6" x2="6" y2="18" />
                                <Line x1="6" y1="6" x2="18" y2="18" />
                            </Svg>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                        {/* Image Slider using FlashList */}
                        <View style={styles.sliderContainer}>
                            <FlatList
                                data={images}
                                renderItem={renderImageItem}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                onMomentumScrollEnd={(ev) => {
                                    const index = Math.round(ev.nativeEvent.contentOffset.x / (width - 48));
                                    setActiveSlide(index);
                                }}
                                keyExtractor={(_, i) => i.toString()}
                            />
                            {/* Pagination Dots */}
                            {images.length > 1 && (
                                <View style={styles.pagination}>
                                    {images.map((_, i) => (
                                        <View
                                            key={i}
                                            style={[styles.dot, i === activeSlide && styles.activeDot]}
                                        />
                                    ))}
                                </View>
                            )}

                            {/* Discount Badge */}
                            {product.discountPrice && product.discountPrice < product.price && (
                                <View style={styles.discountBadge}>
                                    <MonoText size="xs" weight="bold" color={colors.white}>
                                        {Math.round(((product.price - product.discountPrice) / product.price) * 100)}% OFF
                                    </MonoText>
                                </View>
                            )}
                        </View>

                        {/* Title & Price */}
                        <View style={styles.headerRow}>
                            <View style={{ flex: 1 }}>
                                <MonoText size="xl" weight="bold" style={styles.name}>{product.name}</MonoText>
                                <MonoText size="m" color={colors.textLight}>
                                    {product.formattedQuantity || (product.quantity ? `${product.quantity.value}${product.quantity.unit}` : product.unit)}
                                </MonoText>
                            </View>
                            <View style={styles.priceTag}>
                                <MonoText size="xl" weight="bold" color={colors.primary}>₹{effectivePrice}</MonoText>
                                {product.discountPrice && product.discountPrice < product.price && (
                                    <MonoText size="s" style={styles.strikePrice}>₹{product.price}</MonoText>
                                )}
                            </View>
                        </View>

                        {/* Breed & Animal Type Badges */}
                        {(product.breed || product.animalType) && (
                            <View style={styles.badgeRow}>
                                {product.animalType && (
                                    <View style={styles.typeBadge}>
                                        <MonoText size="xs" weight="bold" color={colors.text}>
                                            {product.animalType.charAt(0).toUpperCase() + product.animalType.slice(1)}
                                        </MonoText>
                                    </View>
                                )}
                                {product.breed && (
                                    <View style={styles.breedBadge}>
                                        <MonoText size="xs" weight="bold" color={colors.primary}>
                                            {product.breed}
                                        </MonoText>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Subscription Callout */}
                        {product.isSubscriptionAvailable && (
                            <TouchableOpacity style={styles.subBtn} onPress={handleSubscribe}>
                                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <Polyline points="23 4 23 10 17 10" />
                                    <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                </Svg>
                                <MonoText size="s" weight="bold" color={colors.white}>Subscribe & Save</MonoText>
                            </TouchableOpacity>
                        )}

                        <View style={styles.divider} />

                        {/* Description */}
                        <MonoText size="m" weight="bold" style={styles.sectionTitle}>About Product</MonoText>
                        <MonoText size="s" color={colors.text} style={styles.description}>
                            {product.description || "Premium quality fresh product sourced directly from our organic farms. Free from preservatives and chemicals."}
                        </MonoText>

                        {/* Nutritional Info */}
                        <MonoText size="m" weight="bold" style={styles.sectionTitle}>Nutritional Info (Per 100g)</MonoText>
                        <View style={styles.nutritionGrid}>
                            {Object.entries(nutrients).map(([key, value], i) => (
                                <View key={i} style={styles.nutritionItem}>
                                    <MonoText size="xs" color={colors.textLight}>{key}</MonoText>
                                    <MonoText size="s" weight="bold">{value}</MonoText>
                                </View>
                            ))}
                        </View>

                        {/* Storage Info */}
                        <View style={styles.storageRow}>
                            <View style={styles.storageItem}>
                                <MonoText size="xs" color={colors.textLight}>Shelf Life</MonoText>
                                <MonoText size="s" weight="bold">{shelfLife}</MonoText>
                            </View>
                            <View style={styles.storageItem}>
                                <MonoText size="xs" color={colors.textLight}>Storage</MonoText>
                                <MonoText size="s" weight="bold">{storage}</MonoText>
                            </View>
                        </View>

                    </ScrollView>

                    {/* Footer: Compact Add to Cart */}
                    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.l) }]}>
                        {quantity === 0 ? (
                            <TouchableOpacity style={styles.addToCartBtn} onPress={() => addToCart(product)}>
                                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <Line x1="12" y1="5" x2="12" y2="19" />
                                    <Line x1="5" y1="12" x2="19" y2="12" />
                                </Svg>
                                <MonoText size="m" weight="bold" color={colors.white}>Add ₹{effectivePrice}</MonoText>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.qtyContainer}>
                                <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(product._id)}>
                                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <Line x1="5" y1="12" x2="19" y2="12" />
                                    </Svg>
                                </TouchableOpacity>
                                <MonoText size="xl" weight="bold" style={{ width: 40, textAlign: 'center' }}>{quantity}</MonoText>
                                <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(product)}>
                                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <Line x1="12" y1="5" x2="12" y2="19" />
                                        <Line x1="5" y1="12" x2="19" y2="12" />
                                    </Svg>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: height * 0.90,
        padding: spacing.l,
        paddingBottom: 0,
    },
    pillContainer: {
        alignItems: 'center',
        marginBottom: spacing.m,
        position: 'relative',
        height: 24,
    },
    pill: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E5E7EB',
        alignSelf: 'center',
    },
    closeIconBtn: {
        position: 'absolute',
        right: 0,
        top: -10, // Adjust to align with pill
        padding: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
    },
    sliderContainer: {
        height: 250,
        backgroundColor: '#FAFAFA',
        borderRadius: 24,
        marginBottom: spacing.l,
        position: 'relative',
        overflow: 'hidden',
    },
    slide: {
        width: width - 48,
        height: 250,
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: '90%',
        height: '90%',
    },
    pagination: {
        position: 'absolute',
        bottom: 12,
        alignSelf: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#D1D5DB',
    },
    activeDot: {
        backgroundColor: colors.primary,
        width: 12,
    },
    discountBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: '#EF4444',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.m,
    },
    name: {
        marginBottom: 4,
    },
    priceTag: {
        alignItems: 'flex-end',
    },
    strikePrice: {
        textDecorationLine: 'line-through',
        color: colors.textLight,
    },
    subBtn: {
        backgroundColor: colors.black,
        height: 48,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: spacing.l,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginBottom: spacing.l,
    },
    sectionTitle: {
        marginBottom: spacing.s,
    },
    description: {
        lineHeight: 22,
        marginBottom: spacing.l,
        color: '#4B5563',
    },
    nutritionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: spacing.l,
    },
    nutritionItem: {
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
        minWidth: 80,
    },
    storageRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: spacing.l,
    },
    storageItem: {
        flex: 1,
        backgroundColor: '#FEF3C7',
        padding: 12,
        borderRadius: 12,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        padding: spacing.l,
        paddingBottom: spacing.l, // Will be overridden by dynamic safe area padding
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    addToCartBtn: {
        height: 56, // Match SubscriptionModal
        borderRadius: 16, // Match SubscriptionModal
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: spacing.xl,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        minWidth: 200,
    },
    qtyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56, // Match SubscriptionModal
        backgroundColor: '#F3F4F6',
        borderRadius: 16, // Match SubscriptionModal
        paddingHorizontal: spacing.s,
        minWidth: 160,
    },
    qtyBtn: {
        width: 44, // Match SubscriptionModal
        height: 44, // Match SubscriptionModal
        borderRadius: 22, // Match SubscriptionModal
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: spacing.s,
        marginBottom: spacing.xs,
    },
    typeBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    breedBadge: {
        backgroundColor: '#EBF8FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
});
