import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, Platform, ActivityIndicator, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
// @ts-ignore
import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_KEY_ID } from '@env'; // Ensure you have this configured
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { MonoText } from '../../../components/shared/MonoText';
import { useCartStore } from '../../../store/cart.store';
import { addressService, Address } from '../../../services/customer/address.service';
import { orderService } from '../../../services/customer/order.service';
import { branchService } from '../../../services/customer/branch.service';
import { useAuthStore } from '../../../store/authStore';
import { useSubscriptionCartStore } from '../../../store/subscriptionCart.store';
import { useHomeStore } from '../../../store/home.store';
import { logger } from '../../../utils/logger';

// Simple Haversine fallback to avoid extra dep
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const { width } = Dimensions.get('window');

// Maximum delivery distance in kilometers
const MAX_DELIVERY_DISTANCE_KM = 30;

type CheckoutRouteParams = {
    addressId: string;
    mode: 'cart' | 'subscription'; // To differentiate flows if needed
    subscriptionItems?: any[]; // Pass items if mode is subscription (since sub cart is single item usually)
};

export const CheckoutScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<{ params: CheckoutRouteParams }, 'params'>>();
    const { addressId, mode = 'cart', subscriptionItems = [] } = route.params || {};

    const { items, getTotalPrice, clearCart: clearRegularCart } = useCartStore();
    const { clearCart: clearSubscriptionCart } = useSubscriptionCartStore();
    const { user } = useAuthStore();
    // specific branch for this order, not the user's global location
    const [allocatedBranch, setAllocatedBranch] = useState<any>(null);

    const [address, setAddress] = useState<Address | null>(null);
    const [distanceKm, setDistanceKm] = useState(0);
    const [deliveryHigh, setDeliveryCharge] = useState(0);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [loading, setLoading] = useState(true);
    const [serviceAvailable, setServiceAvailable] = useState(true);

    // Subscription State
    const [slot, setSlot] = useState<'morning' | 'evening'>('morning');
    const [startDate, setStartDate] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
    });
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Fetch Address & Branch Logic
    useEffect(() => {
        const init = async () => {
            try {
                if (!addressId) return;
                setLoading(true);

                // 1. Get Address
                const addr = await addressService.getAddressById(addressId);
                setAddress(addr);

                if (addr.latitude && addr.longitude) {
                    // 2. Get Nearest Branch for THIS address
                    try {
                        const branch = await branchService.getNearestBranch(addr.latitude, addr.longitude);
                        setAllocatedBranch(branch); // branch service returns object with distance
                        setServiceAvailable(true);

                        // 3. Calc Metrics
                        // Backend might return distance, but let's calc explicit path distance or use backend's
                        // If backend returns distance in branch object:
                        const dist = branch.distance || calculateDistance(
                            branch.location.latitude,
                            branch.location.longitude,
                            addr.latitude,
                            addr.longitude
                        );

                        setDistanceKm(Number(dist.toFixed(1)));
                        setDeliveryCharge(orderService.calculateDeliveryCharge(dist));

                    } catch (e) {
                        // Branch service likely throws or returns null if no coverage (depending on implementation)
                        // For now assuming if it fails, no service.
                        logger.warn('No branch found for address', e);
                        setServiceAvailable(false);
                    }
                }
            } catch (err) {
                logger.error('Checkout init failed', err);
                Alert.alert("Error", "Could not load checkout details");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [addressId]);


    // Subscription Logic
    const getDeliveriesCount = (freq: string | undefined) => {
        if (!freq) return 1;
        switch (freq) {
            case 'daily': return 30;
            case 'alternate': return 15;
            case 'weekly': return 5;
            case 'monthly': return 1;
            default: return 1;
        }
    };

    // Derived Data
    const isSubscription = mode === 'subscription';

    // Ensure subscriptionItems is an array if present
    const finalSubItems = useMemo(() => {
        if (!isSubscription) return [];
        if (Array.isArray(subscriptionItems)) return subscriptionItems;
        return subscriptionItems ? [subscriptionItems] : [];
    }, [subscriptionItems, isSubscription]);

    const displayItems = isSubscription ? finalSubItems : items;

    // For Subscription: Force delivery free, calculate monthly total
    const subMonthlyTotal = useMemo(() => {
        if (!isSubscription) return 0;
        return finalSubItems.reduce((acc: number, item: any) => {
            const price = item.product.discountPrice || item.product.price;
            const count = getDeliveriesCount(item.frequency);
            return acc + (price * item.quantity * count);
        }, 0);
    }, [isSubscription, finalSubItems]);

    const cartTotal = getTotalPrice();
    // If subscription, use subMonthlyTotal. If cart, usage cartTotal + delivery
    const finalDeliveryCharge = isSubscription ? 0 : deliveryHigh;
    const grandTotal = isSubscription ? subMonthlyTotal : (cartTotal + finalDeliveryCharge);

    // Savings Calc
    const savings = useMemo(() => {
        if (isSubscription) {
            return finalSubItems.reduce((acc: number, item: any) => {
                const count = getDeliveriesCount(item.frequency);
                const regular = item.product.price * item.quantity * count;
                const deal = (item.product.discountPrice || item.product.price) * item.quantity * count;
                return acc + (regular - deal);
            }, 0);
        }
        return items.reduce((acc, item) => {
            const regular = item.product.price * item.quantity;
            const deal = (item.product.discountPrice || item.product.price) * item.quantity;
            return acc + (regular - deal);
        }, 0);
    }, [items, isSubscription, finalSubItems]);

    // Check if delivery location is out of range (>30km)
    const isOutOfRange = distanceKm > MAX_DELIVERY_DISTANCE_KM;

    const handlePlaceOrder = async () => {
        if (!address || !allocatedBranch) return;
        setPlacingOrder(true);

        try {
            if (isSubscription) {
                // 1. Prepare Payload for Enhanced Subscription
                const productsPayload = finalSubItems.map((item: any) => ({
                    productId: item.product._id,
                    selectedQuantity: item.product.formattedQuantity || (typeof item.product.quantity === 'object'
                        ? `${item.product.quantity.value}${item.product.quantity.unit} `
                        : `${item.product.quantity} `),
                    animalType: item.product.animalTypes?.[0]?.type || 'cow',
                    deliveryFrequency: item.frequency,
                    count: item.quantity || 1,
                    unitPrice: item.product.discountPrice || item.product.price,
                    monthlyPrice: (item.product.discountPrice || item.product.price) * (item.quantity || 1) * getDeliveriesCount(item.frequency)
                }));

                const subscriptionPayload = {
                    customerId: user?._id || '', // Fallback to empty string or handle undefined validation upstream
                    products: productsPayload,
                    slot,
                    startDate: startDate.toISOString(),
                    endDate: new Date(startDate.getTime() + (30 - 1) * 24 * 60 * 60 * 1000).toISOString(), // 29 days after start = 30 days inclusive
                    addressId: addressId,
                    branchId: allocatedBranch._id,
                    branchName: allocatedBranch.name
                };

                // 2. Create Subscription
                const subResponse = await orderService.createEnhancedSubscription(subscriptionPayload);
                const subscriptionId = subResponse.subscription._id;
                const billAmount = subResponse.subscription.bill;

                // 3. Create Payment Order
                const paymentOrderResponse = await orderService.createPaymentOrder({
                    amount: billAmount,
                    currency: 'INR',
                    receipt: `receipt_${Date.now()}`,
                    orderType: 'subscription'
                });

                // 4. Open Razorpay
                const options = {
                    description: 'Subscription Payment',
                    image: 'https://your-logo-url.com/logo.png', // Replace with app logo
                    currency: 'INR',
                    key: RAZORPAY_KEY_ID,
                    amount: paymentOrderResponse.amount,
                    name: 'Lush & Pure',
                    order_id: paymentOrderResponse.id,
                    prefill: {
                        email: 'user@example.com', // Get from user profile
                        contact: '9999999999', // Get from user profile
                        name: 'User Name' // Get from user profile
                    },
                    theme: { color: colors.primary }
                };

                RazorpayCheckout.open(options).then(async (data: any) => {
                    // 5. Verify Payment
                    await orderService.verifyPayment({
                        order_id: data.razorpay_order_id,
                        payment_id: data.razorpay_payment_id,
                        signature: data.razorpay_signature,
                        subscriptionId: subscriptionId,
                        amount: billAmount
                    });

                    Alert.alert("Success", "Subscription activated successfully!", [
                        {
                            text: "OK", onPress: () => {
                                useHomeStore.getState().fetchHomeData();
                                clearSubscriptionCart();
                                navigation.navigate('Home');
                            }
                        }
                    ]);
                }).catch(async (error: any) => {
                    logger.error('Payment Error', error);
                    Alert.alert("Payment Failed", "Something went wrong during payment. Please try again.");
                    // Cleanup pending subscription
                    try {
                        await orderService.deleteSubscription(subscriptionId);
                        logger.log('Cleaned up pending subscription:', subscriptionId);
                    } catch (cleanupErr) {
                        logger.error('Failed to cleanup subscription', cleanupErr);
                    }
                });

            } else {
                // Track orderId for cleanup in case of failure
                let createdOrderId: string | null = null;

                try {
                    // 1. Create Normal Order (Status: Pending Payment)
                    // Backend Expects: { userId, branch, items: [{id, item, count}], totalPrice, deliveryFee, addressId }
                    const orderPayload: any = {
                        userId: user?._id || '', // Ensure string fallback
                        branch: allocatedBranch._id,
                        items: items.map(i => ({
                            id: i.product._id,
                            item: i.product.name,
                            count: i.quantity
                        })),
                        addressId: addressId,
                        totalPrice: grandTotal,
                        deliveryFee: finalDeliveryCharge,
                        // Extra fields for frontend usage or if backend updates later
                        paymentMethod: 'online' as const
                    };

                    const orderResponse = await orderService.createOrder(orderPayload);
                    createdOrderId = orderResponse.order._id;

                    // 2. Create Payment Order (Razorpay)
                    const paymentOrderResponse = await orderService.createPaymentOrder({
                        amount: grandTotal,
                        currency: 'INR',
                        receipt: `order_${createdOrderId}`,
                        orderType: 'order'
                    });

                    // 3. Open Razorpay
                    const options = {
                        description: 'Order Payment',
                        image: 'https://lushandpures.com/assets/images/favicon.png',
                        currency: 'INR',
                        key: RAZORPAY_KEY_ID,
                        amount: paymentOrderResponse.amount,
                        name: 'Lush & Pure',
                        order_id: paymentOrderResponse.id,
                        prefill: {
                            email: user?.email || 'user@example.com',
                            contact: user?.phone || '9999999999',
                            name: user?.name || 'User Name'
                        },
                        theme: { color: colors.primary }
                    };

                    RazorpayCheckout.open(options).then(async (data: any) => {
                        // 4. Verify Payment
                        await orderService.verifyPayment({
                            order_id: data.razorpay_order_id,
                            payment_id: data.razorpay_payment_id,
                            signature: data.razorpay_signature,
                            appOrderId: createdOrderId!, // Pass internal Order ID so backend can update it
                            amount: grandTotal
                        });

                        clearRegularCart();
                        Alert.alert("Order Placed", "Your yummy order is on the way!", [
                            { text: "Track Order", onPress: () => navigation.navigate('OrderTracking', { orderId: createdOrderId }) },
                            { text: "Home", onPress: () => navigation.navigate('Home') }
                        ]);
                    }).catch(async (error: any) => {
                        logger.error('Payment Error', error);
                        // Cleanup pending order when payment cancelled or failed
                        if (createdOrderId) {
                            try {
                                await orderService.deletePendingOrder(createdOrderId);
                                logger.log('Cleaned up pending order:', createdOrderId);
                            } catch (cleanupErr) {
                                logger.error('Failed to cleanup order:', cleanupErr);
                            }
                        }
                        Alert.alert("Payment Cancelled", "Your payment was not completed. The order has been cancelled.");
                    });
                } catch (orderError: any) {
                    logger.error('Order creation error:', orderError);
                    // If order was created but payment order failed, clean up
                    if (createdOrderId) {
                        try {
                            await orderService.deletePendingOrder(createdOrderId);
                            logger.log('Cleaned up pending order after payment creation failure:', createdOrderId);
                        } catch (cleanupErr) {
                            logger.error('Failed to cleanup order:', cleanupErr);
                        }
                    }
                    Alert.alert("Error", orderError.message || "Failed to process order. Please try again.");
                }
            }
        } catch (error: any) {
            logger.error('Order placement error:', error);
            Alert.alert("Error", error.message || "Failed to place order. Please try again.");
        } finally {
            setPlacingOrder(false);
        }
    };

    // Handle COD Payment
    const handleCodPayment = async () => {
        if (!address || !allocatedBranch) return;
        setPlacingOrder(true);

        try {
            if (isSubscription) {
                // 1. Prepare and Create Subscription (same as online flow)
                const productsPayload = finalSubItems.map((item: any) => ({
                    productId: item.product._id,
                    selectedQuantity: item.product.formattedQuantity || (typeof item.product.quantity === 'object'
                        ? `${item.product.quantity.value}${item.product.quantity.unit}`
                        : `${item.product.quantity}`),
                    animalType: item.product.animalTypes?.[0]?.type || 'cow',
                    deliveryFrequency: item.frequency,
                    count: item.quantity || 1,
                    unitPrice: item.product.discountPrice || item.product.price,
                    monthlyPrice: (item.product.discountPrice || item.product.price) * (item.quantity || 1) * getDeliveriesCount(item.frequency)
                }));

                const subscriptionPayload = {
                    customerId: user?._id || '',
                    products: productsPayload,
                    slot,
                    startDate: startDate.toISOString(),
                    endDate: new Date(startDate.getTime() + (30 - 1) * 24 * 60 * 60 * 1000).toISOString(), // 29 days after start = 30 days inclusive
                    addressId: addressId,
                    branchId: allocatedBranch._id,
                    branchName: allocatedBranch.name
                };

                const subResponse = await orderService.createEnhancedSubscription(subscriptionPayload);
                const subscriptionId = subResponse.subscription._id;

                // 2. Mark as COD
                await orderService.createCodSubscription(subscriptionId);

                Alert.alert("Success", "Subscription activated with Cash on Delivery!", [
                    {
                        text: "OK", onPress: () => {
                            useHomeStore.getState().fetchHomeData();
                            clearSubscriptionCart();
                            navigation.navigate('Home');
                        }
                    }
                ]);
            } else {
                // Normal Order COD Flow
                const orderPayload: any = {
                    userId: user?._id || '',
                    branch: allocatedBranch._id,
                    items: items.map(i => ({
                        id: i.product._id,
                        item: i.product.name,
                        count: i.quantity
                    })),
                    addressId: addressId,
                    totalPrice: grandTotal,
                    deliveryFee: finalDeliveryCharge,
                    paymentMethod: 'cod' as const
                };

                const orderResponse = await orderService.createOrder(orderPayload);
                const createdOrderId = orderResponse.order._id;

                // Mark as COD
                await orderService.createCodOrder(createdOrderId);

                clearRegularCart();
                Alert.alert("Order Placed", "Your order is confirmed! Pay on delivery.", [
                    { text: "Track Order", onPress: () => navigation.navigate('OrderTracking', { orderId: createdOrderId }) },
                    { text: "Home", onPress: () => navigation.navigate('Home') }
                ]);
            }
        } catch (error: any) {
            logger.error('COD order error:', error);
            Alert.alert("Error", error.message || "Failed to place COD order. Please try again.");
        } finally {
            setPlacingOrder(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.itemRow}>
            {/* Image placeholder or real image if available */}
            <View style={styles.itemImagePlaceholder}>
                {item.product.images?.[0] ? (
                    <Image source={{ uri: item.product.images[0] }} style={{ width: '100%', height: '100%', borderRadius: 8 }} resizeMode="cover" />
                ) : (
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                        <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </Svg>
                )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
                <MonoText size="s" weight="bold" numberOfLines={1}>{item.product.name}</MonoText>

                {/* Variant / Quantity Info */}
                <MonoText size="xs" color={colors.textLight}>
                    {item.quantity} x {typeof item.product.quantity === 'object' ? item.product.quantity.value : item.product.quantity} {typeof item.product.quantity === 'object' ? item.product.quantity.unit : item.product.unit}
                </MonoText>

                {/* Subscription Plan Info explicitly in Product Card */}
                {isSubscription && (
                    <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 }}>
                            <MonoText size="xs" color="#0369A1" weight="bold">
                                {item.frequency ? item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1) : 'Daily'}
                            </MonoText>
                        </View>
                        <MonoText size="xs" color={colors.textLight}>
                            {getDeliveriesCount(item.frequency)} Deliveries / Month
                        </MonoText>
                    </View>
                )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <MonoText size="s" weight="bold">
                    ₹{(item.product.discountPrice || item.product.price) * item.quantity}
                    {isSubscription && <MonoText size="xs" color={colors.textLight}> / unit</MonoText>}
                </MonoText>
                {(item.product.discountPrice && item.product.price > item.product.discountPrice) && (
                    <MonoText size="xs" color={colors.textLight} style={{ textDecorationLine: 'line-through' }}>
                        ₹{item.product.price * item.quantity}
                    </MonoText>
                )}
            </View>
        </View>
    );

    const onChangeDate = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || startDate;
        setShowDatePicker(Platform.OS === 'ios');
        setStartDate(currentDate);
        if (Platform.OS === 'android') setShowDatePicker(false);
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <MonoText>Loading checkout details...</MonoText>
            </SafeAreaView>
        );
    }

    if (!serviceAvailable) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: spacing.xl }]}>
                <Svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 20 }}>
                    <Circle cx="12" cy="12" r="10" />
                    <Line x1="8" y1="9" x2="16" y2="9" />
                    <Line x1="9" y1="15" x2="15" y2="15" />
                </Svg>
                <MonoText size="l" weight="bold" style={{ textAlign: 'center', marginBottom: 12 }}>Sorry, we don't ship here yet!</MonoText>
                <MonoText color={colors.textLight} style={{ textAlign: 'center', marginBottom: 24 }}>
                    We can't take your order as we are not shipping in your area. We will be coming soon! Stay updated and thanks for coming!
                </MonoText>
                <TouchableOpacity style={styles.payBtn} onPress={() => navigation.navigate('Home')}>
                    <MonoText weight="bold" color={colors.white}>Go Back Home</MonoText>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // Out of range check (> 30km) - Full Screen Notice
    if (isOutOfRange) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: spacing.xl }]}>
                {/* Warning Icon */}
                <View style={styles.outOfRangeIconContainer}>
                    <Svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2">
                        <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#DC2626" stroke="#DC2626" />
                        <Line x1="12" y1="9" x2="12" y2="13" stroke="#FFFFFF" strokeWidth="2" />
                        <Line x1="12" y1="17" x2="12.01" y2="17" stroke="#FFFFFF" strokeWidth="2" />
                    </Svg>
                </View>

                <MonoText size="xl" weight="bold" style={{ textAlign: 'center', marginBottom: 8, marginTop: 20 }}>
                    Service Not Available
                </MonoText>
                <MonoText size="m" color={colors.textLight} style={{ textAlign: 'center', marginBottom: 8 }}>
                    Sorry, we're not available in your area yet!
                </MonoText>
                <View style={styles.distanceBadge}>
                    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth="2">
                        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <Circle cx="12" cy="10" r="3" />
                    </Svg>
                    <MonoText size="s" weight="bold" color={colors.error} style={{ marginLeft: 6 }}>
                        {distanceKm} km away from nearest branch
                    </MonoText>
                </View>
                <MonoText color={colors.textLight} style={{ textAlign: 'center', marginBottom: 32, marginTop: 16, paddingHorizontal: 20 }}>
                    We currently deliver only within 30km of our branches. We'll be expanding soon! Try changing your delivery address or check back later.
                </MonoText>

                {/* Action Buttons */}
                <TouchableOpacity
                    style={styles.outOfRangePrimaryBtn}
                    onPress={() => navigation.navigate('AddressSelection', { mode: mode || 'cart' })}
                >
                    <MonoText weight="bold" color={colors.white}>Change Delivery Address</MonoText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.outOfRangeSecondaryBtn}
                    onPress={() => navigation.navigate('Home')}
                >
                    <MonoText weight="bold" color={colors.text}>Go Back Home</MonoText>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // Empty cart/subscription check
    if (displayItems.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: spacing.xl }]}>
                <Svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 24 }}>
                    <Circle cx="9" cy="21" r="1" />
                    <Circle cx="20" cy="21" r="1" />
                    <Path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </Svg>
                <MonoText size="l" weight="bold" style={{ textAlign: 'center', marginBottom: 12 }}>
                    Your cart is empty
                </MonoText>
                <MonoText color={colors.textLight} style={{ textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 }}>
                    Add products to continue checkout. Browse our fresh dairy products and start your order!
                </MonoText>
                <TouchableOpacity
                    style={styles.emptyCartBtn}
                    onPress={() => navigation.navigate('Categories')}
                >
                    <MonoText weight="bold" color={colors.text} size="s">Add Products</MonoText>
                </TouchableOpacity>
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
                <MonoText size="l" weight="bold">Checkout</MonoText>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* 1. Delivery Address Card */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <Circle cx="12" cy="10" r="3" />
                        </Svg>
                        <MonoText weight="bold" style={{ marginLeft: 8 }}>Delivery Address</MonoText>
                    </View>
                    <MonoText size="s" weight="bold">{address?.addressLine1}</MonoText>
                    {!!address?.addressLine2 && <MonoText size="s">{address.addressLine2}</MonoText>}
                    <MonoText size="s" color={colors.textLight}>{address?.city}, {address?.zipCode}</MonoText>
                </View>

                {/* 2. Allocated Branch Card */}
                <View style={styles.mapCard}>
                    <View style={styles.mapContainer}>
                        {address && address.latitude && address.longitude && allocatedBranch && (
                            <MapView
                                provider={PROVIDER_DEFAULT}
                                style={StyleSheet.absoluteFill}
                                initialRegion={{
                                    latitude: (address.latitude + allocatedBranch.location.latitude) / 2,
                                    longitude: (address.longitude + allocatedBranch.location.longitude) / 2,
                                    latitudeDelta: Math.abs(address.latitude - allocatedBranch.location.latitude) * 1.5,
                                    longitudeDelta: Math.abs(address.longitude - allocatedBranch.location.longitude) * 1.5,
                                }}
                                scrollEnabled={false}
                                zoomEnabled={false}
                            >
                                <Marker coordinate={{ latitude: address.latitude, longitude: address.longitude }}>
                                    <View style={styles.markerMyLoc} />
                                </Marker>
                                <Marker coordinate={{ latitude: allocatedBranch.location.latitude, longitude: allocatedBranch.location.longitude }}>
                                    <View style={styles.markerStore} />
                                </Marker>
                                <Polyline
                                    coordinates={[
                                        { latitude: address.latitude, longitude: address.longitude },
                                        { latitude: allocatedBranch.location.latitude, longitude: allocatedBranch.location.longitude }
                                    ]}
                                    strokeColor={colors.primary}
                                    strokeWidth={3}
                                    lineDashPattern={[5, 5]}
                                />
                            </MapView>
                        )}
                    </View>
                    <View style={styles.branchInfo}>
                        <View>
                            <MonoText size="s" weight="bold" color={colors.text}>{allocatedBranch?.name || "Allocated Branch"}</MonoText>
                            <MonoText size="xs" color={colors.textLight}>{distanceKm} km away</MonoText>
                        </View>
                        <View style={{ backgroundColor: '#FEFCE8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                            <MonoText size="xs" color="#854D0E" weight="bold">
                                {isSubscription
                                    ? "~2 hrs delivery"
                                    : `~${Math.ceil(distanceKm * 5 + 15)} mins`
                                }
                            </MonoText>
                        </View>
                    </View>
                </View>

                {/* Important Notice */}
                <View style={styles.noticeCard}>
                    <MonoText size="xs" color="#854D0E" style={{ lineHeight: 18 }}>
                        {isSubscription
                            ? "NOTE: A delivery partner will be assigned within 2 hours of purchase. You can reschedule slots and dates anytime from your calendar."
                            : `NOTE: A delivery partner will be assigned shortly.Your order will reach you in approximately ${Math.ceil(distanceKm * 5 + 15)} minutes.`
                        }
                    </MonoText>
                </View>

                {/* 3. Subscription Slots (if applicable) */}
                {isSubscription && (
                    <View style={styles.section}>
                        <MonoText size="m" weight="bold" style={{ marginBottom: 12 }}>Schedule Delivery</MonoText>
                        <View style={styles.slotRow}>
                            <TouchableOpacity style={[styles.slotBtn, slot === 'morning' && styles.slotBtnActive]} onPress={() => setSlot('morning')}>
                                <MonoText size="s" weight="bold" color={slot === 'morning' ? colors.primary : colors.textLight}>Morning</MonoText>
                                <MonoText size="xs" color={slot === 'morning' ? colors.primary : colors.textLight}>8 AM - 10 AM</MonoText>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.slotBtn, slot === 'evening' && styles.slotBtnActive]} onPress={() => setSlot('evening')}>
                                <MonoText size="s" weight="bold" color={slot === 'evening' ? colors.primary : colors.textLight}>Evening</MonoText>
                                <MonoText size="xs" color={slot === 'evening' ? colors.primary : colors.textLight}>6 PM - 8 PM</MonoText>
                            </TouchableOpacity>
                        </View>
                        <MonoText size="s" weight="bold" style={{ marginBottom: 8 }}>Start Date</MonoText>
                        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <Line x1="16" y1="2" x2="16" y2="6" />
                                <Line x1="8" y1="2" x2="8" y2="6" />
                                <Line x1="3" y1="10" x2="21" y2="10" />
                            </Svg>
                            <MonoText>Start Delivery From: <MonoText weight="bold">{startDate.toDateString()}</MonoText></MonoText>
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
                )}

                {/* 4. Product Details */}
                <View style={styles.section}>
                    <MonoText size="m" weight="bold" style={{ marginBottom: 16 }}>Order Items</MonoText>
                    <FlatList
                        data={displayItems}
                        renderItem={renderItem}
                        keyExtractor={(item: any, index: number) => item.product._id + index}
                        scrollEnabled={false}
                    />
                    {!isSubscription && (
                        <TouchableOpacity style={styles.addMoreRow} onPress={() => navigation.navigate('Home')}>
                            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <Line x1="12" y1="5" x2="12" y2="19" />
                                <Line x1="5" y1="12" x2="19" y2="12" />
                            </Svg>
                            <MonoText size="s" weight="bold" color={colors.primary}>Add more products</MonoText>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 5. Bill Summary */}
                <View style={styles.section}>
                    <MonoText size="m" weight="bold" style={{ marginBottom: 12 }}>Payment Summary</MonoText>

                    {/* Item Total */}
                    <View style={styles.billRow}>
                        <View>
                            <MonoText color={colors.textLight}>{isSubscription ? 'Monthly Total' : 'Item Total'}</MonoText>
                            {isSubscription && (
                                <MonoText size="xs" color={colors.textLight} style={{ marginTop: 2 }}>
                                    (Total for {finalSubItems.length} subscription {finalSubItems.length > 1 ? 'items' : 'item'})
                                </MonoText>
                            )}
                        </View>
                        <MonoText weight="bold">₹{isSubscription ? subMonthlyTotal : cartTotal}</MonoText>
                    </View>

                    {savings > 0 && (
                        <View style={styles.billRow}>
                            <MonoText color={colors.success}>Total Savings</MonoText>
                            <MonoText color={colors.success} weight="bold">- ₹{savings}</MonoText>
                        </View>
                    )}

                    <View style={styles.billRow}>
                        <MonoText color={colors.textLight}>Delivery Charges</MonoText>
                        <MonoText weight="bold" color={isSubscription ? colors.success : colors.black}>
                            {finalDeliveryCharge === 0 ? 'FREE' : `₹${finalDeliveryCharge} `}
                        </MonoText>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.billRow}>
                        <MonoText size="l" weight="bold">To Pay</MonoText>
                        <MonoText size="l" weight="bold" color={colors.primary}>₹{grandTotal}</MonoText>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                {/* Out of Range Warning - Enhanced visibility */}
                {isOutOfRange && (
                    <View style={styles.outOfRangeWarning}>
                        <View style={styles.warningIconContainer}>
                            <Svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                                <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#DC2626" stroke="#DC2626" />
                                <Line x1="12" y1="9" x2="12" y2="13" stroke="#FFFFFF" />
                                <Line x1="12" y1="17" x2="12.01" y2="17" stroke="#FFFFFF" />
                            </Svg>
                        </View>
                        <View style={{ flex: 1 }}>
                            <MonoText size="m" weight="bold" color="#DC2626">
                                Service Not Available
                            </MonoText>
                            <MonoText size="s" color="#7F1D1D" style={{ marginTop: 2 }}>
                                Sorry, we're not available in your area yet ({distanceKm}km away). We'll be coming soon!
                            </MonoText>
                            <TouchableOpacity
                                style={styles.changeAddressBtn}
                                onPress={() => navigation.navigate('AddressSelection', { mode: mode || 'cart' })}
                            >
                                <MonoText size="xs" weight="bold" color="#DC2626">
                                    Change Delivery Address →
                                </MonoText>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                {/* Payment Buttons */}
                <View style={styles.paymentButtonsRow}>
                    {/* COD Button */}
                    <TouchableOpacity
                        style={[
                            styles.codBtn,
                            (placingOrder || isOutOfRange) && styles.payBtnDisabled
                        ]}
                        onPress={handleCodPayment}
                        disabled={placingOrder || isOutOfRange}
                    >
                        <MonoText weight="bold" color={colors.text} size="s">
                            {placingOrder ? 'Processing...' : 'Pay on Delivery'}
                        </MonoText>
                    </TouchableOpacity>

                    {/* Online Pay Button */}
                    <TouchableOpacity
                        style={[
                            styles.payBtn,
                            { flex: 1.5 },
                            (placingOrder || isOutOfRange) && styles.payBtnDisabled
                        ]}
                        onPress={handlePlaceOrder}
                        disabled={placingOrder || isOutOfRange}
                    >
                        <MonoText weight="bold" color={colors.white} size="m">
                            {placingOrder
                                ? 'Processing...'
                                : isOutOfRange
                                    ? '🚫 Not Available'
                                    : `Pay ₹${grandTotal}`
                            }
                        </MonoText>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background, // Should be an off-white or plain white
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.l,
        paddingTop: Platform.OS === 'android' ? 40 : 60, // Safe area handling for absolute header
        paddingBottom: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.85)', // Glass opacity
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230, 230, 230, 0.5)',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    content: {
        paddingTop: 110, // Space for header
        paddingBottom: 120,
        paddingHorizontal: spacing.l,
    },
    mapCard: {
        marginBottom: 24,
        overflow: 'hidden',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        // No shadow
    },
    mapContainer: {
        height: 160,
        width: '100%',
    },
    markerMyLoc: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: colors.white,
    },
    markerStore: {
        width: 16,
        height: 16,
        borderRadius: 4,
        backgroundColor: colors.black,
    },
    branchInfo: {
        padding: 12,
        backgroundColor: colors.background, // Ensure text is readable
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    noticeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        padding: 12,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    section: {
        marginBottom: 24,
        // Removed card styling (bg, shadow, radius)
    },
    slotRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    slotBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: 'transparent',
    },
    slotBtnActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    dateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: 'transparent',
    },
    billRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 12,
        marginBottom: 12,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingHorizontal: spacing.l,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    itemImagePlaceholder: {
        width: 48,
        height: 48,
        backgroundColor: colors.border,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addMoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    payBtn: {
        flex: 1,
        height: 56,
        backgroundColor: colors.primary, // Using primary color
        borderRadius: 28, // More rounded pill shape?
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    payBtnDisabled: {
        backgroundColor: '#9CA3AF',
        shadowColor: '#9CA3AF',
    },
    outOfRangeWarning: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FEF2F2',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#FECACA',
    },
    warningIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    changeAddressBtn: {
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#FEE2E2',
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    outOfRangeIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    outOfRangePrimaryBtn: {
        width: '100%',
        height: 52,
        backgroundColor: colors.primary,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    outOfRangeSecondaryBtn: {
        width: '100%',
        height: 52,
        backgroundColor: '#FEF2F2',
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    paymentButtonsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    codBtn: {
        flex: 1,
        height: 56,
        backgroundColor: '#F3F4F6',
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    emptyCartBtn: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    }
});
