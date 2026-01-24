import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Alert, Linking, Platform, ScrollView, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, interpolate } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MapView, { Marker, Polyline as MapPolyline, PROVIDER_DEFAULT, AnimatedRegion } from 'react-native-maps';
import Svg, { Path, Circle, Polyline as SvgPolyline } from 'react-native-svg';
import { io, Socket } from 'socket.io-client';
import { api } from '../../../services/core/api';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { MonoText } from '../../../components/shared/MonoText';
import { useAuthStore } from '../../../store/authStore';
import { orderService } from '../../../services/customer/order.service';
import { invoiceService } from '../../../services/customer/invoice.service';
import { ENV } from '../../../utils/env';
import { notifyOrderPickedUp, notifyOrderDelivered } from '../../../services/notification/notification.service';
import { logger } from '../../../utils/logger';
import { RatingModal } from '../../../components/shared/RatingModal';
import { reviewService, Review } from '../../../services/customer/review.service';
import { BlurView } from '@react-native-community/blur';
import { TrackingSkeleton } from '../../../components/shared/TrackingSkeleton';

const { width, height } = Dimensions.get('window');
const MAP_HEIGHT_EXPANDED = height * 0.6;
const MAP_HEIGHT_COLLAPSED = height * 0.3;
const HEADER_CONTENT_HEIGHT = 56;

type OrderTrackingRouteParams = {
    orderId: string;
    from?: 'checkout' | 'history';
};

