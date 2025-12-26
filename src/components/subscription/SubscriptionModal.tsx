import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import Svg, { Path, Line, Polyline } from 'react-native-svg';
import { Product } from '../../services/customer/product.service';
import { DeliveryFrequency, useSubscriptionCartStore } from '../../store/subscriptionCart.store';

const { height } = Dimensions.get('window');

interface SubscriptionModalProps {
    visible: boolean;
    product: Product | null;
    onClose: () => void;
}

const FREQUENCIES: { label: string; value: DeliveryFrequency }[] = [
    { label: 'Daily', value: 'daily' },
    { label: 'Alt Days', value: 'alternate' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
];

export const SubscriptionModal = ({ visible, product, onClose }: SubscriptionModalProps) => {
    const insets = useSafeAreaInsets();
    const addToCart = useSubscriptionCartStore(state => state.addToCart);
    const removeFromCart = useSubscriptionCartStore(state => state.removeFromCart);

    // Check if already in cart
    const existingItem = useSubscriptionCartStore(state => state.items.find(i => i.product._id === product?._id));

    // Initialize state based on existing item or defaults
    // We use a key on the component to reset this state when product changes
    const [frequency, setFrequency] = useState<DeliveryFrequency>(existingItem?.frequency || 'daily');
    const [quantity, setQuantity] = useState(existingItem?.quantity || 1);

    if (!product) return null;

    const handleAdd = () => {
        if (quantity === 0) {
            removeFromCart(product._id);
            onClose();
            return;
        }

        addToCart({
            product,
            frequency,
            quantity,
            startDate: new Date(),
        });
        onClose();
    };

    const increment = () => setQuantity(q => q + 1);
    const decrement = () => setQuantity(q => Math.max(0, q - 1)); // Allow 0 to remove

    const effectivePrice = product.discountPrice && product.discountPrice < product.price
        ? product.discountPrice
        : product.price;

    const getMonthlyMultiplier = (freq: DeliveryFrequency) => {
        switch (freq) {
            case 'daily': return 30;
            case 'alternate': return 15;
            case 'weekly': return 4;
            case 'monthly': return 1;
            default: return 1;
        }
    };

    const monthlyTotal = effectivePrice * quantity * getMonthlyMultiplier(frequency);

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

                <View style={styles.modalContent} key={product._id}>
                    {/* Header */}
                    <View style={styles.header}>
                        <MonoText size="l" weight="bold">
                            {existingItem ? 'Edit Subscription' : 'Subscribe'}
                        </MonoText>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtnHeader}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <Line x1="18" y1="6" x2="6" y2="18" />
                                <Line x1="6" y1="6" x2="18" y2="18" />
                            </Svg>
                        </TouchableOpacity>
                    </View>

                    {/* Product Info */}
                    <View style={styles.productRow}>
                        {product.images && product.images.length > 0 ? (
                            <Image source={{ uri: product.images[0] }} style={styles.thumb} />
                        ) : (
                            <View style={styles.thumbPlaceholder}>
                                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <Polyline points="21 15 16 10 5 21" />
                                </Svg>
                            </View>
                        )}
                        <View style={styles.productDetails}>
                            <MonoText size="m" weight="bold">{product.name}</MonoText>
                            <MonoText size="s" color={colors.textLight}>
                                ₹{effectivePrice} / {product.formattedQuantity || (product.quantity ? `${product.quantity.value}${product.quantity.unit}` : product.unit)}
                            </MonoText>
                        </View>
                    </View>

                    {/* Configuration */}
                    <View style={styles.section}>
                        <MonoText size="s" weight="bold" style={styles.label}>Frequency</MonoText>
                        <View style={styles.freqRow}>
                            {FREQUENCIES.filter(freq => {
                                // Default to true if no config exists (backward compatibility)
                                if (!product.subscriptionConfig?.frequencyPricing) return true;
                                const config = product.subscriptionConfig.frequencyPricing[freq.value];
                                return config ? config.enabled : false;
                            }).map((freq) => (
                                <TouchableOpacity
                                    key={freq.value}
                                    style={[styles.freqChip, frequency === freq.value && styles.freqChipActive]}
                                    onPress={() => setFrequency(freq.value)}
                                >
                                    <MonoText
                                        size="xs"
                                        color={frequency === freq.value ? colors.white : colors.text}
                                        weight={frequency === freq.value ? 'bold' : 'regular'}
                                    >
                                        {freq.label}
                                    </MonoText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <MonoText size="s" weight="bold" style={styles.label}>Quantity</MonoText>
                        <View style={styles.qtyRow}>
                            <TouchableOpacity style={styles.qtyBtn} onPress={decrement}>
                                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <Line x1="5" y1="12" x2="19" y2="12" />
                                </Svg>
                            </TouchableOpacity>
                            <MonoText size="l" weight="bold" style={styles.qtyText}>{quantity}</MonoText>
                            <TouchableOpacity style={styles.qtyBtn} onPress={increment}>
                                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <Line x1="12" y1="5" x2="12" y2="19" />
                                    <Line x1="5" y1="12" x2="19" y2="12" />
                                </Svg>
                            </TouchableOpacity>
                        </View>
                        {quantity === 0 && (
                            <MonoText size="xs" color={colors.error} style={{ marginTop: 8 }}>
                                Set to 0 to remove from subscription
                            </MonoText>
                        )}
                    </View>

                    {/* Footer Buttons */}
                    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + spacing.m, spacing.xl) }]}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <MonoText size="m" weight="bold" color={colors.text}>Cancel</MonoText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.confirmBtn, quantity === 0 && styles.removeBtn]}
                            onPress={handleAdd}
                        >
                            <MonoText size="m" weight="bold" color={colors.white}>
                                {quantity === 0 ? 'Remove' : (existingItem ? 'Update' : 'Subscribe')}
                            </MonoText>
                            {quantity > 0 && (
                                <MonoText size="xs" color="rgba(255,255,255,0.8)">₹{monthlyTotal}/mo</MonoText>
                            )}
                        </TouchableOpacity>
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
        padding: spacing.l,
        paddingBottom: 0,
        minHeight: height * 0.55,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.l,
    },
    closeBtnHeader: {
        padding: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
    },
    productRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.l,
        paddingBottom: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    thumb: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        marginRight: spacing.m,
    },
    thumbPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        marginRight: spacing.m,
        alignItems: 'center',
        justifyContent: 'center',
    },
    productDetails: {
        flex: 1,
    },
    section: {
        marginBottom: spacing.l,
    },
    label: {
        marginBottom: spacing.s,
    },
    freqRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    freqChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    freqChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    qtyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.l,
    },
    qtyBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyText: {
        width: 40,
        textAlign: 'center',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 'auto',
        paddingTop: spacing.m,
    },
    cancelBtn: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
    },
    confirmBtn: {
        flex: 2,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.black,
    },
    removeBtn: {
        backgroundColor: '#EF4444', // Red for remove
    }
});
