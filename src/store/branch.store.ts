import { create } from 'zustand';
import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';
import GetLocation from 'react-native-get-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Branch, branchService } from '../services/customer/branch.service';
import { logger } from '../utils/logger';
import { promptForEnableLocationIfNeeded } from 'react-native-android-location-enabler';

const LOCATION_CACHE_KEY = 'techsmart_branch_cache';

interface BranchState {
    // Current branch
    currentBranch: Branch | null;

    // Status
    isLoading: boolean;
    isInitialized: boolean;
    locationStatus: 'idle' | 'granted' | 'denied' | 'disabled' | 'unavailable';
    error: string | null;

    // Whether location was set manually (vs GPS)
    isManualLocation: boolean;

    // Whether the current branch provides service to the current location
    isServiceAvailable: boolean;

    // Trigger for auto-opening address modal (e.g. after login)
    shouldShowAddressModal: boolean;

    // Actions
    initialize: () => Promise<void>;
    requestGPSAndFetchBranch: () => Promise<Branch | null>;
    fetchBranchByPincode: (pincode: string) => Promise<Branch | null>;
    fetchBranchByCoordinates: (lat: number, lng: number) => Promise<Branch | null>;
    fetchDefaultBranch: () => Promise<Branch | null>;
    setCurrentBranch: (branch: Branch | null, isManual?: boolean) => void;
    clearBranch: () => void;
    setShouldShowAddressModal: (show: boolean) => void;
    openLocationSettings: () => void;
}

