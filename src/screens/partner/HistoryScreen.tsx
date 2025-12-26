import React, { useEffect, useCallback, useState } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    RefreshControl,
    StatusBar,
    Platform,
    TouchableOpacity,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { HistoryOrderCard } from '../../components/partner/HistoryOrderCard';
import { PartnerHeader } from '../../components/partner/PartnerHeader';
import { usePartnerStore } from '../../store/partnerStore';
import { useAuthStore } from '../../store/authStore';

type FilterType = 'all' | 'delivered' | 'cancelled';

export const HistoryScreen = () => {
    const { user } = useAuthStore();
    const {
        historyOrders,
        isLoadingHistory,
        historyError,
        fetchHistoryOrders,
    } = usePartnerStore();

    const partnerId = user?._id;
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    // Fetch history on mount
    useEffect(() => {
        if (partnerId) {
            fetchHistoryOrders(partnerId);
        }
    }, [partnerId]);

    // Handle refresh
    const handleRefresh = useCallback(() => {
        if (partnerId) {
            fetchHistoryOrders(partnerId);
        }
    }, [partnerId]);

    // Filter orders
    const filteredOrders = historyOrders.filter(order => {
        if (activeFilter === 'all') return true;
        return order.status === activeFilter;
    });

    // Calculate stats
    const deliveredCount = historyOrders.filter(o => o.status === 'delivered').length;
    const cancelledCount = historyOrders.filter(o => o.status === 'cancelled').length;
    const totalEarnings = historyOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + o.totalPrice, 0);

    // Render empty state
    const renderEmpty = () => {
        if (isLoadingHistory) return null;

        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                    <Svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={colors.border} strokeWidth="1.5">
                        <Circle cx="12" cy="12" r="10" />
                        <Path d="M12 6v6l4 2" />
                    </Svg>
                </View>
                <MonoText size="l" weight="bold" style={styles.emptyTitle}>
                    No Order History
                </MonoText>
                <MonoText size="s" color={colors.textLight} style={styles.emptySubtitle}>
                    Completed deliveries will{'\n'}appear here.
                </MonoText>
            </View>
        );
    };

    // Render header with stats
    const renderHeader = () => (
        <View style={styles.statsSection}>
            <View style={[styles.statCard, { backgroundColor: `${colors.accent}15` }]}>
                <MonoText size="xxl" weight="bold" color={colors.accent}>
                    {deliveredCount}
                </MonoText>
                <MonoText size="xs" color={colors.textLight}>Delivered</MonoText>
            </View>
            <View style={[styles.statCard, { backgroundColor: `${colors.primary}15` }]}>
                <MonoText size="xxl" weight="bold" color={colors.primary}>
                    ₹{totalEarnings.toLocaleString()}
                </MonoText>
                <MonoText size="xs" color={colors.textLight}>Total Value</MonoText>
            </View>
            <View style={[styles.statCard, { backgroundColor: `${colors.error}10` }]}>
                <MonoText size="xxl" weight="bold" color={colors.error}>
                    {cancelledCount}
                </MonoText>
                <MonoText size="xs" color={colors.textLight}>Cancelled</MonoText>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

            {/* Header with Logout */}
            <PartnerHeader title="Order History" showProfile={false} variant="white" />

            {/* Order Count */}
            <View style={styles.orderCountRow}>
                <MonoText size="xs" color={colors.textLight}>
                    {historyOrders.length} total orders
                </MonoText>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                {(['all', 'delivered', 'cancelled'] as FilterType[]).map((filter) => (
                    <TouchableOpacity
                        key={filter}
                        style={[
                            styles.filterTab,
                            activeFilter === filter && styles.filterTabActive,
                        ]}
                        onPress={() => setActiveFilter(filter)}
                    >
                        <MonoText
                            size="xs"
                            weight={activeFilter === filter ? 'bold' : 'regular'}
                            color={activeFilter === filter ? colors.white : colors.text}
                        >
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </MonoText>
                    </TouchableOpacity>
                ))}
            </View>

            {/* History List */}
            <FlatList
                data={filteredOrders}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => <HistoryOrderCard order={item} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={historyOrders.length > 0 ? renderHeader : null}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoadingHistory}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={renderEmpty}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        backgroundColor: colors.white,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + spacing.m : 50,
        paddingBottom: spacing.m,
        paddingHorizontal: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    orderCountRow: {
        paddingHorizontal: spacing.m,
        paddingBottom: spacing.s,
        backgroundColor: colors.white,
    },
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        paddingHorizontal: spacing.m,
        paddingBottom: spacing.m,
        gap: spacing.s,
    },
    filterTab: {
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.xs,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
    },
    filterTabActive: {
        backgroundColor: colors.primary,
    },
    statsSection: {
        flexDirection: 'row',
        gap: spacing.s,
        marginBottom: spacing.m,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        padding: spacing.m,
        borderRadius: 12,
    },
    listContent: {
        padding: spacing.m,
        paddingBottom: 100,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.m,
    },
    emptyTitle: {
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        textAlign: 'center',
        lineHeight: 22,
    },
});
