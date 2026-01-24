import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, FlatList, ActivityIndicator, Animated } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { MonoText } from '../../../components/shared/MonoText';
import Svg, { Path, Circle, Polyline, Line, Rect } from 'react-native-svg';
import { Address, addressService } from '../../../services/customer/address.service';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { logger } from '../../../utils/logger';

// Icons
const Icons = {
    Edit: () => (
        <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
            <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </Svg>
    ),
    Delete: () => (
        <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth="2">
            <Polyline points="3 6 5 6 21 6" />
            <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </Svg>
    ),
    Home: () => (
        <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
            <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <Polyline points="9 22 9 12 15 12 15 22" />
        </Svg>
    ),
    Office: () => (
        <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
            <Rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
            <Line x1="9" y1="6" x2="9" y2="6" />
            <Line x1="15" y1="6" x2="15" y2="6" />
            <Line x1="9" y1="10" x2="9" y2="10" />
            <Line x1="15" y1="10" x2="15" y2="10" />
            <Line x1="9" y1="14" x2="9" y2="14" />
            <Line x1="15" y1="14" x2="15" y2="14" />
        </Svg>
    ),
};

export const AddressSelectionScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const { mode } = route.params || {};

    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (loading) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [loading]);

    const fetchAddresses = async () => {
        setLoading(true);
        try {
            const data = await addressService.getAddresses();
            setAddresses(data);
            // Auto-select default or first logic
            const defaultAddr = data.find(a => a.isDefault);
            if (defaultAddr) setSelectedId(defaultAddr._id);
            else if (data.length > 0) setSelectedId(data[0]._id);
        } catch (error) {
            logger.error('Failed to fetch addresses', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchAddresses();
        });
        return unsubscribe;
    }, [navigation]);

    const handleSelect = (id: string) => {
        setSelectedId(id);
    };

    const handleEdit = (address: Address) => {
        navigation.navigate('AddAddress', { editAddress: address });
    };

    const handleDelete = (address: Address) => {
        Alert.alert(
            'Delete Address',
            `Are you sure you want to delete this address?\n\n${address.addressLine1}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await addressService.deleteAddress(address._id);
                            // Refresh list
                            fetchAddresses();
                            // Clear selection if deleted address was selected
                            if (selectedId === address._id) {
                                setSelectedId(null);
                            }
                        } catch (error) {
                            logger.error('Failed to delete address:', error);
                            Alert.alert('Error', 'Failed to delete address. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    const handleConfirm = () => {
        if (selectedId) {
            navigation.navigate('Checkout', {
                addressId: selectedId,
                mode: mode || 'cart'
            });
        }
    };

    const getAddressLabel = (address: Address) => {
        if (address.label === 'Other' && address.labelCustom) {
            return address.labelCustom;
        }
        return address.label || 'Home';
    };

    const getLabelIcon = (label?: string) => {
        if (label === 'Office') return <Icons.Office />;
        return <Icons.Home />;
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M19 12H5M12 19l-7-7 7-7" />
                    </Svg>
                </TouchableOpacity>
                <MonoText size="l" weight="bold">Select Address</MonoText>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <Animated.View style={[styles.loaderContent, { opacity: fadeAnim }]}>
                        <View style={styles.loaderIconWrapper}>
                            <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <Circle cx="12" cy="10" r="3" />
                            </Svg>
                        </View>
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 16 }} />
                        <MonoText size="m" weight="bold" style={styles.loaderText}>Searching for Locations</MonoText>
                        <MonoText size="xs" color={colors.textLight} style={styles.loaderSubText}>Bringing fresh dairy to your doorstep...</MonoText>
                    </Animated.View>
                </View>
            ) : (
                <View style={{ flex: 1, padding: spacing.l }}>
                    <FlatList
                        data={addresses || []}
                        keyExtractor={(item: any) => item._id}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyState}>
                                <MonoText size="m" color={colors.textLight} style={{ textAlign: 'center', marginBottom: 20 }}>
                                    No addresses found. Add one to proceed.
                                </MonoText>
                            </View>
                        )}
                        renderItem={({ item: addr }) => (
                            <TouchableOpacity
                                style={[styles.addressCard, selectedId === addr._id && styles.selectedCard]}
                                onPress={() => handleSelect(addr._id)}
                            >
                                <View style={[styles.radio, selectedId === addr._id && styles.selectedRadio]}>
                                    {selectedId === addr._id && (
                                        <View style={styles.radioInner} />
                                    )}
                                </View>
                                <View style={styles.addressInfo}>
                                    <View style={styles.cardHeader}>
                                        {getLabelIcon(addr.label)}
                                        <MonoText weight="bold" size="m" style={{ marginLeft: 6 }}>
                                            {getAddressLabel(addr)}
                                        </MonoText>
                                        {addr.isDefault && (
                                            <View style={styles.defaultBadge}>
                                                <MonoText size="xs" color={colors.primary} weight="bold">DEFAULT</MonoText>
                                            </View>
                                        )}
                                    </View>
                                    {addr.receiverName && (
                                        <MonoText size="xs" color={colors.primary} weight="bold" style={{ marginBottom: 2 }}>
                                            For: {addr.receiverName}
                                        </MonoText>
                                    )}
                                    <MonoText color={colors.text} numberOfLines={1}>{addr.addressLine1}</MonoText>
                                    {addr.addressLine2 && (
                                        <MonoText color={colors.textLight} size="s" numberOfLines={1}>{addr.addressLine2}</MonoText>
                                    )}
                                    <MonoText color={colors.textLight} size="s">{addr.city}, {addr.zipCode}</MonoText>
                                </View>
                                {/* Edit/Delete Actions */}
                                <View style={styles.actionBtns}>
                                    <TouchableOpacity
                                        style={styles.iconBtn}
                                        onPress={() => handleEdit(addr)}
                                    >
                                        <Icons.Edit />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.iconBtn}
                                        onPress={() => handleDelete(addr)}
                                    >
                                        <Icons.Delete />
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        )}
                        ListFooterComponent={() => (
                            <TouchableOpacity
                                style={styles.addBtn}
                                onPress={() => navigation.navigate('AddAddress')}
                            >
                                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <Line x1="12" y1="5" x2="12" y2="19" />
                                    <Line x1="5" y1="12" x2="19" y2="12" />
                                </Svg>
                                <MonoText weight="bold" color={colors.primary}>Add New Address</MonoText>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[styles.confirmBtn, !selectedId && styles.disabledBtn]}
                    disabled={!selectedId}
                    onPress={handleConfirm}
                >
                    <MonoText weight="bold" color={colors.white}>Confirm Address</MonoText>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.l,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backBtn: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    content: {
        padding: spacing.l,
    },
    addressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.l,
        backgroundColor: colors.white,
        borderRadius: 16,
        marginBottom: spacing.m,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    selectedCard: {
        borderColor: colors.primary,
        backgroundColor: '#FEFCE8', // Light yellow tint
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.m,
    },
    selectedRadio: {
        borderColor: colors.primary,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
    addressInfo: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 4,
    },
    defaultBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    actionBtns: {
        flexDirection: 'row',
        gap: 8,
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.l,
        borderWidth: 1,
        borderColor: colors.primary,
        borderStyle: 'dashed',
        borderRadius: 16,
        gap: 8,
        marginTop: spacing.s,
    },
    footer: {
        padding: spacing.l,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        backgroundColor: colors.white,
    },
    confirmBtn: {
        height: 56,
        backgroundColor: colors.primary,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledBtn: {
        backgroundColor: '#D1D5DB',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loaderContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    loaderIconWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loaderText: {
        marginTop: 12,
        color: colors.text,
    },
    loaderSubText: {
        marginTop: 4,
        textAlign: 'center',
    }
});

