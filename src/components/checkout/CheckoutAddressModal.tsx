import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, BackHandler, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { MonoText } from '../shared/MonoText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Address, addressService } from '../../services/customer/address.service';
import { useNavigation } from '@react-navigation/native';
import { SkeletonItem } from '../shared/SkeletonLoader';
import { logger } from '../../utils/logger';

interface CheckoutAddressModalProps {
    visible: boolean;
    onSelectAddress: (addressId: string) => void;
    onBackWithoutSelection: () => void;
    onCancel: () => void; // Just close modal, keep existing selection
    onAddNewAddress: () => void;
    selectedAddressId?: string | null;
}

export const CheckoutAddressModal: React.FC<CheckoutAddressModalProps> = ({
    visible,
    onSelectAddress,
    onBackWithoutSelection,
    onCancel,
    onAddNewAddress,
    selectedAddressId,
}) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [optionsMenuAddressId, setOptionsMenuAddressId] = useState<string | null>(null);

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

    // Handle hardware back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (visible) {
                onBackWithoutSelection();
                return true;
            }
            return false;
        });

        return () => backHandler.remove();
    }, [visible, onBackWithoutSelection]);

    const handleSelectAddress = (addressId: string) => {
        onSelectAddress(addressId);
    };

    const handleAddNewAddress = () => {
        // Close modal and navigate to AddAddress screen
        onAddNewAddress();
    };

    const getAddressLabel = (address: Address) => {
        if (address.label === 'Other' && address.labelCustom) {
            return address.labelCustom;
        }
        return address.label || 'Home';
    };

    const toggleOptionsMenu = (addressId: string) => {
        setOptionsMenuAddressId(prev => (prev === addressId ? null : addressId));
    };

    const handleEditAddress = (address: Address) => {
        setOptionsMenuAddressId(null);
        onCancel();
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

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onBackWithoutSelection}
            statusBarTranslucent={true}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>

                    {/* Handle bar */}
                    <View style={styles.handleBar} />

                    {/* Header */}
                    <View style={styles.header}>
                        <MonoText size="l" weight="bold">Select an Address</MonoText>
                        {/* Close button - enabled if address already selected */}
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => {
                                // If address is already selected, just cancel/close modal
                                if (selectedAddressId) {
                                    onCancel();
                                }
                            }}
                            disabled={!selectedAddressId}
                        >
                            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={selectedAddressId ? colors.textLight : '#D1D5DB'} strokeWidth="2">
                                <Circle cx="12" cy="12" r="10" />
                                <Line x1="15" y1="9" x2="9" y2="15" />
                                <Line x1="9" y1="9" x2="15" y2="15" />
                            </Svg>
                        </TouchableOpacity>
                    </View>

                    {/* Address List */}
                    {loading ? (
                        <View style={styles.addressList}>
                            {[1, 2, 3].map((i) => (
                                <View key={i} style={styles.skeletonCard}>
                                    <SkeletonItem width={24} height={24} borderRadius={12} style={{ marginRight: spacing.m }} />
                                    <View style={{ flex: 1 }}>
                                        <SkeletonItem width="40%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                                        <SkeletonItem width="80%" height={12} borderRadius={4} style={{ marginBottom: 6 }} />
                                        <SkeletonItem width="60%" height={12} borderRadius={4} />
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : addresses.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="1.5">
                                <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <Circle cx="12" cy="10" r="3" />
                            </Svg>
                            <MonoText size="m" color={colors.textLight} style={styles.emptyText}>
                                No saved addresses yet
                            </MonoText>
                            <MonoText size="s" color={colors.textLight} style={{ textAlign: 'center', marginTop: 4 }}>
                                Add an address to continue checkout
                            </MonoText>
                        </View>
                    ) : (
                        <ScrollView style={styles.addressList} showsVerticalScrollIndicator={false}>
                            {addresses.map((address) => (
                                <TouchableOpacity
                                    key={address._id}
                                    style={[
                                        styles.addressCard,
                                        selectedAddressId === address._id && styles.addressCardSelected,
                                        { zIndex: optionsMenuAddressId === address._id ? 100 : 1 }
                                    ]}
                                    onPress={() => handleSelectAddress(address._id)}
                                >
                                    {/* Radio Button */}
                                    <View style={[
                                        styles.radio,
                                        selectedAddressId === address._id && styles.radioSelected
                                    ]}>
                                        {selectedAddressId === address._id && (
                                            <View style={styles.radioInner} />
                                        )}
                                    </View>

                                    {/* Address Info */}
                                    <View style={styles.addressInfo}>
                                        <MonoText weight="bold" size="m">{getAddressLabel(address)}</MonoText>
                                        {address.receiverName && (
                                            <MonoText size="xs" color={colors.primary} style={{ marginTop: 2 }}>
                                                For: {address.receiverName}
                                            </MonoText>
                                        )}
                                        <MonoText size="s" color={colors.text} numberOfLines={1} style={{ marginTop: 2 }}>
                                            {address.addressLine1}
                                        </MonoText>
                                        {address.addressLine2 && (
                                            <MonoText size="xs" color={colors.textLight} numberOfLines={1}>
                                                {address.addressLine2}
                                            </MonoText>
                                        )}
                                        <MonoText size="xs" color={colors.textLight}>
                                            {address.city}, {address.state} {address.zipCode}
                                        </MonoText>
                                    </View>

                                    {/* Three dot menu - Positioned top right like AddressSelectionModal */}
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
                            ))}
                        </ScrollView>
                    )}

                    {/* Add New Address Button */}
                    <TouchableOpacity style={styles.addAddressBtn} onPress={handleAddNewAddress}>
                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2.5">
                            <Line x1="12" y1="5" x2="12" y2="19" />
                            <Line x1="5" y1="12" x2="19" y2="12" />
                        </Svg>
                        <MonoText weight="bold" color={colors.white} style={{ marginLeft: 8 }}>
                            Add New Address
                        </MonoText>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: spacing.l,
        paddingTop: spacing.s,
        maxHeight: '80%',
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: '#D1D5DB',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: spacing.m,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.l,
    },
    closeBtn: {
        padding: 4,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyText: {
        marginTop: spacing.m,
    },
    addressList: {
        maxHeight: 300,
    },
    addressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.m,
        backgroundColor: colors.white,
        borderRadius: 16,
        marginBottom: spacing.m,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    addressCardSelected: {
        borderColor: colors.primary,
        backgroundColor: '#F0FDF4',
    },
    skeletonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.m,
        backgroundColor: colors.white,
        borderRadius: 16,
        marginBottom: spacing.m,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    radio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.m,
    },
    radioSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.white,
    },
    addressInfo: {
        flex: 1,
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
    addAddressBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        backgroundColor: colors.primary,
        borderRadius: 12,
        marginTop: spacing.m,
    },
});
