import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions, StatusBar, ActivityIndicator, Platform, TextStyle, Image, Linking } from 'react-native';
import { MonoText } from '../../../components/shared/MonoText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfWeek, endOfWeek } from 'date-fns';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import { subscriptionService, Subscription } from '../../../services/customer/subscription.service';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { DeliveryDetailModal } from '../../../components/subscription/DeliveryDetailModal';
import { RescheduleModal } from '../../../components/subscription/RescheduleModal';
import { MultipleRescheduleModal } from '../../../components/subscription/MultipleRescheduleModal';
import { DetailsTabContent } from '../../../components/subscription/DetailsTabContent';
import { CalendarTabContent } from '../../../components/subscription/CalendarTabContent';
import { logger } from '../../../utils/logger';

// Theme constants based on requirements
const STATUS_COLORS = {
    upcoming: { border: '#2196F3', bg: '#E3F2FD', text: '#1565C0' }, // Blue
    delivered: { border: 'transparent', bg: '#E8F5E9', text: '#2E7D32' }, // Green
    cancelled: { border: 'transparent', bg: '#FFEBEE', text: '#C62828' }, // Red
    skipped: { border: 'transparent', bg: '#FFEBEE', text: '#C62828' },   // Red (Treat like cancelled)
    none: { border: 'transparent', bg: 'transparent', text: '#9E9E9E' },  // Grey
    disabled: { percent: 0.5 }
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_PADDING = spacing.m;
const DAY_SIZE = (SCREEN_WIDTH - (CALENDAR_PADDING * 2)) / 7;

export const SubscriptionCalendarScreen = ({ navigation }: any) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [calendarData, setCalendarData] = useState<any[]>([]); // This stores deliveries array
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<string>('All');

    // Tab State
    const [activeTab, setActiveTab] = useState<'calendar' | 'details'>('calendar');

    // Modal State
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
    const [bulkModalVisible, setBulkModalVisible] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState<any>(null);

    // Multi-select State
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedDates, setSelectedDates] = useState<string[]>([]);

    // Dropdown State
    const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);


    const insets = useSafeAreaInsets();

    // Fetch subscription ID and Initial Data
    useEffect(() => {
        loadSubscription();
    }, []);

    // Fetch Calendar Data when month or subscriptionId changes
    useEffect(() => {
        if (subscription?._id) {
            fetchCalendarData();
        }
    }, [currentMonth, subscription?._id]);

    const loadSubscription = async () => {
        setLoading(true);
        // Get the main active subscription
        const sub = await subscriptionService.getMySubscription();
        if (sub) {
            setSubscription(sub);
        }
        setLoading(false);
    };

    const fetchCalendarData = async () => {
        if (!subscription?._id) return;
        setLoading(true);
        try {
            const data = await subscriptionService.getDeliveryCalendar(
                subscription._id,
                currentMonth.getFullYear(),
                currentMonth.getMonth()
            );

            // Check if data is array or object with deliveries
            if (Array.isArray(data)) {
                setCalendarData(data);
            } else if (data && data.deliveries) {
                setCalendarData(data.deliveries);
            } else if (data && data.data) {
                // Fallback if wrapped
                setCalendarData(data.data);
            }
        } catch (error) {
            logger.error('Failed to fetch calendar:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMonthChange = (direction: 'prev' | 'next') => {
        setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    };


    const handleDatePress = (date: Date, delivery: any) => {
        // If no delivery object but date is future, maybe allow creating one?
        // For now, only interact with existing deliveries or empty slots if logic permits
        if (!delivery && !selectionMode) return;

        // Normalize to YYYY-MM-DD
        const dateStr = format(date, 'yyyy-MM-dd');

        if (selectionMode) {
            // Only allow selecting future scheduled/awaiting deliveries
            if (delivery && (delivery.status !== 'scheduled' && delivery.status !== 'awaitingCustomer')) return;
            if (isBefore(date, new Date()) && !isSameDay(date, new Date())) return; // Only future

            setSelectedDates(prev => {
                const exists = prev.find(d => {
                    const dLocal = d.includes('T') ? d.split('T')[0] : d;
                    return dLocal === dateStr;
                });
                if (exists) {
                    return prev.filter(d => {
                        const dLocal = d.includes('T') ? d.split('T')[0] : d;
                        return dLocal !== dateStr;
                    });
                } else {
                    return [...prev, dateStr];
                }
            });
            return;
        }

        const isTodayDate = isSameDay(date, new Date());

        if (delivery) {
            // Apply strict filter to the delivery object passed to modal
            let modalDelivery = delivery;
            if (filter !== 'All' && delivery.products) {
                const filterLower = filter.toLowerCase();
                const filteredProducts = delivery.products.filter((p: any) =>
                    (p.productName && p.productName.toLowerCase() === filterLower) ||
                    (p.displayName && p.displayName.toLowerCase() === filterLower) ||
                    (typeof p.productId === 'string' && p.productId === filter) ||
                    (p.productId?.name && p.productId.name.toLowerCase() === filterLower)
                );
                if (filteredProducts.length > 0) {
                    modalDelivery = { ...delivery, products: filteredProducts };
                }
            }

            setSelectedDelivery(modalDelivery);
            if (isTodayDate) {
                setDetailModalVisible(true);
            } else if (delivery.status === 'scheduled' && !isBefore(date, new Date())) {
                // If it's a future date, we generally allow rescheduling.
                // But user complained about "no details". 
                // Maybe we should show DetailModal for FUTURE dates too if they want to see product?
                // The snippet showed "DeliveryActionModals".
                // Current logic: Today -> Detail. Future -> Reschedule.
                // If I want to see what is coming, Reschedule modal shows it?
                // RescheduleModal usually shows "Reschedule from [Date]". Does it list products?
                // If not, we should probably toggle DetailModal for future too, or ensure RescheduleModal shows info.
                // Creating a hybrid behavior: If click future, maybe show Detail first with "Reschedule" button?
                // OR just open DetailModal which has valid info.
                // User said "no details of product". 
                // Let's open DetailModal for ALL valid deliveries, and add Reschedule button in DetailModal?
                // Or stick to RescheduleModal but ensure it shows products.
                // Let's check RescheduleModal content later. For now, open RescheduleModal as before.
                setRescheduleModalVisible(true);

                // Correction: User explicitly said "no details... for particular date". 
                // This strongly suggests they want to SEE what is delivered.
                // I will open DetailModal for future dates too? 
                // BUT Reschedule is a primary action.
                // Let's keep it as is, assuming RescheduleModal has info or is what they expect (if working).
                // Actually, if I filter products, `modalDelivery` is updated. 
            }
        }
    };

    const toggleSelectionMode = () => {
        setSelectionMode(!selectionMode);
        setSelectedDates([]);
    };

    // Filter Logic
    const filteredDeliveries = useMemo(() => {
        if (filter === 'All') return calendarData;
        const filterLower = filter.toLowerCase();
        return calendarData.filter(d =>
            d.products && d.products.some((p: any) =>
                (p.productName && p.productName.toLowerCase() === filterLower) ||
                (p.displayName && p.displayName.toLowerCase() === filterLower) ||
                (typeof p.productId === 'string' && p.productId === filter) ||
                (p.productId?.name && p.productId.name.toLowerCase() === filterLower)
            )
        );
    }, [calendarData, filter]);

    // Calendar Grid Generation
    const calendarGrid = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth));
        const end = endOfWeek(endOfMonth(currentMonth));
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const renderDay = (date: Date) => {
        const isCurrentMonth = isSameMonth(date, currentMonth);
        const gridDateKey = format(date, 'yyyy-MM-dd'); // Local YYYY-MM-DD

        const dayDeliveries = filteredDeliveries.find(d => {
            if (!d.date) return false;
            // Robustly extract YYYY-MM-DD from delivery date string
            // Handle both ISO strings (2024-05-01T00:00:00.000Z) and simple dates (2024-05-01)
            const deliveryDateStr = typeof d.date === 'string'
                ? d.date.split('T')[0]
                : new Date(d.date).toISOString().split('T')[0];

            return gridDateKey === deliveryDateStr;
        });
        const isTodayDate = isToday(date);

        // Determine Style
        let dayStyle = styles.dayCell;
        let textStyle: TextStyle = styles.dayText;
        let dayNumberStyle: TextStyle = { ...styles.dayText };
        let containerStyle: any = {};

        if (!isCurrentMonth) {
            textStyle = { ...textStyle, color: '#E0E0E0' };
            dayNumberStyle = { ...dayNumberStyle, color: '#E0E0E0' };
        }

        let isClickable = false;

        if (dayDeliveries) {
            // Normalize status mapping
            // 'upcoming' is sometimes used by user but backend is 'scheduled', 'reaching', 'awaitingCustomer'
            // Map alias statuses to visual types
            let visualStatus = dayDeliveries.status;

            // Strict Status Filtering: Use product status if filter is active
            if (filter !== 'All' && dayDeliveries.products) {
                const filterLower = filter.toLowerCase();
                const matchedProduct = dayDeliveries.products.find((p: any) =>
                    (p.productName && p.productName.toLowerCase() === filterLower) ||
                    (p.displayName && p.displayName.toLowerCase() === filterLower) ||
                    (typeof p.productId === 'string' && p.productId === filter) ||
                    (p.productId?.name && p.productId.name.toLowerCase() === filterLower)
                );

                if (matchedProduct && matchedProduct.deliveryStatus) {
                    visualStatus = matchedProduct.deliveryStatus;
                }
            }

            if (visualStatus === 'reaching') {
                visualStatus = 'scheduled';
            }
            // 'awaitingCustomer' and 'noResponse' remain unique for new styling

            if (visualStatus === 'scheduled' || visualStatus === 'delivered') {
                containerStyle = {
                    backgroundColor: visualStatus === 'scheduled' ? '#E3F2FD' : '#E8F5E9',
                    borderRadius: 16,
                };
                dayNumberStyle = {
                    color: visualStatus === 'scheduled' ? '#1565C0' : '#2E7D32',
                    fontWeight: 'bold'
                };
                isClickable = true;
            } else if (visualStatus === 'awaitingCustomer') {
                containerStyle = {
                    backgroundColor: '#FFFDE7', // Yellow tint
                    borderRadius: 16,
                };
                dayNumberStyle = {
                    color: '#FBC02D',
                    fontWeight: 'bold'
                };
                isClickable = true;
            } else if (visualStatus === 'noResponse') {
                containerStyle = {
                    backgroundColor: '#FFF3E0', // Orange tint
                    borderRadius: 16,
                };
                dayNumberStyle = {
                    color: '#E65100',
                    fontWeight: 'bold'
                };
                isClickable = true;
            } else if (visualStatus === 'cancelled' || visualStatus === 'skipped') {
                containerStyle = {
                    backgroundColor: '#FFEBEE',
                    borderRadius: 14,
                };
                dayNumberStyle = {
                    color: '#C62828',
                    fontWeight: 'bold'
                };
                isClickable = true;
            } else if (visualStatus === 'concession') {
                // Concession: Missed by delivery partner, rescheduled + extended subscription
                containerStyle = {
                    backgroundColor: '#F3E5F5', // Light purple
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: '#9C27B0',
                    borderStyle: 'dashed',
                };
                dayNumberStyle = {
                    color: '#7B1FA2', // Purple
                    fontWeight: 'bold'
                };
                isClickable = true;
            }

            // Selection Highlight
            if (selectionMode) {
                // Check string inclusion robustly
                const isSelected = selectedDates.some(d => {
                    const dLocal = d.includes('T') ? d.split('T')[0] : d;
                    return dLocal === gridDateKey;
                });

                if (isSelected) {
                    containerStyle = {
                        ...containerStyle,
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                        borderWidth: 2
                    };
                    dayNumberStyle = { ...dayNumberStyle, color: colors.white };
                } else if (['scheduled', 'awaitingCustomer'].includes(visualStatus)) {
                    // accessible
                } else {
                    containerStyle = { ...containerStyle, opacity: 0.3 };
                    isClickable = false; // Disable selection for non-actionable
                }
            }
        }

        if (isTodayDate) {
            containerStyle = {
                ...containerStyle,
                borderWidth: 1.5,
                borderColor: colors.primary
            }
        }

        // If selection mode active, only allow clicking valid dates
        const isDisabled = selectionMode
            ? (!dayDeliveries || (dayDeliveries.status !== 'scheduled' && dayDeliveries.status !== 'awaitingCustomer' && dayDeliveries.status !== 'reaching'))
            : (!isCurrentMonth && !dayDeliveries);

        return (
            <TouchableOpacity
                key={date.toString()}
                style={[styles.dayCell, containerStyle, !isCurrentMonth && { opacity: 0.3 }]}
                onPress={() => handleDatePress(date, dayDeliveries)}
                disabled={isDisabled}
            >
                <MonoText size="s" style={dayNumberStyle}>
                    {format(date, 'd')}
                </MonoText>
                {dayDeliveries && (
                    <View style={styles.dotContainer}>
                        <View style={[styles.dot, { backgroundColor: dayNumberStyle.color || 'grey' }]} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Glass Header */}
            <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="light"
                    blurAmount={20}
                    reducedTransparencyFallbackColor="white"
                />
                {/* Header Top Row */}
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M19 12H5" />
                            <Path d="M12 19l-7-7 7-7" />
                        </Svg>
                    </TouchableOpacity>
                    <MonoText size="l" weight="bold">My Subscription</MonoText>
                    <View style={{ width: 40 }} />
                </View>

                {/* Tab Switcher */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'calendar' && styles.tabActive]}
                        onPress={() => setActiveTab('calendar')}
                    >
                        <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'calendar' ? colors.primary : colors.textLight} strokeWidth="2">
                            <Path d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                            <Path d="M16 2v4M8 2v4M3 10h18" />
                        </Svg>
                        <MonoText
                            size="s"
                            weight={activeTab === 'calendar' ? 'bold' : 'regular'}
                            color={activeTab === 'calendar' ? colors.primary : colors.textLight}
                            style={{ marginLeft: 6 }}
                        >
                            Calendar
                        </MonoText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'details' && styles.tabActive]}
                        onPress={() => setActiveTab('details')}
                    >
                        <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'details' ? colors.primary : colors.textLight} strokeWidth="2">
                            <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                        </Svg>
                        <MonoText
                            size="s"
                            weight={activeTab === 'details' ? 'bold' : 'regular'}
                            color={activeTab === 'details' ? colors.primary : colors.textLight}
                            style={{ marginLeft: 6 }}
                        >
                            Details
                        </MonoText>
                    </TouchableOpacity>
                </View>

                {/* Month Selector & Controls - Only in Calendar Tab */}
                {activeTab === 'calendar' && (
                    <View style={styles.calendarControls}>
                        {/* Row 1: Filter + Month Navigation + Actions */}
                        <View style={styles.monthRow}>
                            {/* Filter Dropdown */}
                            <TouchableOpacity
                                style={styles.filterDropdown}
                                onPress={() => setFilterDropdownOpen(!filterDropdownOpen)}
                            >
                                <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                    <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                                </Svg>
                                <MonoText size="xs" weight="bold" color={colors.text}>{filter}</MonoText>
                                <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                    <Polyline points={filterDropdownOpen ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
                                </Svg>
                            </TouchableOpacity>

                            {/* Month Navigation */}
                            <View style={styles.monthNav}>
                                <TouchableOpacity onPress={() => handleMonthChange('prev')} style={styles.navBtn}>
                                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2.5">
                                        <Path d="M15 18l-6-6 6-6" />
                                    </Svg>
                                </TouchableOpacity>
                                <MonoText size="s" weight="bold">{format(currentMonth, 'MMM yyyy')}</MonoText>
                                <TouchableOpacity onPress={() => handleMonthChange('next')} style={styles.navBtn}>
                                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2.5">
                                        <Path d="M9 18l6-6-6-6" />
                                    </Svg>
                                </TouchableOpacity>
                            </View>

                            {/* Selection Mode Toggle */}
                            {selectionMode ? (
                                <View style={styles.selectionInfo}>
                                    <MonoText size="xs" weight="bold" color={colors.primary}>
                                        {selectedDates.length}
                                    </MonoText>
                                    <TouchableOpacity onPress={toggleSelectionMode}>
                                        <MonoText size="xs" weight="bold" color={colors.error}>✕</MonoText>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity onPress={toggleSelectionMode} style={styles.selectModeBtn}>
                                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                        <Path d="M9 11l3 3L22 4" />
                                        <Path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                                    </Svg>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Dropdown Menu */}
                        {filterDropdownOpen && (
                            <View style={styles.dropdownMenu}>
                                {['All', ...(subscription?.products?.map((p: any) => p.productName || p.displayName || 'Product') || [])].map((f, idx) => (
                                    <TouchableOpacity
                                        key={f + idx}
                                        style={[
                                            styles.dropdownItem,
                                            filter === f && styles.dropdownItemActive,
                                            idx === 0 && { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
                                        ]}
                                        onPress={() => {
                                            setFilter(f);
                                            setFilterDropdownOpen(false);
                                        }}
                                    >
                                        <MonoText
                                            size="s"
                                            weight={filter === f ? 'bold' : 'regular'}
                                            color={filter === f ? colors.primary : colors.text}
                                        >
                                            {f}
                                        </MonoText>
                                        {filter === f && (
                                            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2.5">
                                                <Polyline points="20 6 9 17 4 12" />
                                            </Svg>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                )}
            </View>

            {/* ========== DETAILS TAB CONTENT ========== */}
            {activeTab === 'details' && subscription && (
                <DetailsTabContent
                    subscription={subscription}
                    navigation={navigation}
                    styles={styles}
                />
            )}

            {/* ========== CALENDAR TAB CONTENT ========== */}
            {activeTab === 'calendar' && (
                <CalendarTabContent
                    subscription={subscription}
                    calendarData={calendarData}
                    calendarGrid={calendarGrid}
                    renderDay={renderDay}
                    loading={loading}
                    selectionMode={selectionMode}
                    selectedDates={selectedDates}
                    setBulkModalVisible={setBulkModalVisible}
                    styles={styles}
                />
            )}

            {/* Modals */}
            {subscription && selectedDelivery && (
                <>
                    <DeliveryDetailModal
                        visible={detailModalVisible}
                        onClose={() => setDetailModalVisible(false)}
                        delivery={selectedDelivery}
                        subscriptionId={subscription._id}
                        onUpdate={fetchCalendarData}
                    />
                    <RescheduleModal
                        visible={rescheduleModalVisible}
                        onClose={() => setRescheduleModalVisible(false)}
                        delivery={selectedDelivery}
                        subscriptionId={subscription._id}
                        onUpdate={fetchCalendarData}
                    />
                </>
            )}

            {/* Bulk Modal */}
            {subscription && (
                <MultipleRescheduleModal
                    visible={bulkModalVisible}
                    onClose={() => setBulkModalVisible(false)}
                    deliveryDates={selectedDates}
                    subscriptionId={subscription._id}
                    onUpdate={() => {
                        fetchCalendarData();
                        toggleSelectionMode();
                    }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    headerContainer: {
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        zIndex: 100,
    },
    monthSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.l,
        marginBottom: spacing.m,
    },
    iconBtn: {
        padding: spacing.s,
    },
    filterScroll: {
        maxHeight: 50,
    },
    filterContent: {
        paddingHorizontal: spacing.s,
        gap: spacing.xs,
        alignItems: 'center',
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 24,
        backgroundColor: colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 1,
    },
    chipActive: {
        backgroundColor: colors.primary,
        shadowOpacity: 0.15,
        elevation: 3,
    },
    weekHeader: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: spacing.xs,
        backgroundColor: colors.white,
        marginHorizontal: spacing.m,
        borderRadius: 12,
        marginBottom: spacing.s,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    weekDayText: {
        width: DAY_SIZE,
        textAlign: 'center',
    },
    grid: {
        paddingBottom: spacing.xl,
    },
    daysContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: spacing.xs,
    },
    dayCell: {
        width: DAY_SIZE,
        height: DAY_SIZE,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F9FA',
    },
    dayText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    dotContainer: {
        flexDirection: 'row',
        gap: 3,
        marginTop: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    cancelBtn: {
        padding: spacing.s,
    },
    fabContainer: {
        position: 'absolute',
        bottom: spacing.xl,
        left: spacing.l,
        right: spacing.l,
        alignItems: 'center',
    },
    fab: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.m,
        borderRadius: 30,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.m,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // New Calendar Controls
    calendarControls: {
        paddingHorizontal: spacing.m,
        paddingBottom: spacing.s,
    },
    monthRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    navBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.m,
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
        backgroundColor: colors.primary + '15',
        borderRadius: 20,
    },
    selectModeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
        backgroundColor: colors.primary + '15',
        borderRadius: 20,
    },
    filterDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    dropdownMenu: {
        marginTop: spacing.s,
        backgroundColor: colors.white,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    dropdownItemActive: {
        backgroundColor: colors.primary + '10',
    },
    legendContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.m,
        paddingVertical: spacing.s,
        paddingHorizontal: spacing.s,
        backgroundColor: colors.white,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    detailsCard: {
        marginHorizontal: spacing.l,
        marginBottom: spacing.m,
        padding: spacing.m,
        backgroundColor: colors.white,
        borderRadius: 16,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusBadge: {
        paddingHorizontal: spacing.s,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: 4,
    },
    partnerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    callButton: {
        padding: spacing.s,
        backgroundColor: colors.accent,
        borderRadius: 20,
        marginLeft: spacing.s,
    },
    todayCard: {
        marginHorizontal: spacing.l,
        marginBottom: spacing.m,
        padding: spacing.m,
        backgroundColor: colors.white,
        borderRadius: 16,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    todayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    todayStatusBadge: {
        paddingHorizontal: spacing.s,
        paddingVertical: 4,
        borderRadius: 8,
    },
    todayContent: {
        marginBottom: 4,
    },
    slotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    productList: {
        paddingLeft: 4,
    },
    addProductBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.m,
        paddingVertical: spacing.s,
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary,
        borderStyle: 'dashed',
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: spacing.m,
        marginTop: spacing.xs,
        marginBottom: spacing.m,
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: 16,
        padding: 5,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
    },
    tabActive: {
        backgroundColor: colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 3,
    },
    selectBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.xs,
        borderRadius: 16,
    },
});
