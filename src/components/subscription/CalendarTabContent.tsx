/**
 * Calendar Tab Content Component (Modern Design)
 * Displays today's delivery, status legend, and calendar grid
 * Inspired by HomeScreen's premium aesthetic
 */
import React from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { MonoText } from '../shared/MonoText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { format } from 'date-fns';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CalendarTabContentProps {
    subscription: any;
    calendarData: any[];
    calendarGrid: Date[];
    renderDay: (date: Date) => React.ReactNode;
    loading: boolean;
    selectionMode: boolean;
    selectedDates: string[];
    setBulkModalVisible: (visible: boolean) => void;
    styles: any;
}

// Status colors for legend
const STATUS_LEGEND = [
    { label: 'Scheduled', bg: '#E3F2FD', border: '#2196F3', icon: '📅' },
    { label: 'Delivered', bg: '#E8F5E9', border: '#4CAF50', icon: '✅' },
    { label: 'Confirming', bg: '#FFFDE7', border: '#FBC02D', icon: '⏳' },
    { label: 'No Response', bg: '#FFF3E0', border: '#E65100', icon: '❓' },
    { label: 'Cancelled', bg: '#FFEBEE', border: '#F44336', icon: '❌' },
    { label: 'Concession', bg: '#F3E5F5', border: '#9C27B0', icon: '🔄', dashed: true },
];

