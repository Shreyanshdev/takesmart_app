import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { BlurBottomSheet } from '../shared/BlurBottomSheet';
import { MonoText } from '../shared/MonoText';
import { SkeletonItem } from '../shared/SkeletonLoader';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Address, addressService } from '../../services/customer/address.service';
import { branchService, Branch } from '../../services/customer/branch.service';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { ENV } from '../../utils/env';
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
    const [optionsMenuAddressId, setOptionsMenuAddressId] = useState<string | null>(null);

    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = useCallback(async (query: string) => {
        setSearchQuery(query);
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${ENV.GOOGLE_MAPS_API_KEY}&components=country:in&types=geocode`;
            const res = await axios.get(url);
            if (res.data.status === 'OK') {
                setSearchResults(res.data.predictions || []);
            }
        } catch (error) {
            logger.error('Search error', error);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleSelectSearchResult = (placeId: string) => {
        onClose();
        // Redirect to AddAddress in quick select mode
        navigation.navigate('AddAddress', {
            isQuickSelect: true,
            selectedPlaceId: placeId
        });
    };


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

    const toggleOptionsMenu = (addressId: string) => {
        setOptionsMenuAddressId(prev => (prev === addressId ? null : addressId));
    };

    const handleEditAddress = (address: Address) => {
        setOptionsMenuAddressId(null);
        onClose();
        navigation.navigate('AddAddress', { editAddress: address });
    };

    const handleDeleteAddress = async (address: Address) => {
        setOptionsMenuAddressId(null);
        Alert.alert(
            'Delete Address',
            `Are you sure you want to delete this address?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await addressService.deleteAddress(address._id);
                            fetchAddresses();
                        } catch (error) {
                            logger.error('Failed to delete address', error);
                        }
                    }
                }
            ]
        );
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
            <View style={styles.container}>
                <MonoText size="l" weight="bold" style={styles.title}>
                    Select delivery location
                </MonoText>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputWrapper}>
                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Circle cx="11" cy="11" r="8" />
                            <Line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </Svg>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search for area, street name..."
                            placeholderTextColor={colors.textLight}
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                    </View>
                </View>

                {/* Search Results Overlay */}
                {searchQuery.length >= 3 && (
                    <View style={styles.searchResults}>
                        {isSearching ? (
                            <ActivityIndicator size="small" color={colors.primary} style={{ padding: spacing.m }} />
                        ) : searchResults.length > 0 ? (
                            searchResults.map((item) => (
                                <TouchableOpacity
                                    key={item.place_id}
                                    style={styles.searchResultItem}
                                    onPress={() => handleSelectSearchResult(item.place_id)}
                                >
                                    <View style={styles.searchResultIcon}>
                                        <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                            <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                            <Circle cx="12" cy="10" r="3" />
                                        </Svg>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <MonoText weight="bold" size="s">{item.structured_formatting.main_text}</MonoText>
                                        <MonoText size="xs" color={colors.textLight} numberOfLines={1}>
                                            {item.structured_formatting.secondary_text}
                                        </MonoText>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <MonoText size="xs" color={colors.textLight} style={{ padding: spacing.m }}>No results found</MonoText>
                        )}
                    </View>
                )}

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                    {/* Action Buttons */}
                    <View style={styles.actionSection}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={handleUseCurrentLocation}
                            disabled={isFetchingLocation}
                        >
                            <View style={styles.actionIconCircle}>
                                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isFetchingLocation ? "#2D7A14" : "#2D7A14"} strokeWidth="2">
                                    <Circle cx="12" cy="12" r="10" />
                                    <Path d="M22 12h-4M6 12H2M12 6V2M12 22v-4" />
                                    <Circle cx="12" cy="12" r="3" />
                                </Svg>
                            </View>
                            <View style={styles.actionTextContent}>
                                {isFetchingLocation ? (
                                    <>
                                        <SkeletonItem width="60%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                                        <SkeletonItem width="80%" height={12} borderRadius={4} />
                                    </>
                                ) : (
                                    <>
                                        <MonoText weight="bold" color="#2D7A14">
                                            Use current location
                                        </MonoText>
                                        <MonoText size="xs" color={colors.textLight} numberOfLines={1}>
                                            {currentLocationAddress || 'Allow access to your location'}
                                        </MonoText>
                                    </>
                                )}
                            </View>
                            {!isFetchingLocation && (
                                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                    <Path d="M9 18l6-6-6-6" />
                                </Svg>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn} onPress={handleAddNewAddress}>
                            <View style={styles.actionIconCircle}>
                                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D7A14" strokeWidth="2">
                                    <Line x1="12" y1="5" x2="12" y2="19" />
                                    <Line x1="5" y1="12" x2="19" y2="12" />
                                </Svg>
                            </View>
                            <View style={styles.actionTextContent}>
                                <MonoText weight="bold" color="#2D7A14">Add new address</MonoText>
                            </View>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                <Path d="M9 18l6-6-6-6" />
                            </Svg>
                        </TouchableOpacity>
                    </View>


                    {/* Saved Addresses Section */}
                    <View style={styles.savedSection}>
                        <MonoText size="s" weight="bold" color={colors.textLight} style={styles.savedLabel}>Your saved addresses</MonoText>

                        {loading ? (
                            <View>
                                {[1, 2, 3].map((i) => (
                                    <View key={i} style={styles.skeletonCard}>
                                        <View style={styles.savedIconOuter}>
                                            <SkeletonItem width={48} height={48} borderRadius={12} />
                                        </View>
                                        <View style={styles.savedContent}>
                                            <SkeletonItem width="40%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                                            <SkeletonItem width="80%" height={12} borderRadius={4} />
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : addresses.length === 0 ? (
                            <View style={styles.noSaved}>
                                <MonoText size="xs" color={colors.textLight}>No saved addresses found</MonoText>
                            </View>
                        ) : (
                            addresses.map((address) => (
                                <TouchableOpacity
                                    key={address._id}
                                    style={[
                                        styles.savedCard,
                                        { zIndex: optionsMenuAddressId === address._id ? 100 : 1 }
                                    ]}
                                    onPress={() => handleSelectSavedAddress(address)}
                                    disabled={selectingAddressId === address._id}
                                >
                                    <View style={styles.savedIconOuter}>
                                        <View style={styles.savedIconInner}>
                                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D9A51F" strokeWidth="2">
                                                <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                <Circle cx="12" cy="10" r="3" />
                                            </Svg>
                                        </View>
                                    </View>
                                    <View style={styles.savedContent}>
                                        <MonoText weight="bold" size="m">{address.label || 'Other'}</MonoText>
                                        <MonoText size="xs" color={colors.textLight} style={styles.addressLine}>
                                            {address.addressLine1}, {address.addressLine2 ? `${address.addressLine2}, ` : ''}{address.city}
                                        </MonoText>
                                    </View>

                                    {/* Actions in top right corner */}
                                    <View style={styles.cardActions}>
                                        <TouchableOpacity
                                            style={styles.cardActionBtn}
                                            onPress={() => toggleOptionsMenu(address._id)}
                                            activeOpacity={0.7}
                                        >
                                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2.5">
                                                <Circle cx="12" cy="12" r="1.2" />
                                                <Circle cx="12" cy="5" r="1.2" />
                                                <Circle cx="12" cy="19" r="1.2" />
                                            </Svg>
                                        </TouchableOpacity>

                                        {optionsMenuAddressId === address._id && (
                                            <View style={styles.optionsMenu}>
                                                <TouchableOpacity style={styles.optionItem} onPress={() => handleEditAddress(address)}>
                                                    <MonoText size="s" weight="bold">Edit</MonoText>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.optionItem, styles.deleteOption]} onPress={() => handleDeleteAddress(address)}>
                                                    <MonoText size="s" weight="bold" color="#E23744">Delete</MonoText>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}

                    </View>
                </ScrollView>
            </View>
        </BlurBottomSheet>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: spacing.s,
    },
    title: {
        marginBottom: spacing.m,
        color: colors.text,
    },
    searchContainer: {
        marginBottom: spacing.m,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 12,
        paddingHorizontal: spacing.m,
        height: 52,
        borderWidth: 1,
        borderColor: '#E8E8E8',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        marginLeft: spacing.s,
        fontFamily: typography.fontFamily,
        fontSize: typography.size.l,
        color: colors.text,
    },
    searchResults: {
        position: 'absolute',
        top: 110,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        zIndex: 100,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E8E8E8',
        maxHeight: 250,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    searchResultIcon: {
        marginRight: spacing.m,
    },
    actionSection: {
        marginBottom: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
        paddingBottom: spacing.s,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.s,
        marginBottom: spacing.xs,
    },
    actionIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3FBF1',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.m,
    },
    actionTextContent: {
        flex: 1,
    },
    savedSection: {
        marginTop: spacing.s,
    },
    savedLabel: {
        marginBottom: spacing.m,
    },
    noSaved: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    savedCard: {
        flexDirection: 'row',
        padding: spacing.m,
        backgroundColor: colors.white,
        borderRadius: 16,
        marginBottom: spacing.m,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    skeletonCard: {
        flexDirection: 'row',
        padding: spacing.m,
        backgroundColor: colors.white,
        borderRadius: 16,
        marginBottom: spacing.m,
        borderWidth: 1,
        borderColor: '#F8F8F8',
    },
    savedIconOuter: {
        marginRight: spacing.m,
    },
    savedIconInner: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FCF8ED',
        alignItems: 'center',
        justifyContent: 'center',
    },
    savedContent: {
        flex: 1,
    },
    addressLine: {
        lineHeight: 18,
    },
    cardActions: {
        position: 'absolute',
        top: 12,
        right: 8,
    },
    cardActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E8E8E8',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    optionsMenu: {
        position: 'absolute',
        right: 0,
        top: 36,
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        padding: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 10,
        zIndex: 100,
        minWidth: 100,
    },
    optionItem: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    deleteOption: {
        borderTopWidth: 1,
        borderTopColor: '#F5F5F5',
    },
});
