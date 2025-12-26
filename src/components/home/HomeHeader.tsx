import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import Svg, { Path, Circle, Polyline, Line } from 'react-native-svg';
import Animated, { useAnimatedStyle, interpolateColor, interpolate, SharedValue } from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { useLocationLogic } from '../../hooks/useLocationLogic';
import { AddressSelectionModal } from './AddressSelectionModal';
import { Address } from '../../services/customer/address.service';
import { Branch } from '../../services/customer/branch.service';

import { useNavigation } from '@react-navigation/native';

interface HomeHeaderProps {
    scrollY: SharedValue<number>;
}

export const HomeHeader = ({ scrollY }: HomeHeaderProps) => {
    const { locationStatus, currentAddress, nearestBranch, requestPermission, isFetching } = useLocationLogic();
    const navigation = useNavigation<any>();

    // State for address selection modal
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
    const [displayBranch, setDisplayBranch] = useState<Branch | null>(null);
    const [displayAddress, setDisplayAddress] = useState<string | null>(null);

    // Calculate ETA based on distance (assuming 5 mins per km + 10 mins prep)
    const activeBranch = displayBranch || nearestBranch;
    const eta = activeBranch?.distance
        ? Math.ceil(activeBranch.distance * 5) + 10
        : 15;

    const branchName = activeBranch?.name || 'Home';
    const addressDisplay = displayAddress || currentAddress;

    const containerAnimatedStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            scrollY.value,
            [0, 100],
            [colors.primary, 'rgba(255, 255, 255, 0.85)']
        );
        return { backgroundColor };
    });

    const blurOpacityStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [0, 80], [0, 1]);
        return { opacity };
    });

    const handleOpenModal = useCallback(() => {
        setIsModalVisible(true);
    }, []);

    // Auto-open modal when the app/component first mounts
    useEffect(() => {
        // Small delay to ensure smooth animation after screen loads
        const timer = setTimeout(() => {
            setIsModalVisible(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const handleCloseModal = useCallback(() => {
        setIsModalVisible(false);
    }, []);

    const handleSelectAddress = useCallback((address: Address | null, branch: Branch | null, addrDisplay: string) => {
        setSelectedAddress(address);
        setDisplayBranch(branch);
        setDisplayAddress(addrDisplay);
    }, []);

    const handleUseCurrentLocation = useCallback(() => {
        // Reset to current location
        setSelectedAddress(null);
        setDisplayBranch(null);
        setDisplayAddress(null);
        requestPermission();
    }, [requestPermission]);

    return (
        <Animated.View style={[styles.container, containerAnimatedStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, blurOpacityStyle]}>
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="light"
                    blurAmount={20}
                    reducedTransparencyFallbackColor="white"
                />
            </Animated.View>

            <View style={styles.safeContent}>
                <View style={styles.locationRow}>
                    <TouchableOpacity
                        style={styles.locationTextContainer}
                        onPress={handleOpenModal}
                        disabled={isFetching}
                    >
                        <View style={styles.row}>
                            <View style={styles.locIcon}>
                                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={locationStatus === 'denied' ? colors.error : colors.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <Circle cx="12" cy="10" r="3" />
                                </Svg>
                            </View>
                            <MonoText size="xs" weight="bold" color={colors.text}>
                                {isFetching ? 'Locating...' : (locationStatus === 'denied' ? 'Location Required' : branchName)}
                            </MonoText>
                            <View style={{ marginLeft: 4 }}>
                                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <Polyline points="6 9 12 15 18 9" />
                                </Svg>
                            </View>
                        </View>
                        <MonoText size="xs" color={colors.text} numberOfLines={1}>
                            {addressDisplay || "Tap to set location"}
                        </MonoText>
                    </TouchableOpacity>
                    <View style={styles.deliveryBadge}>
                        <MonoText size="xxs" weight="bold" color={colors.white}>{eta} MINS</MonoText>
                    </View>
                </View>

                {/* Address Selection Modal */}
                <AddressSelectionModal
                    visible={isModalVisible}
                    onClose={handleCloseModal}
                    onSelectAddress={handleSelectAddress}
                    onUseCurrentLocation={handleUseCurrentLocation}
                    currentLocationAddress={currentAddress}
                    nearestBranch={nearestBranch}
                    isFetchingLocation={isFetching}
                />

                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
                        <View style={styles.profilePlaceholder} >
                            <MonoText size="xs" weight="bold" color={colors.white}>V</MonoText>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.searchBar}
                        onPress={() => navigation.navigate('Search')}
                        activeOpacity={0.9}
                    >
                        <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Circle cx="11" cy="11" r="8" />
                            <Line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </Svg>
                        <MonoText size="s" color={colors.textLight} style={styles.searchText}>Search "Ghee"</MonoText>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('AddressSelection')}>
                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Circle cx="9" cy="21" r="1" />
                            <Circle cx="20" cy="21" r="1" />
                            <Path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </Svg>
                    </TouchableOpacity>
                </View>
            </View>
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
        // Android Status Bar Fix: 
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 50,
        paddingBottom: spacing.s,
        paddingHorizontal: spacing.m,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflow: 'hidden',
    },
    safeContent: {
        zIndex: 1,
    },
    locationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    locationTextContainer: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locIcon: {
        marginRight: 4,
    },
    deliveryBadge: {
        backgroundColor: colors.black,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s,
    },
    profileBtn: {
        padding: 0,
    },
    profilePlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.success,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.white,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        height: 40,
        borderRadius: 12,
        paddingHorizontal: spacing.s,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    searchText: {
        marginLeft: spacing.s,
        opacity: 0.7,
    },
    cartBtn: {
        width: 40,
        height: 40,
        backgroundColor: colors.white,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    }
});
