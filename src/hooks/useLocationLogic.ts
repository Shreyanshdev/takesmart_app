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

    // Simplified address logic: Use branch name or address
    useEffect(() => {
        if (currentBranch) {
            // Priority: Branch Address -> Branch Name
            setCurrentAddress(currentBranch.address || currentBranch.name);
        } else {
            setCurrentAddress(null);
        }
    }, [currentBranch]);

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
