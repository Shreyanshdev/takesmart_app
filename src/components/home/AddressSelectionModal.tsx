import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { BlurBottomSheet } from '../shared/BlurBottomSheet';
import { MonoText } from '../shared/MonoText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Address, addressService } from '../../services/customer/address.service';
import { branchService, Branch } from '../../services/customer/branch.service';
import { useNavigation } from '@react-navigation/native';
import { logger } from '../../utils/logger';

interface AddressSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectAddress: (address: Address | null, branch: Branch | null, displayAddress: string) => void;
    onUseCurrentLocation: () => void;
    currentLocationAddress?: string | null;
    nearestBranch?: Branch | null;
    isFetchingLocation?: boolean;
}

export const AddressSelectionModal: React.FC<AddressSelectionModalProps> = ({
    visible,
    onClose,
    onSelectAddress,
    onUseCurrentLocation,
    currentLocationAddress,
    nearestBranch,
    isFetchingLocation,
}) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectingAddressId, setSelectingAddressId] = useState<string | null>(null);

    const fetchAddresses = useCallback(async () => {
        setLoading(true);
        try {
            const data = await addressService.getAddresses();
            setAddresses(data);
        } catch (error) {
            logger.error('Failed to fetch addresses', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (visible) {
            fetchAddresses();
        }
    }, [visible, fetchAddresses]);

    const handleSelectSavedAddress = async (address: Address) => {
        if (!address.latitude || !address.longitude) {
            // If address doesn't have coordinates, just select it without branch assignment
            onSelectAddress(address, null, `${address.addressLine1}, ${address.city}`);
            onClose();
            return;
        }

        setSelectingAddressId(address._id);
        try {
            const branch = await branchService.getNearestBranch(address.latitude, address.longitude);
            onSelectAddress(address, branch, `${address.addressLine1}, ${address.city}`);
        } catch (error) {
            logger.error('Failed to fetch nearest branch for address', error);
            onSelectAddress(address, null, `${address.addressLine1}, ${address.city}`);
        } finally {
            setSelectingAddressId(null);
            onClose();
        }
    };

    const handleUseCurrentLocation = () => {
        onUseCurrentLocation();
        onClose();
    };

    const handleAddNewAddress = () => {
        onClose();
        navigation.navigate('AddAddress');
    };

    return (
        <BlurBottomSheet visible={visible} onClose={onClose}>
            <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.m) }]}>
                <MonoText size="l" weight="bold" style={styles.title}>
                    Select Delivery Location
                </MonoText>
                <MonoText size="s" color={colors.textLight} style={styles.subtitle}>
                    Choose an address to find your nearest branch
                </MonoText>

                {/* Use Current Location Option */}
                <TouchableOpacity
                    style={styles.currentLocationBtn}
                    onPress={handleUseCurrentLocation}
                    disabled={isFetchingLocation}
                >
                    <View style={styles.locationIconContainer}>
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Circle cx="12" cy="12" r="10" />
                            <Path d="M22 12h-4M6 12H2M12 6V2M12 22v-4" />
                            <Circle cx="12" cy="12" r="3" />
                        </Svg>
                    </View>
                    <View style={styles.currentLocationText}>
                        <MonoText weight="bold" color={colors.primary}>
                            {isFetchingLocation ? 'Locating...' : 'Use Current Location'}
                        </MonoText>
                        {currentLocationAddress && !isFetchingLocation && (
                            <MonoText size="xs" color={colors.textLight} numberOfLines={1}>
                                {currentLocationAddress}
                            </MonoText>
                        )}
                    </View>
                    {isFetchingLocation && (
                        <ActivityIndicator size="small" color={colors.primary} />
                    )}
                    {!isFetchingLocation && nearestBranch && (
                        <View style={styles.branchBadge}>
                            <MonoText size="xxs" weight="bold" color={colors.white}>
                                {nearestBranch.name}
                            </MonoText>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <MonoText size="xs" color={colors.textLight} style={styles.dividerText}>
                        OR SELECT SAVED ADDRESS
                    </MonoText>
                    <View style={styles.dividerLine} />
                </View>

                {/* Saved Addresses */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <MonoText size="s" color={colors.textLight} style={{ marginLeft: spacing.s }}>
                            Loading addresses...
                        </MonoText>
                    </View>
                ) : addresses.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <Circle cx="12" cy="10" r="3" />
                        </Svg>
                        <MonoText size="s" color={colors.textLight} style={styles.emptyText}>
                            No saved addresses yet
                        </MonoText>
                    </View>
                ) : (
                    <ScrollView style={styles.addressList} showsVerticalScrollIndicator={false}>
                        {addresses.map((address) => (
                            <TouchableOpacity
                                key={address._id}
                                style={styles.addressCard}
                                onPress={() => handleSelectSavedAddress(address)}
                                disabled={selectingAddressId === address._id}
                            >
                                <View style={styles.addressIconContainer}>
                                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                        <Circle cx="12" cy="10" r="3" />
                                    </Svg>
                                </View>
                                <View style={styles.addressInfo}>
                                    <View style={styles.addressHeader}>
                                        <MonoText weight="bold" size="m">
                                            {address.isDefault ? 'Home' : 'Other'}
                                        </MonoText>
                                        {address.isDefault && (
                                            <View style={styles.defaultBadge}>
                                                <MonoText size="xxs" color={colors.primary} weight="bold">
                                                    DEFAULT
                                                </MonoText>
                                            </View>
                                        )}
                                    </View>
                                    <MonoText size="s" color={colors.text} numberOfLines={1}>
                                        {address.addressLine1}
                                    </MonoText>
                                    <MonoText size="xs" color={colors.textLight}>
                                        {address.city}, {address.zipCode}
                                    </MonoText>
                                </View>
                                {selectingAddressId === address._id ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <Path d="M9 18l6-6-6-6" />
                                    </Svg>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Add New Address Button */}
                <TouchableOpacity style={styles.addAddressBtn} onPress={handleAddNewAddress}>
                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <Line x1="12" y1="5" x2="12" y2="19" />
                        <Line x1="5" y1="12" x2="19" y2="12" />
                    </Svg>
                    <MonoText weight="bold" color={colors.primary}>
                        Add New Address
                    </MonoText>
                </TouchableOpacity>
            </View>
        </BlurBottomSheet>
    );
};

const styles = StyleSheet.create({
    container: {
        // paddingBottom handled dynamically with safe area insets
    },
    title: {
        marginBottom: spacing.xs,
    },
    subtitle: {
        marginBottom: spacing.l,
    },
    currentLocationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.m,
        backgroundColor: '#F0FDF4', // Light green background
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.primary,
        borderStyle: 'dashed',
    },
    locationIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.m,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    currentLocationText: {
        flex: 1,
    },
    branchBadge: {
        backgroundColor: colors.success,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.l,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dividerText: {
        marginHorizontal: spacing.m,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.l,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    emptyText: {
        marginTop: spacing.m,
    },
    addressList: {
        maxHeight: 200,
    },
    addressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.m,
        backgroundColor: colors.white,
        borderRadius: 12,
        marginBottom: spacing.s,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    addressIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.m,
    },
    addressInfo: {
        flex: 1,
    },
    addressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    defaultBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    addAddressBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.m,
        borderWidth: 1,
        borderColor: colors.primary,
        borderStyle: 'dashed',
        borderRadius: 12,
        gap: 8,
        marginTop: spacing.m,
    },
});
