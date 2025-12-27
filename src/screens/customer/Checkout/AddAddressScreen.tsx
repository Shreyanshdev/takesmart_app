import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, KeyboardAvoidingView, Platform, Alert, TextInput, ActivityIndicator, Animated } from 'react-native';
import MapView, { PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import GetLocation from 'react-native-get-location';
import axios from 'axios';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { MonoText } from '../../../components/shared/MonoText';
import Svg, { Path, Circle, Line, Polyline, Rect } from 'react-native-svg';
import { addressService } from '../../../services/customer/address.service';
import { ENV } from '../../../utils/env';
import { logger } from '../../../utils/logger';

const { width, height } = Dimensions.get('window');
const MAP_HEIGHT_EXPANDED = height * 0.55;
const MAP_HEIGHT_COLLAPSED = height * 0.25;

// Default initial region - zoomed in to show streets/buildings
const INITIAL_REGION = {
    latitude: 26.489181,
    longitude: 80.275209,
    latitudeDelta: 0.002, // More zoomed in to see buildings/streets
    longitudeDelta: 0.002,
};

// Address label options
const LABEL_OPTIONS: ('Home' | 'Office' | 'Other')[] = ['Home', 'Office', 'Other'];

export const AddAddressScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const editAddress = route.params?.editAddress;
    const isEditMode = !!editAddress;

    const mapRef = useRef<MapView>(null);
    const scrollY = useRef(new Animated.Value(0)).current;

    // Animated map height based on scroll
    const mapHeight = scrollY.interpolate({
        inputRange: [0, 150],
        outputRange: [MAP_HEIGHT_EXPANDED, MAP_HEIGHT_COLLAPSED],
        extrapolate: 'clamp',
    });

    const [region, setRegion] = useState(editAddress?.latitude && editAddress?.longitude ? {
        latitude: editAddress.latitude,
        longitude: editAddress.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
    } : INITIAL_REGION);
    const [markerCoord, setMarkerCoord] = useState(editAddress?.latitude && editAddress?.longitude ? {
        latitude: editAddress.latitude,
        longitude: editAddress.longitude
    } : { latitude: INITIAL_REGION.latitude, longitude: INITIAL_REGION.longitude });
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [isFetchingAddress, setIsFetchingAddress] = useState(false);
    const [locationConfirmed, setLocationConfirmed] = useState(true); // Auto-confirmed since address updates on map move

    // Form State
    const [addressLine1, setAddressLine1] = useState(editAddress?.addressLine1 || '');
    const [addressLine2, setAddressLine2] = useState(editAddress?.addressLine2 || '');
    const [city, setCity] = useState(editAddress?.city || '');
    const [state, setState] = useState(editAddress?.state || '');
    const [zipCode, setZipCode] = useState(editAddress?.zipCode || '');
    const [label, setLabel] = useState<'Home' | 'Office' | 'Other'>(editAddress?.label || 'Home');
    const [labelCustom, setLabelCustom] = useState(editAddress?.labelCustom || '');
    const [isDefault, setIsDefault] = useState(editAddress?.isDefault || false);
    const [saving, setSaving] = useState(false);

    const fetchAddressFromCoords = useCallback(async (lat: number, lng: number) => {
        setIsFetchingAddress(true);
        try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${ENV.GOOGLE_MAPS_API_KEY}`;
            const res = await axios.get(url);

            if (res.data.status !== 'OK') {
                logger.error('Geocoding API Error Status:', res.data.status, res.data.error_message || '');

                let errorMsg = `Status: ${res.data.status}\n\nMessage: ${res.data.error_message || 'Check your Google Cloud Console for Geocoding API status.'}`;

                if (res.data.status === 'REQUEST_DENIED') {
                    errorMsg += '\n\nIMPORTANT: This API key might not have Geocoding API enabled, or it is restricted for this app package/SHA-1. Please ensure Geocoding API is enabled for key: ' + ENV.GOOGLE_MAPS_API_KEY.slice(0, 5) + '...' + ENV.GOOGLE_MAPS_API_KEY.slice(-4);
                }

                Alert.alert('Geocoding API Error', errorMsg, [{ text: 'OK' }]);
                return;
            }

            if (res.data.results && res.data.results.length > 0) {
                const result = res.data.results[0];
                const components = result.address_components;

                let newHouseNo = '';
                let newStreet = '';
                let newSublocality = '';
                let newNeighborhood = '';
                let newCity = '';
                let newState = '';
                let newZip = '';

                components.forEach((c: any) => {
                    if (c.types.includes('street_number')) newHouseNo = c.long_name;
                    if (c.types.includes('route')) newStreet = c.long_name;
                    if (c.types.includes('sublocality_level_1') || c.types.includes('sublocality')) newSublocality = c.long_name;
                    if (c.types.includes('neighborhood')) newNeighborhood = c.long_name;
                    if (c.types.includes('locality')) newCity = c.long_name;
                    if (c.types.includes('administrative_area_level_2') && !newCity) newCity = c.long_name;
                    if (c.types.includes('administrative_area_level_1')) newState = c.long_name;
                    if (c.types.includes('postal_code')) newZip = c.long_name;
                });

                // Build address line 1 with house no and street
                let line1Parts = [];
                if (newHouseNo) line1Parts.push(newHouseNo);
                if (newStreet) line1Parts.push(newStreet);
                if (line1Parts.length === 0 && newSublocality) line1Parts.push(newSublocality);
                setAddressLine1(line1Parts.join(' ') || result.formatted_address.split(',')[0]);

                // Build address line 2 with neighborhood/sublocality
                let line2Parts = [];
                if (newNeighborhood && newNeighborhood !== newSublocality) line2Parts.push(newNeighborhood);
                if (newSublocality && !line1Parts.includes(newSublocality)) line2Parts.push(newSublocality);
                setAddressLine2(line2Parts.join(', ') || '');

                if (newCity) setCity(newCity);
                if (newState) setState(newState);
                if (newZip) setZipCode(newZip);
            } else {
                Alert.alert('Geocoding Info', 'No address found for this location.', [{ text: 'OK' }]);
            }
        } catch (error: any) {
            logger.error('Geocoding network/unknown error', error);
            Alert.alert('Geocoding Network Error', `Failed to reach Google services.\n\nError: ${error.message || 'Unknown'}`);
        } finally {
            setIsFetchingAddress(false);
        }
    }, []);

    const onRegionChangeComplete = (r: Region) => {
        console.log('>>> onRegionChangeComplete FIRED <<<', r.latitude, r.longitude);
        setRegion(r);
        setMarkerCoord({ latitude: r.latitude, longitude: r.longitude });
        // Auto-fetch address when map stops moving
        fetchAddressFromCoords(r.latitude, r.longitude);
        // Auto-confirm location since user has interacted with map
        setLocationConfirmed(true);
    };

    // Fetch address on initial load for new addresses
    useEffect(() => {
        if (!isEditMode) {
            console.log('>>> Initial geocoding on mount <<<');
            fetchAddressFromCoords(markerCoord.latitude, markerCoord.longitude);
        }

        // Ensure map animates to correct region after mount (fixes Android issue)
        const timer = setTimeout(() => {
            console.log('>>> Animating map to initial region <<<', region);
            mapRef.current?.animateToRegion(region, 500);
        }, 500);

        return () => clearTimeout(timer);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleMapPress = (e: any) => {
        const { coordinate } = e.nativeEvent;
        const newRegion = {
            ...region,
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
        };
        mapRef.current?.animateToRegion(newRegion, 500);
        setRegion(newRegion);
        setMarkerCoord(coordinate);
        // fetchAddressFromCoords is called by onRegionChangeComplete, 
        // but explicit press can also trigger immediate feedback if we wanted.
        fetchAddressFromCoords(coordinate.latitude, coordinate.longitude);
    };

    const handleCurrentLocation = () => {
        setIsFetchingLocation(true);
        GetLocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
        })
            .then(async location => {
                const { latitude, longitude } = location;
                const newRegion = {
                    ...region,
                    latitude,
                    longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005
                };
                mapRef.current?.animateToRegion(newRegion, 1000);
                // onRegionChangeComplete will handle the fetch
                setIsFetchingLocation(false);
            })
            .catch(err => {
                logger.warn('Location fetch error', err);
                Alert.alert("Error", "Could not fetch location. Please ensure GPS is on.");
                setIsFetchingLocation(false);
            });
    };

    // Handle confirm location - gets current map center and triggers geocoding
    const handleConfirmLocation = async () => {
        console.log('>>> handleConfirmLocation called <<<');
        // Get current map region
        if (mapRef.current) {
            // @ts-ignore - getCamera is available but not typed
            const camera = await mapRef.current.getCamera();
            if (camera && camera.center) {
                const { latitude, longitude } = camera.center;
                console.log('>>> Map center coordinates <<<', latitude, longitude);
                setMarkerCoord({ latitude, longitude });
                setRegion(prev => ({ ...prev, latitude, longitude }));
                fetchAddressFromCoords(latitude, longitude);
                setLocationConfirmed(true); // Mark location as confirmed
            }
        }
    };

    const handleSave = async () => {
        if (!locationConfirmed) {
            Alert.alert('Confirm Location', 'Please select your location on the map and tap "Confirm This Location" first.');
            return;
        }

        if (!addressLine1 || !city || !state || !zipCode) {
            Alert.alert('Missing Fields', 'Please fill in all required fields.');
            return;
        }

        if (label === 'Other' && !labelCustom.trim()) {
            Alert.alert('Missing Label', 'Please enter a custom label for your address.');
            return;
        }

        setSaving(true);
        try {
            const addressData = {
                addressLine1,
                addressLine2,
                city,
                state,
                zipCode,
                isDefault,
                latitude: markerCoord.latitude,
                longitude: markerCoord.longitude,
                label,
                labelCustom: label === 'Other' ? labelCustom : '',
            };

            if (isEditMode) {
                await addressService.updateAddress(editAddress._id, addressData);
            } else {
                await addressService.addAddress(addressData);
            }
            navigation.goBack();
        } catch (error) {
            logger.error('Failed to save address', error);
            Alert.alert('Error', 'Failed to save address. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Map Section */}
            <Animated.View style={[styles.mapContainer, { height: mapHeight }]}>
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_DEFAULT}
                    style={StyleSheet.absoluteFill}
                    initialRegion={INITIAL_REGION}
                    onRegionChangeComplete={onRegionChangeComplete}
                    onPress={handleMapPress}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                    zoomEnabled={true}
                    scrollEnabled={true}
                    mapType="standard"
                    showsBuildings={true}
                    showsIndoors={true}
                    showsTraffic={false}
                    loadingEnabled={true}
                    loadingIndicatorColor={colors.primary}
                />
                {/* Center Marker Overlay with Loading */}
                <View style={styles.centerMarker} pointerEvents="none">
                    {isFetchingAddress ? (
                        <View style={styles.markerLoading}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    ) : (
                        <Svg width="44" height="44" viewBox="0 0 24 24" fill={colors.primary} stroke={colors.white} strokeWidth="1.5">
                            <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={colors.primary} />
                            <Circle cx="12" cy="9" r="2.5" fill={colors.white} />
                        </Svg>
                    )}
                </View>

                {/* Header Overlay (Back Button) */}
                <SafeAreaView style={styles.headerOverlay} edges={['top']}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M19 12H5M12 19l-7-7 7-7" />
                        </Svg>
                    </TouchableOpacity>
                </SafeAreaView>

                {/* Zoom Controls */}
                <View style={styles.zoomContainer}>
                    <TouchableOpacity style={styles.zoomBtn} onPress={async () => {
                        if (mapRef.current) {
                            // @ts-ignore
                            const camera = await mapRef.current.getCamera();
                            if (camera && camera.center) {
                                const newRegion = {
                                    latitude: camera.center.latitude,
                                    longitude: camera.center.longitude,
                                    latitudeDelta: (region.latitudeDelta || 0.01) / 2,
                                    longitudeDelta: (region.longitudeDelta || 0.01) / 2,
                                };
                                setRegion(newRegion);
                                mapRef.current?.animateToRegion(newRegion, 400);
                            }
                        }
                    }}>
                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Line x1="12" y1="5" x2="12" y2="19" />
                            <Line x1="5" y1="12" x2="19" y2="12" />
                        </Svg>
                    </TouchableOpacity>
                    <View style={styles.zoomDivider} />
                    <TouchableOpacity style={styles.zoomBtn} onPress={async () => {
                        if (mapRef.current) {
                            // @ts-ignore
                            const camera = await mapRef.current.getCamera();
                            if (camera && camera.center) {
                                const newRegion = {
                                    latitude: camera.center.latitude,
                                    longitude: camera.center.longitude,
                                    latitudeDelta: (region.latitudeDelta || 0.01) * 2,
                                    longitudeDelta: (region.longitudeDelta || 0.01) * 2,
                                };
                                setRegion(newRegion);
                                mapRef.current?.animateToRegion(newRegion, 400);
                            }
                        }
                    }}>
                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Line x1="5" y1="12" x2="19" y2="12" />
                        </Svg>
                    </TouchableOpacity>
                </View>

                {/* Current Location Button */}
                <TouchableOpacity style={styles.currentLocBtn} onPress={handleCurrentLocation} disabled={isFetchingLocation}>
                    {isFetchingLocation ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Circle cx="12" cy="12" r="4" fill={colors.primary} />
                            <Path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                        </Svg>
                    )}
                </TouchableOpacity>


            </Animated.View>

            {/* Form Section with KeyboardAvoidingView */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.formWrapper}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <Animated.ScrollView
                    style={styles.formContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 200, paddingTop: 8 }}
                    bounces={true}
                    scrollEventThrottle={16}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: false }
                    )}
                >
                    {/* Handle Bar */}
                    <View style={styles.handle} />


                    <MonoText size="l" weight="bold" style={styles.formTitle}>
                        {isEditMode ? 'Edit Address' : 'Add Address Details'}
                    </MonoText>

                    {/* Label Selector */}
                    <View style={styles.field}>
                        <MonoText size="s" color={colors.textLight} style={styles.label}>Address Type *</MonoText>
                        <View style={styles.labelSelector}>
                            {LABEL_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt}
                                    style={[styles.labelChip, label === opt && styles.labelChipActive]}
                                    onPress={() => setLabel(opt)}
                                >
                                    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={label === opt ? colors.white : colors.textLight} strokeWidth="2">
                                        {opt === 'Home' && <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />}
                                        {opt === 'Office' && <>
                                            <Rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                                            <Line x1="9" y1="6" x2="9.01" y2="6" />
                                            <Line x1="15" y1="6" x2="15.01" y2="6" />
                                        </>}
                                        {opt === 'Other' && <>
                                            <Circle cx="12" cy="12" r="10" />
                                            <Line x1="12" y1="8" x2="12" y2="12" />
                                            <Line x1="12" y1="16" x2="12.01" y2="16" />
                                        </>}
                                    </Svg>
                                    <MonoText size="s" weight={label === opt ? 'bold' : 'regular'} color={label === opt ? colors.white : colors.text} style={{ marginLeft: 6 }}>
                                        {opt}
                                    </MonoText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Custom Label Input for 'Other' */}
                    {label === 'Other' && (
                        <View style={styles.field}>
                            <MonoText size="s" color={colors.textLight} style={styles.label}>Custom Label *</MonoText>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Grandma's House, Gym"
                                value={labelCustom}
                                onChangeText={setLabelCustom}
                            />
                        </View>
                    )}

                    <View style={styles.field}>
                        <MonoText size="s" color={colors.textLight} style={styles.label}>House No / Flat / Building *</MonoText>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Flat 402, Sunshine Apts"
                            value={addressLine1}
                            onChangeText={setAddressLine1}
                        />
                    </View>

                    <View style={styles.field}>
                        <MonoText size="s" color={colors.textLight} style={styles.label}>Street / Landmark (Optional)</MonoText>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Near City Center"
                            value={addressLine2}
                            onChangeText={setAddressLine2}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                            <MonoText size="s" color={colors.textLight} style={styles.label}>City *</MonoText>
                            <TextInput
                                style={styles.input}
                                placeholder="City"
                                value={city}
                                onChangeText={setCity}
                            />
                        </View>
                        <View style={[styles.field, { flex: 1, marginLeft: 8 }]}>
                            <MonoText size="s" color={colors.textLight} style={styles.label}>Zip Code *</MonoText>
                            <TextInput
                                style={styles.input}
                                placeholder="Zip Code"
                                keyboardType="numeric"
                                value={zipCode}
                                onChangeText={setZipCode}
                            />
                        </View>
                    </View>

                    <View style={styles.field}>
                        <MonoText size="s" color={colors.textLight} style={styles.label}>State *</MonoText>
                        <TextInput
                            style={styles.input}
                            placeholder="State"
                            value={state}
                            onChangeText={setState}
                        />
                    </View>

                    {/* Set as Default Toggle */}
                    <TouchableOpacity
                        style={styles.defaultToggle}
                        onPress={() => setIsDefault(!isDefault)}
                    >
                        <View style={[styles.checkbox, isDefault && styles.checkboxActive]}>
                            {isDefault && (
                                <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="3">
                                    <Polyline points="20 6 9 17 4 12" />
                                </Svg>
                            )}
                        </View>
                        <MonoText size="s">Set as default address</MonoText>
                    </TouchableOpacity>
                </Animated.ScrollView>
            </KeyboardAvoidingView>

            {/* Footer Save Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.disabledBtn]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    <MonoText weight="bold" color={colors.white}>
                        {saving ? 'Saving...' : isEditMode ? 'Update Address' : 'Save Address'}
                    </MonoText>
                </TouchableOpacity>
            </View>
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    mapContainer: {
        height: height * 0.55,
        width: '100%',
        position: 'relative',
    },
    formWrapper: {
        flex: 1,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        alignSelf: 'center',
        marginVertical: 10,
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: spacing.m,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    centerMarker: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -20,
        marginTop: -40, // Adjust based on icon size
        zIndex: 10,
    },
    currentLocBtn: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    zoomContainer: {
        position: 'absolute',
        bottom: 80, // Above current location btn
        right: 20,
        backgroundColor: colors.white,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        alignItems: 'center',
    },
    zoomBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    zoomDivider: {
        width: '80%',
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    formContainer: {
        flex: 1,
        backgroundColor: colors.white,
        marginTop: -20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.l,
    },
    formTitle: {
        marginBottom: spacing.l,
    },
    field: {
        marginBottom: spacing.m,
    },
    label: {
        marginBottom: 6,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: spacing.m,
        fontFamily: 'monospace',
        fontSize: 16,
        color: colors.text,
        backgroundColor: '#F9FAFB',
    },
    row: {
        flexDirection: 'row',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.l,
        paddingBottom: spacing.xl,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    saveBtn: {
        height: 56,
        backgroundColor: colors.black,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledBtn: {
        backgroundColor: '#9Ca3AF',
    },
    // New styles for enhanced map features
    markerLoading: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    mapTypeContainer: {
        position: 'absolute',
        bottom: 80,
        left: 20,
    },
    mapTypeBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    mapTypeSelectorPopup: {
        position: 'absolute',
        bottom: 52,
        left: 0,
        backgroundColor: colors.white,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        minWidth: 100,
    },
    mapTypeOption: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    labelSelector: {
        flexDirection: 'row',
        gap: 10,
    },
    labelChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    labelChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    defaultToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 12,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    mapTypeOptionActive: {
        backgroundColor: `${colors.primary}15`,
    },
    confirmLocBtn: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 80,
        height: 48,
        backgroundColor: colors.primary,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    noticeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F59E0B',
    },
});
