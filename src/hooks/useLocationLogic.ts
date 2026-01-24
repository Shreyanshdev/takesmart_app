import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useBranchStore } from '../store/branch.store';
import { ENV } from '../utils/env';
import { logger } from '../utils/logger';

/**
 * useLocationLogic - Thin wrapper around branch store for UI components
 * 
 * The branch.store.ts is the single source of truth for:
 * - GPS permission handling
 * - Branch fetching (GPS, pincode, coordinates)
 * - Caching
 * 
 * This hook provides:
 * - Reverse geocoding for display address
 * - Simple interface for HomeHeader
 */

export const useLocationLogic = () => {
    const {
        currentBranch,
        isLoading: isFetching,
        locationStatus,
        requestGPSAndFetchBranch,
        openLocationSettings,
        initialize
    } = useBranchStore();

    const [currentAddress, setCurrentAddress] = useState<string | null>(null);

    // Initialize branch store on mount
    useEffect(() => {
        initialize();
    }, []);

    // Reverse geocode when branch changes (to get display address)
    useEffect(() => {
        if (currentBranch?.location) {
            reverseGeocode(currentBranch.location.latitude, currentBranch.location.longitude);
        }
    }, [currentBranch]);

    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const response = await axios.get(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${ENV.GOOGLE_MAPS_API_KEY}`
            );
            if (response.data.results.length > 0) {
                // Get a short address (locality, city)
                const components = response.data.results[0].address_components;
                let locality = '';
                let city = '';

                for (const comp of components) {
                    if (comp.types.includes('locality')) {
                        locality = comp.short_name;
                    }
                    if (comp.types.includes('administrative_area_level_2')) {
                        city = comp.short_name;
                    }
                }

                setCurrentAddress(locality || city || response.data.results[0].formatted_address);
            }
        } catch (error) {
            logger.warn('Reverse geocode failed:', error);
            // Use branch name as fallback
            if (currentBranch?.name) {
                setCurrentAddress(currentBranch.name);
            }
        }
    };

    const requestPermission = useCallback(async () => {
        await requestGPSAndFetchBranch();
    }, []);

    const handleOpenSettings = useCallback(() => {
        openLocationSettings();
    }, []);

    return {
        locationStatus,
        currentAddress,
        nearestBranch: currentBranch,
        isFetching,
        requestPermission,
        handleOpenSettings
    };
};
