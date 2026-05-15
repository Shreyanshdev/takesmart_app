import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import Animated, {
    useAnimatedStyle,
    interpolateColor,
    interpolate,
    SharedValue,
    Extrapolation,
    useDerivedValue,
    useAnimatedReaction,
    runOnJS
} from 'react-native-reanimated';
import { SafeBlurView as BlurView } from '../shared/SafeBlurView';
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
    const addressDisplay = displayAddress || currentAddress || 'Set delivery location';

    // --- Animations ---
    const SCROLL_RANGE = 100;

    const scroll = useDerivedValue(() => {
        return interpolate(scrollY.value, [0, SCROLL_RANGE], [0, 1], Extrapolation.CLAMP);
    });

    const containerStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            scroll.value,
            [0, 1],
            [colors.primary, colors.white]
        );

        return {
            backgroundColor,
            ...(Platform.OS === 'android' ? {
                elevation: interpolate(scroll.value, [0, 1], [0, 4]),
            } : {}),
        };
    });

    const blurStyle = useAnimatedStyle(() => {
        return {
            opacity: scroll.value,
        };
    });

    const topRowStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(scroll.value, [0, 0.6], [1, 0]),
            transform: [
                { translateY: interpolate(scroll.value, [0, 1], [0, -20]) }
            ],
            // Reduced expanded height from 60 to 50 for a tighter look
            height: interpolate(scroll.value, [0, 1], [50, 0]),
            // Reduced bottom margin
            marginBottom: interpolate(scroll.value, [0, 1], [12, 0]),
        };
    });

    const [barStyle, setBarStyle] = useState<'light-content' | 'dark-content'>('light-content');

    useAnimatedReaction(
        () => scroll.value > 0.5,
        (isScrolled, previousIsScrolled) => {
            if (isScrolled !== previousIsScrolled) {
                runOnJS(setBarStyle)(isScrolled ? 'dark-content' : 'light-content');
            }
        }
    );

    // --- Handlers ---
    const handleOpenModal = useCallback(() => setIsModalVisible(true), []);
    const handleCloseModal = useCallback(() => setIsModalVisible(false), []);
    const handleSelectAddress = useCallback((address: Address | null, branch: Branch | null, addrDisplay: string) => {
        setSelectedAddress(address);
        setDisplayBranch(branch);
        setDisplayAddress(addrDisplay);
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

    useEffect(() => {
        const checkModalStatus = async () => {
            const hasShown = await AsyncStorage.getItem(ADDRESS_MODAL_SHOWN_KEY);

            if (shouldShowAddressModal || !hasShown) {
                handleOpenModal();
                if (!hasShown) {
                    await AsyncStorage.setItem(ADDRESS_MODAL_SHOWN_KEY, 'true');
                }
                if (shouldShowAddressModal) {
                    setShouldShowAddressModal(false);
                }
            }
        };
        checkModalStatus();
    }, [handleOpenModal, shouldShowAddressModal, setShouldShowAddressModal]);

    return (
        <Animated.View style={[styles.container, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : insets.top }, containerStyle]}>
            <StatusBar barStyle={barStyle} backgroundColor="transparent" translucent />

            <Animated.View style={[StyleSheet.absoluteFill, blurStyle, { zIndex: 0 }]}>
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="light"
                    blurAmount={20}
                    reducedTransparencyFallbackColor="white"
                />
            </Animated.View>

            <View style={styles.content}>
                {/* TOP ROW: ETA + Address + Profile */}
                <Animated.View style={[styles.topRow, topRowStyle]}>
                    <TouchableOpacity
                        onPress={handleOpenModal}
                        disabled={isFetching}
                        style={styles.locationContainer}
                    >
                        {isFetching ? (
                            <View>
                                <SkeletonItem width={90} height={20} borderRadius={6} style={{ marginBottom: 4 }} />
                                <SkeletonItem width={160} height={14} borderRadius={4} />
                            </View>
                        ) : (
                            <View>
                                {/* Line 1: Bolt + ETA */}
                                <View style={styles.etaRow}>
                                    <Svg width="14" height="14" viewBox="0 0 24 24" fill={colors.white} style={{ marginRight: 6 }}>
                                        <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                    </Svg>
                                    <MonoText size="l" weight="bold" color={colors.white} style={{ fontSize: 20 }}>
                                        {!isServiceAvailable ? 'No Service' : `${eta} mins`}
                                    </MonoText>
                                </View>

                                {/* Line 2: Home + Address */}
                                <View style={styles.addressRow}>
                                    <Svg width="12" height="12" viewBox="0 0 24 24" fill={colors.white} style={{ marginRight: 6, marginTop: -2 }}>
                                        <Path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                                    </Svg>
                                    <MonoText size="s" weight="bold" color={colors.white} numberOfLines={1} style={{ flexShrink: 1 }}>
                                        Home - {addressDisplay}
                                    </MonoText>
                                    <View style={styles.caretIcon}>
                                        <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <Path d="M6 9l6 6 6-6" />
                                        </Svg>
                                    </View>
                                </View>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Profile Button */}
                    <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.circleBtn}>
                        <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <Circle cx="12" cy="7" r="4" />
                        </Svg>
                    </TouchableOpacity>
                </Animated.View>

                {/* BOTTOM ROW: Search Pill + Wishlist Circle */}
                <View style={styles.bottomRow}>
                    <TouchableOpacity
                        style={styles.searchBar}
                        onPress={() => navigation.navigate('Search')}
                        activeOpacity={0.9}
                    >
                        <View style={styles.searchLeft}>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A4A4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                                <Circle cx="11" cy="11" r="8" />
                                <Line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </Svg>
                            <MonoText size="m" color="#666666">Search for 'cheese'</MonoText>
                        </View>

                        {/* Mic Icon */}
                        <View style={styles.searchRightIcons}>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <Line x1="12" y1="19" x2="12" y2="23" />
                                <Line x1="8" y1="23" x2="16" y2="23" />
                            </Svg>
                        </View>
                    </TouchableOpacity>

                    {/* Wishlist / Notepad Button */}
                    <TouchableOpacity
                        style={styles.circleBtn}
                        onPress={() => navigation.navigate('Wishlist')}
                    >
                        <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                            <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                            <Path d="M9 14h6" />
                            <Path d="M9 18h6" />
                            <Path d="M10 10h4" />
                        </Svg>

                        {wishlistCount > 0 && (
                            <View style={styles.badge}>
                                <MonoText weight="bold" color={colors.white} style={{ fontSize: 8 }}>
                                    {wishlistCount}
                                </MonoText>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

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
        paddingBottom: 14,
        overflow: 'hidden',
    },
    content: {
        zIndex: 1,
        paddingHorizontal: spacing.m,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        overflow: 'hidden',
    },
    locationContainer: {
        flex: 1,
        marginRight: 12,
        justifyContent: 'center',
    },
    etaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    caretIcon: {
        marginLeft: 2,
        marginTop: 2,
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10, // Slightly tighter gap between search and button
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.white,
        height: 46,           // Shrunk from 54
        borderRadius: 23,     // Perfect pill shape
        paddingHorizontal: 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    searchLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchRightIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    circleBtn: {
        width: 46,            // Shrunk from 54
        height: 46,
        backgroundColor: colors.white,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#FF3B30',
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: colors.white,
    }
});