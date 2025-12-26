import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking, Alert, PermissionsAndroid } from 'react-native';
import GetLocation from 'react-native-get-location';
import { userService } from '../services/customer/user.service';
import { branchService, Branch } from '../services/customer/branch.service';
import { ENV } from '../utils/env';
import { logger } from '../utils/logger';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useLocationLogic = () => {
    const [locationStatus, setLocationStatus] = useState<'idle' | 'granted' | 'denied' | 'disabled'>('idle');
    const [currentAddress, setCurrentAddress] = useState<string | null>(null);
    const [nearestBranch, setNearestBranch] = useState<Branch | null>(null);
    const [isFetching, setIsFetching] = useState(false);

    // Initial permission check
    useEffect(() => {
        loadCachedLocation();
    }, []);

    const loadCachedLocation = async () => {
        try {
            const cached = await AsyncStorage.getItem('user_location_data');
            if (cached) {
                const data = JSON.parse(cached);
                setCurrentAddress(data.address);
                setNearestBranch(data.branch);
                // Even if cached, try to fetch fresh location silently
                requestPermission(true);
            } else {
                requestPermission();
            }
        } catch (e) {
            logger.log('Failed to load cached location');
        }
    };

    const requestPermission = useCallback(async (silent = false) => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: "Location Permission",
                        message: "LushAndPure needs your location to find the nearest branch.",
                        buttonNeutral: "Ask Me Later",
                        buttonNegative: "Cancel",
                        buttonPositive: "OK"
                    }
                );
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    setLocationStatus('granted');
                    fetchCurrentLocation(silent);
                } else {
                    setLocationStatus('denied');
                }
            } catch (err) {
                logger.warn('Location permission error:', err);
                setLocationStatus('denied');
            }
        } else {
            // iOS usually handles permission automatically on GetLocation call
            fetchCurrentLocation(silent);
        }
    }, []);

    const fetchCurrentLocation = (silent = false) => {
        if (!silent) setIsFetching(true);

        GetLocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
        })
            .then(async location => {
                try {
                    const { latitude, longitude } = location;
                    // console.log('[useLocationLogic] Got Location:', latitude, longitude);

                    // 1. Fetch Address (Non-blocking)
                    let address = "Unknown Location";
                    try {
                        address = await reverseGeocode(latitude, longitude);
                    } catch (addrErr) {
                        logger.warn('[useLocationLogic] Geocoding failed:', addrErr);
                    }
                    setCurrentAddress(address);

                    // 2. Fetch Nested Branch (Blocking/Critical)
                    let fetchedBranch: Branch | null = null;
                    try {
                        const branch = await branchService.getNearestBranch(latitude, longitude);
                        setNearestBranch(branch);
                        fetchedBranch = branch;
                    } catch (branchErr: any) {
                        logger.error('[useLocationLogic] Branch fetch failed:', branchErr.message);
                        // Silent failure for UI
                    }

                    // Cache locally
                    const tempData = {
                        address,
                        branch: fetchedBranch
                    };
                    await AsyncStorage.setItem('user_location_data', JSON.stringify(tempData));

                } finally {
                    setIsFetching(false);
                }
            })
            .catch(error => {
                const { code, message } = error;
                logger.warn('[useLocationLogic] Location Error:', code, message);
                setLocationStatus('disabled');
                setIsFetching(false);
            });
    };

    const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
        try {
            const response = await axios.get(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${ENV.GOOGLE_MAPS_API_KEY}`
            );
            if (response.data.results.length > 0) {
                return response.data.results[0].formatted_address;
            }
        } catch (error) {
            logger.error('Reverse geocode error:', error);
        }
        return "Unknown Location";
    };

    const handleOpenSettings = () => {
        Linking.openSettings();
    };

    return {
        locationStatus,
        currentAddress,
        nearestBranch,
        isFetching,
        requestPermission,
        handleOpenSettings
    };
};
