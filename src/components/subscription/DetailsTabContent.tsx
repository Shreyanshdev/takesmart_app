/**
 * Details Tab Content Component
 * Displays subscription details, address, delivery partner, and products list
 * Redesigned with yellow/red theme and compact pill styles
 */
import React from 'react';
import { View, ScrollView, TouchableOpacity, Linking, StyleSheet, Dimensions } from 'react-native';
import { MonoText } from '../shared/MonoText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import { Subscription } from '../../services/customer/subscription.service';

const { width } = Dimensions.get('window');

interface DetailsTabContentProps {
    subscription: Subscription;
    navigation: any;
    styles: any; // Pass styles from parent (unused now, using local)
}

export const DetailsTabContent: React.FC<DetailsTabContentProps> = ({
    subscription,
    navigation,
}) => {
    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    };

    return (
        <ScrollView style={localStyles.container} contentContainerStyle={localStyles.content}>
            {/* Status Banner */}
            <View style={[
                localStyles.statusBanner,
                { backgroundColor: subscription.status === 'active' ? '#FEF3C7' : '#FEE2E2' }
            ]}>
                <View style={localStyles.statusBannerLeft}>
                    <View style={[
                        localStyles.statusDot,
                        { backgroundColor: subscription.status === 'active' ? '#F59E0B' : '#EF4444' }
                    ]} />
                    <MonoText size="s" weight="bold" color={subscription.status === 'active' ? '#B45309' : '#DC2626'}>
                        {subscription.status === 'active' ? 'Active Subscription' : 'Inactive'}
                    </MonoText>
                </View>
                <View style={localStyles.idBadge}>
                    <MonoText size="xxs" weight="bold" color={colors.textLight}>
                        #{subscription.subscriptionId || subscription._id.slice(-6).toUpperCase()}
                    </MonoText>
                </View>
            </View>

            {/* Quick Info Pills */}
            <View style={localStyles.pillsRow}>
                <View style={localStyles.infoPill}>
                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                        <Circle cx="12" cy="12" r="10" />
                        <Polyline points="12 6 12 12 16 14" />
                    </Svg>
                    <MonoText size="xs" weight="bold" color={colors.text}>
                        {subscription.slot === 'morning' ? 'Morning' : 'Evening'}
                    </MonoText>
                </View>
                <View style={localStyles.infoPill}>
                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                        <Path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
                        <Path d="M16 2v4M8 2v4M3 10h18" />
                    </Svg>
                    <MonoText size="xs" weight="bold" color={colors.text}>
                        {formatDate(subscription.startDate)} - {formatDate(subscription.endDate)}
                    </MonoText>
                </View>
            </View>

            {/* Address Card */}
            {subscription.deliveryAddress && (
                <View style={localStyles.card}>
                    <View style={localStyles.cardHeader}>
                        <View style={localStyles.cardIconContainer}>
                            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                <Circle cx="12" cy="10" r="3" />
                            </Svg>
                        </View>
                        <MonoText size="xs" weight="bold" color={colors.textLight}>DELIVERY ADDRESS</MonoText>
                    </View>
                    <MonoText size="s" weight="bold" numberOfLines={2}>
                        {subscription.deliveryAddress.addressLine1}
                        {subscription.deliveryAddress.addressLine2 ? `, ${subscription.deliveryAddress.addressLine2}` : ''}
                    </MonoText>
                    <MonoText size="xs" color={colors.textLight}>
                        {subscription.deliveryAddress.city}{subscription.deliveryAddress.state ? `, ${subscription.deliveryAddress.state}` : ''}
                        {subscription.deliveryAddress.zipCode ? ` - ${subscription.deliveryAddress.zipCode}` : ''}
                    </MonoText>
                </View>
            )}

            {/* Delivery Partner Card */}
            <View style={localStyles.card}>
                <View style={localStyles.cardHeader}>
                    <View style={[localStyles.cardIconContainer, { backgroundColor: '#FEF3C7' }]}>
                        <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                            <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                            <Circle cx="12" cy="7" r="4" />
                        </Svg>
                    </View>
                    <MonoText size="xs" weight="bold" color={colors.textLight}>DELIVERY PARTNER</MonoText>
                </View>

                {subscription.deliveryPartner && (subscription.deliveryPartner.name || subscription.deliveryPartner.partner) ? (
                    <View style={localStyles.partnerRow}>
                        <View style={localStyles.partnerAvatar}>
                            <MonoText weight="bold" color={colors.white} size="m">
                                {(subscription.deliveryPartner.name || subscription.deliveryPartner.partner?.name || 'D')[0]}
                            </MonoText>
                        </View>
                        <View style={{ flex: 1 }}>
                            <MonoText weight="bold" size="s">
                                {subscription.deliveryPartner.name || subscription.deliveryPartner.partner?.name || 'Partner Assigned'}
                            </MonoText>
                            <MonoText size="xs" color={colors.textLight}>
                                {subscription.deliveryPartner.phone || subscription.deliveryPartner.partner?.phone || ''}
                            </MonoText>
                        </View>
                        {(subscription.deliveryPartner.phone || subscription.deliveryPartner.partner?.phone) && (
                            <TouchableOpacity
                                style={localStyles.callBtn}
                                onPress={() => {
                                    const phone = subscription.deliveryPartner.phone || subscription.deliveryPartner.partner?.phone;
                                    if (phone) Linking.openURL(`tel:${phone}`);
                                }}
                            >
                                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2">
                                    <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                                </Svg>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View style={localStyles.pendingPartner}>
                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
                            <Circle cx="12" cy="12" r="10" />
                            <Path d="M12 8v4l3 3" />
                        </Svg>
                        <MonoText size="s" color="#9CA3AF">Pending assignment...</MonoText>
                    </View>
                )}
            </View>

            {/* Products Section */}
            <View style={localStyles.sectionHeader}>
                <MonoText size="m" weight="bold">Your Products</MonoText>
                <TouchableOpacity
                    style={localStyles.addBtn}
                    onPress={() => navigation.navigate('AddProductToSubscription', {
                        subscriptionId: subscription._id,
                        subscription: subscription
                    })}
                >
                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2.5">
                        <Path d="M12 5v14M5 12h14" />
                    </Svg>
                    <MonoText size="xs" weight="bold" color={colors.primary}>Add</MonoText>
                </TouchableOpacity>
            </View>

            {subscription.products.map((product, index) => (
                <View key={product.subscriptionProductId || index} style={localStyles.productCard}>
                    <View style={localStyles.productLeft}>
                        <MonoText weight="bold" size="s">{product.productName}</MonoText>
                        <View style={localStyles.productDetails}>
                            <View style={localStyles.productPill}>
                                <MonoText size="xxs" color={colors.textLight}>
                                    {product.quantityValue}{product.quantityUnit}
                                </MonoText>
                            </View>
                            <View style={localStyles.productPill}>
                                <MonoText size="xxs" color={colors.textLight}>
                                    {product.deliveryFrequency}
                                </MonoText>
                            </View>
                        </View>
                    </View>
                    <View style={localStyles.productRight}>
                        <MonoText weight="bold" size="m" color={colors.primary}>
                            ₹{product.monthlyPrice || product.unitPrice}
                        </MonoText>
                        <View style={localStyles.remainingBadge}>
                            <MonoText size="xxs" weight="bold" color="#F59E0B">
                                {product.remainingDeliveries} left
                            </MonoText>
                        </View>
                    </View>
                </View>
            ))}
        </ScrollView>
    );
};

const localStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    content: {
        padding: spacing.m,
        paddingBottom: spacing.xl * 2,
    },
    // Status Banner
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.m,
        borderRadius: 16,
        marginBottom: spacing.m,
    },
    statusBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    idBadge: {
        paddingHorizontal: spacing.s,
        paddingVertical: 4,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 8,
    },
    // Pills Row
    pillsRow: {
        flexDirection: 'row',
        gap: spacing.s,
        marginBottom: spacing.m,
    },
    infoPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    // Cards
    card: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.m,
        marginBottom: spacing.m,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s,
        marginBottom: spacing.s,
    },
    cardIconContainer: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Partner
    partnerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.m,
    },
    partnerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    callBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pendingPartner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s,
        paddingVertical: spacing.s,
    },
    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.m,
        marginTop: spacing.s,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
        backgroundColor: colors.primary + '15',
        borderRadius: 20,
    },
    // Product Cards
    productCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.white,
        borderRadius: 14,
        padding: spacing.m,
        marginBottom: spacing.s,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    productLeft: {
        flex: 1,
    },
    productDetails: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 4,
    },
    productPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: '#F3F4F6',
        borderRadius: 6,
    },
    productRight: {
        alignItems: 'flex-end',
    },
    remainingBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: '#FEF3C7',
        borderRadius: 8,
        marginTop: 4,
    },
});

export default DetailsTabContent;
