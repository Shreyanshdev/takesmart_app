import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Alert,
    Platform,
    ActivityIndicator,
    Image,
    FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
// @ts-ignore
import RazorpayCheckout from 'react-native-razorpay';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { MonoText } from '../../../components/shared/MonoText';
import { subscriptionService, Subscription } from '../../../services/customer/subscription.service';
import { productService, Product } from '../../../services/customer/product.service';
import { useAuthStore } from '../../../store/authStore';
import { RAZORPAY_KEY_ID } from '@env';
import { logger } from '../../../utils/logger';

const { width } = Dimensions.get('window');

type AddProductRouteParams = {
    subscriptionId: string;
    subscription: Subscription;
    preselectedProduct?: Product;
};

interface SelectedProduct {
    product: Product;
    animalType: string;
    quantityValue: number;
    quantityUnit: string;
    unitPrice: number;
    frequency: 'daily' | 'alternate' | 'weekly' | 'monthly';
    maxDeliveries: number;
}

export const AddProductToSubscriptionScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<{ params: AddProductRouteParams }, 'params'>>();
    const { subscriptionId, subscription: initialSubscription, preselectedProduct } = route.params || {};

    const { user } = useAuthStore();

    // State
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedAnimalType, setSelectedAnimalType] = useState<string>('');
    const [selectedQuantity, setSelectedQuantity] = useState<{ value: number; unit: string; price: number } | null>(null);
    const [count, setCount] = useState(1); // Number of units per delivery
    const [frequency, setFrequency] = useState<'daily' | 'alternate' | 'weekly' | 'monthly'>('daily');
    const [startDate, setStartDate] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [subscription] = useState<Subscription | null>(initialSubscription);

    // Step tracking
    const [step, setStep] = useState<'select' | 'configure' | 'confirm'>('select');

    // Fetch subscription products
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const availableProducts = await productService.getSubscriptionProducts();
                setProducts(availableProducts);

                // If a product was preselected (from HomeScreen subscribe button), auto-select it
                if (preselectedProduct) {
                    // Find the product in available products to ensure it's subscribable
                    const matchedProduct = availableProducts.find(p => p._id === preselectedProduct._id);
                    if (matchedProduct) {
                        handleSelectProduct(matchedProduct);
                    }
                }
            } catch (error) {
                logger.error('Failed to fetch products:', error);
                Alert.alert('Error', 'Failed to load products');
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    // Calculate ACTUAL deliveries based on subscription end date and frequency
    const getActualDeliveries = (freq: string): number => {
        if (!subscription) return getTheoreticalDeliveries(freq);

        const subscriptionEndDate = new Date(subscription.endDate);
        const productStartDate = startDate > new Date() ? startDate : new Date(Date.now() + 24 * 60 * 60 * 1000);
        const daysRemaining = Math.ceil((subscriptionEndDate.getTime() - productStartDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 0) return 0;

        let actualDeliveries: number;
        switch (freq) {
            case 'daily':
                actualDeliveries = Math.min(30, daysRemaining);
                break;
            case 'alternate':
                actualDeliveries = Math.min(15, Math.floor(daysRemaining / 2));
                break;
            case 'weekly':
                actualDeliveries = Math.min(4, Math.floor(daysRemaining / 7));
                break;
            case 'monthly':
                actualDeliveries = Math.min(1, Math.floor(daysRemaining / 30));
                break;
            default:
                actualDeliveries = Math.min(30, daysRemaining);
        }

        return Math.max(1, actualDeliveries); // At least 1 delivery if days remaining > 0
    };

    // Theoretical deliveries per month (for display reference)
    const getTheoreticalDeliveries = (freq: string): number => {
        switch (freq) {
            case 'daily': return 30;
            case 'alternate': return 15;
            case 'weekly': return 4;
            case 'monthly': return 1;
            default: return 30;
        }
    };

    // Calculate days remaining in subscription
    const daysRemaining = useMemo(() => {
        if (!subscription) return 30;
        const endDate = new Date(subscription.endDate);
        const now = new Date();
        return Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }, [subscription]);

    // Actual deliveries user will receive
    const actualDeliveries = useMemo(() => getActualDeliveries(frequency), [frequency, startDate, subscription]);

    // Calculate total price based on ACTUAL deliveries (unit price × count × actual deliveries)
    const totalPrice = useMemo(() => {
        if (!selectedQuantity) return 0;
        return selectedQuantity.price * count * actualDeliveries;
    }, [selectedQuantity, count, actualDeliveries]);

    // Calculate per-delivery price (unit price × count)
    const perDeliveryPrice = useMemo(() => {
        if (!selectedQuantity) return 0;
        return selectedQuantity.price * count;
    }, [selectedQuantity, count]);

    // Handle product selection
    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        // Set default animal type if available
        const animalTypes = (product as any).animalTypes;
        if (animalTypes && animalTypes.length > 0) {
            setSelectedAnimalType(animalTypes[0].type);
            // Set default quantity from first variant
            const firstVariant = animalTypes[0].variants?.[0];
            if (firstVariant) {
                setSelectedQuantity({
                    value: firstVariant.quantity?.value || 500,
                    unit: firstVariant.quantity?.unit || 'ml',
                    price: firstVariant.discountPrice || firstVariant.price || product.discountPrice || product.price
                });
            }
        } else {
            setSelectedAnimalType('default');
            setSelectedQuantity({
                value: product.quantity?.value || 500,
                unit: product.quantity?.unit || 'ml',
                price: product.discountPrice || product.price
            });
        }
        setStep('configure');
    };

    // Handle payment and add product
    const handleAddProduct = async () => {
        if (!subscription || !selectedProduct || !selectedQuantity) {
            Alert.alert('Error', 'Please select a product and configure it');
            return;
        }

        setProcessing(true);

        // Check subscription's payment method
        const paymentMethod = (subscription as any).paymentDetails?.paymentMethod || 'online';
        const isCod = paymentMethod === 'cod';

        logger.log('Subscription payment method:', paymentMethod, 'isCOD:', isCod);

        try {
            if (isCod) {
                // COD Flow - Skip Razorpay, add product directly
                logger.log('COD subscription - skipping Razorpay');

                const result = await subscriptionService.addProductToExistingSubscription(
                    subscription._id,
                    {
                        productId: selectedProduct._id,
                        productName: selectedProduct.name,
                        animalType: selectedAnimalType,
                        quantityValue: selectedQuantity.value * count,
                        quantityUnit: selectedQuantity.unit,
                        unitPrice: selectedQuantity.price * count,
                        deliveryFrequency: frequency,
                        maxDeliveries: actualDeliveries,
                        startDate: startDate.toISOString(),
                        paymentVerified: true, // COD doesn't need Razorpay verification
                        // No Razorpay details for COD - use empty strings
                        razorpayOrderId: '',
                        razorpayPaymentId: '',
                        razorpaySignature: '',
                        paymentAmount: totalPrice
                    }
                );

                Alert.alert(
                    'Success! 🎉',
                    `${selectedProduct.name} has been added to your subscription!\n\nPrice: ₹${totalPrice} (to be collected on delivery)`,
                    [
                        {
                            text: 'View Subscription',
                            onPress: () => navigation.navigate('SubscriptionCalendar')
                        },
                        {
                            text: 'Add More',
                            onPress: () => {
                                setStep('select');
                                setSelectedProduct(null);
                                setSelectedQuantity(null);
                                setCount(1);
                            }
                        }
                    ]
                );
            } else {
                // Online Payment Flow - Use Razorpay
                // 1. Create payment order
                const paymentOrder = await subscriptionService.createAddProductPaymentOrder(
                    totalPrice,
                    subscription._id
                );

                // 2. Open Razorpay
                const options = {
                    description: `Add ${selectedProduct.name} to Subscription`,
                    image: 'https://your-logo-url.com/logo.png',
                    currency: 'INR',
                    key: RAZORPAY_KEY_ID,
                    amount: paymentOrder.amount,
                    name: 'Lush & Pure',
                    order_id: paymentOrder.id,
                    prefill: {
                        email: user?.email || 'user@example.com',
                        contact: user?.phone || '9999999999',
                        name: user?.name || 'User'
                    },
                    theme: { color: colors.primary }
                };

                RazorpayCheckout.open(options).then(async (data: any) => {
                    try {
                        // 3. Verify payment
                        await subscriptionService.verifyAddProductPayment({
                            order_id: data.razorpay_order_id,
                            payment_id: data.razorpay_payment_id,
                            signature: data.razorpay_signature,
                            subscriptionId: subscription._id,
                            amount: totalPrice
                        });

                        // 4. Add product to subscription
                        const result = await subscriptionService.addProductToExistingSubscription(
                            subscription._id,
                            {
                                productId: selectedProduct._id,
                                productName: selectedProduct.name,
                                animalType: selectedAnimalType,
                                quantityValue: selectedQuantity.value * count,
                                quantityUnit: selectedQuantity.unit,
                                unitPrice: selectedQuantity.price * count,
                                deliveryFrequency: frequency,
                                maxDeliveries: actualDeliveries,
                                startDate: startDate.toISOString(),
                                paymentVerified: true,
                                razorpayOrderId: data.razorpay_order_id,
                                razorpayPaymentId: data.razorpay_payment_id,
                                razorpaySignature: data.razorpay_signature,
                                paymentAmount: totalPrice
                            }
                        );

                        Alert.alert(
                            'Success! 🎉',
                            `${selectedProduct.name} has been added to your subscription!\n\nMonthly Price: ₹${result.data.addedProduct.monthlyPrice}`,
                            [
                                {
                                    text: 'View Subscription',
                                    onPress: () => navigation.navigate('SubscriptionCalendar')
                                },
                                {
                                    text: 'Add More',
                                    onPress: () => {
                                        setStep('select');
                                        setSelectedProduct(null);
                                        setSelectedQuantity(null);
                                        setCount(1);
                                    }
                                }
                            ]
                        );
                    } catch (verifyError: any) {
                        logger.error('Verification failed:', verifyError);
                        Alert.alert('Error', verifyError.message || 'Failed to add product. Please contact support.');
                    }
                }).catch((error: any) => {
                    logger.error('Payment failed:', error);
                    Alert.alert('Payment Cancelled', 'The payment was cancelled or failed. Please try again.');
                });
            }
        } catch (error: any) {
            logger.error('Add product error:', error);
            Alert.alert('Error', error.message || 'Failed to process. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    // Check if subscription is COD for UI purposes
    const isCodSubscription = useMemo(() => {
        return (subscription as any)?.paymentDetails?.paymentMethod === 'cod';
    }, [subscription]);

    // Date picker handler
    const onChangeDate = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || startDate;
        setShowDatePicker(Platform.OS === 'ios');
        setStartDate(currentDate);
        if (Platform.OS === 'android') setShowDatePicker(false);
    };

    // Get available quantities for selected product and animal type
    const availableQuantities = useMemo(() => {
        if (!selectedProduct) return [];
        const animalTypes = (selectedProduct as any).animalTypes;
        if (animalTypes && animalTypes.length > 0) {
            const animalType = animalTypes.find((at: any) => at.type === selectedAnimalType);
            return animalType?.variants || [];
        }
        // Fallback to product's own quantity
        return [{
            quantity: selectedProduct.quantity,
            price: selectedProduct.price,
            discountPrice: selectedProduct.discountPrice
        }];
    }, [selectedProduct, selectedAnimalType]);

    // Render product card
    const renderProductCard = ({ item }: { item: Product }) => (
        <TouchableOpacity
            style={styles.productCard}
            onPress={() => handleSelectProduct(item)}
        >
            <View style={styles.productImageContainer}>
                {item.images?.[0] ? (
                    <Image
                        source={{ uri: item.images[0] }}
                        style={styles.productImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.productImagePlaceholder}>
                        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="1.5">
                            <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </Svg>
                    </View>
                )}
            </View>
            <View style={styles.productInfo}>
                <MonoText size="s" weight="bold" numberOfLines={2}>{item.name}</MonoText>
                <MonoText size="xs" color={colors.textLight}>{item.formattedQuantity || `${item.quantity?.value}${item.quantity?.unit}`}</MonoText>
                <View style={styles.priceRow}>
                    <MonoText size="s" weight="bold" color={colors.primary}>
                        ₹{item.discountPrice || item.price}
                    </MonoText>
                    {item.discountPrice && item.discountPrice < item.price && (
                        <MonoText size="xs" color={colors.textLight} style={{ textDecorationLine: 'line-through', marginLeft: 4 }}>
                            ₹{item.price}
                        </MonoText>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <MonoText style={{ marginTop: 16 }}>Loading products...</MonoText>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M19 12H5M12 19l-7-7 7-7" />
                    </Svg>
                </TouchableOpacity>
                <MonoText size="l" weight="bold">
                    {step === 'select' ? 'Add Product' : step === 'configure' ? 'Configure' : 'Confirm'}
                </MonoText>
                <View style={{ width: 40 }} />
            </View>

            {/* Subscription Info Bar */}
            {subscription && (
                <View style={styles.subscriptionInfoBar}>
                    <View style={styles.infoItem}>
                        <MonoText size="xs" color={colors.textLight}>Delivery Slot</MonoText>
                        <MonoText size="s" weight="bold">{subscription.slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}</MonoText>
                    </View>
                    <View style={styles.infoItem}>
                        <MonoText size="xs" color={colors.textLight}>Days Left</MonoText>
                        <MonoText size="s" weight="bold" color={daysRemaining < 7 ? '#EF4444' : colors.text}>
                            {daysRemaining} days
                        </MonoText>
                    </View>
                    <View style={styles.infoItem}>
                        <MonoText size="xs" color={colors.textLight}>End Date</MonoText>
                        <MonoText size="s" weight="bold">
                            {new Date(subscription.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </MonoText>
                    </View>
                </View>
            )}

            {step === 'select' && (
                <FlatList
                    data={products}
                    renderItem={renderProductCard}
                    keyExtractor={(item) => item._id}
                    numColumns={2}
                    contentContainerStyle={styles.productList}
                    columnWrapperStyle={{ gap: 12 }}
                    ListHeaderComponent={() => (
                        <MonoText size="m" weight="bold" style={{ marginBottom: 16 }}>
                            Select a product to add
                        </MonoText>
                    )}
                />
            )}

            {step === 'configure' && selectedProduct && (
                <ScrollView contentContainerStyle={styles.configContent}>
                    {/* Selected Product Card */}
                    <View style={styles.selectedProductCard}>
                        {selectedProduct.images?.[0] && (
                            <Image
                                source={{ uri: selectedProduct.images[0] }}
                                style={styles.selectedProductImage}
                                resizeMode="cover"
                            />
                        )}
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <MonoText size="m" weight="bold">{selectedProduct.name}</MonoText>
                            <MonoText size="xs" color={colors.textLight}>{selectedProduct.shortDescription}</MonoText>
                        </View>
                        <TouchableOpacity onPress={() => setStep('select')}>
                            <MonoText size="s" color={colors.primary}>Change</MonoText>
                        </TouchableOpacity>
                    </View>

                    {/* Animal Type Selection (if applicable) */}
                    {(selectedProduct as any).animalTypes?.length > 1 && (
                        <View style={styles.section}>
                            <MonoText size="s" weight="bold" style={{ marginBottom: 8 }}>Select Type</MonoText>
                            <View style={styles.optionsRow}>
                                {(selectedProduct as any).animalTypes.map((at: any) => (
                                    <TouchableOpacity
                                        key={at.type}
                                        style={[
                                            styles.optionBtn,
                                            selectedAnimalType === at.type && styles.optionBtnActive
                                        ]}
                                        onPress={() => {
                                            setSelectedAnimalType(at.type);
                                            const firstVariant = at.variants?.[0];
                                            if (firstVariant) {
                                                setSelectedQuantity({
                                                    value: firstVariant.quantity?.value || 500,
                                                    unit: firstVariant.quantity?.unit || 'ml',
                                                    price: firstVariant.discountPrice || firstVariant.price
                                                });
                                            }
                                        }}
                                    >
                                        <MonoText
                                            size="s"
                                            weight="bold"
                                            color={selectedAnimalType === at.type ? colors.primary : colors.textLight}
                                        >
                                            {at.type.charAt(0).toUpperCase() + at.type.slice(1)}
                                        </MonoText>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Quantity Selection */}
                    <View style={styles.section}>
                        <MonoText size="s" weight="bold" style={{ marginBottom: 8 }}>Select Quantity</MonoText>
                        <View style={styles.optionsRow}>
                            {availableQuantities.map((variant: any, index: number) => {
                                const qty = variant.quantity || { value: 500, unit: 'ml' };
                                const price = variant.discountPrice || variant.price;
                                const isSelected = selectedQuantity?.value === qty.value && selectedQuantity?.unit === qty.unit;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.quantityBtn, isSelected && styles.quantityBtnActive]}
                                        onPress={() => setSelectedQuantity({ value: qty.value, unit: qty.unit, price })}
                                    >
                                        <MonoText
                                            size="s"
                                            weight="bold"
                                            color={isSelected ? colors.primary : colors.text}
                                        >
                                            {qty.value}{qty.unit}
                                        </MonoText>
                                        <MonoText size="xs" color={isSelected ? colors.primary : colors.textLight}>
                                            ₹{price}
                                        </MonoText>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Count Selector */}
                    <View style={styles.section}>
                        <MonoText size="s" weight="bold" style={{ marginBottom: 8 }}>How many per delivery?</MonoText>
                        <View style={styles.countSelector}>
                            <TouchableOpacity
                                style={[styles.countBtn, count <= 1 && styles.countBtnDisabled]}
                                onPress={() => setCount(Math.max(1, count - 1))}
                                disabled={count <= 1}
                            >
                                <MonoText size="l" weight="bold" color={count <= 1 ? colors.textLight : colors.text}>−</MonoText>
                            </TouchableOpacity>
                            <View style={styles.countDisplay}>
                                <MonoText size="l" weight="bold">{count}</MonoText>
                                <MonoText size="xs" color={colors.textLight}>
                                    {count === 1 ? 'unit' : 'units'} × {selectedQuantity?.value}{selectedQuantity?.unit}
                                </MonoText>
                            </View>
                            <TouchableOpacity
                                style={styles.countBtn}
                                onPress={() => setCount(count + 1)}
                            >
                                <MonoText size="l" weight="bold" color={colors.text}>+</MonoText>
                            </TouchableOpacity>
                        </View>
                        {count > 1 && (
                            <MonoText size="xs" color={colors.textLight} style={{ marginTop: 8, textAlign: 'center' }}>
                                Total per delivery: {selectedQuantity?.value ? selectedQuantity.value * count : 0}{selectedQuantity?.unit} = ₹{perDeliveryPrice}
                            </MonoText>
                        )}
                    </View>

                    {/* Frequency Selection */}
                    <View style={styles.section}>
                        <MonoText size="s" weight="bold" style={{ marginBottom: 8 }}>Delivery Frequency</MonoText>
                        <View style={styles.frequencyGrid}>
                            {(['daily', 'alternate', 'weekly', 'monthly'] as const).map((freq) => (
                                <TouchableOpacity
                                    key={freq}
                                    style={[styles.frequencyBtn, frequency === freq && styles.frequencyBtnActive]}
                                    onPress={() => setFrequency(freq)}
                                >
                                    <MonoText
                                        size="s"
                                        weight="bold"
                                        color={frequency === freq ? colors.primary : colors.text}
                                    >
                                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                    </MonoText>
                                    <MonoText size="xs" color={frequency === freq ? colors.primary : colors.textLight}>
                                        {freq === frequency ? actualDeliveries : getTheoreticalDeliveries(freq)}/month
                                    </MonoText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Start Date */}
                    <View style={styles.section}>
                        <MonoText size="s" weight="bold" style={{ marginBottom: 8 }}>Start Date</MonoText>
                        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2">
                                <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <Line x1="16" y1="2" x2="16" y2="6" />
                                <Line x1="8" y1="2" x2="8" y2="6" />
                                <Line x1="3" y1="10" x2="21" y2="10" />
                            </Svg>
                            <MonoText style={{ marginLeft: 12 }}>
                                {startDate.toDateString()}
                            </MonoText>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={startDate}
                                mode="date"
                                display="default"
                                onChange={onChangeDate}
                                minimumDate={(() => {
                                    const d = new Date();
                                    d.setDate(d.getDate() + 1);
                                    return d;
                                })()}
                            />
                        )}
                    </View>

                    {/* Price Summary */}
                    <View style={styles.priceSummary}>
                        <View style={styles.priceRow}>
                            <MonoText color={colors.textLight}>Unit Price ({selectedQuantity?.value}{selectedQuantity?.unit})</MonoText>
                            <MonoText weight="bold">₹{selectedQuantity?.price || 0}</MonoText>
                        </View>
                        <View style={styles.priceRow}>
                            <MonoText color={colors.textLight}>Quantity per Delivery</MonoText>
                            <MonoText weight="bold">{count} × ₹{selectedQuantity?.price || 0} = ₹{perDeliveryPrice}</MonoText>
                        </View>
                        <View style={styles.priceRow}>
                            <MonoText color={colors.textLight}>Deliveries You'll Get</MonoText>
                            <MonoText weight="bold" color={actualDeliveries < getTheoreticalDeliveries(frequency) ? '#F59E0B' : colors.text}>
                                {actualDeliveries} (of {getTheoreticalDeliveries(frequency)} possible)
                            </MonoText>
                        </View>
                        {actualDeliveries < getTheoreticalDeliveries(frequency) && (
                            <MonoText size="xs" color="#F59E0B" style={{ marginTop: 4 }}>
                                ⚠️ Limited by {daysRemaining} days remaining in subscription
                            </MonoText>
                        )}
                        <View style={styles.divider} />
                        <View style={styles.priceRow}>
                            <MonoText size="l" weight="bold">Total Amount</MonoText>
                            <MonoText size="l" weight="bold" color={colors.primary}>₹{totalPrice}</MonoText>
                        </View>
                        <MonoText size="xs" color={colors.textLight} style={{ marginTop: 4 }}>
                            ₹{perDeliveryPrice}/delivery × {actualDeliveries} deliveries
                        </MonoText>
                    </View>

                    <View style={{ height: 120 }} />
                </ScrollView>
            )}

            {/* Footer */}
            {step === 'configure' && (
                <View style={styles.footer}>
                    <View style={styles.footerPrice}>
                        <MonoText size="xs" color={colors.textLight}>{actualDeliveries} deliveries</MonoText>
                        <MonoText size="l" weight="bold" color={colors.primary}>₹{totalPrice}</MonoText>
                    </View>
                    <TouchableOpacity
                        style={[styles.payBtn, processing && { opacity: 0.7 }]}
                        onPress={handleAddProduct}
                        disabled={processing || !selectedQuantity}
                    >
                        {processing ? (
                            <ActivityIndicator color={colors.white} size="small" />
                        ) : (
                            <MonoText weight="bold" color={colors.white}>
                                {isCodSubscription ? 'Add Product (COD)' : 'Pay & Add Product'}
                            </MonoText>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.l,
        paddingTop: Platform.OS === 'android' ? 40 : 60,
        paddingBottom: 16,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subscriptionInfoBar: {
        flexDirection: 'row',
        paddingHorizontal: spacing.l,
        paddingVertical: 12,
        backgroundColor: '#F0FDF4',
        borderBottomWidth: 1,
        borderBottomColor: '#BBF7D0',
    },
    infoItem: {
        flex: 1,
    },
    productList: {
        padding: spacing.l,
    },
    productCard: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
    },
    productImageContainer: {
        height: 100,
        backgroundColor: '#F9FAFB',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    productImagePlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    productInfo: {
        padding: 10,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    configContent: {
        padding: spacing.l,
    },
    selectedProductCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
    },
    selectedProductImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    section: {
        marginBottom: 20,
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
    },
    optionBtnActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    quantityBtn: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
        minWidth: 80,
    },
    quantityBtnActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    frequencyGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    frequencyBtn: {
        flexBasis: '48%',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
    },
    frequencyBtnActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    dateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
    },
    priceSummary: {
        padding: 16,
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 12,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingHorizontal: spacing.l,
        paddingVertical: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    },
    footerPrice: {
        flex: 1,
    },
    payBtn: {
        flex: 1,
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 8,
    },
    countBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    countBtnDisabled: {
        backgroundColor: '#F9FAFB',
    },
    countDisplay: {
        alignItems: 'center',
        paddingHorizontal: 24,
        minWidth: 100,
    },
});

export default AddProductToSubscriptionScreen;
