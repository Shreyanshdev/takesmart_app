import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    ScrollView,
    PermissionsAndroid,
} from 'react-native';
import GetLocation from 'react-native-get-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { LocationPermissionModal } from '../../components/shared/LocationPermissionModal';
import { useAuthStore } from '../../store/authStore';
import { usePartnerStore } from '../../store/partnerStore';
import { partnerService } from '../../services/partner/partner.service';
import { socketService } from '../../services/core/socket.service';
import { invoiceService } from '../../services/customer/invoice.service';
import { PartnerOrder } from '../../types/partner';
import { logger } from '../../utils/logger';

const { width, height } = Dimensions.get('window');
const MAP_HEIGHT = height * 0.45;

type RouteParams = {
    order: PartnerOrder;
};

interface RouteData {
    coordinates: Array<{ latitude: number; longitude: number }>;
    distance: { text: string; value: number };
    duration: { text: string; value: number };
}

export const PartnerOrderTrackingScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
    const { order: initialOrder } = route.params;

    const { user } = useAuthStore();
    const { pickupOrder, markDelivered } = usePartnerStore();

    const [order, setOrder] = useState<PartnerOrder>(initialOrder);
    const [partnerLocation, setPartnerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [routeData, setRouteData] = useState<RouteData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [showLocationModal, setShowLocationModal] = useState(false);

    const mapRef = useRef<MapView>(null);
    const partnerMarkerRef = useRef<any>(null);
    const trackingInterval = useRef<NodeJS.Timeout | null>(null);
    const partnerId = user?._id;

    // Customer delivery location
    const customerLocation = order.deliveryLocation;
    const branchLocation = order.pickupLocation;

    // Request location permission
    const requestLocationPermission = async (): Promise<boolean> => {
        try {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: 'Location Permission',
                        message: 'LushAndPure Partner App needs access to your location to track deliveries.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            }
            return true;
        } catch (error) {
            logger.error('Permission error:', error);
            return false;
        }
    };

    // Initialize partner location check
    const checkAndInitLocation = async () => {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
            setLocationError('Location permission denied');
            setShowLocationModal(true);
            return;
        }

        GetLocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
        })
            .then(location => {
                const { latitude, longitude } = location;
                setPartnerLocation({ latitude, longitude });
                setLocationError(null);
                setShowLocationModal(false);
            })
            .catch(error => {
                logger.error('Initial location error:', error);
                setLocationError('Location services disabled');
                setShowLocationModal(true);
            });
    };

    // Initialize on mount
    useEffect(() => {
        checkAndInitLocation();

        return () => {
            stopTracking();
        };
    }, []);

    // Also check when order becomes in-progress
    useEffect(() => {
        if (order.status === 'in-progress') {
            startTracking();
        } else {
            stopTracking();
        }
    }, [order.status]);

    const handleEnableLocation = async () => {
        if (Platform.OS === 'android') {
            await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
        } else {
            Linking.openSettings();
        }
        setShowLocationModal(false);
        // Retry after a delay to give user time to switch
        setTimeout(checkAndInitLocation, 2000);
    };

    const startTracking = () => {
        if (trackingInterval.current !== null) return; // Already tracking

        const updateLocation = () => {
            GetLocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 15000,
            })
                .then(location => {
                    const { latitude, longitude } = location;

                    if (partnerMarkerRef.current) {
                        partnerMarkerRef.current.animateMarkerToCoordinate({ latitude, longitude }, 2000);
                    }
                    setPartnerLocation({ latitude, longitude });

                    // Update backend with new location
                    if (partnerId && order._id) {
                        partnerService.updateLocation(order._id, {
                            deliveryPartnerId: partnerId,
                            location: {
                                latitude,
                                longitude,
                                address: 'Live Location'
                            }
                        }).catch(err => logger.log('Location update failed', err));
                    }
                })
                .catch(error => {
                    const { code, message } = error;
                    logger.warn(`Tracking error ${code}: ${message}`);
                });
        };

        // Run immediately
        updateLocation();

        // Then interval
        trackingInterval.current = setInterval(updateLocation, 2500);
    };

    const stopTracking = () => {
        if (trackingInterval.current !== null) {
            clearInterval(trackingInterval.current);
            trackingInterval.current = null;
        }
    };

    // Fetch route when locations are available
    useEffect(() => {
        const fetchRoute = async () => {
            if (!partnerLocation || !customerLocation?.latitude) return;

            // Only fetch route occasionally or initially to save API calls?
            // For now, fetch if we don't have it or if distance changed significantly
            // But to avoid spamming, we just rely on initial load + manual updates if needed.
            // Let's keep it simple: Fetch once on load if we have locations.
            if (routeData) return;

            setIsLoading(true);
            try {
                const response = await partnerService.getDirections(
                    order._id,
                    {
                        latitude: partnerLocation.latitude,
                        longitude: partnerLocation.longitude,
                        address: 'Partner Location'
                    },
                    {
                        latitude: customerLocation.latitude,
                        longitude: customerLocation.longitude,
                        address: customerLocation.address || 'Customer Location'
                    },
                    'partner-to-customer',
                    false
                );

                if (response.routeData) {
                    setRouteData(response.routeData);
                }
            } catch (error) {
                logger.error('Failed to fetch route:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRoute();
    }, [partnerLocation, customerLocation, order._id]);

    // Fit map to show all markers
    useEffect(() => {
        if (!mapRef.current) return;

        const markers: Array<{ latitude: number; longitude: number }> = [];
        if (partnerLocation) markers.push(partnerLocation);
        if (customerLocation?.latitude) {
            markers.push({
                latitude: customerLocation.latitude,
                longitude: customerLocation.longitude
            });
        }
        if (branchLocation?.latitude && order.status === 'accepted') {
            markers.push({
                latitude: branchLocation.latitude,
                longitude: branchLocation.longitude
            });
        }

        if (markers.length > 0) {
            setTimeout(() => {
                mapRef.current?.fitToCoordinates(markers, {
                    edgePadding: { top: 100, right: 50, bottom: 150, left: 50 },
                    animated: true,
                });
            }, 500);
        }
    }, [partnerLocation, customerLocation, branchLocation, order.status]);

    // Handle pickup action
    const handlePickup = async () => {
        if (!partnerId) return;

        setActionLoading(true);
        try {
            const success = await pickupOrder(order._id, partnerId);
            if (success) {
                setOrder({ ...order, status: 'in-progress', deliveryStatus: 'On The Way' });
                Alert.alert('Success', 'Order picked up! Navigate to customer.');
            } else {
                Alert.alert('Error', 'Failed to update order status');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update order status');
        } finally {
            setActionLoading(false);
        }
    };

    // Handle delivery action
    const handleDelivered = async () => {
        if (!partnerId) return;

        Alert.alert(
            'Confirm Delivery',
            'Are you sure you want to mark this order as delivered?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes, Delivered',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            const success = await markDelivered(order._id, partnerId);
                            if (success) {
                                Alert.alert('Success', 'Order delivered successfully!', [
                                    { text: 'OK', onPress: () => navigation.goBack() }
                                ]);
                            } else {
                                Alert.alert('Error', 'Failed to update order status');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to update order status');
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Open Google Maps for navigation
    const openGoogleMapsNavigation = () => {
        if (!customerLocation?.latitude) return;

        const destination = `${customerLocation.latitude},${customerLocation.longitude}`;
        const url = Platform.select({
            ios: `maps://app?daddr=${destination}`,
            android: `google.navigation:q=${destination}&mode=d`
        });

        if (url) {
            Linking.openURL(url).catch(() => {
                // Fallback to Google Maps URL
                Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
            });
        }
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'accepted': return colors.accent;
            case 'in-progress': return '#3B82F6';
            case 'awaitconfirmation': return '#8B5CF6';
            case 'delivered': return colors.success;
            default: return colors.textLight;
        }
    };

    // Get action button text
    const getActionButton = () => {
        if (order.status === 'accepted') {
            return { text: 'PICK UP ORDER', onPress: handlePickup, color: colors.accent };
        }
        if (order.status === 'in-progress') {
            return { text: 'MARK AS DELIVERED', onPress: handleDelivered, color: colors.success };
        }
        if (order.status === 'awaitconfirmation') {
            return { text: 'AWAITING CUSTOMER CONFIRMATION', onPress: () => { }, color: '#8B5CF6', disabled: true };
        }
        return null;
    };

    const actionButton = getActionButton();

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                        <Path d="M19 12H5M12 19l-7-7 7-7" />
                    </Svg>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <MonoText size="m" weight="bold">Order #{order.orderId?.slice(-6).toUpperCase()}</MonoText>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                        <MonoText size="xs" weight="bold" color={getStatusColor(order.status)}>
                            {order.deliveryStatus || order.status.toUpperCase()}
                        </MonoText>
                    </View>
                </View>
                <TouchableOpacity onPress={openGoogleMapsNavigation} style={styles.navigateBtn}>
                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2">
                        <Path d="M3 11l19-9-9 19-2-8-8-2z" />
                    </Svg>
                </TouchableOpacity>
            </View>

            {/* Map */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_DEFAULT}
                    style={styles.map}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    initialRegion={{
                        latitude: customerLocation?.latitude || 26.4499,
                        longitude: customerLocation?.longitude || 80.3319,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                >
                    {partnerLocation && (
                        <Marker
                            ref={partnerMarkerRef}
                            coordinate={partnerLocation}
                            title="Your Location"
                        >
                            <View style={styles.partnerMarker}>
                                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <Circle cx="12" cy="12" r="3" />
                                    <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                                </Svg>
                            </View>
                        </Marker>
                    )}

                    {/* Customer Location Marker */}
                    {customerLocation?.latitude && (
                        <Marker
                            coordinate={{
                                latitude: customerLocation.latitude,
                                longitude: customerLocation.longitude
                            }}
                            title="Customer"
                            description={customerLocation.address}
                        >
                            <View style={styles.customerMarker}>
                                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                </Svg>
                            </View>
                        </Marker>
                    )}

                    {/* Branch Location Marker (when not picked up) */}
                    {branchLocation?.latitude && order.status === 'accepted' && (
                        <Marker
                            coordinate={{
                                latitude: branchLocation.latitude,
                                longitude: branchLocation.longitude
                            }}
                            title="Branch"
                        >
                            <View style={styles.branchMarker}>
                                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <Path d="M3 21v-8l9-4 9 4v8M9 21v-6h6v6" />
                                </Svg>
                            </View>
                        </Marker>
                    )}

                    {/* Route Polyline */}
                    {routeData?.coordinates && routeData.coordinates.length > 0 && (
                        <Polyline
                            coordinates={routeData.coordinates}
                            strokeWidth={4}
                            strokeColor={colors.primary}
                            lineDashPattern={[0]}
                        />
                    )}
                </MapView>

                {/* ETA Card */}
                <View style={styles.etaCard}>
                    {isLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <>
                            <MonoText size="xxl" weight="bold">
                                {routeData?.duration?.text || '--'}
                            </MonoText>
                            <MonoText size="xs" color={colors.textLight}>
                                {routeData?.distance?.text || 'Calculating...'}
                            </MonoText>
                        </>
                    )}
                </View>

                {/* Location Error */}
                {locationError && (
                    <View style={styles.errorBanner}>
                        <MonoText size="xs" color={colors.white}>{locationError}</MonoText>
                    </View>
                )}
            </View>

            {/* Bottom Details */}
            <ScrollView style={styles.bottomSheet} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Customer Card */}
                <View style={styles.customerCard}>
                    <View style={styles.customerAvatar}>
                        <MonoText size="l" weight="bold" color={colors.white}>
                            {order.customer?.name?.charAt(0).toUpperCase() || 'C'}
                        </MonoText>
                    </View>
                    <View style={styles.customerInfo}>
                        <MonoText weight="bold" size="m">{order.customer?.name || 'Customer'}</MonoText>
                        <MonoText size="xs" color={colors.textLight} numberOfLines={2}>
                            {customerLocation?.address || 'Delivery Address'}
                        </MonoText>
                    </View>
                    {order.customer?.phone && (
                        <TouchableOpacity
                            style={styles.callBtn}
                            onPress={() => Linking.openURL(`tel:${order.customer?.phone}`)}
                        >
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2">
                                <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </Svg>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Order Items - Detailed Bill */}
                <View style={styles.section}>
                    <MonoText weight="bold" style={{ marginBottom: spacing.s }}>Bill Details</MonoText>
                    <View style={styles.itemsCard}>
                        {(() => {
                            let totalSavings = 0;
                            const itemsList = order.items?.map((item: any, index: number) => {
                                const product = item.id;
                                const originalPrice = product?.price || 0;
                                const discountPrice = product?.discountPrice;
                                const finalPrice = discountPrice || originalPrice || (order.totalPrice / (order.items?.length || 1));
                                const quantity = item.count || 1;
                                const itemTotal = finalPrice * quantity;

                                if (discountPrice && discountPrice < originalPrice) {
                                    totalSavings += (originalPrice - discountPrice) * quantity;
                                }

                                return (
                                    <View key={index} style={styles.itemRow}>
                                        <View style={styles.itemQty}>
                                            <MonoText size="xs" weight="bold" color={colors.white}>
                                                {item.count}x
                                            </MonoText>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <MonoText numberOfLines={1}>
                                                {item.item || product?.name || 'Product'}
                                            </MonoText>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                {discountPrice && discountPrice < originalPrice && (
                                                    <MonoText size="xs" color={colors.textLight} style={{ textDecorationLine: 'line-through', marginRight: 4 }}>
                                                        ₹{originalPrice}
                                                    </MonoText>
                                                )}
                                                <MonoText size="xs" color={colors.textLight}>
                                                    ₹{finalPrice} × {quantity}
                                                </MonoText>
                                            </View>
                                        </View>
                                        <MonoText weight="bold">₹{itemTotal}</MonoText>
                                    </View>
                                );
                            });

                            return (
                                <>
                                    {itemsList}
                                    <View style={styles.divider} />
                                    {totalSavings > 0 && (
                                        <View style={[styles.totalRow, { marginBottom: 4 }]}>
                                            <MonoText size="s" color={colors.success}>Total Savings</MonoText>
                                            <MonoText size="s" color={colors.success}>-₹{totalSavings}</MonoText>
                                        </View>
                                    )}
                                </>
                            );
                        })()}
                        <View style={styles.totalRow}>
                            <MonoText size="s" color={colors.textLight}>Subtotal</MonoText>
                            <MonoText size="s">₹{(order.totalPrice || 0) - ((order as any).deliveryFee || 0)}</MonoText>
                        </View>
                        <View style={[styles.totalRow, { marginTop: 4 }]}>
                            <MonoText size="s" color={colors.textLight}>Delivery Fee</MonoText>
                            <MonoText size="s">{(order as any).deliveryFee === 0 ? 'FREE' : `₹${(order as any).deliveryFee || 0}`}</MonoText>
                        </View>
                        <View style={[styles.totalRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }]}>
                            <MonoText weight="bold">Grand Total</MonoText>
                            <MonoText size="l" weight="bold" color={colors.primary}>
                                ₹{order.totalPrice}
                            </MonoText>
                        </View>
                    </View>
                </View>

                {/* Payment Info */}
                <View style={[
                    styles.paymentCard,
                    { backgroundColor: (order as any).paymentStatus === 'verified' ? '#D1FAE5' : '#FEF3C7' }
                ]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <MonoText size="xs" color={colors.textLight}>Payment Status</MonoText>
                            <MonoText weight="bold" color={(order as any).paymentStatus === 'verified' ? '#065F46' : '#92400E'}>
                                {(order as any).paymentStatus === 'verified' || (order as any).paymentStatus === 'paid'
                                    ? '✓ Paid Online'
                                    : (order as any).paymentDetails?.paymentMethod === 'cod' ? 'Cash on Delivery' : 'COD'}
                            </MonoText>
                        </View>
                        {((order as any).paymentDetails?.paymentMethod === 'cod' && (order as any).paymentStatus !== 'verified') && (
                            <View style={{ backgroundColor: '#92400E', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                <MonoText size="xs" color={colors.white} weight="bold">
                                    COLLECT ₹{order.totalPrice}
                                </MonoText>
                            </View>
                        )}
                    </View>
                </View>

                {/* Download Invoice Button */}
                <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.black,
                        paddingVertical: 14,
                        borderRadius: 12,
                        marginBottom: spacing.m
                    }}
                    onPress={async () => {
                        try {
                            const invoiceData = invoiceService.createInvoiceFromOrder(order);
                            await invoiceService.generateAndShareInvoice(invoiceData);
                        } catch (err) {
                            logger.error('Invoice error:', err);
                        }
                    }}
                >
                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                        <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <Path d="M14 2v6h6" />
                        <Path d="M12 18v-6" />
                        <Path d="M9 15l3 3 3-3" />
                    </Svg>
                    <MonoText color={colors.white} weight="bold">Download Invoice</MonoText>
                </TouchableOpacity>
            </ScrollView>

            {/* Action Button */}
            {actionButton && (
                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: actionButton.color },
                            actionButton.disabled && styles.actionButtonDisabled
                        ]}
                        onPress={actionButton.onPress}
                        disabled={actionLoading || actionButton.disabled}
                    >
                        {actionLoading ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <MonoText weight="bold" color={colors.white} size="m">
                                {actionButton.text}
                            </MonoText>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Location Permission Modal */}
            <LocationPermissionModal
                visible={showLocationModal}
                onRequestPermission={handleEnableLocation}
                onClose={() => setShowLocationModal(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.m,
        paddingTop: Platform.OS === 'android' ? 40 : 50,
        paddingBottom: spacing.m,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    statusBadge: {
        paddingHorizontal: spacing.s,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: 4,
    },
    navigateBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    mapContainer: {
        height: MAP_HEIGHT,
        width: '100%',
    },
    map: {
        flex: 1,
    },
    partnerMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: colors.white,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    customerMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.success,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: colors.white,
    },
    branchMarker: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.black,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.white,
    },
    etaCard: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 100 : 110,
        right: spacing.m,
        backgroundColor: colors.white,
        padding: spacing.m,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        minWidth: 80,
    },
    errorBanner: {
        position: 'absolute',
        bottom: spacing.m,
        left: spacing.m,
        right: spacing.m,
        backgroundColor: colors.error,
        padding: spacing.s,
        borderRadius: 8,
        alignItems: 'center',
    },
    bottomSheet: {
        flex: 1,
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -20,
        paddingHorizontal: spacing.m,
        paddingTop: spacing.l,
    },
    customerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: spacing.m,
        borderRadius: 16,
        marginBottom: spacing.m,
    },
    customerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    customerInfo: {
        flex: 1,
        marginLeft: spacing.m,
    },
    callBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.success,
    },
    section: {
        marginBottom: spacing.m,
    },
    itemsCard: {
        backgroundColor: '#F8FAFC',
        padding: spacing.m,
        borderRadius: 16,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    itemQty: {
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.s,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.s,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paymentCard: {
        backgroundColor: '#FEF3C7',
        padding: spacing.m,
        borderRadius: 12,
        marginBottom: spacing.m,
    },
    actionContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.m,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    actionButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonDisabled: {
        opacity: 0.6,
    },
});