export const CalendarTabContent: React.FC<CalendarTabContentProps> = ({
    subscription,
    calendarData,
    calendarGrid,
    renderDay,
    loading,
    selectionMode,
    selectedDates,
    setBulkModalVisible,
    styles,
}) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayDelivery = calendarData.find((d: any) => {
        const dDate = typeof d.date === 'string'
            ? d.date.split('T')[0]
            : new Date(d.date).toISOString().split('T')[0];
        return dDate === todayStr;
    });

    const showTodayCard = todayDelivery && !['canceled', 'paused'].includes(todayDelivery.status);
    const isAwaiting = todayDelivery?.status === 'awaitingCustomer';

    // Weekday headers
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <View style={localStyles.container}>
            {/* Today's Delivery Card - Clean Modern Style */}
            {showTodayCard && (
                <View style={localStyles.todayCard}>
                    <View style={localStyles.todayHeader}>
                        <View style={localStyles.todayBadge}>
                            <MonoText size="xxs" weight="bold" color={colors.white}>TODAY</MonoText>
                        </View>
                        <View style={[
                            localStyles.statusBadge,
                            { backgroundColor: isAwaiting ? '#FEF3C7' : (todayDelivery.status === 'delivered' ? '#D1FAE5' : '#DBEAFE') }
                        ]}>
                            <MonoText
                                size="xxs"
                                weight="bold"
                                color={isAwaiting ? '#D97706' : (todayDelivery.status === 'delivered' ? '#059669' : '#2563EB')}
                            >
                                {isAwaiting ? 'CONFIRM' : todayDelivery.status?.toUpperCase()}
                            </MonoText>
                        </View>
                    </View>

                    <View style={localStyles.todayContent}>
                        <View style={localStyles.slotInfo}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                <Circle cx="12" cy="12" r="10" />
                                <Polyline points="12 6 12 12 16 14" />
                            </Svg>
                            <MonoText size="m" weight="bold">
                                {subscription?.slot === 'morning' ? 'Morning Slot' : 'Evening Slot'}
                            </MonoText>
                        </View>

                        {todayDelivery.products && todayDelivery.products.length > 0 && (
                            <View style={localStyles.productsList}>
                                {todayDelivery.products.slice(0, 3).map((p: any, idx: number) => (
                                    <View key={idx} style={localStyles.productChip}>
                                        <MonoText size="xs" color={colors.text}>{p.productName}</MonoText>
                                        {p.quantity > 1 && (
                                            <MonoText size="xs" weight="bold" color={colors.primary}> ×{p.quantity}</MonoText>
                                        )}
                                    </View>
                                ))}
                                {todayDelivery.products.length > 3 && (
                                    <MonoText size="xs" color={colors.textLight}>
                                        +{todayDelivery.products.length - 3} more
                                    </MonoText>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Status Legend - Modern Pill Style */}
            <View style={localStyles.legendWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={localStyles.legendScroll}
                >
                    {STATUS_LEGEND.map((item, idx) => (
                        <View key={idx} style={localStyles.legendPill}>
                            <View style={[
                                localStyles.legendDot,
                                {
                                    backgroundColor: item.bg,
                                    borderColor: item.border,
                                    borderWidth: 1.5,
                                    borderStyle: item.dashed ? 'dashed' : 'solid'
                                }
                            ]} />
                            <MonoText size="xxs" color={colors.textLight}>{item.label}</MonoText>
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* Week Days Header - Modern Style */}
            <View style={localStyles.weekHeader}>
                {weekDays.map((day, idx) => (
                    <View key={idx} style={localStyles.weekDayCell}>
                        <MonoText
                            size="xs"
                            weight="bold"
                            color={idx === 0 || idx === 6 ? colors.error : colors.textLight}
                            style={{ opacity: 0.8 }}
                        >
                            {day}
                        </MonoText>
                    </View>
                ))}
            </View>

            {/* Calendar Grid - Modern Cards */}
            <ScrollView
                contentContainerStyle={localStyles.calendarGrid}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <View style={localStyles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <MonoText size="s" color={colors.textLight} style={{ marginTop: spacing.m }}>
                            Loading calendar...
                        </MonoText>
                    </View>
                ) : (
                    <View style={localStyles.daysGrid}>
                        {calendarGrid.map(renderDay)}
                    </View>
                )}
            </ScrollView>

            {/* Floating Action Button - Modern Gradient Style */}
            {selectionMode && selectedDates.length > 0 && (
                <View style={localStyles.fabWrapper}>
                    <TouchableOpacity
                        style={localStyles.fabButton}
                        onPress={() => setBulkModalVisible(true)}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={[colors.primary, colors.accent || '#FF6B6B']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={localStyles.fabGradient}
                        >
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <Path d="M12 5v14M5 12h14" />
                            </Svg>
                            <MonoText weight="bold" color={colors.white} style={{ marginLeft: 8 }}>
                                Reschedule ({selectedDates.length})
                            </MonoText>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};


const CALENDAR_PADDING = spacing.m;
const DAY_SIZE = (SCREEN_WIDTH - (CALENDAR_PADDING * 2)) / 7;

const localStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    // Today's Card - Clean Modern Style
    todayCard: {
        marginHorizontal: spacing.m,
        marginTop: spacing.s,
        marginBottom: spacing.m,
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.m,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    todayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    todayBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    todayContent: {
        gap: spacing.m,
    },
    slotInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s,
    },
    productsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.s,
        alignItems: 'center',
    },
    productChip: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    // Legend
    legendWrapper: {
        marginBottom: spacing.s,
    },
    legendScroll: {
        paddingHorizontal: spacing.m,
        gap: spacing.s,
    },
    legendPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    // Week Header - Aligned with day cells
    weekHeader: {
        flexDirection: 'row',
        marginHorizontal: CALENDAR_PADDING,
        marginBottom: spacing.xs,
    },
    weekDayCell: {
        width: DAY_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.s,
    },
    // Calendar Grid - Aligned with header
    calendarGrid: {
        paddingBottom: 100, // Space for FAB
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: CALENDAR_PADDING,
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    // FAB
    fabWrapper: {
        position: 'absolute',
        bottom: 20,
        left: spacing.l,
        right: spacing.l,
        alignItems: 'center',
    },
    fabButton: {
        borderRadius: 28,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    fabGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: 14,
    },
});

export default CalendarTabContent;

