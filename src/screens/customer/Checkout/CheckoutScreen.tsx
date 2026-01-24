import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, Platform, ActivityIndicator, Image, FlatList, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
// @ts-ignore
import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_KEY_ID } from '@env'; // Ensure you have this configured
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { MonoText } from '../../../components/shared/MonoText';
import { ProductGridCard } from '../../../components/shared/ProductGridCard';
import { useCartStore } from '../../../store/cart.store';
import { useToastStore } from '../../../store/toast.store';
import { productService, Product } from '../../../services/customer/product.service';
import { ProductDetailsModal } from '../../../components/home/ProductDetailsModal';
import { addressService, Address } from '../../../services/customer/address.service';
import { orderService } from '../../../services/customer/order.service';
import { branchService } from '../../../services/customer/branch.service';
import { taxService, TaxSettings } from '../../../services/customer/tax.service';
import { useAuthStore } from '../../../store/authStore';
import { useHomeStore } from '../../../store/home.store';
import { logger } from '../../../utils/logger';
import { notifyOrderPlaced } from '../../../services/notification/notification.service';
import { ApplyCouponModal } from '../../../components/checkout/ApplyCouponModal';
import { CheckoutAddressModal } from '../../../components/checkout/CheckoutAddressModal';
import { CheckoutSkeleton } from '../../../components/shared/CheckoutSkeleton';
import { CouponData, couponService } from '../../../services/customer/coupon.service';

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

type CheckoutRouteParams = {
    addressId?: string;
    showAddressModal?: boolean;
};

