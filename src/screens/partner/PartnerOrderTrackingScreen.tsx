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
import { BlurView } from '@react-native-community/blur';
import Modal from 'react-native-modal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, AnimatedRegion } from 'react-native-maps';
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
    const insets = useSafeAreaInsets();
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
    const [noRouteFound, setNoRouteFound] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [showItemModal, setShowItemModal] = useState(false);

    // Animated Location for smooth marker movement
    const partnerLocationAnimated = useRef(new AnimatedRegion({
        latitude: initialOrder.deliveryLocation?.latitude || 26.4499,
        longitude: initialOrder.deliveryLocation?.longitude || 80.3319,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    })).current;

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
                        message: 'TakeSmart Partner App needs access to your location to track deliveries.',
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
                // Only show permission modal for specific permission/disabled errors
                // Error codes: CANCELLED, UNAVAILABLE, TIMEOUT, PLAY_SERVICES_NOT_AVAILABLE
                const { code } = error;
                if (code === 'UNAVAILABLE' || code === 'CANCELLED') {
                    setLocationError('Location services disabled');
                    setShowLocationModal(true);
                } else if (code === 'TIMEOUT') {
                    // For timeout, just retry silently without showing modal
                    setLocationError('Unable to get location. Please ensure GPS is enabled.');
                    // Try again after a delay
                    setTimeout(checkAndInitLocation, 3000);
                } else {
                    setLocationError('Location error');
                }
            });
    };

    // Initialize on mount
    useEffect(() => {
        checkAndInitLocation();

        // Initial data fetch to ensure items are populated
        if (order._id) {
            setIsLoading(true);
            partnerService.getOrderById(order._id).then((res: { order: PartnerOrder }) => {
                if (res.order) setOrder(res.order);
                setIsLoading(false);
            }).catch(err => {
                logger.error('Initial fetch failed', err);
                setIsLoading(false);
            });
        }

        // Socket integration
        if (order._id) {
            socketService.joinOrderRoom(order._id);

            socketService.on('orderStatusUpdated', (data: any) => {
                if (data.orderId === order._id) {
                    logger.log('Order status updated via socket', data.status);
                    // Refresh order data
                    partnerService.getOrderById(order._id).then((res: { order: PartnerOrder }) => {
                        if (res.order) setOrder(res.order);
                    });
                }
            });

            socketService.on('orderLocationUpdated', (data: any) => {
                if (data.orderId === order._id) {
                    // Update order with new locations if they changed
                    setOrder(prev => ({
                        ...prev,
                        deliveryLocation: data.deliveryLocation || prev.deliveryLocation,
                        pickupLocation: data.pickupLocation || prev.pickupLocation
                    }));
                }
            });
        }

        return () => {
            stopTracking();
            if (order._id) {
                socketService.leaveOrderRoom(order._id);
                socketService.off('orderStatusUpdated');
                socketService.off('orderLocationUpdated');
            }
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
                    if (location) {
                        const { latitude, longitude } = location;

                        (partnerLocationAnimated.timing({
                            latitude,
                            longitude,
                            duration: 2000,
                            useNativeDriver: false
                        } as any) as any).start();

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
            setNoRouteFound(false);
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

                // Check if no route was found
                if (response.noRouteFound) {
                    setNoRouteFound(true);
                    logger.warn('No route found between locations');
                    // Still set the fallback route data for display
                    if (response.routeData) {
                        setRouteData(response.routeData);
                    }
                } else if (response.routeData) {
                    setRouteData(response.routeData);
                    setNoRouteFound(false);
                }
            } catch (error) {
                logger.error('Failed to fetch route:', error);
                setNoRouteFound(true);
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

    const handleItemPress = (item: any) => {
        setSelectedItem(item);
        setShowItemModal(true);
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

    const getTagColor = (tag: string) => {
        const t = tag.toLowerCase();
        if (t.includes('cold') || t.includes('frozen')) return '#3B82F6';
        if (t.includes('fragile')) return '#EF4444';
        if (t.includes('heavy') || t.includes('bulky')) return '#4B5563';
        return colors.primary;
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
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2.5">
                        <Path d="M19 12H5M12 19l-7-7 7-7" />
                    </Svg>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <MonoText size="s" weight="bold" color={colors.textLight}>Order Tracking</MonoText>
                    <MonoText size="m" weight="bold">#{order.orderId?.slice(-6).toUpperCase()}</MonoText>
                </View>
                <TouchableOpacity onPress={openGoogleMapsNavigation} style={styles.navigateBtn}>
                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2.5">
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
                        <Marker.Animated
                            coordinate={partnerLocationAnimated as any}
                            title="Your Location"
                        >
                            <View style={styles.partnerMarker}>
                                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <Circle cx="12" cy="12" r="3" />
                                    <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                                </Svg>
                            </View>
                        </Marker.Animated>
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
                    ) : noRouteFound ? (
                        <>
                            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2">
                                <Circle cx="12" cy="12" r="10" />
                                <Path d="M12 8v4M12 16h.01" />
                            </Svg>
                            <MonoText size="xs" weight="bold" color={colors.accent} style={{ marginTop: 6, textAlign: 'center' }}>
                                Route Unavailable
                            </MonoText>
                            <MonoText size="xs" color={colors.textLight} style={{ marginTop: 4, textAlign: 'center' }}>
                                Use Maps to navigate
                            </MonoText>
                            <TouchableOpacity
                                style={{
                                    marginTop: 8,
                                    backgroundColor: colors.primary,
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                }}
                                onPress={openGoogleMapsNavigation}
                            >
                                <MonoText size="xs" weight="bold" color={colors.white}>Open Maps</MonoText>
                            </TouchableOpacity>
                        </>
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
            <ScrollView style={styles.bottomSheet} contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
                {/* Handle Bar */}
                <View style={styles.handle} />

                {/* No Route Found Banner */}
                {noRouteFound && (
                    <View style={styles.noRouteBanner}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2">
                                <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <Path d="M12 9v4M12 17h.01" />
                            </Svg>
                            <MonoText weight="bold" color="#92400E" style={{ marginLeft: 8 }}>Route Not Available</MonoText>
                        </View>
                        <MonoText size="xs" color="#78350F">
                            Google Maps couldn't find a route to this location. Please use external navigation for directions.
                        </MonoText>
                        <TouchableOpacity
                            style={{
                                marginTop: 12,
                                backgroundColor: '#1F2937',
                                paddingVertical: 10,
                                paddingHorizontal: 16,
                                borderRadius: 8,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            onPress={openGoogleMapsNavigation}
                        >
                            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <Path d="M3 11l19-9-9 19-2-8-8-2z" />
                            </Svg>
                            <MonoText size="s" weight="bold" color={colors.white} style={{ marginLeft: 8 }}>Open Google Maps</MonoText>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Delivery details */}
                <View style={styles.customerCard}>
                    <View style={styles.customerAvatar}>
                        <MonoText size="l" weight="bold" color={colors.white}>
                            {order.customer?.name?.charAt(0).toUpperCase() || 'C'}
                        </MonoText>
                    </View>
                    <View style={styles.customerInfo}>
                        <MonoText weight="bold" size="m">{order.customer?.name || 'Customer'}</MonoText>
                        <MonoText size="s" color={colors.text} numberOfLines={3} style={{ marginTop: 2 }}>
                            {customerLocation?.address || 'Delivery Address'}
                        </MonoText>
                        {order.deliveryLocation?.directions && (
                            <View style={styles.instructionBadge}>
                                <MonoText size="xxs" color={colors.primary} weight="bold">INS: {order.deliveryLocation.directions}</MonoText>
                            </View>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                            style={styles.callBtn}
                            onPress={() => Linking.openURL(`tel:${order.deliveryLocation?.receiverPhone || order.customer?.phone}`)}
                        >
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2.5">
                                <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </Svg>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Receiver Info Section */}
                <View style={[styles.section, { marginTop: 0 }]}>
                    <View style={styles.receiverCard}>
                        <View style={styles.receiverIcon}>
                            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2.5">
                                <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <Circle cx="12" cy="7" r="4" />
                            </Svg>
                        </View>
                        <View style={styles.receiverDetails}>
                            <MonoText size="xs" color={colors.textLight} weight="bold">RECEIVER DETAILS</MonoText>
                            <MonoText size="s" weight="bold" style={{ marginTop: 2 }}>
                                {order.deliveryLocation?.receiverName || order.customer?.name} • {order.deliveryLocation?.receiverPhone || order.customer?.phone}
                            </MonoText>
                        </View>
                    </View>

                    {order.deliveryLocation?.directions && (
                        <View style={styles.directionsCard}>
                            <View style={styles.directionsIcon}>
                                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2.5">
                                    <Path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </Svg>
                            </View>
                            <View style={styles.receiverDetails}>
                                <MonoText size="xs" color={colors.textLight} weight="bold">DELIVERY DIRECTIONS</MonoText>
                                <MonoText size="s" style={{ marginTop: 2 }}>{order.deliveryLocation.directions}</MonoText>
                            </View>
                        </View>
                    )}
                </View>

                {/* Pickup List (Zepto/Instamart Style) */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <MonoText weight="bold" size="m">Pickup List</MonoText>
                        <View style={styles.itemCountBadge}>
                            <MonoText size="xs" weight="bold" color={colors.primary}>{order.items?.length || 0} ITEMS</MonoText>
                        </View>
                    </View>

                    <View style={styles.itemsListContainer}>
                        {order.items?.map((item: any, index: number) => {
                            const hasVariantImage = item.productImage && item.productImage.trim() !== '';
                            const instructions = item.deliveryInstructions || [];

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.pickupItemCard}
                                    onPress={() => handleItemPress(item)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.itemImageContainer}>
                                        {hasVariantImage ? (
                                            <View style={styles.placeholderImage}>
                                                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.border} strokeWidth="1.5">
                                                    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                    <Circle cx="12" cy="7" r="4" />
                                                </Svg>
                                            </View>
                                        ) : (
                                            <View style={styles.placeholderImage}>
                                                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.border} strokeWidth="1.5">
                                                    <Path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                                </Svg>
                                            </View>
                                        )}
                                        <View style={styles.itemQtyBadge}>
                                            <MonoText size="xxs" weight="bold" color={colors.white}>×{item.count || item.quantity}</MonoText>
                                        </View>
                                    </View>

                                    <View style={styles.itemInfo}>
                                        <MonoText size="s" weight="bold" numberOfLines={1}>{item.productName || item.item}</MonoText>
                                        <MonoText size="xxs" color={colors.textLight}>{item.packSize || 'Standard variant'}</MonoText>

                                        <View style={styles.tagContainer}>
                                            {item.handling?.cold && (
                                                <View style={[styles.tag, { backgroundColor: '#3B82F6' }]}>
                                                    <MonoText size="xxs" weight="bold" color={colors.white}>COLD</MonoText>
                                                </View>
                                            )}
                                            {item.handling?.fragile && (
                                                <View style={[styles.tag, { backgroundColor: '#EF4444' }]}>
                                                    <MonoText size="xxs" weight="bold" color={colors.white}>FRAGILE</MonoText>
                                                </View>
                                            )}
                                            {item.handling?.heavy && (
                                                <View style={[styles.tag, { backgroundColor: '#4B5563' }]}>
                                                    <MonoText size="xxs" weight="bold" color={colors.white}>HEAVY</MonoText>
                                                </View>
                                            )}
                                            {item.deliveryInstructions?.map((ins: string, tid: number) => (
                                                <View key={tid} style={[styles.tag, { backgroundColor: colors.primary }]}>
                                                    <MonoText size="xxs" weight="bold" color={colors.white}>{ins.toUpperCase()}</MonoText>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.border} strokeWidth="2">
                                        <Path d="M9 18l6-6-6-6" />
                                    </Svg>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Payment Info (Enhanced COD Handling) */}
                <View style={styles.section}>
                    <MonoText weight="bold" size="m" style={{ marginBottom: 12 }}>Payment Info</MonoText>
                    <View style={styles.paymentCardMinimal}>
                        <View style={styles.paymentRow}>
                            <MonoText size="s" color={colors.textLight}>Payment Method</MonoText>
                            <MonoText size="s" weight="bold">{order.paymentDetails?.paymentMethod?.toUpperCase() || 'ONLINE'}</MonoText>
                        </View>

                        {order.paymentDetails?.paymentMethod === 'cod' ? (
                            <>
                                <View style={[styles.paymentRow, { marginTop: 8 }]}>
                                    <MonoText size="s" color={colors.textLight}>Cash to Collect</MonoText>
                                    <MonoText size="m" weight="bold" color={colors.warning}>₹{order.totalPrice}</MonoText>
                                </View>
                                <View style={[styles.paymentRow, { marginTop: 8 }]}>
                                    <MonoText size="s" color={colors.textLight}>Payment Status</MonoText>
                                    <View style={[styles.statusBadgeSmall, { backgroundColor: order.paymentStatus === 'verified' ? `${colors.success}15` : `${colors.warning}15` }]}>
                                        <MonoText size="xxs" weight="bold" color={order.paymentStatus === 'verified' ? colors.success : colors.warning}>
                                            {order.paymentStatus === 'verified' ? 'COLLECTED & VERIFIED' : 'PENDING COLLECTION'}
                                        </MonoText>
                                    </View>
                                </View>
                            </>
                        ) : (
                            <View style={[styles.paymentRow, { marginTop: 8 }]}>
                                <MonoText size="s" color={colors.textLight}>Payment Status</MonoText>
                                <View style={[styles.statusBadgeSmall, { backgroundColor: `${colors.success}15` }]}>
                                    <MonoText size="xxs" weight="bold" color={colors.success}>PAID ONLINE</MonoText>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Collect Cash Button - COD Specific */}
                    {order.paymentDetails?.paymentMethod === 'cod' && order.status === 'delivered' && order.paymentStatus !== 'verified' && (
                        <TouchableOpacity
                            style={styles.collectCashBtn}
                            onPress={() => {
                                Alert.alert(
                                    'Collect Cash',
                                    `Are you sure you have collected ₹${order.totalPrice} from the customer?`,
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Yes, Collected',
                                            onPress: async () => {
                                                setActionLoading(true);
                                                try {
                                                    const res = await partnerService.verifyCashPayment(order._id);
                                                    if (res.message) {
                                                        Alert.alert('Success', 'Payment verified successfully');
                                                        // Refresh order
                                                        const fresh = await partnerService.getOrderById(order._id);
                                                        if (fresh.order) setOrder(fresh.order);
                                                    }
                                                } catch (err) {
                                                    Alert.alert('Error', 'Failed to verify payment');
                                                } finally {
                                                    setActionLoading(false);
                                                }
                                            }
                                        }
                                    ]
                                );
                            }}
                            disabled={actionLoading}
                        >
                            {actionLoading ? (
                                <ActivityIndicator color={colors.white} size="small" />
                            ) : (
                                <>
                                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2.5">
                                        <Path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                    </Svg>
                                    <MonoText weight="bold" color={colors.white} style={{ marginLeft: 8 }}>COLLECT CASH - ₹{order.totalPrice}</MonoText>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
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

            {/* Item Detail Modal */}
            <Modal
                isVisible={showItemModal}
                onBackdropPress={() => setShowItemModal(false)}
                onSwipeComplete={() => setShowItemModal(false)}
                swipeDirection={['down']}
                style={styles.modal}
                propagateSwipe={true}
                statusBarTranslucent={true}
            >
                <View style={styles.modalContent}>
                    <View style={styles.modalHandle} />

                    {selectedItem && (
                        <View style={styles.modalBody}>
                            <View style={styles.modalImageContainer}>
                                {selectedItem.productImage ? (
                                    <View style={[styles.placeholderImage, { transform: [{ scale: 1.5 }] }]}>
                                        <Svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colors.border} strokeWidth="1">
                                            <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <Circle cx="12" cy="7" r="4" />
                                        </Svg>
                                    </View>
                                ) : (
                                    <View style={[styles.placeholderImage, { transform: [{ scale: 1.5 }] }]}>
                                        <Svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colors.border} strokeWidth="1">
                                            <Path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                        </Svg>
                                    </View>
                                )}
                            </View>

                            <View style={styles.modalInfo}>
                                <MonoText size="xl" weight="bold">{selectedItem.productName || selectedItem.item}</MonoText>
                                <MonoText size="m" color={colors.textLight} style={{ marginTop: 4 }}>
                                    Variant: {selectedItem.packSize || 'Standard Pack'}
                                </MonoText>

                                <View style={styles.modalDivider} />

                                <View style={styles.modalDetailRow}>
                                    <View style={styles.modalDetailItem}>
                                        <MonoText size="xs" color={colors.textLight} weight="bold">QUANTITY</MonoText>
                                        <MonoText size="l" weight="bold" style={{ marginTop: 4 }}>{selectedItem.count || selectedItem.quantity} Units</MonoText>
                                    </View>
                                    <View style={styles.modalDetailItem}>
                                        <MonoText size="xs" color={colors.textLight} weight="bold">SKU</MonoText>
                                        <MonoText size="s" style={{ marginTop: 4 }}>{selectedItem.variantSku || 'N/A'}</MonoText>
                                    </View>
                                </View>

                                {selectedItem.deliveryInstructions?.length > 0 && (
                                    <View style={styles.modalInstructionsSection}>
                                        <MonoText size="xs" color={colors.primary} weight="bold" style={{ marginBottom: 12 }}>ITEM INSTRUCTIONS</MonoText>
                                        {selectedItem.deliveryInstructions.map((ins: string, idx: number) => (
                                            <View key={idx} style={styles.modalInstructionItem}>
                                                <View style={[styles.statusDot, { backgroundColor: getTagColor(ins) }]} />
                                                <MonoText size="s" weight="bold" color={colors.text}>{ins.toUpperCase()}</MonoText>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setShowItemModal(false)}
                            >
                                <MonoText size="m" weight="bold" color={colors.white}>Got it</MonoText>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Modal>

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
        paddingHorizontal: spacing.l,
        paddingBottom: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
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
        paddingHorizontal: spacing.l,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    noRouteBanner: {
        backgroundColor: '#FEF3C7',
        padding: spacing.m,
        borderRadius: 12,
        marginBottom: spacing.m,
        borderWidth: 1,
        borderColor: '#FDE68A',
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
    receiverCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
    },
    receiverIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 71, 0, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    receiverDetails: {
        flex: 1,
    },
    directionsCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFFBEB',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    directionsIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    statusBadgeSmall: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    collectCashBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.warning,
        paddingVertical: 14,
        borderRadius: 14,
        marginTop: 16,
        shadowColor: colors.warning,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
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
    paymentCardMinimal: {
        backgroundColor: '#F8FAFC',
        padding: spacing.m,
        borderRadius: 16,
        marginBottom: spacing.m,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pickupItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: colors.white,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    itemImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    placeholderImage: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemInfo: {
        flex: 1,
    },
    itemQtyBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: colors.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.white,
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 6,
        gap: 6,
    },
    tag: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    itemCountBadge: {
        backgroundColor: 'rgba(255, 71, 0, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    itemsListContainer: {
        marginBottom: 8,
    },
    instructionBadge: {
        marginTop: 8,
        backgroundColor: 'rgba(255, 71, 0, 0.05)',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 71, 0, 0.1)',
        borderStyle: 'dashed',
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
    modal: {
        margin: 0,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 40 : 40,
        paddingHorizontal: spacing.l,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 24,
    },
    modalBody: {
        width: '100%',
    },
    modalImageContainer: {
        width: '100%',
        height: 180,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    modalInfo: {
        marginBottom: 24,
    },
    modalDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 16,
    },
    modalDetailRow: {
        flexDirection: 'row',
        marginBottom: 24,
        gap: 20,
    },
    modalDetailItem: {
        flex: 1,
    },
    modalInstructionsSection: {
        backgroundColor: 'rgba(255, 71, 0, 0.03)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 71, 0, 0.08)',
    },
    modalInstructionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    modalCloseBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
});