export const OrderTrackingScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<{ params: OrderTrackingRouteParams }, 'params'>>();
    const insets = useSafeAreaInsets();
    const { orderId, from } = route.params;
    const { user } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<any>(null);
    const [partnerLocation, setPartnerLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [routeData, setRouteData] = useState<{ distance: string; duration: string } | null>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
    const [status, setStatus] = useState<string>('confirmed'); // pending, confirmed, preparing, out_for_delivery, delivered, cancelled
    const [activeTab, setActiveTab] = useState<'status' | 'details'>('status');
    const [showMap, setShowMap] = useState(false);
    const [tabContainerWidth, setTabContainerWidth] = useState(0);

    const mapRef = useRef<MapView>(null);
    const socketRef = useRef<Socket | null>(null);
    const partnerMarkerRef = useRef<any>(null);

    // Animated Location for smooth marker movement
    const partnerLocationAnimated = useRef(new AnimatedRegion({
        latitude: 26.4499,
        longitude: 80.3319,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    })).current;

    const mapHeight = useSharedValue(0);
    const tabOffset = useSharedValue(0);

    useEffect(() => {
        mapHeight.value = withTiming(showMap ? MAP_HEIGHT_EXPANDED : 0, {
            duration: 600,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
    }, [showMap]);

    useEffect(() => {
        tabOffset.value = withTiming(activeTab === 'status' ? 0 : 1, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
    }, [activeTab]);

    const animatedMapStyle = useAnimatedStyle(() => {
        return {
            height: mapHeight.value,
            opacity: interpolate(mapHeight.value, [0, MAP_HEIGHT_EXPANDED * 0.2, MAP_HEIGHT_EXPANDED], [0, 0, 1]),
        };
    });

    const animatedTabStyle = useAnimatedStyle(() => {
        if (tabContainerWidth === 0) return { opacity: 0 };
        const INDICATOR_WIDTH = (tabContainerWidth - 8) / 2;
        return {
            transform: [{ translateX: tabOffset.value * INDICATOR_WIDTH }],
            width: INDICATOR_WIDTH,
        };
    });

    // Rating Modal State
    const [ratingModalVisible, setRatingModalVisible] = useState(false);
    const [ratingProduct, setRatingProduct] = useState<{ id: string; name: string; image?: string; review?: Review } | null>(null);
    const [ratedProducts, setRatedProducts] = useState<Set<string>>(new Set());
    const [orderReviews, setOrderReviews] = useState<Review[]>([]);

    // Derived State
    const isActiveOrder = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'accepted', 'in-progress', 'awaitconfirmation'].includes(status);
    const isPastOrder = ['delivered', 'cancelled'].includes(status);

    // Animated map height based on scroll


    // Initial Fetch
    useEffect(() => {
        const fetchOrderData = async () => {
            try {
                // Fetch Order Details
                const response = await api.get(`/orders/${orderId}`);
                if (response.data && response.data.order) {
                    const orderData = response.data.order;
                    setOrder(orderData);
                    setStatus(orderData.status || 'confirmed');

                    // If order is active and we have a partner, set initial location
                    if (orderData.deliveryPersonLocation) {
                        const { latitude, longitude } = orderData.deliveryPersonLocation;
                        partnerLocationAnimated.setValue({
                            latitude,
                            longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        });
                        setPartnerLocation({ latitude, longitude });
                    }

                    // If delivered, fetch existing reviews for this order
                    if (orderData.status === 'delivered') {
                        try {
                            const reviews = await reviewService.getOrderReviews(orderId);
                            setOrderReviews(reviews);

                            // Pre-populate ratedProducts set
                            const ratedSet = new Set<string>();
                            reviews.forEach(r => {
                                const pId = typeof r.product === 'string' ? r.product : r.product._id;
                                ratedSet.add(pId);
                            });
                            setRatedProducts(ratedSet);
                        } catch (err) {
                            logger.error('Failed to fetch order reviews', err);
                        }
                    }
                }
            } catch (error) {
                logger.error('Fetch order data error', error);
                Alert.alert("Error", "Could not fetch order details");
            } finally {
                setLoading(false);
            }
        };

        fetchOrderData();
    }, [orderId]);

    // Socket Connection (Only for active orders)
    useEffect(() => {
        if (!orderId || isPastOrder) return;

        socketRef.current = io(ENV.SOCKET_URL, {
            transports: ['websocket'],
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            logger.socket('connected for tracking');
            socket.emit('joinRoom', orderId);
        });

        socket.on('driverLocation', (data: { latitude: number, longitude: number }) => {
            logger.log('Driver location update (legacy):', data);
            (partnerLocationAnimated.timing({
                latitude: data.latitude,
                longitude: data.longitude,
                duration: 2000,
                useNativeDriver: false
            } as any) as any).start();
            setPartnerLocation({ latitude: data.latitude, longitude: data.longitude });
        });

        socket.on('deliveryPartnerLocationUpdate', (data: any) => {
            logger.log('Enhanced delivery location update:', data);
            if (data.location) {
                (partnerLocationAnimated.timing({
                    latitude: data.location.latitude,
                    longitude: data.location.longitude,
                    duration: 2000,
                    useNativeDriver: false
                } as any) as any).start();
                setPartnerLocation(data.location);
                if (data.eta !== undefined) {
                    setRouteData(prev => ({
                        distance: data.routeData?.distance?.text || prev?.distance || '--',
                        duration: data.eta ? `${data.eta} mins` : (data.routeData?.duration?.text || prev?.duration || '--')
                    }));
                }
            }
        });

        socket.on('orderPickedUp', (data: any) => {
            logger.log('Order picked up:', data._id);
            setStatus('out_for_delivery');

            // Trigger customer notification
            const etaMinutes = routeData?.duration ? parseInt(routeData.duration) : 15;
            notifyOrderPickedUp(etaMinutes, orderId);

            if (data.deliveryPersonLocation) {
                setPartnerLocation(data.deliveryPersonLocation);
            }
        });

        socket.on('orderUpdated', (data: any) => {
            logger.log('Order status update:', data);
            if (data.status) {
                setStatus(data.status);

                // If becomes delivered, notify customer
                if (data.status === 'delivered') {
                    notifyOrderDelivered(orderId);
                }

                // If becomes delivered, refetch or update state to past order mode
                if (['delivered', 'cancelled'].includes(data.status)) {
                    setOrder(data); // Assuming full payload or refetch
                }
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [orderId, isPastOrder]);

    // Fit Map to show all markers and route
    useEffect(() => {
        if (order && mapRef.current) {
            const markers: { latitude: number; longitude: number }[] = [];
            const hasPartner = !!order.deliveryPartner;

            // User Location (Prioritize deliveryLocation from new API structure)
            const userLoc = order.deliveryLocation || order.shippingAddress;
            if (userLoc?.latitude) {
                markers.push({
                    latitude: userLoc.latitude,
                    longitude: userLoc.longitude
                });
            }

            // Partner Location - ONLY include if partner is assigned and has location
            if (hasPartner && partnerLocation) {
                markers.push(partnerLocation);
            }

            // Branch Location - always show when no partner, or when partner not picked up yet
            if (order.pickupLocation?.latitude) {
                markers.push({
                    latitude: order.pickupLocation.latitude,
                    longitude: order.pickupLocation.longitude
                });
            }

            // Include route start/end for better fit (use first and last route points)
            if (routeCoordinates.length > 0) {
                markers.push(routeCoordinates[0]);
                markers.push(routeCoordinates[routeCoordinates.length - 1]);
            }

            console.log('>>> Fitting map <<<', {
                hasPartner,
                markersCount: markers.length,
                routeCoordsCount: routeCoordinates.length
            });

            if (markers.length > 0) {
                mapRef.current.fitToCoordinates(markers, {
                    edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
                    animated: true,
                });
            }
        }
    }, [partnerLocation, order, routeCoordinates]);

    // Helper function to decode Google polyline
    const decodePolyline = (encoded: string): { latitude: number; longitude: number }[] => {
        const points: { latitude: number; longitude: number }[] = [];
        let index = 0;
        let lat = 0;
        let lng = 0;

        while (index < encoded.length) {
            let shift = 0;
            let result = 0;
            let byte;

            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);

            const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
            lat += dlat;

            shift = 0;
            result = 0;

            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);

            const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
            lng += dlng;

            points.push({
                latitude: lat / 1e5,
                longitude: lng / 1e5,
            });
        }

        return points;
    };

    // Fetch route data - works in all order states
    useEffect(() => {
        const fetchRouteData = async () => {
            if (!order) {
                return;
            }

            const customerLocation = order.deliveryLocation || order.shippingAddress;
            if (!customerLocation?.latitude) return;

            // Determine Origin based on order state:
            // 1. If order is picked up (in-progress/out_for_delivery) AND partner location available → use partner location
            // 2. Otherwise → use branch location (even before partner is assigned)
            let originLocation = null;
            let originAddress = '';
            let routeType = 'branch-to-customer';

            const isPickedUp = ['out_for_delivery', 'in-progress', 'reaching', 'awaitconfirmation'].includes(status);

            if (isPickedUp && partnerLocation) {
                // Order is picked up, track from partner → customer
                originLocation = partnerLocation;
                originAddress = 'Partner Location';
                routeType = 'partner-to-customer';
            } else if (order.pickupLocation && order.pickupLocation.latitude) {
                // Order not picked up yet, show route from branch → customer
                originLocation = {
                    latitude: order.pickupLocation.latitude,
                    longitude: order.pickupLocation.longitude
                };
                originAddress = order.pickupLocation.address || 'Branch Location';
                routeType = 'branch-to-customer';
            }

            // If no origin available, skip
            if (!originLocation) return;

            try {
                // Use customer-accessible endpoint
                console.log('>>> Fetching route directions <<<', { originLocation, routeType });
                const response = await api.post(`/orders/${orderId}/directions/customer`, {
                    origin: {
                        latitude: originLocation.latitude,
                        longitude: originLocation.longitude,
                        address: originAddress
                    },
                    destination: {
                        latitude: customerLocation.latitude,
                        longitude: customerLocation.longitude,
                        address: customerLocation.address || 'Customer Location'
                    },
                    routeType: routeType,
                    updateOrder: false
                });

                console.log('>>> Route API Response <<<', JSON.stringify(response.data, null, 2));

                if (response.data?.routeData) {
                    const { distance, duration, polyline, coordinates } = response.data.routeData;
                    console.log('>>> Route Data <<<', { distance, duration, hasPolyline: !!polyline, hasCoordinates: !!coordinates, coordsLength: coordinates?.length });

                    setRouteData({
                        distance: distance?.text || '--',
                        duration: duration?.text || '--'
                    });

                    // Try to use coordinates directly if available, otherwise decode polyline
                    if (coordinates && coordinates.length > 0) {
                        console.log('>>> Using direct coordinates <<<', coordinates.length);
                        setRouteCoordinates(coordinates);
                    } else if (polyline) {
                        console.log('>>> Decoding polyline <<<', polyline.substring(0, 50) + '...');
                        const decoded = decodePolyline(polyline);
                        console.log('>>> Decoded coords <<<', decoded.length);
                        setRouteCoordinates(decoded);
                    } else {
                        console.log('>>> No polyline or coordinates in response <<<');
                        // Create straight line as fallback
                        setRouteCoordinates([
                            { latitude: originLocation.latitude, longitude: originLocation.longitude },
                            { latitude: customerLocation.latitude, longitude: customerLocation.longitude }
                        ]);
                    }
                }
            } catch (error) {
                logger.error('Failed to fetch route data:', error);

                // Fallback Distance Calc - SAME formula as checkout screen
                const originLat = originLocation.latitude;
                const originLng = originLocation.longitude;
                const customerLat = customerLocation.latitude;
                const customerLng = customerLocation.longitude;

                const distKm = Math.sqrt(
                    Math.pow((originLat - customerLat) * 111, 2) +
                    Math.pow((originLng - customerLng) * 111 * Math.cos(originLat * Math.PI / 180), 2)
                );

                // SAME ETA formula as checkout: Math.ceil(distKm * 5 + 15)
                const etaMins = Math.ceil(distKm * 5 + 15);

                console.log('>>> Using fallback ETA calculation <<<', { distKm: distKm.toFixed(1), etaMins });

                setRouteData({
                    distance: `${distKm.toFixed(1)} km`,
                    duration: `${etaMins} mins`
                });

                // Create simple straight line route as fallback
                setRouteCoordinates([
                    { latitude: originLat, longitude: originLng },
                    { latitude: customerLat, longitude: customerLng }
                ]);
            }
        };

        fetchRouteData();
    }, [partnerLocation, order, orderId, status]);


    const renderStatusStep = (stepStatus: string, label: string, isCompleted: boolean, isActive: boolean) => (
        <View style={styles.stepContainer}>
            <View style={[styles.stepDot, isCompleted ? styles.stepDotCompleted : isActive ? styles.stepDotActive : styles.stepDotPending]}>
                {isCompleted && (
                    <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <SvgPolyline points="20 6 9 17 4 12" />
                    </Svg>
                )}
            </View>
            <View style={styles.stepContent}>
                <MonoText weight={isActive || isCompleted ? 'bold' : 'regular'} color={isActive || isCompleted ? colors.black : colors.textLight}>
                    {label}
                </MonoText>
                {isActive && <MonoText size="xs" color={colors.primary}>In Progress</MonoText>}
            </View>
        </View>
    );

    const getStatusStepState = (currentStatus: string, stepStatus: string) => {
        // Order of statuses in progression
        const statuses = ['confirmed', 'preparing', 'out_for_delivery', 'awaitconfirmation', 'delivered'];

        // Normalize status for comparison
        let normalizedStatus = currentStatus;
        if (currentStatus === 'pending') normalizedStatus = 'confirmed';
        if (currentStatus === 'accepted') normalizedStatus = 'preparing';
        if (currentStatus === 'in-progress') normalizedStatus = 'out_for_delivery';

        // Map display labels to internal status values
        const mapStatus: Record<string, string> = {
            'Confirmed': 'confirmed',
            'Order picked up from the branch': 'preparing',
            'Out for Delivery': 'out_for_delivery',
            'Awaiting Confirmation of Delivery Confirmation By Customer': 'awaitconfirmation',
            'Delivered': 'delivered'
        };

        const currentIndex = statuses.indexOf(normalizedStatus);
        const stepIndex = statuses.indexOf(mapStatus[stepStatus]);

        return {
            isCompleted: currentIndex > stepIndex,
            isActive: currentIndex === stepIndex,
        };
    };

    if (loading) {
        return <TrackingSkeleton />;
    }

    const currentMapHeight = showMap ? MAP_HEIGHT_EXPANDED : 0;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="light"
                    blurAmount={20}
                    reducedTransparencyFallbackColor="white"
                />
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => {
                            if (from === 'checkout') {
                                navigation.navigate('MainTabs', { screen: 'Home' });
                            } else {
                                navigation.goBack();
                            }
                        }}
                        style={styles.backBtn}
                    >
                        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M19 12H5M12 19l-7-7 7-7" />
                        </Svg>
                    </TouchableOpacity>
                    <MonoText size="l" weight="bold" style={styles.headerTitle}>
                        {isPastOrder ? 'Order Details' : 'Track Order'}
                    </MonoText>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            {/* Map Area */}
            <Animated.View style={[styles.mapContainer, animatedMapStyle]}>
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_DEFAULT}
                    style={{ width: '100%', height: MAP_HEIGHT_EXPANDED }}
                    initialRegion={{
                        latitude: 26.4499,
                        longitude: 80.3319,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                >
                    {/* User Marker (Home) */}
                    {(order?.shippingAddress?.latitude || order?.deliveryLocation?.latitude) && (
                        <Marker coordinate={{
                            latitude: order.shippingAddress?.latitude || order.deliveryLocation?.latitude,
                            longitude: order.shippingAddress?.longitude || order.deliveryLocation?.longitude
                        }} title="Delivery Location" description={order.deliveryLocation?.address}>
                            <View style={styles.markerMyLoc}>
                                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                </Svg>
                            </View>
                        </Marker>
                    )}

                    {/* Branch Marker (Store) */}
                    {order?.pickupLocation?.latitude && (
                        <Marker coordinate={{
                            latitude: order.pickupLocation.latitude,
                            longitude: order.pickupLocation.longitude
                        }} title="Store Branch">
                            <View style={styles.markerBranch}>
                                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <Path d="M3 21v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8" />
                                    <Path d="M5 21v-8" />
                                    <Path d="M19 21v-8" />
                                    <Path d="M9 21v-8" />
                                    <Path d="M15 21v-8" />
                                    <Path d="M2 11h20M2 11l2-7h16l2 7" />
                                </Svg>
                            </View>
                        </Marker>
                    )}

                    {/* Partner Marker (Bike) - Only if Active */}
                    {isActiveOrder && partnerLocation && (
                        <Marker.Animated
                            coordinate={partnerLocationAnimated as any}
                            title="Delivery Partner"
                        >
                            <View style={styles.markerPartner}>
                                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
                                    <Circle cx="12" cy="12" r="10" />
                                    <Path d="M12 6v6l4 2" />
                                </Svg>
                            </View>
                        </Marker.Animated>
                    )}

                    {/* Route Polyline - Show for all active orders with route */}
                    {isActiveOrder && routeCoordinates.length > 0 && (
                        <MapPolyline
                            coordinates={routeCoordinates}
                            strokeWidth={4}
                            strokeColor={colors.primary}
                            lineDashPattern={[0]}
                        />
                    )}
                </MapView>

                {/* ETA/Status Card Overlay - Only when map is shown and active */}
                {isActiveOrder && routeData && (
                    <View style={styles.etaCard}>
                        <TouchableOpacity
                            style={styles.closeMapBtn}
                            onPress={() => setShowMap(false)}
                        >
                            <MonoText size="xs" weight="bold" color={colors.primary}>Close Map</MonoText>
                        </TouchableOpacity>
                        {(() => {
                            const isPickedUp = ['out_for_delivery', 'in-progress', 'reaching', 'awaitconfirmation'].includes(status);
                            const hasPartner = !!order?.deliveryPartner;

                            if (isPickedUp && hasPartner) {
                                return (
                                    <>
                                        <MonoText size="xxl" weight="bold" color={colors.primary}>
                                            {routeData.duration}
                                        </MonoText>
                                        <MonoText size="xs" color={colors.textLight}>
                                            {routeData.distance} away
                                        </MonoText>
                                    </>
                                );
                            } else if (hasPartner) {
                                return (
                                    <MonoText size="l" weight="bold" color={colors.accent}>
                                        ~{routeData.duration}
                                    </MonoText>
                                );
                            } else {
                                return <MonoText size="xs" color={colors.textLight}>Assigning partner...</MonoText>;
                            }
                        })()}
                    </View>
                )}
            </Animated.View>

            {!showMap && isActiveOrder && routeData && (
                <View style={[styles.inlineTrackingCard, { marginTop: insets.top + HEADER_CONTENT_HEIGHT + 10 }]}>
                    <View style={styles.inlineTrackingInfo}>
                        <View>
                            <MonoText size="xs" color={colors.textLight}>Estimated Delivery</MonoText>
                            <MonoText size="xl" weight="bold" color={colors.primary}>{routeData.duration}</MonoText>
                        </View>
                        {status !== 'delivered' && (
                            <TouchableOpacity
                                style={styles.showMapButton}
                                onPress={() => setShowMap(true)}
                            >
                                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2" style={{ marginRight: 6 }}>
                                    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <Circle cx="12" cy="10" r="3" />
                                </Svg>
                                <MonoText size="xs" weight="bold" color={colors.white}>View Map</MonoText>
                            </TouchableOpacity>
                        )}
                    </View>
                    {status === 'out_for_delivery' && (
                        <View style={styles.pulseContainer}>
                            <View style={styles.pulseDot} />
                            <MonoText size="xs" color={colors.success} weight="bold">Live Tracking Active</MonoText>
                        </View>
                    )}
                </View>
            )}

            {/* Bottom Sheet Content */}
            <ScrollView
                style={[
                    styles.bottomSheet,
                    showMap
                        ? { marginTop: -20 } // When map is expanded, overlap slightly
                        : isPastOrder
                            ? { marginTop: insets.top + HEADER_CONTENT_HEIGHT + 10 } // Past orders: account for header
                            : { marginTop: isActiveOrder && routeData ? 0 : insets.top + HEADER_CONTENT_HEIGHT + 10 } // Active without map but with inline card handled separately
                ]}
                contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
                showsVerticalScrollIndicator={false}
                bounces={true}
                scrollEventThrottle={16}
            >


                <View style={[styles.handle, { alignSelf: 'center' }]} />

                {/* Glassmorphism Tab Selector */}
                <View style={styles.glassTabContainer}>
                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType="xlight"
                        blurAmount={30}
                        reducedTransparencyFallbackColor="#F1F5F9"
                    />
                    <View
                        style={styles.tabInner}
                        onLayout={(e) => setTabContainerWidth(e.nativeEvent.layout.width)}
                    >
                        <Animated.View style={[styles.tabIndicator, animatedTabStyle]} />
                        <TouchableOpacity
                            style={styles.tabItem}
                            onPress={() => setActiveTab('status')}
                            activeOpacity={0.7}
                        >
                            <MonoText
                                weight="bold"
                                color={activeTab === 'status' ? colors.primary : colors.textLight}
                            >
                                Order Status
                            </MonoText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.tabItem}
                            onPress={() => setActiveTab('details')}
                            activeOpacity={0.7}
                        >
                            <MonoText
                                weight="bold"
                                color={activeTab === 'details' ? colors.primary : colors.textLight}
                            >
                                Order Details
                            </MonoText>
                        </TouchableOpacity>
                    </View>
                </View>

                {activeTab === 'status' && (<>

                    {/* Status Summary for Past Orders */}
                    {isPastOrder && (
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryItem}>
                                <MonoText size="xl" weight="bold" color={colors.success}>
                                    {status === 'delivered' ? 'Delivered' : 'Cancelled'}
                                </MonoText>
                                <MonoText size="xs" color={colors.textLight}>
                                    {new Date(order.updatedAt).toLocaleString()}
                                </MonoText>
                            </View>
                            {status === 'delivered' && (
                                <View style={{ flexDirection: 'row', marginTop: 16, justifyContent: 'center' }}>
                                    <View style={{ alignItems: 'center' }}>
                                        <MonoText weight="bold" size="l" color={colors.primary}>
                                            {(() => {
                                                const start = new Date(order.createdAt).getTime();
                                                const end = new Date(order.updatedAt).getTime();
                                                const diffMins = Math.floor((end - start) / 60000);
                                                const hours = Math.floor(diffMins / 60);
                                                const mins = diffMins % 60;
                                                return hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;
                                            })()}
                                        </MonoText>
                                        <MonoText size="xs" color={colors.textLight}>Total Time Taken</MonoText>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Rate Products Section - Only for Delivered Orders */}
                    {status === 'delivered' && order?.items?.length > 0 && (
                        <View style={styles.rateSection}>
                            <MonoText weight="bold" size="m" style={{ marginBottom: 12 }}>
                                Rate Your Products
                            </MonoText>
                            <MonoText size="xs" color={colors.textLight} style={{ marginBottom: 16 }}>
                                Your feedback helps others make better choices
                            </MonoText>
                            {order.items.map((item: any, index: number) => {
                                // Prioritize denormalized productId, then fallback to id, then to inventory.product
                                const productId = item.productId ||
                                    (typeof item.id === 'object' ? item.id?._id : item.id) ||
                                    item.inventory?.product ||
                                    (typeof item.inventory === 'object' ? item.inventory._id : item.inventory);
                                const productName = item.productName || item.item || item.id?.name || 'Product';
                                const productImage = item.id?.images?.[0] || item.id?.image;
                                const isRated = ratedProducts.has(productId);

                                return (
                                    <View key={index} style={styles.rateItemRow}>
                                        <MonoText size="s" numberOfLines={1} style={{ flex: 1 }}>
                                            {productName}
                                        </MonoText>
                                        {isRated ? (
                                            <TouchableOpacity
                                                style={[styles.ratedBadge, { backgroundColor: '#F0FDF4', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 }]}
                                                onPress={() => {
                                                    const existingReview = orderReviews.find(r => (typeof r.product === 'string' ? r.product : r.product._id) === productId);
                                                    setRatingProduct({ id: productId, name: productName, image: productImage, review: existingReview });
                                                    setRatingModalVisible(true);
                                                }}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                                                    {[1, 2, 3, 4, 5].map((star) => {
                                                        const existingReview = orderReviews.find(r => (typeof r.product === 'string' ? r.product : r.product._id) === productId);
                                                        return (
                                                            <Svg key={star} width="10" height="10" viewBox="0 0 24 24" fill={star <= (existingReview?.rating || 0) ? "#FBBF24" : "none"} stroke={star <= (existingReview?.rating || 0) ? "#FBBF24" : colors.textLight} strokeWidth="2">
                                                                <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                            </Svg>
                                                        );
                                                    })}
                                                </View>
                                                <MonoText size="xs" color="#16A34A" weight="bold">View</MonoText>
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.rateButton}
                                                onPress={() => {
                                                    setRatingProduct({ id: productId, name: productName, image: productImage });
                                                    setRatingModalVisible(true);
                                                }}
                                            >
                                                <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                                    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                </Svg>
                                                <MonoText size="xs" color={colors.primary} weight="bold" style={{ marginLeft: 4 }}>Rate</MonoText>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Partner Info (Active Only) */}
                    {isActiveOrder && (
                        order?.deliveryPartner ? (
                            <View style={styles.partnerCard}>
                                <View style={styles.partnerAvatar}>
                                    <MonoText size="xl">🛵</MonoText>
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <MonoText weight="bold" size="m">{order.deliveryPartner.name || 'Delivery Partner'}</MonoText>
                                    <MonoText size="xs" color={colors.textLight}>Your delivery hero</MonoText>
                                </View>
                                <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${order.deliveryPartner.phone}`)}>
                                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                        <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </Svg>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={[styles.partnerCard, { opacity: 0.7 }]}>
                                <MonoText color={colors.textLight} style={{ fontStyle: 'italic' }}>Assigning delivery partner...</MonoText>
                            </View>
                        )
                    )}

                    {/* Timeline (Active Only) - Moved above details */}
                    {isActiveOrder && (
                        <>
                            <MonoText weight="bold" size="m" style={{ marginBottom: 16 }}>Order Status</MonoText>
                            <View style={styles.timeline}>
                                <View style={styles.timelineLine} />
                                {['Confirmed', 'Order picked up from the branch', 'Out for Delivery', 'Awaiting Confirmation of Delivery Confirmation By Customer', 'Delivered'].map((step) => {
                                    const { isCompleted, isActive } = getStatusStepState(status, step);
                                    return (
                                        <View key={step}>
                                            {renderStatusStep(step, step, isCompleted, isActive)}
                                        </View>
                                    );
                                })}
                            </View>
                            <View style={styles.divider} />
                        </>
                    )}
                    {/* Order Received Button - Show only when awaiting customer confirmation */}
                    {status === 'awaitconfirmation' && (
                        <View style={{ marginTop: 20 }}>
                            <View style={styles.awaitingBanner}>
                                <MonoText size="s" color={colors.white} weight="bold" style={{ textAlign: 'center' }}>
                                    📦 Your delivery partner has arrived! Please confirm receipt.
                                </MonoText>
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.confirmBtn,
                                    { backgroundColor: colors.success }
                                ]}
                                onPress={() => {
                                    Alert.alert(
                                        "Confirm Delivery",
                                        "Have you received your order?",
                                        [
                                            { text: "No", style: "cancel" },
                                            {
                                                text: "Yes, Received",
                                                onPress: async () => {
                                                    try {
                                                        setLoading(true);
                                                        await orderService.confirmDelivery(orderId);
                                                        setStatus('delivered');
                                                        // Refresh order details to show summary
                                                        const res = await api.get(`/orders/${orderId}`);
                                                        setOrder(res.data.order);
                                                    } catch (err) {
                                                        Alert.alert("Error", "Failed to update status");
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }
                                            }
                                        ]
                                    );
                                }}
                            >
                                <MonoText color={colors.white} weight="bold" size="m">
                                    ✓ Confirm Order Received
                                </MonoText>
                            </TouchableOpacity>
                        </View>
                    )}
                </>)}
                {activeTab === 'details' && (<>
                    {/* Delivery Address & Payment Status */}
                    <View style={styles.section}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <MonoText weight="bold" size="m">Order Details</MonoText>
                            {order?.paymentStatus === 'verified' ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                                        <SvgPolyline points="20 6 9 17 4 12" />
                                    </Svg>
                                    <MonoText size="xs" color={colors.success} weight="bold">PAID</MonoText>
                                </View>
                            ) : order?.paymentDetails?.paymentMethod === 'cod' ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                                    <MonoText size="xs" color="#D97706" weight="bold">PAY ON DELIVERY</MonoText>
                                </View>
                            ) : null}
                        </View>

                        <View style={styles.detailsCard}>
                            {/* Branch Info */}
                            {order?.branch?.name && (
                                <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                                    <View style={{ width: 32, alignItems: 'center', marginRight: 12 }}>
                                        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(0, 0, 0, 0.05)', alignItems: 'center', justifyContent: 'center' }}>
                                            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <Path d="M3 21v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8" />
                                                <Path d="M5 21v-8" />
                                                <Path d="M19 21v-8" />
                                                <Path d="M2 11h20M2 11l2-7h16l2 7" />
                                            </Svg>
                                        </View>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <MonoText weight="bold">Store Branch</MonoText>
                                        <MonoText size="s" color={colors.textLight} style={{ marginTop: 2 }}>{order.branch.name}</MonoText>
                                        {order.branch?.address && (
                                            <MonoText size="xs" color={colors.textLight}>{order.branch.address}</MonoText>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Delivery Address */}
                            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                                <View style={{ width: 32, alignItems: 'center', marginRight: 12 }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
                                        <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                            <Circle cx="12" cy="10" r="3" />
                                        </Svg>
                                    </View>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <MonoText weight="bold">Delivery Address</MonoText>
                                    {order?.deliveryLocation?.receiverName && (
                                        <MonoText size="xs" color={colors.primary} weight="bold" style={{ marginTop: 2 }}>
                                            Receiver: {order.deliveryLocation.receiverName}
                                        </MonoText>
                                    )}
                                    <MonoText size="s" color={colors.textLight} numberOfLines={3} style={{ marginTop: 2 }}>
                                        {order?.deliveryLocation?.address || order?.shippingAddress?.address || 'Address not available'}
                                    </MonoText>
                                    {order?.deliveryLocation?.directions && (
                                        <View style={{ marginTop: 8, backgroundColor: '#FFFBEB', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#FEF3C7' }}>
                                            <MonoText size="xxs" color="#92400E" weight="bold">DIRECTIONS:</MonoText>
                                            <MonoText size="xs" color="#B45309" style={{ marginTop: 2 }}>{order.deliveryLocation.directions}</MonoText>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {/* Order Items & Bill Summary */}
                            {(() => {
                                let mrpTotal = 0;
                                let sellingTotal = 0;

                                const itemsList = order?.items?.map((item: any, index: number) => {
                                    const originalPrice = item.unitMrp || item.id?.price || 0;
                                    const finalPrice = item.unitPrice || item.id?.discountPrice || item.id?.price || 0;
                                    const quantity = item.quantity || item.count || 1;
                                    const itemTotal = item.totalPrice || (finalPrice * quantity);

                                    mrpTotal += originalPrice * quantity;
                                    sellingTotal += finalPrice * quantity;

                                    return (
                                        <View key={index} style={styles.orderItemRow}>
                                            <View style={styles.itemImageContainer}>
                                                {(item.productImage || item.id?.images?.[0] || item.id?.image) ? (
                                                    <Image
                                                        source={{ uri: item.productImage || item.id?.images?.[0] || item.id?.image }}
                                                        style={styles.itemImage}
                                                    />
                                                ) : (
                                                    <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                                                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                                            <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                                        </Svg>
                                                    </View>
                                                )}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <MonoText weight="bold" numberOfLines={1} size="s">
                                                    {item.productName || item.item || item.id?.name || 'Product'}
                                                    {item.packSize ? ` (${item.packSize})` : ''}
                                                </MonoText>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                                    <MonoText size="xs" weight="bold" color={colors.primary}>
                                                        ₹{finalPrice}
                                                    </MonoText>
                                                    {finalPrice < originalPrice && (
                                                        <MonoText size="xxs" color={colors.textLight} style={{ textDecorationLine: 'line-through', marginLeft: 6 }}>
                                                            MRP: ₹{originalPrice}
                                                        </MonoText>
                                                    )}
                                                    <MonoText size="xs" color={colors.textLight} style={{ marginLeft: 8 }}>
                                                        × {quantity}
                                                    </MonoText>
                                                </View>
                                            </View>
                                            <MonoText weight="bold" style={{ marginLeft: 8 }}>₹{itemTotal}</MonoText>
                                        </View>
                                    );
                                });

                                const productDiscount = mrpTotal - sellingTotal;
                                const couponDiscount = order?.couponDiscount || 0;
                                const totalSavings = productDiscount + couponDiscount;
                                const taxableBase = (order?.totalPrice || 0) - (order?.deliveryFee || 0) - (order?.sgst || 0) - (order?.cgst || 0);
                                const sgstRate = taxableBase > 0 ? Math.round(((order?.sgst || 0) / taxableBase) * 100) : 0;
                                const cgstRate = taxableBase > 0 ? Math.round(((order?.cgst || 0) / taxableBase) * 100) : 0;

                                return (
                                    <>
                                        {itemsList}
                                        <View style={[styles.divider, { marginVertical: 16 }]} />

                                        {/* Item Total (MRP) */}
                                        <View style={styles.billRow}>
                                            <MonoText size="s" color={colors.textLight}>Item Total (MRP)</MonoText>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                {productDiscount > 0 && (
                                                    <MonoText size="xs" color={colors.textLight} style={{ textDecorationLine: 'line-through', marginRight: 8 }}>
                                                        ₹{mrpTotal.toFixed(2)}
                                                    </MonoText>
                                                )}
                                                <MonoText size="s" weight="bold">₹{sellingTotal.toFixed(2)}</MonoText>
                                            </View>
                                        </View>

                                        {/* Product Discount */}
                                        {productDiscount > 0 && (
                                            <View style={[styles.billRow, { marginTop: 4 }]}>
                                                <MonoText size="s" color={colors.success}>Product Discount</MonoText>
                                                <MonoText size="s" color={colors.success} weight="bold">- ₹{productDiscount.toFixed(2)}</MonoText>
                                            </View>
                                        )}

                                        {/* Coupon Discount */}
                                        {couponDiscount > 0 && (
                                            <View style={[styles.billRow, { marginTop: 4 }]}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <MonoText size="s" color={colors.success}>Coupon</MonoText>
                                                    <View style={styles.couponTag}>
                                                        <MonoText size="xs" color={colors.success} weight="bold">{order?.couponCode}</MonoText>
                                                    </View>
                                                </View>
                                                <MonoText size="s" color={colors.success} weight="bold">- ₹{couponDiscount.toFixed(2)}</MonoText>
                                            </View>
                                        )}

                                        {/* Delivery Fee */}
                                        <View style={[styles.billRow, { marginTop: 4 }]}>
                                            <MonoText size="s" color={colors.textLight}>Delivery Fee</MonoText>
                                            <MonoText size="s" weight="bold" color={order?.deliveryFee === 0 ? colors.success : colors.black}>
                                                {order?.deliveryFee === 0 ? 'FREE' : `₹${order?.deliveryFee}`}
                                            </MonoText>
                                        </View>

                                        {/* Tax Breakdown */}
                                        {(order?.sgst ?? 0) > 0 && (
                                            <View style={[styles.billRow, { marginTop: 4 }]}>
                                                <MonoText size="s" color={colors.textLight}>SGST ({sgstRate}%)</MonoText>
                                                <MonoText size="s" weight="bold">₹{order?.sgst?.toFixed(2)}</MonoText>
                                            </View>
                                        )}

                                        {(order?.cgst ?? 0) > 0 && (
                                            <View style={[styles.billRow, { marginTop: 4 }]}>
                                                <MonoText size="s" color={colors.textLight}>CGST ({cgstRate}%)</MonoText>
                                                <MonoText size="s" weight="bold">₹{order?.cgst?.toFixed(2)}</MonoText>
                                            </View>
                                        )}

                                        <View style={[styles.divider, { marginVertical: 12 }]} />

                                        {/* Total Savings Banner */}
                                        {totalSavings > 0 && (
                                            <View style={styles.savingsBanner}>
                                                <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
                                                    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                </Svg>
                                                <MonoText size="xs" weight="bold" color="#16A34A" style={{ marginLeft: 8 }}>
                                                    You saved ₹{totalSavings.toFixed(2)} on this order!
                                                </MonoText>
                                            </View>
                                        )}

                                        <View style={styles.billRow}>
                                            <MonoText weight="bold" size="l">Total Paid</MonoText>
                                            <MonoText weight="bold" size="l" color={colors.primary}>₹{order?.totalPrice}</MonoText>
                                        </View>

                                        <View style={[styles.billRow, { marginTop: 12 }]}>
                                            <MonoText size="xs" color={colors.textLight}>Order ID</MonoText>
                                            <MonoText size="xs" weight="bold" color={colors.primary}>#{order?.orderId || order?._id?.slice(-6).toUpperCase()}</MonoText>
                                        </View>
                                    </>
                                );
                            })()}

                            {/* Download Invoice Button - Always show */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: colors.black,
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    marginTop: 16
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
                                    <SvgPolyline points="14 2 14 8 20 8" />
                                    <Path d="M12 18v-6" />
                                    <Path d="M9 15l3 3 3-3" />
                                </Svg>
                                <MonoText color={colors.white} weight="bold">Download Invoice</MonoText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </>)}

            </ScrollView>

            {/* Rating Modal */}
            {ratingProduct && (
                <RatingModal
                    visible={ratingModalVisible}
                    onClose={() => {
                        setRatingModalVisible(false);
                        setRatingProduct(null);
                    }}
                    productId={ratingProduct.id}
                    productName={ratingProduct.name}
                    productImage={ratingProduct.image}
                    orderId={orderId}
                    initialRating={ratingProduct.review?.rating}
                    initialTitle={ratingProduct.review?.title}
                    initialComment={ratingProduct.review?.comment}
                    readOnly={!!ratingProduct.review}
                    onSuccess={async () => {
                        try {
                            const reviews = await reviewService.getOrderReviews(orderId);
                            setOrderReviews(reviews);
                            const ratedSet = new Set<string>();
                            reviews.forEach(r => {
                                const pId = typeof r.product === 'string' ? r.product : r.product._id;
                                ratedSet.add(pId);
                            });
                            setRatedProducts(ratedSet);
                        } catch (err) {
                            logger.error('Failed to refetch reviews after success', err);
                        }
                    }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        overflow: 'hidden',
    },
    headerContent: {
        height: HEADER_CONTENT_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    headerTitle: {
        flex: 1,
        marginLeft: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    mapContainer: {
        width: '100%',
        overflow: 'hidden',
    },
    markerMyLoc: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: colors.white,
        ...Platform.select({
            ios: {
                shadowColor: 'black',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    markerBranch: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.black,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: colors.white,
    },
    markerPartner: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FDE047',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: colors.white,
        ...Platform.select({
            ios: {
                shadowColor: 'black',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    etaCard: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 110 : 130,
        right: 16,
        left: 16,
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 12,
            },
            android: {
                elevation: 6,
            },
        }),
        alignItems: 'center',
    },
    closeMapBtn: {
        position: 'absolute',
        top: 8,
        right: 12,
        padding: 4,
    },
    inlineTrackingCard: {
        backgroundColor: colors.white,
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.05,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
            },
            android: {
                elevation: 3,
            },
        }),
    },
    inlineTrackingInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    showMapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
    },
    pulseContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success,
        marginRight: 8,
    },
    glassTabContainer: {
        height: 52,
        borderRadius: 16,
        marginBottom: 24,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
    },
    tabInner: {
        flex: 1,
        flexDirection: 'row',
        padding: 4,
        alignItems: 'center',
    },
    tabItem: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
    },
    tabIndicator: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        left: 4,
        backgroundColor: colors.white,
        borderRadius: 12,
        shadowColor: colors.primary,
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    bottomSheet: {
        flex: 1,
        backgroundColor: 'white',
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        paddingHorizontal: spacing.l,
        marginTop: -20, // Overlap map slightly
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: -2 }, // Bottom sheet usually needs negative Y or 0
            },
            android: {
                elevation: 10,
            },
        }),
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        marginBottom: 20,
    },
    partnerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 16,
        marginBottom: 20,
    },
    partnerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E0F2FE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    callBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginBottom: 20,
    },
    timeline: {
        marginLeft: 10,
    },
    timelineLine: {
        position: 'absolute',
        left: 9,
        top: 0,
        bottom: 20,
        width: 2,
        backgroundColor: '#E2E8F0',
    },
    stepContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    stepDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    stepDotActive: {
        borderColor: colors.primary,
        backgroundColor: 'white',
    },
    stepDotCompleted: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    stepDotPending: {
        borderColor: '#E2E8F0',
    },
    stepContent: {
        marginLeft: 16,
        flex: 1,
    },
    section: {
        marginBottom: 20,
    },
    detailsCard: {
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    orderItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    itemImageContainer: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        marginRight: 12,
        overflow: 'hidden',
    },
    itemImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    itemImagePlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    billRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryCard: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#F0FDF4',
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#DCFCE7',
    },
    summaryItem: {
        alignItems: 'center',
    },
    confirmBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOpacity: 0.3,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
            },
            android: {
                elevation: 4,
            },
        }),
    },
    awaitingBanner: {
        backgroundColor: colors.success,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    rateSection: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    rateItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    rateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.primary}15`,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    ratedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
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
        marginVertical: 12,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
});
