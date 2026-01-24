import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, StyleSheet, TouchableOpacity, Dimensions, KeyboardAvoidingView,
    Platform, Alert, TextInput, ActivityIndicator, Linking, FlatList,
    Image, StatusBar, ScrollView, PermissionsAndroid
} from 'react-native';
import MapView, { PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import GetLocation from 'react-native-get-location';
import axios from 'axios';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { MonoText } from '../../../components/shared/MonoText';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { addressService } from '../../../services/customer/address.service';
import { branchService } from '../../../services/customer/branch.service';
import { useBranchStore } from '../../../store/branch.store';
import { SkeletonItem } from '../../../components/shared/SkeletonLoader';
import { ENV } from '../../../utils/env';
import { logger } from '../../../utils/logger';

const { width, height } = Dimensions.get('window');

// Flow states
type FlowState = 'initial' | 'map' | 'confirm' | 'form' | 'search';

// Place prediction from Google Places API
interface PlacePrediction {
    place_id: string;
    description: string;
    structured_formatting: {
        main_text: string;
        secondary_text: string;
    };
}

// Address label options
const LABEL_OPTIONS = [
    { key: 'Home', icon: 'home', label: 'Home' },
    { key: 'Office', icon: 'briefcase', label: 'Office' },
    { key: 'Friends and Family', icon: 'users', label: 'Friends and Family' },
    { key: 'Other', icon: 'map-pin', label: 'Other' },
] as const;

// Default initial region
const INITIAL_REGION = {
    latitude: 26.489181,
    longitude: 80.275209,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
};

export const AddAddressScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const editAddress = route.params?.editAddress;
    const fromCheckout = route.params?.fromCheckout;
    const isQuickSelect = route.params?.isQuickSelect;
    const isEditMode = !!editAddress;
    const insets = useSafeAreaInsets();

    const mapRef = useRef<MapView>(null);

    // Flow state - skip initial if editing
    const [flowState, setFlowState] = useState<FlowState>(isEditMode ? 'form' : 'initial');

    // Location states
    const [region, setRegion] = useState(editAddress?.latitude && editAddress?.longitude ? {
        latitude: editAddress.latitude,
        longitude: editAddress.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
    } : INITIAL_REGION);
    const [markerCoord, setMarkerCoord] = useState(editAddress?.latitude && editAddress?.longitude ? {
        latitude: editAddress.latitude,
        longitude: editAddress.longitude
    } : { latitude: INITIAL_REGION.latitude, longitude: INITIAL_REGION.longitude });
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [isFetchingAddress, setIsFetchingAddress] = useState(false);

    // Extracted address info
    const [extractedAddress, setExtractedAddress] = useState({
        name: editAddress?.addressLine1 || '',
        fullAddress: editAddress ? `${editAddress.addressLine1}, ${editAddress.city}, ${editAddress.state}` : '',
    });

    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PlacePrediction[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Form states
    const [houseFlat, setHouseFlat] = useState(editAddress?.addressLine1 || '');
    const [apartmentArea, setApartmentArea] = useState(editAddress?.addressLine2 || '');
    const [directions, setDirections] = useState(editAddress?.directions || '');
    const [receiverName, setReceiverName] = useState(editAddress?.receiverName || '');
    const [receiverPhone, setReceiverPhone] = useState(editAddress?.receiverPhone || '');
    const [label, setLabel] = useState<'Home' | 'Office' | 'Friends and Family' | 'Other'>(editAddress?.label || 'Home');
    const [customLabel, setCustomLabel] = useState(editAddress?.labelCustom || '');
    const [city, setCity] = useState(editAddress?.city || '');
    const [state, setState] = useState(editAddress?.state || '');
    const [zipCode, setZipCode] = useState(editAddress?.zipCode || '');
    const [saving, setSaving] = useState(false);
    const [existingAddresses, setExistingAddresses] = useState<any[]>([]);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const selectedPlaceId = route.params?.selectedPlaceId;

    // Auto-check location on mount
    useEffect(() => {
        if (!isEditMode && flowState === 'initial') {
            checkLocationAutomatically();
        }
    }, []);

    const checkLocationAutomatically = async () => {
        try {
            // Silently check if location is available
            const location = await GetLocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 5000,
            });

            if (location) {
                const { latitude, longitude } = location;
                setCurrentLocation({ latitude, longitude });
                const newRegion = {
                    latitude,
                    longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                };
                setRegion(newRegion);
                setMarkerCoord({ latitude, longitude });
                setFlowState('map');

                // Animate map and fetch address
                setTimeout(() => {
                    mapRef.current?.animateToRegion(newRegion, 500);
                    fetchAddressFromCoords(latitude, longitude);
                }, 100);
            }
        } catch (error) {
            // Silently fail, user can still click manually
            logger.debug('Auto-location check failed or timed out', error);
        }
    };

    // Calculate distance from current location
    const distanceFromCurrent = useCallback(() => {
        if (!currentLocation) return null;
        const R = 6371e3; // Earth's radius in meters
        const φ1 = currentLocation.latitude * Math.PI / 180;
        const φ2 = markerCoord.latitude * Math.PI / 180;
        const Δφ = (markerCoord.latitude - currentLocation.latitude) * Math.PI / 180;
        const Δλ = (markerCoord.longitude - currentLocation.longitude) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance; // in meters
    }, [currentLocation, markerCoord]);

    // Fetch address from coordinates
    const fetchAddressFromCoords = useCallback(async (lat: number, lng: number) => {
        setIsFetchingAddress(true);
        try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${ENV.GOOGLE_MAPS_API_KEY}`;
            const res = await axios.get(url);

            if (res.data.status === 'OK' && res.data.results?.length > 0) {
                const result = res.data.results[0];
                const components = result.address_components;

                let streetNumber = '';
                let subpremise = '';
                let premise = '';
                let route = '';
                let sublocality = '';
                let neighborhood = '';
                let locality = '';
                let city = '';
                let state = '';
                let zipCode = '';
                let poi = '';

                components.forEach((c: any) => {
                    if (c.types.includes('street_number')) streetNumber = c.long_name;
                    if (c.types.includes('subpremise')) subpremise = c.long_name;
                    if (c.types.includes('premise')) premise = c.long_name;
                    if (c.types.includes('route')) route = c.long_name;
                    if (c.types.includes('sublocality_level_1') || c.types.includes('sublocality')) sublocality = c.long_name;
                    if (c.types.includes('neighborhood')) neighborhood = c.long_name;
                    if (c.types.includes('locality')) city = c.long_name;
                    if (c.types.includes('administrative_area_level_1')) state = c.long_name;
                    if (c.types.includes('postal_code')) zipCode = c.long_name;
                    if (c.types.includes('point_of_interest') || c.types.includes('establishment')) poi = c.long_name;
                });

                // Construct Prefilled Values
                // 1. House/Flat: Combine Flat/Suite No and Street/Building No
                let prefilledHouse = [subpremise, streetNumber].filter(Boolean).join(', ');

                // Heuristic: If house number is empty but premise starts with digit, use premise as house number
                let premiseUsedInHouse = false;
                if (!prefilledHouse && premise && /^\d/.test(premise)) {
                    prefilledHouse = premise;
                    premiseUsedInHouse = true;
                }

                // 2. Apartment/Area: Combine Premise/POI, Street and Sublocality
                const areaParts = [];
                // Only use premise in area if not used in house
                if (premise && !premiseUsedInHouse) areaParts.push(premise);
                // Use POI if distinct from premise
                if (poi && poi !== premise) areaParts.push(poi);

                if (route) areaParts.push(route);
                if (neighborhood) areaParts.push(neighborhood);
                if (sublocality) areaParts.push(sublocality);

                const prefilledArea = areaParts.filter(Boolean).join(', ');

                // Best name for location header
                const placeName = premise || poi || sublocality || neighborhood || route || city;

                setExtractedAddress({
                    name: placeName,
                    fullAddress: result.formatted_address,
                });

                // Update Form States
                setHouseFlat(prefilledHouse);
                setApartmentArea(prefilledArea);
                setCity(city);
                setState(state);
                setZipCode(zipCode);
            }
        } catch (error: any) {
            logger.error('Geocoding error', error);
        } finally {
            setIsFetchingAddress(false);
        }
    }, []);

    // Handle map region change
    const onRegionChangeComplete = (r: Region) => {
        setRegion(r);
        setMarkerCoord({ latitude: r.latitude, longitude: r.longitude });
        if (flowState === 'map' || flowState === 'confirm') {
            fetchAddressFromCoords(r.latitude, r.longitude);
        }
    };

    // Request location permission and get current location
    const handleTurnOnLocation = async () => {
        setIsFetchingLocation(true);
        try {
            // Android: Check existing permission first, then request if needed
            if (Platform.OS === 'android') {
                // First check if permission already granted
                const hasPermission = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                );

                if (!hasPermission) {

                    // Wrapper with timeout - sometimes request() hangs on permanently denied permissions
                    const requestWithTimeout = (): Promise<string> => {
                        return new Promise((resolve) => {
                            const timeoutId = setTimeout(() => {
                                resolve(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
                            }, 5000); // 5 second timeout

                            PermissionsAndroid.request(
                                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                                {
                                    title: 'Location Permission',
                                    message: 'TechMart needs your location to find nearby stores and ensure accurate delivery.',
                                    buttonPositive: 'Allow',
                                    buttonNegative: 'Deny',
                                }
                            ).then((result) => {
                                clearTimeout(timeoutId);
                                resolve(result);
                            }).catch(() => {
                                clearTimeout(timeoutId);
                                resolve(PermissionsAndroid.RESULTS.DENIED);
                            });
                        });
                    };

                    const granted = await requestWithTimeout();

                    if (granted === PermissionsAndroid.RESULTS.DENIED) {
                        setIsFetchingLocation(false);
                        Alert.alert(
                            'Location Permission Denied',
                            'We need your location to show available stores in your area.',
                            [
                                { text: 'Try Again', onPress: () => handleTurnOnLocation() },
                                { text: 'Search Manually', onPress: () => setFlowState('search') }
                            ]
                        );
                        return;
                    }

                    if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                        setIsFetchingLocation(false);
                        Alert.alert(
                            'Permission Required',
                            'Location permission is disabled. Please enable it in Settings to use this feature.',
                            [
                                { text: 'Search Manually', onPress: () => setFlowState('search') },
                                { text: 'Open Settings', onPress: () => Linking.openSettings() },
                            ]
                        );
                        return;
                    }

                    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                        setIsFetchingLocation(false);
                        return;
                    }
                }
            }

            const location = await GetLocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 15000,
            });

            const { latitude, longitude } = location;
            setCurrentLocation({ latitude, longitude });

            const newRegion = {
                latitude,
                longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            };
            setRegion(newRegion);
            setMarkerCoord({ latitude, longitude });

            // Transition to map state
            setFlowState('map');

            // Animate map after state change
            setTimeout(() => {
                mapRef.current?.animateToRegion(newRegion, 500);
                fetchAddressFromCoords(latitude, longitude);
                setIsFetchingLocation(false);
            }, 100);
        } catch (error: any) {
            logger.warn('Location error', error);
            setIsFetchingLocation(false);

            // Handle timeout and other errors
            if (error.code === 'CANCELLED') return;

            Alert.alert(
                'Location Error',
                'Could not fetch your location. Please ensure GPS is enabled and try again.',
                [
                    { text: 'Try Again', onPress: () => handleTurnOnLocation() },
                    { text: 'Search Manually', onPress: () => setFlowState('search') },
                    { text: 'Settings', onPress: () => Linking.openSettings() }
                ]
            );
        }
    };

    // Handle current location button
    const handleCurrentLocation = async () => {
        setIsFetchingLocation(true);
        try {
            // Android Permission Check for current location button too
            if (Platform.OS === 'android') {
                const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

                if (!hasPermission) {

                    // Wrapper with timeout - sometimes request() hangs on permanently denied permissions
                    const requestWithTimeout = (): Promise<string> => {
                        return new Promise((resolve) => {
                            const timeoutId = setTimeout(() => {
                                resolve(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
                            }, 5000);

                            PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
                                .then((result) => {
                                    clearTimeout(timeoutId);
                                    resolve(result);
                                })
                                .catch(() => {
                                    clearTimeout(timeoutId);
                                    resolve(PermissionsAndroid.RESULTS.DENIED);
                                });
                        });
                    };

                    const status = await requestWithTimeout();

                    if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                        setIsFetchingLocation(false);
                        Alert.alert(
                            'Permission Required',
                            'Location permission is disabled. Please enable it in Settings.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Open Settings', onPress: () => Linking.openSettings() },
                            ]
                        );
                        return;
                    }

                    if (status !== PermissionsAndroid.RESULTS.GRANTED) {
                        setIsFetchingLocation(false);
                        return;
                    }
                }
            }

            const location = await GetLocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 15000,
            });

            const { latitude, longitude } = location;
            setCurrentLocation({ latitude, longitude });
            const newRegion = {
                latitude,
                longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            };
            mapRef.current?.animateToRegion(newRegion, 1000);
            setIsFetchingLocation(false);
        } catch (err) {
            logger.warn('Location fetch error', err);
            setIsFetchingLocation(false);
            Alert.alert('Location Error', 'Could not fetch current location. Please ensure GPS is enabled.');
        }
    };

    // Google Places Autocomplete search
    const handleSearch = useCallback(async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${ENV.GOOGLE_MAPS_API_KEY}&components=country:in&types=geocode`;
            const res = await axios.get(url);

            if (res.data.status === 'OK') {
                setSearchResults(res.data.predictions || []);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            logger.error('Places search error', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Select place from search results
    const handleSelectPlace = async (placeId: string) => {
        try {
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,name&key=${ENV.GOOGLE_MAPS_API_KEY}`;
            const res = await axios.get(url);

            if (res.data.status === 'OK' && res.data.result) {
                const { geometry, formatted_address, name } = res.data.result;
                const { lat, lng } = geometry.location;

                setMarkerCoord({ latitude: lat, longitude: lng });
                setExtractedAddress({
                    name: name || formatted_address.split(',')[0],
                    fullAddress: formatted_address,
                });

                const newRegion = {
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                };
                setRegion(newRegion);

                // Clear search and go to map
                setSearchQuery('');
                setSearchResults([]);
                setFlowState('map');

                setTimeout(() => {
                    mapRef.current?.animateToRegion(newRegion, 500);
                    fetchAddressFromCoords(lat, lng);
                }, 100);
            }
        } catch (error) {
            logger.error('Place details error', error);
        }
    };

    // Handle place selection from search results
    const handleSearchSelect = useCallback(async (placeId: string) => {
        setFlowState('map');
        setIsFetchingAddress(true);
        try {
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${ENV.GOOGLE_MAPS_API_KEY}`;
            const res = await axios.get(url);

            if (res.data.status === 'OK') {
                const { lat, lng } = res.data.result.geometry.location;
                const newRegion = {
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                };
                setRegion(newRegion);
                setMarkerCoord({ latitude: lat, longitude: lng });

                // Slight delay to ensure map is ready
                setTimeout(() => {
                    mapRef.current?.animateToRegion(newRegion, 500);
                    fetchAddressFromCoords(lat, lng);
                }, 100);
            }
        } catch (error) {
            logger.error('Place details error', error);
        } finally {
            setIsFetchingAddress(false);
        }
    }, [fetchAddressFromCoords]);

    // Handle selectedPlaceId from navigation params (e.g., from modal)
    useEffect(() => {
        if (selectedPlaceId) {
            handleSearchSelect(selectedPlaceId);
            // Clear the param after handling to prevent re-triggering if the screen re-renders
            navigation.setParams({ selectedPlaceId: undefined });
        }
    }, [selectedPlaceId, handleSearchSelect, navigation]);

    // Confirm location and go to form
    const handleConfirmProceed = async () => {
        if (isQuickSelect) {
            setIsFetchingAddress(true);
            try {
                const branch = await branchService.getNearestBranch(markerCoord.latitude, markerCoord.longitude);
                useBranchStore.getState().setCurrentBranch(branch, true);

                navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' }],
                });
            } catch (error) {
                logger.error('Quick select branch error', error);
                Alert.alert('Error', 'Could not find a branch for this location.');
            } finally {
                setIsFetchingAddress(false);
            }
            return;
        }
        setFlowState('form');
    };

    // Save address
    const handleSave = async () => {
        if (!houseFlat.trim()) {
            Alert.alert('Missing Field', 'Please enter house/flat/block number.');
            return;
        }

        // Require receiver name for Friends and Family / Other
        if ((label === 'Friends and Family' || label === 'Other') && !receiverName.trim()) {
            Alert.alert('Missing Field', 'Please enter receiver name.');
            return;
        }

        // Check for existing Home/Office address (only for new addresses, not edit)
        if (!isEditMode && (label === 'Home' || label === 'Office')) {
            try {
                const addresses = await addressService.getAddresses();
                const existingLabel = addresses.find(addr => addr.label === label);
                if (existingLabel) {
                    Alert.alert(
                        'Address Exists',
                        `You already have a ${label} address saved. Please use a different label or edit the existing address.`
                    );
                    return;
                }
            } catch (error) {
                // Continue if check fails
            }
        }

        setSaving(true);
        try {
            const addressData = {
                addressLine1: houseFlat,
                addressLine2: apartmentArea || extractedAddress.name,
                city,
                state,
                zipCode,
                isDefault: false,
                latitude: markerCoord.latitude,
                longitude: markerCoord.longitude,
                label,
                labelCustom: label === 'Other' ? customLabel : '',
                receiverName: (label === 'Friends and Family' || label === 'Other') ? receiverName : '',
                receiverPhone: (label === 'Friends and Family' || label === 'Other') ? receiverPhone : '',
                directions,
            };

            if (isEditMode) {
                await addressService.updateAddress(editAddress._id, addressData);
            } else {
                await addressService.addAddress(addressData);
            }

            if (fromCheckout) {
                navigation.reset({
                    index: 1,
                    routes: [
                        { name: 'MainTabs' },
                        { name: 'Checkout', params: { showAddressModal: true } }
                    ],
                });
            } else {
                navigation.goBack();
            }
        } catch (error) {
            logger.error('Failed to save address', error);
            Alert.alert('Error', 'Failed to save address. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Render Initial State
    const renderInitialState = () => (
        <View style={styles.initialContainer}>
            {/* Blurred Map Background */}
            <MapView
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_DEFAULT}
                initialRegion={INITIAL_REGION}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
            />
            <View style={styles.mapBlur} />

            {/* Back Button */}
            <TouchableOpacity
                style={[styles.initialBackBtn, { top: insets.top + 12 }]}
                onPress={() => navigation.goBack()}
            >
                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                    <Path d="M19 12H5M12 19l-7-7 7-7" />
                </Svg>
            </TouchableOpacity>

            {/* Bottom Panel */}
            <View style={[styles.initialPanel, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <View style={styles.initialPanelContent}>
                    <View style={styles.initialTextSection}>
                        <MonoText size="xl" weight="bold" style={{ lineHeight: 28 }}>Get the</MonoText>
                        <MonoText size="xl" weight="bold" style={{ lineHeight: 28 }}>fastest delivery</MonoText>
                    </View>

                    {/* Illustration Placeholder */}
                    <View style={styles.illustrationContainer}>
                        <Svg width="80" height="80" viewBox="0 0 80 80">
                            {/* Simple map illustration */}
                            <Path d="M10 60 L70 60" stroke="#E5D4B8" strokeWidth="8" strokeLinecap="round" />
                            <Path d="M20 50 L60 50" stroke="#D4C4A8" strokeWidth="6" strokeLinecap="round" />
                            <Circle cx="40" cy="30" r="15" fill={colors.primary} />
                            <Circle cx="40" cy="27" r="6" fill="white" />
                            <Path d="M40 45 L40 55" stroke={colors.primary} strokeWidth="3" />
                        </Svg>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.turnOnLocationBtn}
                    onPress={handleTurnOnLocation}
                    disabled={isFetchingLocation}
                >
                    {isFetchingLocation ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <MonoText weight="bold" color="white">Turn on device location</MonoText>
                    )}
                </TouchableOpacity>

                {/* Search Bar */}
                <TouchableOpacity
                    style={styles.searchBarInitial}
                    onPress={() => setFlowState('search')}
                >
                    <MonoText color={colors.textLight}>Search an area or address</MonoText>
                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                        <Circle cx="11" cy="11" r="8" />
                        <Path d="M21 21l-4.35-4.35" />
                    </Svg>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Render Search State
    const renderSearchState = () => (
        <SafeAreaView style={styles.searchContainer} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.searchHeader}>
                <TouchableOpacity onPress={() => setFlowState(flowState === 'search' && currentLocation ? 'map' : 'initial')} style={styles.searchBackBtn}>
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2">
                        <Path d="M19 12H5M12 19l-7-7 7-7" />
                    </Svg>
                </TouchableOpacity>
                <MonoText size="l" weight="bold" style={{ flex: 1 }}>Select Your Location</MonoText>
            </View>

            {/* Search Input */}
            <View style={styles.searchInputContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search location..."
                    placeholderTextColor={colors.textLight}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoFocus
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                            <Line x1="18" y1="6" x2="6" y2="18" />
                            <Line x1="6" y1="6" x2="18" y2="18" />
                        </Svg>
                    </TouchableOpacity>
                )}
            </View>

            {/* Results */}
            {isSearching ? (
                <View style={styles.searchResultsContainer}>
                    <View style={{ height: 20, width: 100, marginBottom: 16 }}>
                        <SkeletonItem width="100%" height={16} borderRadius={4} />
                    </View>
                    {[1, 2, 3].map(i => (
                        <View key={i} style={styles.searchResultItem}>
                            <View style={styles.searchResultIcon}>
                                <SkeletonItem width={20} height={20} borderRadius={10} />
                            </View>
                            <View style={styles.searchResultText}>
                                <SkeletonItem width="60%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                                <SkeletonItem width="80%" height={12} borderRadius={4} />
                            </View>
                        </View>
                    ))}
                </View>
            ) : searchResults.length > 0 ? (
                <View style={styles.searchResultsContainer}>
                    <MonoText size="xs" color={colors.textLight} style={styles.searchResultsLabel}>SEARCH RESULTS</MonoText>
                    <FlatList
                        data={searchResults}
                        keyExtractor={(item) => item.place_id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.searchResultItem}
                                onPress={() => handleSelectPlace(item.place_id)}
                            >
                                <View style={styles.searchResultIcon}>
                                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                        <Circle cx="12" cy="12" r="10" />
                                        <Path d="M12 6v6l4 2" />
                                    </Svg>
                                </View>
                                <View style={styles.searchResultText}>
                                    <MonoText weight="bold">{item.structured_formatting.main_text}</MonoText>
                                    <MonoText size="s" color={colors.textLight} numberOfLines={1}>
                                        {item.structured_formatting.secondary_text}
                                    </MonoText>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            ) : null}
        </SafeAreaView>
    );

    // Render Map State (and Confirm state)
    const renderMapState = () => {
        const isConfirmState = flowState === 'confirm';
        const distance = distanceFromCurrent();
        const distanceText = distance ? (distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`) : null;

        return (
            <View style={styles.mapContainer}>
                {/* Map */}
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_DEFAULT}
                    style={StyleSheet.absoluteFill}
                    initialRegion={region}
                    onRegionChangeComplete={onRegionChangeComplete}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                    mapType="standard"
                />

                {/* Center Marker */}
                <View style={styles.centerMarker} pointerEvents="none">
                    {isFetchingAddress ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Svg width="48" height="56" viewBox="0 0 48 56">
                            {/* Pin shadow */}
                            <Path d="M24 52 C24 52 8 36 8 20 C8 10 15 4 24 4 C33 4 40 10 40 20 C40 36 24 52 24 52Z" fill="#00000020" />
                            {/* Pin body */}
                            <Path d="M24 48 C24 48 8 32 8 18 C8 9 15 2 24 2 C33 2 40 9 40 18 C40 32 24 48 24 48Z" fill={colors.primary} />
                            {/* Inner circle */}
                            <Circle cx="24" cy="18" r="8" fill="white" />
                        </Svg>
                    )}
                </View>

                {/* Header with Search */}
                <View style={[styles.mapHeader, { paddingTop: insets.top + 8 }]}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.mapBackBtn}
                    >
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                            <Path d="M19 12H5M12 19l-7-7 7-7" />
                        </Svg>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.mapSearchBar}
                        onPress={() => setFlowState('search')}
                    >
                        <MonoText color={colors.textLight}>Search an area or address</MonoText>
                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                            <Circle cx="11" cy="11" r="8" />
                            <Path d="M21 21l-4.35-4.35" />
                        </Svg>
                    </TouchableOpacity>
                </View>

                {/* Current Location Button */}
                <TouchableOpacity
                    style={styles.currentLocationPill}
                    onPress={handleCurrentLocation}
                    disabled={isFetchingLocation}
                >
                    {isFetchingLocation ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                <Circle cx="12" cy="12" r="4" fill={colors.primary} />
                                <Path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                            </Svg>
                            <MonoText size="s" style={{ marginLeft: 6 }}>Current location</MonoText>
                        </>
                    )}
                </TouchableOpacity>

                {/* Bottom Sheet */}
                <View style={[styles.mapBottomSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    {isConfirmState ? (
                        <>
                            <MonoText size="s" color={colors.textLight}>Order will be delivered here</MonoText>
                            <View style={styles.addressRow}>
                                <Svg width="24" height="24" viewBox="0 0 24 24" fill={colors.primary}>
                                    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                                    <Circle cx="12" cy="9" r="2.5" fill="white" />
                                </Svg>
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <MonoText size="l" weight="bold">{extractedAddress.name || 'Selected Location'}</MonoText>
                                    <MonoText size="s" color={colors.textLight} numberOfLines={2}>{extractedAddress.fullAddress}</MonoText>
                                </View>
                            </View>
                            {distanceText && (
                                <View style={styles.distanceBadge}>
                                    <MonoText size="s" color="#D97706">This is {distanceText} away from your current location</MonoText>
                                </View>
                            )}
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmProceed}>
                                <MonoText weight="bold" color="white" size="m">Confirm & proceed</MonoText>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <MonoText size="s" color={colors.textLight}>Place the pin at exact delivery location</MonoText>
                            <View style={styles.addressRow}>
                                <Svg width="24" height="24" viewBox="0 0 24 24" fill={colors.primary}>
                                    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                                    <Circle cx="12" cy="9" r="2.5" fill="white" />
                                </Svg>
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <MonoText size="l" weight="bold">{extractedAddress.name || 'Move map to select'}</MonoText>
                                    <MonoText size="s" color={colors.textLight} numberOfLines={2}>{extractedAddress.fullAddress}</MonoText>
                                </View>
                            </View>
                            <View style={styles.zoomHint}>
                                <MonoText size="s" color="#DC2626">Zoom in to place the pin at exact delivery location</MonoText>
                            </View>
                            <TouchableOpacity
                                style={styles.confirmBtn}
                                onPress={() => setFlowState('confirm')}
                            >
                                <MonoText weight="bold" color="white" size="m">Confirm Location</MonoText>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    };

    // Render Form State
    const renderFormState = () => (
        <KeyboardAvoidingView
            style={styles.formContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Map Preview - Fixed at top */}
            <View style={styles.formMapPreview}>
                <MapView
                    style={StyleSheet.absoluteFill}
                    provider={PROVIDER_DEFAULT}
                    region={region}
                    scrollEnabled={false}
                    zoomEnabled={false}
                />
                <TouchableOpacity
                    style={[styles.formBackBtn, { top: insets.top + 8 }]}
                    onPress={() => setFlowState('confirm')}
                >
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                        <Path d="M19 12H5M12 19l-7-7 7-7" />
                    </Svg>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.formScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >

                {/* Address Header */}
                <View style={styles.formAddressHeader}>
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill={colors.primary}>
                        <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        <Circle cx="12" cy="9" r="2.5" fill="white" />
                    </Svg>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <MonoText size="l" weight="bold">{extractedAddress.name || 'Selected Location'}</MonoText>
                        <MonoText size="s" color={colors.textLight} numberOfLines={2}>{extractedAddress.fullAddress}</MonoText>
                    </View>
                </View>

                {/* Form Fields */}
                <View style={styles.formFields}>
                    {/* Info Banner */}
                    <View style={styles.infoBanner}>
                        <MonoText size="s" color={colors.primary}>
                            A detailed address will help our Delivery Partner reach your doorstep easily
                        </MonoText>
                    </View>

                    {/* House/Flat */}
                    <View style={styles.formField}>
                        <MonoText
                            size="xs"
                            color={focusedField === 'houseFlat' ? colors.primary : colors.textLight}
                            style={styles.formLabel}
                        >
                            HOUSE / FLAT / BLOCK NO. *
                        </MonoText>
                        <TextInput
                            style={[
                                styles.formInput,
                                focusedField === 'houseFlat' && styles.formInputFocused
                            ]}
                            value={houseFlat}
                            onChangeText={setHouseFlat}
                            placeholder="Enter house/flat/block number"
                            placeholderTextColor="#9CA3AF"
                            onFocus={() => setFocusedField('houseFlat')}
                            onBlur={() => setFocusedField(null)}
                        />
                    </View>

                    {/* Apartment/Area */}
                    <View style={styles.formField}>
                        <MonoText
                            size="xs"
                            color={focusedField === 'apartmentArea' ? colors.primary : colors.textLight}
                            style={styles.formLabel}
                        >
                            APARTMENT / ROAD / AREA (RECOMMENDED)
                        </MonoText>
                        <TextInput
                            style={[
                                styles.formInput,
                                focusedField === 'apartmentArea' && styles.formInputFocused
                            ]}
                            value={apartmentArea}
                            onChangeText={setApartmentArea}
                            placeholder="Enter apartment/road/area"
                            placeholderTextColor="#9CA3AF"
                            onFocus={() => setFocusedField('apartmentArea')}
                            onBlur={() => setFocusedField(null)}
                        />
                    </View>

                    {/* Directions */}
                    <View style={styles.formField}>
                        <MonoText
                            size="xs"
                            color={focusedField === 'directions' ? colors.primary : colors.textLight}
                            style={styles.formLabel}
                        >
                            DIRECTIONS TO REACH (OPTIONAL)
                        </MonoText>
                        <TextInput
                            style={[
                                styles.formInput,
                                styles.formTextarea,
                                focusedField === 'directions' && styles.formInputFocused
                            ]}
                            value={directions}
                            onChangeText={setDirections}
                            placeholder="e.g. Ring the bell on the red gate"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            numberOfLines={3}
                            maxLength={200}
                            onFocus={() => setFocusedField('directions')}
                            onBlur={() => setFocusedField(null)}
                        />
                        <MonoText size="xs" color={colors.textLight} style={{ marginTop: 4 }}>{directions.length}/200</MonoText>
                    </View>

                    {/* Label Selector */}
                    <View style={styles.formField}>
                        <MonoText size="xs" color={colors.textLight} style={styles.formLabel}>SAVE AS</MonoText>
                        <View style={styles.labelGrid}>
                            {LABEL_OPTIONS.map((option) => {
                                const isDisabled = (option.key === 'Home' || option.key === 'Office') &&
                                    existingAddresses.some(addr => addr.label === option.key && addr._id !== editAddress?._id);
                                return (
                                    <TouchableOpacity
                                        key={option.key}
                                        style={[
                                            styles.labelChip,
                                            label === option.key && styles.labelChipActive,
                                            isDisabled && styles.labelChipDisabled
                                        ]}
                                        onPress={() => !isDisabled && setLabel(option.key)}
                                        disabled={isDisabled}
                                    >
                                        <View style={[
                                            styles.labelIcon,
                                            label === option.key && styles.labelIconActive
                                        ]}>
                                            {option.key === 'Home' && (
                                                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={label === option.key ? colors.primary : (isDisabled ? '#9CA3AF' : colors.textLight)} strokeWidth="2">
                                                    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                </Svg>
                                            )}
                                            {option.key === 'Office' && (
                                                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={label === option.key ? colors.primary : (isDisabled ? '#9CA3AF' : colors.textLight)} strokeWidth="2">
                                                    <Path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                                                    <Path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                                </Svg>
                                            )}
                                            {option.key === 'Friends and Family' && (
                                                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={label === option.key ? colors.primary : colors.textLight} strokeWidth="2">
                                                    <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                    <Circle cx="9" cy="7" r="4" />
                                                    <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                                    <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                                </Svg>
                                            )}
                                            {option.key === 'Other' && (
                                                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={label === option.key ? colors.primary : colors.textLight} strokeWidth="2">
                                                    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                    <Circle cx="12" cy="10" r="3" />
                                                </Svg>
                                            )}
                                        </View>
                                        <MonoText
                                            size="s"
                                            color={label === option.key ? colors.primary : (isDisabled ? '#9CA3AF' : colors.text)}
                                        >
                                            {option.label}
                                        </MonoText>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Custom Label Input for Other */}
                    {label === 'Other' && (
                        <View style={styles.formField}>
                            <MonoText
                                size="xs"
                                color={focusedField === 'customLabel' ? colors.primary : colors.textLight}
                                style={styles.formLabel}
                            >
                                SAVE AS (CUSTOM LABEL) *
                            </MonoText>
                            <TextInput
                                style={[
                                    styles.formInput,
                                    focusedField === 'customLabel' && styles.formInputFocused
                                ]}
                                value={customLabel}
                                onChangeText={setCustomLabel}
                                placeholder="e.g. Gym, Hospital, etc."
                                placeholderTextColor="#9CA3AF"
                                onFocus={() => setFocusedField('customLabel')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>
                    )}

                    {/* Receiver Name - Show for Friends and Family / Other */}
                    {(label === 'Friends and Family' || label === 'Other') && (
                        <>
                            <View style={styles.formField}>
                                <MonoText
                                    size="xs"
                                    color={focusedField === 'receiverName' ? colors.primary : colors.textLight}
                                    style={styles.formLabel}
                                >
                                    RECEIVER NAME *
                                </MonoText>
                                <TextInput
                                    style={[
                                        styles.formInput,
                                        focusedField === 'receiverName' && styles.formInputFocused
                                    ]}
                                    value={receiverName}
                                    onChangeText={setReceiverName}
                                    placeholder="Enter receiver's name"
                                    placeholderTextColor="#9CA3AF"
                                    onFocus={() => setFocusedField('receiverName')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>

                            <View style={styles.formField}>
                                <MonoText
                                    size="xs"
                                    color={focusedField === 'receiverPhone' ? colors.primary : colors.textLight}
                                    style={styles.formLabel}
                                >
                                    RECEIVER PHONE (OPTIONAL)
                                </MonoText>
                                <View style={[
                                    styles.phoneInputContainer,
                                    focusedField === 'receiverPhone' && styles.phoneInputContainerFocused
                                ]}>
                                    <View style={styles.phonePrefix}>
                                        <MonoText size="m" color={colors.text}>+91</MonoText>
                                    </View>
                                    <TextInput
                                        style={styles.phoneInput}
                                        value={receiverPhone}
                                        onChangeText={(text) => {
                                            const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                                            setReceiverPhone(cleaned);
                                        }}
                                        placeholder="10 digit mobile number"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                        onFocus={() => setFocusedField('receiverPhone')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>
                                <View style={styles.phoneHint}>
                                    <MonoText size="xs" color="#6B7280">
                                        If this number is not reachable, we will call your registered number.
                                    </MonoText>
                                </View>
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Save Button */}
            {(() => {
                // Determine button state
                let buttonText = '';
                let isEnabled = false;

                if (!houseFlat.trim()) {
                    buttonText = 'ENTER HOUSE / FLAT / BLOCK NO.';
                } else if ((label === 'Friends and Family' || label === 'Other') && !receiverName.trim()) {
                    buttonText = 'ENTER RECEIVER NAME';
                } else if (label === 'Other' && !customLabel.trim()) {
                    buttonText = 'ENTER CUSTOM LABEL';
                } else {
                    buttonText = isEditMode ? 'UPDATE ADDRESS' : 'ADD ADDRESS';
                    isEnabled = true;
                }

                return (
                    <View style={[styles.formFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                        <TouchableOpacity
                            style={[styles.saveBtn, !isEnabled && styles.saveBtnDisabled]}
                            onPress={handleSave}
                            disabled={saving || !isEnabled}
                        >
                            {saving ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <MonoText weight="bold" color="white" size="m">
                                    {buttonText}
                                </MonoText>
                            )}
                        </TouchableOpacity>
                    </View>
                );
            })()}
        </KeyboardAvoidingView>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle={flowState === 'initial' ? 'dark-content' : 'dark-content'} />
            {flowState === 'initial' && renderInitialState()}
            {flowState === 'search' && renderSearchState()}
            {(flowState === 'map' || flowState === 'confirm') && renderMapState()}
            {flowState === 'form' && renderFormState()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    // Initial State
    initialContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    initialBackBtn: {
        position: 'absolute',
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    mapBlur: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
        flex: 1,
    },
    initialPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFF8F1', // Very light orange tint
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    initialPanelContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    initialTextSection: {
        flex: 1,
    },
    illustrationContainer: {
        width: 100,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    turnOnLocationBtn: {
        backgroundColor: colors.primary,
        borderRadius: 24,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 16,
    },
    searchBarInitial: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.white,
        borderRadius: 28,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    // Search State
    searchContainer: {
        flex: 1,
        backgroundColor: colors.white,
    },
    searchHeader: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    searchBackBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
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
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'monospace',
        color: colors.text,
    },
    searchResultsContainer: {
        flex: 1,
        paddingHorizontal: 16,
        marginTop: 16,
    },
    searchResultsLabel: {
        marginBottom: 12,
        letterSpacing: 1,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    searchResultIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    searchResultText: {
        flex: 1,
    },
    // Map State
    mapContainer: {
        flex: 1,
    },
    centerMarker: {
        position: 'absolute',
        top: '42%',
        left: '50%',
        marginLeft: -24,
        marginTop: -56,
        zIndex: 10,
    },
    mapHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 8,
        gap: 12,
    },
    mapBackBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    mapSearchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.white,
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    currentLocationPill: {
        position: 'absolute',
        bottom: 220,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    mapBottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginVertical: 12,
    },
    distanceBadge: {
        backgroundColor: '#FEF3C7',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
    },
    zoomHint: {
        backgroundColor: '#FEE2E2',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
    },
    confirmBtn: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    // Form State
    formContainer: {
        flex: 1,
        backgroundColor: colors.white,
    },
    formScroll: {
        flex: 1,
    },
    formMapPreview: {
        height: 120,
        position: 'relative',
    },
    formBackBtn: {
        position: 'absolute',
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    formAddressHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    formFields: {
        padding: 16,
    },
    formField: {
        marginBottom: 20,
    },
    formLabel: {
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    formInput: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        fontFamily: 'monospace',
        color: colors.text,
    },
    formTextarea: {
        height: 80,
        textAlignVertical: 'top',
    },
    labelGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    labelChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: colors.white,
    },
    labelChipActive: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}10`,
    },
    labelChipDisabled: {
        opacity: 0.5,
        backgroundColor: '#F3F4F6',
    },
    labelIcon: {
        marginRight: 8,
    },
    labelIconActive: {
        // Could add custom styling for active icons
    },
    formFooter: {
        padding: 16,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    saveBtn: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveBtnDisabled: {
        backgroundColor: '#D1D5DB',
    },
    phoneHint: {
        marginTop: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 10,
    },
    // New styles for redesigned form
    infoBanner: {
        backgroundColor: `${colors.primary}10`,
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    formInputFocused: {
        borderColor: colors.primary,
        borderWidth: 2,
    },
    phoneInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        overflow: 'hidden',
    },
    phoneInputContainerFocused: {
        borderColor: colors.primary,
        borderWidth: 2,
    },
    phonePrefix: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
    },
    phoneInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        fontFamily: 'monospace',
        color: colors.text,
    },
});