export const useBranchStore = create<BranchState>((set, get) => ({
    currentBranch: null,
    isLoading: false,
    isInitialized: false,
    locationStatus: 'idle',
    error: null,
    isManualLocation: false,
    isServiceAvailable: true, // Default to true until we check
    shouldShowAddressModal: false,

    // Initialize - check for cached branch on app start
    initialize: async () => {
        if (get().isInitialized) return;

        try {
            const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                if (data.branch) {
                    set({
                        currentBranch: data.branch,
                        isManualLocation: data.isManual || false,
                        isServiceAvailable: data.branch.isWithinRadius !== false,
                        isInitialized: true
                    });
                    logger.debug('[BranchStore] Loaded cached branch:', data.branch.name);
                    return;
                }
            }
        } catch (e) {
            logger.warn('[BranchStore] Failed to load cached branch');
        }

        set({ isInitialized: true });
    },

    // Request GPS permission and get nearest branch
    requestGPSAndFetchBranch: async () => {
        set({ isLoading: true, error: null });

        try {
            // Request permission on Android
            if (Platform.OS === 'android') {
                // First check if already granted
                const hasPermission = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                );

                if (!hasPermission) {

                    // Wrapper with timeout - sometimes request() hangs on permanently denied permissions
                    const requestWithTimeout = (): Promise<string> => {
                        return new Promise((resolve) => {
                            const timeoutId = setTimeout(() => {
                                resolve(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
                            }, 5000);

                            PermissionsAndroid.request(
                                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                                {
                                    title: "Enable Location",
                                    message: "TechSmart needs your location to show products available in your area with accurate pricing.",
                                    buttonNegative: "Not Now",
                                    buttonPositive: "Enable"
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

                    if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                        set({ isLoading: false, locationStatus: 'denied' });
                        Alert.alert(
                            'Permission Required',
                            'Location permission is disabled. Please enable it in Settings.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Open Settings', onPress: () => Linking.openSettings() },
                            ]
                        );
                        return null;
                    }

                    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                        set({ isLoading: false, locationStatus: 'denied' });
                        return null;
                    }
                }
            }

            set({ locationStatus: 'granted' });

            // On Android, prompt user to enable GPS if it's disabled (native dialog)
            if (Platform.OS === 'android') {
                try {
                    await promptForEnableLocationIfNeeded();
                } catch (enableError: any) {
                    logger.warn('[BranchStore] User declined to enable GPS:', enableError.message);
                    set({ isLoading: false, locationStatus: 'disabled' });
                    // Fallback: offer to open settings manually
                    Alert.alert(
                        'GPS Required',
                        'Please enable GPS/Location Services to continue.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: () => Linking.openSettings() },
                        ]
                    );
                    return null;
                }
            }

            // Get current position
            const location = await GetLocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 15000,
            });

            // Fetch nearest branch
            const branch = await branchService.getNearestBranch(location.latitude, location.longitude);

            // Cache and set
            await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
                branch,
                isManual: false,
                timestamp: Date.now()
            }));

            set({
                currentBranch: branch,
                isLoading: false,
                isManualLocation: false,
                isServiceAvailable: branch.isWithinRadius !== false,
                error: null
            });

            logger.debug('[BranchStore] Set branch via GPS:', branch.name);
            return branch;

        } catch (error: any) {
            logger.error('[BranchStore] GPS location failed:', error.message);

            const errorCode = error.code;
            if (errorCode === 'CANCELLED' || errorCode === 'UNAVAILABLE') {
                set({ locationStatus: 'disabled' });
                // GPS is disabled - this case should be rare since we prompt earlier
                // but show fallback alert just in case
                Alert.alert(
                    'Location Unavailable',
                    'Could not get your location. Please check your GPS settings.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() },
                    ]
                );
            } else if (errorCode === 'TIMEOUT') {
                set({ locationStatus: 'unavailable' });
            }

            set({
                isLoading: false,
                error: 'Could not determine location'
            });
            return null;
        }
    },

    // Fetch branch by pincode
    fetchBranchByPincode: async (pincode: string) => {
        set({ isLoading: true, error: null });

        try {
            const branch = await branchService.getBranchByPincode(pincode);

            // Cache and set
            await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
                branch,
                isManual: true,
                pincode,
                timestamp: Date.now()
            }));

            set({
                currentBranch: branch,
                isLoading: false,
                isManualLocation: true,
                isServiceAvailable: branch.isWithinRadius !== false,
                error: null
            });

            logger.debug('[BranchStore] Set branch via pincode:', branch.name);
            return branch;

        } catch (error: any) {
            logger.error('[BranchStore] Pincode lookup failed:', error.message);
            set({
                isLoading: false,
                error: 'Could not find service in this area'
            });
            return null;
        }
    },

    // Fetch branch by coordinates (for saved addresses)
    fetchBranchByCoordinates: async (lat: number, lng: number) => {
        set({ isLoading: true, error: null });

        try {
            const branch = await branchService.getNearestBranch(lat, lng);

            // Cache and set
            await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
                branch,
                isManual: true,
                timestamp: Date.now()
            }));

            set({
                currentBranch: branch,
                isLoading: false,
                isManualLocation: true,
                isServiceAvailable: branch.isWithinRadius !== false,
                error: null
            });

            logger.debug('[BranchStore] Set branch via coordinates:', branch.name);
            return branch;

        } catch (error: any) {
            logger.error('[BranchStore] Coordinate lookup failed:', error.message);
            set({
                isLoading: false,
                error: 'Could not find nearest branch'
            });
            return null;
        }
    },

    // Fetch default branch (fallback)
    fetchDefaultBranch: async () => {
        set({ isLoading: true, error: null });

        try {
            const branch = await branchService.getDefaultBranch();

            // Cache and set
            await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
                branch,
                isManual: true,
                isDefault: true,
                timestamp: Date.now()
            }));

            set({
                currentBranch: branch,
                isLoading: false,
                isManualLocation: true,
                isServiceAvailable: true,
                error: null
            });

            logger.debug('[BranchStore] Set default branch:', branch.name);
            return branch;

        } catch (error: any) {
            logger.error('[BranchStore] Default branch fetch failed:', error.message);
            set({
                isLoading: false,
                error: 'Could not load default location'
            });
            return null;
        }
    },

    // Direct setter
    setCurrentBranch: (branch, isManual = false) => {
        set({
            currentBranch: branch,
            isManualLocation: isManual,
            isServiceAvailable: branch ? (branch.isWithinRadius !== false) : false
        });

        if (branch) {
            AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
                branch,
                isManual,
                timestamp: Date.now()
            })).catch(() => { });
        }
    },

    setShouldShowAddressModal: (show) => set({ shouldShowAddressModal: show }),

    // Clear branch
    clearBranch: () => {
        set({
            currentBranch: null,
            error: null,
            isManualLocation: false,
            locationStatus: 'idle'
        });
        AsyncStorage.removeItem(LOCATION_CACHE_KEY).catch(() => { });
    },

    // Open device location settings
    openLocationSettings: () => {
        Linking.openSettings();
    }
}));

// Helper to get current branch ID (for use outside React components)
export const getCurrentBranchId = (): string | undefined => {
    return useBranchStore.getState().currentBranch?._id;
};
