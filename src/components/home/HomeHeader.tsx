import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Polyline, Line } from 'react-native-svg';
import Animated, { useAnimatedStyle, interpolateColor, interpolate, SharedValue, Extrapolation, useDerivedValue } from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { SkeletonItem } from '../shared/SkeletonLoader';
import { useLocationLogic } from '../../hooks/useLocationLogic';
import { AddressSelectionModal } from './AddressSelectionModal';
import { Address } from '../../services/customer/address.service';
import { Branch } from '../../services/customer/branch.service';
import { useWishlistStore } from '../../store/wishlist.store';
import { useBranchStore } from '../../store/branch.store';

const ADDRESS_MODAL_SHOWN_KEY = '@lush_address_modal_shown';

interface HomeHeaderProps {
    scrollY: SharedValue<number>;
}

export const HomeHeader = ({ scrollY }: HomeHeaderProps) => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { locationStatus, currentAddress, nearestBranch, requestPermission, isFetching } = useLocationLogic();
    const { isServiceAvailable } = useBranchStore();
    const { wishlist } = useWishlistStore();
    const wishlistCount = wishlist.length;

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
    const [displayBranch, setDisplayBranch] = useState<Branch | null>(null);
    const [displayAddress, setDisplayAddress] = useState<string | null>(null);

    // Derived Logic
    const activeBranch = displayBranch || nearestBranch;
    const eta = activeBranch?.distance ? Math.ceil(activeBranch.distance * 5) + 10 : 15;
    const branchName = activeBranch ? activeBranch.name : 'Select Area';
    const addressDisplay = displayAddress || currentAddress || 'Set delivery location';

    // --- Animations ---
    // Scroll distance to collapse the header
    const SCROLL_RANGE = 100;

    // Derived values for smoother interpolation
    const scroll = useDerivedValue(() => {
        return interpolate(scrollY.value, [0, SCROLL_RANGE], [0, 1], Extrapolation.CLAMP);
    });

    // 1. Container Background: Blue -> White/Glass
    const containerStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            scroll.value,
            [0, 1],
            [colors.primary, colors.white] // Use solid colors for efficient shadow calculation
        );
        const borderBottomLeftRadius = interpolate(scroll.value, [0, 1], [0, 0]);
        const borderBottomRightRadius = interpolate(scroll.value, [0, 1], [0, 0]);

        return {
            backgroundColor,
            borderBottomLeftRadius,
            borderBottomRightRadius,
            ...(Platform.OS === 'ios' ? {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: interpolate(scroll.value, [0, 1], [0, 0.1]),
                shadowRadius: 8,
            } : {
                elevation: interpolate(scroll.value, [0, 1], [0, 4]),
            }),
        };
    });

    // 2. Blur / Glassmorphism Layer Opacity
    const blurStyle = useAnimatedStyle(() => {
        return {
            opacity: scroll.value, // 0 at top, 1 when scrolled
        };
    });

    // 3. Top Row (Location + Profile): Fade Out & Slide Up
    const topRowStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(scroll.value, [0, 0.6], [1, 0]),
            transform: [
                { translateY: interpolate(scroll.value, [0, 1], [0, -20]) }
            ],
            // Hide completely when scrolled to avoid touch events?
            // We can use pointerEvents="none" logic or just rely on layout/z-index if needed.
            // Height interpolation to actually collapse the space:
            height: interpolate(scroll.value, [0, 1], [40, 0]),
            marginBottom: interpolate(scroll.value, [0, 1], [12, 0]),
        };
    });

    // 4. Content Color Interpolation (White text on Blue -> Black text on White)
    // We can't easily interpolate color on SVG props directly via style without AnimatedProps.
    // For simplicity, we might keep the wishlist button white/black or use conditional rendering if easy.
    // BUT, the Search Bar is white bg on both.
    // The Wishlist button:
    //  - On Blue: White button with Blue icon? OR Transparent button with White Icon?
    //  - Screenshot shows: Solid White Square with Blue Icon.
    //  - Scrolled: Solid White (or gray) with Blue Icon?
    // Let's stick to the styling in the screenshot:
    // Search Bar: White BG.
    // Wishlist Btn: White BG, Square/Rounded. 
    // So distinct elements don't necessarily change color, just the background behind them.

    // 5. Status Bar Style
    // We might need to toggle standard status bar color from light to dark content. 
    // This is side-effectual and handled better in the parent or usually just 'light-content' on blue 
    // and 'dark-content' on white. 
    // Reanimated doesn't control StatusBar directly. We'll leave it 'light' or set fixed.
    // Given the blue header, 'light-content' (white text) is best initially.
    // When white header, 'dark-content'.

    // --- Handlers ---
    const handleOpenModal = useCallback(() => setIsModalVisible(true), []);
    const handleCloseModal = useCallback(() => setIsModalVisible(false), []);
    const handleSelectAddress = useCallback((address: Address | null, branch: Branch | null, addrDisplay: string) => {
        setSelectedAddress(address);
        setDisplayBranch(branch);
        setDisplayAddress(addrDisplay);

        // Synchronize with global branch store to refresh products/inventory
        useBranchStore.getState().setCurrentBranch(branch, true);
    }, []);
    const handleUseCurrentLocation = useCallback(() => {
        setSelectedAddress(null);
        setDisplayBranch(null);
        setDisplayAddress(null);
        requestPermission();
    }, [requestPermission]);

    const shouldShowAddressModal = useBranchStore(state => state.shouldShowAddressModal);
    const setShouldShowAddressModal = useBranchStore(state => state.setShouldShowAddressModal);

    // Auto-show modal check on mount (previous logic) + New Login Trigger
    useEffect(() => {
        const checkModalStatus = async () => {
            const hasShown = await AsyncStorage.getItem(ADDRESS_MODAL_SHOWN_KEY);

            if (shouldShowAddressModal || !hasShown) {
                handleOpenModal();
                if (!hasShown) {
                    await AsyncStorage.setItem(ADDRESS_MODAL_SHOWN_KEY, 'true');
                }

                // Reset the flag so it doesn't keep opening
                if (shouldShowAddressModal) {
                    setShouldShowAddressModal(false);
                }
            }
        };
        checkModalStatus();
    }, [handleOpenModal, shouldShowAddressModal, setShouldShowAddressModal]);
    // Location Text Color: Always White on Blue (Initial).
    // But as it fades out, it doesn't matter much.
    // Profile Placeholder: 

    return (
        <Animated.View style={[styles.container, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : insets.top }, containerStyle]}>
            {/* Glassmorphism Blur Layer */}
            <Animated.View style={[StyleSheet.absoluteFill, blurStyle]}>
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="light"
                    blurAmount={20}
                    reducedTransparencyFallbackColor="white"
                />
            </Animated.View>

            <View style={styles.content}>
                {/* TOP ROW: Location + Profile + ETA */}
                <Animated.View style={[styles.topRow, topRowStyle]}>
                    <TouchableOpacity
                        onPress={handleOpenModal}
                        disabled={isFetching}
                        style={{ flex: 1, marginRight: 12 }}
                    >
                        {isFetching ? (
                            <SkeletonItem width={80} height={18} borderRadius={4} style={{ marginBottom: 4 }} />
                        ) : (
                            <View style={styles.locationHeaderRow}>
                                <MonoText size="l" weight="bold" color={colors.white} numberOfLines={1}>
                                    {!isServiceAvailable
                                        ? 'No Service'
                                        : (activeBranch ? `${activeBranch.distance ? `${activeBranch.distance.toFixed(1)} km` : ''} • ${eta} mins` : 'Welcome to TechMart')}
                                </MonoText>
                                <View style={styles.locationArrow}>
                                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <Polyline points="6 9 12 15 18 9" />
                                    </Svg>
                                </View>
                            </View>
                        )}

                        {isFetching ? (
                            <SkeletonItem width={150} height={14} borderRadius={4} />
                        ) : (
                            <MonoText size="s" color={!isServiceAvailable ? '#FCA5A5' : "rgba(255,255,255,0.8)"} numberOfLines={1}>
                                {!isServiceAvailable ? 'No service in this area' : (activeBranch ? `to ${branchName} | ${addressDisplay}` : 'Set your location to see products')}
                            </MonoText>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                        <View style={styles.profileCircle}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <Circle cx="12" cy="7" r="4" />
                            </Svg>
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                {/* BOTTOM ROW: Search + Wishlist */}
                {/* This row stays visible and slides up slightly as the top row vanishes */}
                <View style={styles.bottomRow}>
                    <TouchableOpacity
                        style={styles.searchBar}
                        onPress={() => navigation.navigate('Search')}
                        activeOpacity={0.9}
                    >
                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                            <Circle cx="11" cy="11" r="8" />
                            <Line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </Svg>
                        <MonoText size="m" color={colors.textLight}>Search "Milk"</MonoText>

                        <View style={styles.searchRightIcons}>
                            {/* Mic or Scan icon could go here if needed, keeping simple for now */}
                            {/* <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <Polyline points="14 2 14 8 20 8" />
                                <Line x1="16" y1="13" x2="8" y2="13" />
                                <Line x1="16" y1="17" x2="8" y2="17" />
                                <Polyline points="10 9 9 9 8 9" />
                            </Svg> */}
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.wishlistBtn}
                        onPress={() => navigation.navigate('Wishlist')}
                    >
                        {/* Wishlist Icon */}
                        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </Svg>
                        {wishlistCount > 0 && (
                            <View style={styles.badge}>
                                <MonoText size="xxs" weight="bold" color={colors.white} style={{ fontSize: 9 }}>
                                    {wishlistCount}
                                </MonoText>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Address Selection Modal - Kept same */}
            <AddressSelectionModal
                visible={isModalVisible}
                onClose={handleCloseModal}
                onSelectAddress={handleSelectAddress}
                onUseCurrentLocation={handleUseCurrentLocation}
                currentLocationAddress={currentAddress}
                nearestBranch={nearestBranch}
                isFetchingLocation={isFetching}
            />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingBottom: 16,
        overflow: undefined, // Removed overflow:hidden to allow shadow on iOS
        backgroundColor: colors.white, // Explicit background for shadow efficiency warning
    },
    content: {
        zIndex: 1,
        paddingHorizontal: spacing.m,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        overflow: 'hidden', // Crucial for height animation
    },
    locationHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    locationArrow: {
        marginLeft: 6,
        marginTop: 2,
    },
    profileCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        height: 48, // Taller search bar like screens
        borderRadius: 16, // Softer corners
        paddingHorizontal: 16,
        // Shadow for depth
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    searchRightIcons: {
        marginLeft: 'auto',
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    wishlistBtn: {
        width: 48,
        height: 48,
        backgroundColor: colors.white,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#FF3B30',
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.white,
    }
});