export const CheckoutScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<{ params: CheckoutRouteParams }, 'params'>>();
    const { addressId: routeAddressId, showAddressModal } = route.params || {};

    const { items, getTotalPrice, clearCart, addToCart, removeFromCart, deleteFromCart, getItemQuantity } = useCartStore();
    const { showToast } = useToastStore();
    const { user } = useAuthStore();
    const { normalProducts } = useHomeStore();
    const [allocatedBranch, setAllocatedBranch] = useState<any>(null);

    // Details Modal State
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

    const [address, setAddress] = useState<Address | null>(null);
    const [distanceKm, setDistanceKm] = useState(0);
    const [deliveryHigh, setDeliveryCharge] = useState(0);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [loading, setLoading] = useState(true);
    const [serviceAvailable, setServiceAvailable] = useState(true);
    const [taxRates, setTaxRates] = useState<TaxSettings>({ sgst: 0, cgst: 0 });

    // Coupon state
    const [couponModalVisible, setCouponModalVisible] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [availableCouponsCount, setAvailableCouponsCount] = useState(0);

    // Payment method state
    const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);

    // Remove Item Confirmation State
    const [removeItemModalVisible, setRemoveItemModalVisible] = useState(false);
    const [itemToRemove, setItemToRemove] = useState<any>(null);

    // Address Modal State
    const [addressModalVisible, setAddressModalVisible] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(routeAddressId || null);

    // Stock Validation State
    const [isValidatingStock, setIsValidatingStock] = useState(false);
    const [stockErrors, setStockErrors] = useState<Record<string, { status: string, message: string, available: number }>>({});
    const [hasCriticalStockIssue, setHasCriticalStockIssue] = useState(false);

    const insets = useSafeAreaInsets();

    // Function to validate stock for all items in cart
    const validateStock = async (forceAlert = false) => {
        if (items.length === 0) return true;

        try {
            setIsValidatingStock(true);
            const inventoryItems = items.map(item => ({
                inventoryId: item.product.inventoryId || item.product._id,
                quantity: item.quantity
            }));

            const result = await productService.validateCartStock(inventoryItems);

            const errors: Record<string, any> = {};
            let criticalIssue = false;

            result.items.forEach(item => {
                if (!item.available) {
                    errors[item.inventoryId] = {
                        status: item.status,
                        message: item.message,
                        available: item.availableStock
                    };
                    if (item.status === 'OUT_OF_STOCK' || item.status === 'NOT_FOUND') {
                        criticalIssue = true;
                    }
                }
            });

            setStockErrors(errors);
            setHasCriticalStockIssue(criticalIssue);

            if (forceAlert && !result.allAvailable) {
                Alert.alert("Stock Update", result.message);
            }

            return result.allAvailable;
        } catch (err) {
            console.error('Stock validation failed:', err);
            return true; // Fallback to proceed if validation service fails
        } finally {
            setIsValidatingStock(false);
        }
    };

    // Re-validate stock when items in cart change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (items.length > 0) {
                validateStock();
            }
        }, 500); // Debounce validation

        return () => clearTimeout(timer);
    }, [items]);

    // Function to load address and branch data
    const loadAddressData = async (addrId: string) => {
        try {
            setLoading(true);

            // 1. Get Address
            const addr = await addressService.getAddressById(addrId);
            setAddress(addr);

            if (addr.latitude && addr.longitude) {
                // 2. Get Nearest Branch for THIS address
                try {
                    const branch = await branchService.getNearestBranch(addr.latitude, addr.longitude);
                    console.log('[Checkout] Branch response:', JSON.stringify({
                        name: branch.name,
                        distance: branch.distance,
                        deliveryRadiusKm: branch.deliveryRadiusKm,
                        isWithinRadius: branch.isWithinRadius
                    }));

                    setAllocatedBranch(branch);
                    setServiceAvailable(true);

                    // Use distance from backend, fallback to 0 if null
                    const safeDist = branch.distance ?? 0;
                    setDistanceKm(Number(safeDist.toFixed(1)));
                    setDeliveryCharge(orderService.calculateDeliveryCharge(safeDist));
                } catch (e) {
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

    // Show address modal when screen gains focus with showAddressModal param
    useFocusEffect(
        React.useCallback(() => {
            if (showAddressModal && !selectedAddressId) {
                setAddressModalVisible(true);
                setLoading(false);
            }
        }, [showAddressModal, selectedAddressId])
    );

    // Fetch Address & Branch Logic when address changes
    useEffect(() => {
        if (selectedAddressId) {
            loadAddressData(selectedAddressId);
        } else if (!showAddressModal) {
            setLoading(false);
        }

        const fetchTax = async () => {
            const rates = await taxService.getTaxRates();
            setTaxRates(rates);
        };
        fetchTax();
    }, [selectedAddressId]);

    // Handle address selection from modal
    const handleAddressSelect = (addrId: string) => {
        setSelectedAddressId(addrId);
        setAddressModalVisible(false);
    };

    // Handle back without address selection (goes back to previous screen)
    const handleBackWithoutSelection = () => {
        setAddressModalVisible(false);
        navigation.goBack();
    };

    // Handle cancel - just close modal, keep existing address
    const handleCancelModal = () => {
        setAddressModalVisible(false);
    };

    // Handle add new address from modal
    const handleAddNewAddress = () => {
        setAddressModalVisible(false);
        navigation.navigate('AddAddress', { fromCheckout: true });
    };


    // Derived Data - Cart only mode
    const displayItems = items;

    const cartTotal = getTotalPrice();
    const finalDeliveryCharge = deliveryHigh;
    const baseTotal = cartTotal;

    // MRP Total (sum of MRP * quantity for all items)
    const mrpTotal = useMemo(() => {
        return items.reduce((acc, item) => {
            const mrp = item.product.price || item.product.discountPrice || 0;
            return acc + (mrp * item.quantity);
        }, 0);
    }, [items]);

    // Product discount (MRP - selling price)
    const productDiscount = mrpTotal - baseTotal;

    // Tax Calculations (applied to baseTotal)
    const sgstAmount = (baseTotal * taxRates.sgst) / 100;
    const cgstAmount = (baseTotal * taxRates.cgst) / 100;
    const totalTax = sgstAmount + cgstAmount;

    // Total discount (product + coupon)
    const totalDiscount = productDiscount + couponDiscount;

    // Apply coupon discount
    const grandTotal = baseTotal + totalTax + finalDeliveryCharge - couponDiscount;
    const estimatedDeliveryMins = Math.ceil((distanceKm || 0) * 5 + 15);

    // Fetch available coupons count
    useEffect(() => {
        const fetchCouponsCount = async () => {
            if (allocatedBranch?._id) {
                try {
                    const response = await couponService.getAvailableCoupons(allocatedBranch._id, user?._id);
                    setAvailableCouponsCount(response.count || 0);
                } catch (err) {
                    console.error('Failed to fetch coupons count:', err);
                }
            }
        };
        fetchCouponsCount();
    }, [allocatedBranch?._id, user?._id]);

    // Suggestions for "Before you checkout" - sorted by discount percentage
    const suggestionProducts = useMemo(() => {
        if (!normalProducts || normalProducts.length === 0) return [];
        return [...normalProducts]
            .filter(p => !items.find(i => i.product._id === p._id || i.product.inventoryId === p._id))
            .map(p => {
                const variant = (p as any).variants?.[0] || p.variant;
                const mrp = variant?.pricing?.mrp || 0;
                const sp = variant?.pricing?.sellingPrice || 0;
                const discountPercent = mrp > 0 ? ((mrp - sp) / mrp) * 100 : 0;
                return { ...p, discountPercent };
            })
            .sort((a, b) => b.discountPercent - a.discountPercent)
            .slice(0, 10);
    }, [normalProducts, items]);

    const handleApplyCoupon = (coupon: CouponData, discount: number) => {
        setAppliedCoupon(coupon);
        setCouponDiscount(discount);
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponDiscount(0);
    };

    const handleAddToCartFromSuggestions = (product: Product, variant: any) => {
        const cartItemId = variant?._id || variant?.inventoryId || product._id;
        const productImage = variant?.variant?.images?.[0] || product.images?.[0] || product.image;

        addToCart({
            ...product,
            _id: cartItemId,
            name: product.name,
            image: productImage || '',
            price: variant?.pricing?.mrp || 0,
            discountPrice: variant?.pricing?.sellingPrice || 0,
            stock: variant?.stock || 0,
            quantity: variant?.variant ? {
                value: variant.variant.weightValue,
                unit: variant.variant.weightUnit
            } : undefined,
            formattedQuantity: variant?.variant ? `${variant.variant.weightValue} ${variant.variant.weightUnit}` : undefined
        } as any);
    };

    const handleProductPress = (product: Product, variantId?: string) => {
        setSelectedProduct(product);
        setSelectedVariantId(variantId || null);
        setDetailsModalVisible(true);
    };

    // Savings Calc - use stored prices from cart items
    const savings = useMemo(() => {
        return items.reduce((acc, item) => {
            // Use the stored price (MRP) and discountPrice (selling price) from cart item
            const mrp = item.product.price || 0;
            const sellingPrice = item.product.discountPrice ?? item.product.price ?? 0;
            const regular = mrp * item.quantity;
            const deal = sellingPrice * item.quantity;
            return acc + Math.max(0, regular - deal);
        }, 0);
    }, [items]);

    // Check if delivery location is out of range (uses branch's deliveryRadiusKm from backend)
    // If isWithinRadius is explicitly false from backend, mark as out of range
    // Also check if service is available (branch was found)
    const isOutOfRange = !serviceAvailable || (allocatedBranch?.isWithinRadius === false);

    const handlePlaceOrder = async () => {
        if (!address || !allocatedBranch) return;

        // Final stock check before payment
        const isStockAvailable = await validateStock(true);
        if (!isStockAvailable) return;

        setPlacingOrder(true);

        try {
            // Track orderId for cleanup in case of failure
            let createdOrderId: string | null = null;

            try {
                // 1. Create Normal Order (Status: Pending Payment)
                const orderPayload: any = {
                    userId: user?._id || '',
                    branchId: allocatedBranch._id,
                    items: items.map(i => ({
                        inventoryId: i.product.inventoryId || i.product._id,
                        quantity: i.quantity
                    })),
                    addressId: selectedAddressId,
                    totalPrice: grandTotal,
                    deliveryFee: finalDeliveryCharge,
                    sgst: taxRates.sgst,
                    cgst: taxRates.cgst,
                    couponCode: appliedCoupon?.code || null,
                    couponDiscount: couponDiscount || 0,
                    paymentMethod: 'online' as const
                };

                const orderResponse = await orderService.createOrder(orderPayload);
                createdOrderId = orderResponse.order._id;

                // 2. Create Payment Order (Razorpay)
                const paymentOrderResponse = await orderService.createPaymentOrder({
                    amount: grandTotal,
                    currency: 'INR',
                    receipt: `order_${createdOrderId}`,
                    orderType: 'order',
                    orderId: createdOrderId || undefined
                });

                // 3. Open Razorpay
                const options = {
                    description: 'Order Payment',
                    image: 'https://techsmart.com/images/logo.png',
                    currency: 'INR',
                    key: RAZORPAY_KEY_ID,
                    amount: paymentOrderResponse.amount,
                    name: 'TechSmart',
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
                        appOrderId: createdOrderId!,
                        amount: grandTotal
                    });

                    notifyOrderPlaced(createdOrderId!);
                    clearCart();
                    Alert.alert("Order Placed", "Your order is on the way!", [
                        { text: "Track Order", onPress: () => navigation.navigate('OrderTracking', { orderId: createdOrderId, from: 'checkout' }) },
                        { text: "Home", onPress: () => navigation.navigate('Home') }
                    ]);
                }).catch(async (error: any) => {
                    logger.error('Payment Error', error);
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
                const errorMessage = orderError.response?.data?.message || orderError.response?.data?.error || orderError.message || "Failed to process order. Please try again.";
                Alert.alert("Order Error", errorMessage);
                if (createdOrderId) {
                    try {
                        await orderService.deletePendingOrder(createdOrderId);
                    } catch (cleanupErr) {
                        logger.error('Failed to cleanup order:', cleanupErr);
                    }
                }
            }
        } catch (error: any) {
            logger.error('Order placement error:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to process order. Please try again.";
            Alert.alert("Order Error", errorMessage);
        } finally {
            setPlacingOrder(false);
        }
    };

    // Handle COD Payment
    const handleCodPayment = async () => {
        if (!address || !allocatedBranch) return;

        // Final stock check before order
        const isStockAvailable = await validateStock(true);
        if (!isStockAvailable) return;

        setPlacingOrder(true);

        try {
            // Normal Order COD Flow
            const orderPayload: any = {
                userId: user?._id || '',
                branchId: allocatedBranch._id,
                items: items.map(i => ({
                    inventoryId: i.product.inventoryId || i.product._id,
                    quantity: i.quantity
                })),
                addressId: selectedAddressId,
                totalPrice: grandTotal,
                deliveryFee: finalDeliveryCharge,
                sgst: taxRates.sgst,
                cgst: taxRates.cgst,
                couponCode: appliedCoupon?.code || null,
                couponDiscount: couponDiscount || 0,
                paymentMethod: 'cod' as const
            };

            const orderResponse = await orderService.createOrder(orderPayload);
            const createdOrderId = orderResponse.order._id;

            // Mark as COD
            await orderService.createCodOrder(createdOrderId);

            notifyOrderPlaced(createdOrderId);
            clearCart();
            Alert.alert("Order Placed", "Your order is confirmed! Pay on delivery.", [
                { text: "Track Order", onPress: () => navigation.navigate('OrderTracking', { orderId: createdOrderId, from: 'checkout' }) },
                { text: "Home", onPress: () => navigation.navigate('Home') }
            ]);
        } catch (error: any) {
            logger.error('COD order error:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to place COD order. Please try again.";
            Alert.alert("Order Error", errorMessage);
        } finally {
            setPlacingOrder(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const inventoryId = item.product.inventoryId || item.product._id;
        const stockError = stockErrors[inventoryId];

        const handleDecrease = () => {
            if (item.quantity <= 0) {
                showToast('Product quantity is already at minimum!');
                return;
            }
            if (item.quantity === 1) {
                setItemToRemove(item);
                setRemoveItemModalVisible(true);
            } else {
                removeFromCart(item.product._id);
            }
        };

        return (
            <View style={[styles.itemRow, stockError && { borderColor: colors.error, borderWidth: 1, borderRadius: 12, padding: 8, backgroundColor: colors.error + '05' }]}>
                {/* Image */}
                <View style={styles.itemImagePlaceholder}>
                    {item.product.images?.[0] ? (
                        <Image source={{ uri: item.product.images[0] }} style={{ width: '100%', height: '100%', borderRadius: 8 }} resizeMode="cover" />
                    ) : (
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                            <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </Svg>
                    )}
                </View>

                {/* Info */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <MonoText size="s" weight="bold" numberOfLines={1}>{item.product.name}</MonoText>
                    <MonoText size="xs" color={colors.textLight}>
                        {typeof item.product.quantity === 'object'
                            ? `${item.product.quantity.value} ${item.product.quantity.unit}`
                            : item.product.unit || 'Nos'}
                    </MonoText>

                    {/* Price moved here - below quality/variant */}
                    <View style={{ marginTop: 4 }}>
                        <MonoText size="s" weight="bold">
                            ₹{(item.product.discountPrice ?? item.product.price ?? 0) * item.quantity}
                        </MonoText>
                        {(() => {
                            const mrp = item.product.price || 0;
                            const sp = item.product.discountPrice ?? item.product.price ?? 0;
                            if (mrp > sp) {
                                return (
                                    <MonoText size="xs" color={colors.textLight} style={{ textDecorationLine: 'line-through' }}>
                                        ₹{mrp * item.quantity}
                                    </MonoText>
                                );
                            }
                            return null;
                        })()}
                    </View>

                    {/* Stock Error Message */}
                    {stockError && (
                        <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                            <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth="2">
                                <Circle cx="12" cy="12" r="10" />
                                <Line x1="12" y1="8" x2="12" y2="12" />
                                <Line x1="12" y1="16" x2="12.01" y2="16" />
                            </Svg>
                            <MonoText size="xs" color={colors.error} weight="bold" style={{ marginLeft: 4 }}>
                                {stockError.message}
                            </MonoText>
                        </View>
                    )}
                </View>

                {/* Right Column: Counter only */}
                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    {/* Quantity Controls - White background style */}
                    <View style={styles.checkoutQtyContainer}>
                        <TouchableOpacity
                            onPress={handleDecrease}
                            style={styles.checkoutQtyBtn}
                        >
                            <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="3">
                                <Line x1="5" y1="12" x2="19" y2="12" />
                            </Svg>
                        </TouchableOpacity>

                        <View style={styles.checkoutQtyValue}>
                            <MonoText size="s" weight="bold">{item.quantity}</MonoText>
                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                const success = addToCart(item.product);
                                if (!success) {
                                    const currentQuantity = getItemQuantity(item.product._id);
                                    if (currentQuantity >= (item.product.stock || 0)) {
                                        showToast('Maximum stock limit reached!');
                                    } else {
                                        showToast('Product is out of stock!');
                                    }
                                }
                            }}
                            style={styles.checkoutQtyBtn}
                        >
                            <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="3">
                                <Line x1="12" y1="5" x2="12" y2="19" />
                                <Line x1="5" y1="12" x2="19" y2="12" />
                            </Svg>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return <CheckoutSkeleton />;
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
            <View style={styles.container}>
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
                        We currently deliver only within {allocatedBranch?.deliveryRadiusKm || 30}km of our branches. We'll be expanding soon! Try changing your delivery address or check back later.
                    </MonoText>

                    {/* Action Buttons */}
                    <TouchableOpacity
                        style={styles.outOfRangePrimaryBtn}
                        onPress={() => setAddressModalVisible(true)}
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

                {/* Address Selection Modal */}
                <CheckoutAddressModal
                    visible={addressModalVisible}
                    onSelectAddress={handleAddressSelect}
                    onBackWithoutSelection={handleBackWithoutSelection}
                    onCancel={handleCancelModal}
                    onAddNewAddress={handleAddNewAddress}
                    selectedAddressId={selectedAddressId}
                />
            </View>
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

                {/* 1. Product Details (Order Items) - TOP */}
                <View style={styles.section}>
                    <MonoText size="m" weight="bold" style={{ marginBottom: 16 }}>Order Items</MonoText>
                    <FlatList
                        data={displayItems}
                        renderItem={renderItem}
                        keyExtractor={(item: any, index: number) => item.product._id + index}
                        scrollEnabled={false}
                    />
                </View>

                {/* 2. Before you checkout Suggestions */}
                {suggestionProducts.length > 0 && (
                    <View style={[styles.section, { backgroundColor: 'transparent', paddingHorizontal: 0, marginTop: 10, marginBottom: 20 }]}>
                        <View style={{ marginBottom: 16 }}>
                            <MonoText size="m" weight="bold">Before you checkout</MonoText>
                            <MonoText size="xs" color={colors.textLight} style={{ marginTop: 2 }}>You might need these fresh items too</MonoText>
                        </View>
                        <FlatList
                            horizontal
                            data={suggestionProducts}
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(p) => p._id}
                            contentContainerStyle={{ paddingRight: spacing.l }}
                            ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
                            renderItem={({ item: p }) => {
                                const variant = (p as any).variants?.[0] || p.variant;
                                const cartItemId = variant?._id || variant?.inventoryId || p._id;
                                return (
                                    <ProductGridCard
                                        product={p}
                                        variant={variant}
                                        quantity={getItemQuantity(cartItemId)}
                                        width={160}
                                        onPress={() => handleProductPress(p, variant?.inventoryId)}
                                        onAddToCart={handleAddToCartFromSuggestions}
                                        onRemoveFromCart={removeFromCart}
                                    />
                                );
                            }}
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                            <View style={{ flex: 1, height: 1.5, backgroundColor: colors.border, opacity: 0.6 }} />
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 16 }}
                                onPress={() => navigation.navigate('Home')}
                            >
                                <MonoText size="s" weight="bold" color={colors.primary} style={{ textDecorationLine: 'underline' }}>
                                    Something still left? Add now
                                </MonoText>
                                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2.5" style={{ marginLeft: 4 }}>
                                    <Path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* 3. Apply Coupon Section */}
                <View style={[styles.section, { marginBottom: 16 }]}>
                    <TouchableOpacity
                        style={styles.applyCouponBtnSimple}
                        onPress={() => setCouponModalVisible(true)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View style={styles.couponIconContainer}>
                                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2.5">
                                    <Path d="M15 5l-1.41 1.41L15 7.83 17.17 10H13V12h4.17L15 14.17l1.41 1.41L19 12l-4-4z" />
                                    <Path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM5 19V5h14v14H5z" />
                                </Svg>
                            </View>
                            <View style={{ marginLeft: 12 }}>
                                <MonoText size="s" weight="bold">Apply Coupon</MonoText>
                                <MonoText size="xs" color={colors.textLight}>Save more on your order</MonoText>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {availableCouponsCount > 0 && (
                                <View style={styles.couponCountBadgeSimple}>
                                    <MonoText size="xs" weight="bold" color={colors.primary}>{availableCouponsCount} Offers</MonoText>
                                </View>
                            )}
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                <Path d="M9 18l6-6-6-6" />
                            </Svg>
                        </View>
                    </TouchableOpacity>

                    {appliedCoupon && (
                        <View style={styles.appliedCouponRow}>
                            <View style={styles.couponCodeBadgeSimple}>
                                <MonoText size="xs" weight="bold" color={colors.success}>{appliedCoupon.code}</MonoText>
                            </View>
                            <MonoText size="s" color={colors.success} style={{ flex: 1, marginLeft: 10 }}>
                                Applied! Saving ₹{couponDiscount.toFixed(2)}
                            </MonoText>
                            <TouchableOpacity onPress={handleRemoveCoupon}>
                                <MonoText size="xs" weight="bold" color={colors.error}>REMOVE</MonoText>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* 4. Bill Details */}
                <View style={styles.section}>
                    <MonoText size="m" weight="bold" style={{ marginBottom: 16 }}>Bill Details</MonoText>

                    {/* Item Total (MRP) */}
                    <View style={styles.billRow}>
                        <MonoText color={colors.textLight}>Item Total (MRP)</MonoText>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {productDiscount > 0 && (
                                <MonoText size="s" color={colors.textLight} style={{ textDecorationLine: 'line-through', marginRight: 8 }}>
                                    ₹{mrpTotal.toFixed(2)}
                                </MonoText>
                            )}
                            <MonoText weight="bold">₹{Number(baseTotal).toFixed(2)}</MonoText>
                        </View>
                    </View>

                    {/* Product Discount */}
                    {productDiscount > 0 && (
                        <View style={styles.billRow}>
                            <MonoText color={colors.success}>Product Discount</MonoText>
                            <MonoText color={colors.success} weight="bold">- ₹{productDiscount.toFixed(2)}</MonoText>
                        </View>
                    )}

                    {/* Coupon Discount */}
                    {couponDiscount > 0 && appliedCoupon && (
                        <View style={[styles.billRow, styles.couponRow]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <MonoText color={colors.success}>Coupon</MonoText>
                                <View style={styles.couponTag}>
                                    <MonoText size="xs" color={colors.success} weight="bold">{appliedCoupon.code}</MonoText>
                                </View>
                            </View>
                            <MonoText color={colors.success} weight="bold">- ₹{couponDiscount.toFixed(2)}</MonoText>
                        </View>
                    )}

                    {/* Delivery Charges */}
                    <View style={styles.billRow}>
                        <MonoText color={colors.textLight}>Delivery Charges</MonoText>
                        <MonoText weight="bold" color={finalDeliveryCharge === 0 ? colors.success : colors.black}>
                            {finalDeliveryCharge === 0 ? 'FREE' : `₹${finalDeliveryCharge.toFixed(2)}`}
                        </MonoText>
                    </View>

                    {/* Tax Breakdown */}
                    {(taxRates.sgst > 0 || taxRates.cgst > 0) && (
                        <>
                            <View style={styles.billRow}>
                                <MonoText color={colors.textLight}>SGST ({taxRates.sgst}%)</MonoText>
                                <MonoText weight="bold">₹{sgstAmount.toFixed(2)}</MonoText>
                            </View>
                            <View style={styles.billRow}>
                                <MonoText color={colors.textLight}>CGST ({taxRates.cgst}%)</MonoText>
                                <MonoText weight="bold">₹{cgstAmount.toFixed(2)}</MonoText>
                            </View>
                        </>
                    )}

                    <View style={styles.divider} />

                    {/* Total Savings Banner */}
                    {totalDiscount > 0 && (
                        <View style={styles.savingsBanner}>
                            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                                <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </Svg>
                            <MonoText size="s" weight="bold" color="#16A34A" style={{ marginLeft: 8 }}>
                                You're saving ₹{totalDiscount.toFixed(2)} on this order!
                            </MonoText>
                        </View>
                    )}

                    <View style={styles.billRow}>
                        <MonoText size="l" weight="bold">To Pay</MonoText>
                        <MonoText size="l" weight="bold" color={colors.primary}>₹{(grandTotal || 0).toFixed(2)}</MonoText>
                    </View>
                </View>

                <View style={{ height: 160 }} />
            </ScrollView>

            {/* New Footer with Payment Selector */}
            <View style={styles.newFooter}>
                {/* Sticky Delivery Address Section */}
                <View style={styles.stickyDeliveryContainer}>
                    <View style={styles.deliveryIconCircle}>
                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                            <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <Path d="M9 22V12h6v10" />
                        </Svg>
                    </View>
                    <View style={styles.deliveryInfo}>
                        {address ? (
                            <>
                                <MonoText size="s">Delivering to <MonoText weight="bold">{address.label || 'Other'}</MonoText></MonoText>
                                <MonoText size="xs" color={colors.textLight} numberOfLines={1}>
                                    {address.addressLine1}, {address.city}
                                </MonoText>
                            </>
                        ) : (
                            <MonoText size="s" color={colors.error} weight="bold">No delivery address selected</MonoText>
                        )}
                    </View>
                    <TouchableOpacity onPress={() => setAddressModalVisible(true)}>
                        <MonoText size="s" weight="bold" color={colors.primary}>{address ? 'Change' : 'Select'}</MonoText>
                    </TouchableOpacity>
                </View>

                <View style={styles.footerDivider} />

                <View style={styles.footerRow}>
                    {/* Payment Method Selector */}
                    <TouchableOpacity
                        style={styles.paymentSelector}
                        onPress={() => setPaymentModalVisible(true)}
                    >
                        <View style={styles.paymentText}>
                            <MonoText size="xs" color={colors.textLight}>Pay Using</MonoText>
                            <View style={styles.paymentMethodRow}>
                                <MonoText size="s" weight="bold">
                                    {paymentMethod === 'online' ? 'Online Payment' : 'Cash on Delivery'}
                                </MonoText>
                                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2.5" style={{ marginLeft: 4 }}>
                                    <Path d="M18 15l-6-6-6 6" />
                                </Svg>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Pay Button */}
                    <TouchableOpacity
                        style={[
                            styles.newPayBtn,
                            (placingOrder || isOutOfRange || !address || hasCriticalStockIssue) && styles.payBtnDisabled
                        ]}
                        onPress={() => {
                            if (paymentMethod === 'online') {
                                handlePlaceOrder();
                            } else {
                                handleCodPayment();
                            }
                        }}
                        disabled={placingOrder || isOutOfRange || !address || hasCriticalStockIssue}
                    >
                        <View style={styles.payBtnContent}>
                            <MonoText weight="bold" color={colors.white} size="m">
                                ₹{(grandTotal || 0).toFixed(0)}
                            </MonoText>
                            <View style={styles.payBtnSeparator} />
                            <View style={styles.payBtnAction}>
                                <MonoText weight="bold" color={colors.white} size="m">
                                    {placingOrder
                                        ? 'Processing...'
                                        : isOutOfRange
                                            ? 'Not Available'
                                            : hasCriticalStockIssue
                                                ? 'Items Unavailable'
                                                : 'Place Order'
                                    }
                                </MonoText>
                                {!hasCriticalStockIssue && (
                                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2.5" style={{ marginLeft: 8 }}>
                                        <Path d="M5 12h14M12 5l7 7-7 7" />
                                    </Svg>
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Payment Method Modal */}
            <Modal
                visible={paymentModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setPaymentModalVisible(false)}
                statusBarTranslucent={true}
            >
                <TouchableOpacity
                    style={[styles.modalOverlay, { paddingBottom: 0 }]}
                    activeOpacity={1}
                    onPress={() => setPaymentModalVisible(false)}
                >
                    <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
                        <View style={styles.modalHeader}>
                            <MonoText size="l" weight="bold">Select Payment Method</MonoText>
                            <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                    <Line x1="18" y1="6" x2="6" y2="18" />
                                    <Line x1="6" y1="6" x2="18" y2="18" />
                                </Svg>
                            </TouchableOpacity>
                        </View>

                        {/* Online Payment Option */}
                        <TouchableOpacity
                            style={[
                                styles.paymentOption,
                                paymentMethod === 'online' && styles.paymentOptionSelected
                            ]}
                            onPress={() => {
                                setPaymentMethod('online');
                                setPaymentModalVisible(false);
                            }}
                        >
                            <View style={styles.paymentOptionIcon}>
                                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                    <Path d="M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zM1 10h22" />
                                </Svg>
                            </View>
                            <View style={{ flex: 1 }}>
                                <MonoText weight="bold">Online Payment</MonoText>
                                <MonoText size="xs" color={colors.textLight}>UPI, Cards, Net Banking</MonoText>
                            </View>
                            <View style={[styles.radioOuter, paymentMethod === 'online' && styles.radioOuterSelected]}>
                                {paymentMethod === 'online' && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>

                        {/* COD Option */}
                        <TouchableOpacity
                            style={[
                                styles.paymentOption,
                                paymentMethod === 'cod' && styles.paymentOptionSelected
                            ]}
                            onPress={() => {
                                setPaymentMethod('cod');
                                setPaymentModalVisible(false);
                            }}
                        >
                            <View style={styles.paymentOptionIcon}>
                                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2">
                                    <Circle cx="12" cy="12" r="10" />
                                    <Path d="M9 12l2 2 4-4" />
                                </Svg>
                            </View>
                            <View style={{ flex: 1 }}>
                                <MonoText weight="bold">Cash on Delivery</MonoText>
                                <MonoText size="xs" color={colors.textLight}>Pay when you receive</MonoText>
                            </View>
                            <View style={[styles.radioOuter, paymentMethod === 'cod' && styles.radioOuterSelected]}>
                                {paymentMethod === 'cod' && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>


            {/* Apply Coupon Modal */}
            <ApplyCouponModal
                visible={couponModalVisible}
                onClose={() => setCouponModalVisible(false)}
                onApply={handleApplyCoupon}
                cartTotal={baseTotal}
                branchId={allocatedBranch?._id}
                userId={user?._id}
            />

            {/* Remove Item Confirmation Modal */}
            <Modal
                visible={removeItemModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setRemoveItemModalVisible(false)}
                statusBarTranslucent={true}
            >
                <TouchableOpacity
                    style={[styles.modalOverlay, { paddingBottom: 0 }]}
                    activeOpacity={1}
                    onPress={() => setRemoveItemModalVisible(false)}
                >
                    <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
                        <View style={styles.modalHeader}>
                            <MonoText size="l" weight="bold">Remove Item</MonoText>
                            <TouchableOpacity onPress={() => setRemoveItemModalVisible(false)}>
                                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                    <Line x1="18" y1="6" x2="6" y2="18" />
                                    <Line x1="6" y1="6" x2="18" y2="18" />
                                </Svg>
                            </TouchableOpacity>
                        </View>

                        {itemToRemove && (
                            <View>
                                <View style={styles.removeModalItemCard}>
                                    <View style={styles.removeModalItemImage}>
                                        {itemToRemove.product.images?.[0] ? (
                                            <Image source={{ uri: itemToRemove.product.images[0] }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
                                        ) : (
                                            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                                <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                            </Svg>
                                        )}
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 16 }}>
                                        <MonoText size="m" weight="bold">{itemToRemove.product.name}</MonoText>
                                        <MonoText size="s" color={colors.textLight} style={{ marginVertical: 4 }}>
                                            {typeof itemToRemove.product.quantity === 'object'
                                                ? `${itemToRemove.product.quantity.value} ${itemToRemove.product.quantity.unit}`
                                                : itemToRemove.product.unit || 'Nos'}
                                        </MonoText>
                                        <MonoText size="m" weight="bold">₹{itemToRemove.product.discountPrice ?? itemToRemove.product.price}</MonoText>
                                    </View>
                                    <View style={styles.checkoutQtyContainer}>
                                        <TouchableOpacity
                                            style={styles.checkoutQtyBtn}
                                            onPress={() => {
                                                if (getItemQuantity(itemToRemove.product._id) === 1) {
                                                    removeFromCart(itemToRemove.product._id);
                                                    setRemoveItemModalVisible(false);
                                                    setItemToRemove(null);
                                                } else {
                                                    removeFromCart(itemToRemove.product._id);
                                                }
                                            }}
                                        >
                                            <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="3">
                                                <Line x1="5" y1="12" x2="19" y2="12" />
                                            </Svg>
                                        </TouchableOpacity>
                                        <View style={styles.checkoutQtyValue}>
                                            <MonoText size="s" weight="bold">{getItemQuantity(itemToRemove.product._id)}</MonoText>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.checkoutQtyBtn}
                                            onPress={() => {
                                                const success = addToCart(itemToRemove.product);
                                                if (!success) {
                                                    const currentQuantity = getItemQuantity(itemToRemove.product._id);
                                                    if (currentQuantity >= (itemToRemove.product.stock || 0)) {
                                                        showToast('Maximum stock limit reached!');
                                                    } else {
                                                        showToast('Product is out of stock!');
                                                    }
                                                }
                                            }}
                                        >
                                            <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="3">
                                                <Line x1="12" y1="5" x2="12" y2="19" />
                                                <Line x1="5" y1="12" x2="19" y2="12" />
                                            </Svg>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.removeModalActions}>
                                    <TouchableOpacity
                                        style={styles.cancelRemoveBtn}
                                        onPress={() => setRemoveItemModalVisible(false)}
                                    >
                                        <MonoText weight="bold">Cancel</MonoText>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.confirmRemoveBtn}
                                        onPress={() => {
                                            deleteFromCart(itemToRemove.product._id);
                                            setRemoveItemModalVisible(false);
                                            setItemToRemove(null);
                                        }}
                                    >
                                        <MonoText weight="bold" color={colors.white}>Remove</MonoText>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {selectedProduct && (
                <ProductDetailsModal
                    visible={detailsModalVisible}
                    product={selectedProduct}
                    initialVariantId={selectedVariantId || undefined}
                    onClose={() => {
                        setDetailsModalVisible(false);
                        setSelectedProduct(null);
                        setSelectedVariantId(null);
                    }}
                />
            )}

            {/* Address Selection Modal */}
            <CheckoutAddressModal
                visible={addressModalVisible}
                onSelectAddress={handleAddressSelect}
                onBackWithoutSelection={handleBackWithoutSelection}
                onCancel={handleCancelModal}
                onAddNewAddress={handleAddNewAddress}
                selectedAddressId={selectedAddressId}
            />
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
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    content: {
        paddingTop: 140, // Increased space for header
        paddingBottom: 100,
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
    noAddressPlaceholder: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FECACA',
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
    payBtn: {
        flex: 1,
        height: 56,
        backgroundColor: colors.primary, // Using primary color
        borderRadius: 28, // More rounded pill shape?
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
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
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
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
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: `${colors.primary}10`,
        borderRadius: 8,
        alignSelf: 'flex-start',
        padding: 2,
    },
    qtyBtn: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        borderRadius: 6,
    },
    qtyValue: {
        paddingHorizontal: 12,
        minWidth: 36,
        alignItems: 'center',
    },
    // Store info card (replaces map)
    storeInfoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    storeIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: `${colors.primary}10`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    etaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEFCE8',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    // Simplified Coupon UI
    applyCouponBtnSimple: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    couponIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: `${colors.primary}10`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    couponCountBadgeSimple: {
        backgroundColor: `${colors.primary}10`,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 8,
    },
    appliedCouponRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        padding: 12,
        borderRadius: 10,
        marginTop: 8,
    },
    couponCodeBadgeSimple: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    removeCouponBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#FEE2E2',
        borderRadius: 6,
    },
    couponCountBadge: {
        backgroundColor: colors.primary,
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    couponRow: {
        paddingVertical: 4,
    },
    couponTag: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    savingsBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    // New Delivery Section styles
    deliverySection: {
        backgroundColor: colors.white,
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    deliveryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    changeAddressButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: `${colors.primary}10`,
        borderRadius: 20,
    },
    addressDetails: {
        marginBottom: 12,
    },
    storeInfoInline: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    // Redesigned Checkout Qty Controls
    checkoutQtyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 2,
    },
    checkoutQtyBtn: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkoutQtyValue: {
        paddingHorizontal: 12,
        minWidth: 32,
        alignItems: 'center',
    },
    // Remove Modal Styles
    removeModalItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 16,
        marginVertical: 12,
    },
    removeModalItemImage: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: colors.white,
    },
    removeModalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    cancelRemoveBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
    },
    confirmRemoveBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.error,
    },
    // New Footer styles
    newFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    stickyDeliveryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 12,
    },
    deliveryIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: `${colors.primary}10`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    deliveryInfo: {
        flex: 1,
    },
    footerDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginBottom: 12,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    paymentSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    paymentText: {
        justifyContent: 'center',
    },
    paymentMethodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    newPayBtn: {
        flex: 1,
        height: 52,
        backgroundColor: colors.primary,
        borderRadius: 14,
        overflow: 'hidden',
    },
    payBtnContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    payBtnSeparator: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginHorizontal: 12,
    },
    payBtnAction: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Payment Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },

    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.border,
        marginBottom: 12,
    },
    paymentOptionSelected: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}08`,
    },
    paymentOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    radioOuter: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 'auto',
    },
    radioOuterSelected: {
        borderColor: colors.primary,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.primary,
    },
});
