import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { BlurBottomSheet } from '../shared/BlurBottomSheet';
import { format } from 'date-fns';
import { subscriptionService } from '../../services/customer/subscription.service';
import { logger } from '../../utils/logger';

interface RescheduleModalProps {
    visible: boolean;
    onClose: () => void;
    delivery: any;
    subscriptionId: string;
    onUpdate: () => void;
}

export const RescheduleModal = ({ visible, onClose, delivery, subscriptionId, onUpdate }: RescheduleModalProps) => {
    const [activeTab, setActiveTab] = useState<'slot' | 'date'>('slot');

    // Slot State
    const [selectedSlot, setSelectedSlot] = useState<'morning' | 'evening'>('morning');

    // Reschedule State
    const [availableDates, setAvailableDates] = useState<any[]>([]);
    const [loadingDates, setLoadingDates] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [newDateSlot, setNewDateSlot] = useState<'morning' | 'evening'>('morning');

    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (visible && delivery) {
            setSelectedSlot(delivery.slot as 'morning' | 'evening');
            setNewDateSlot(delivery.slot as 'morning' | 'evening');
            if (activeTab === 'date') {
                loadAvailableDates();
            }
        }
    }, [visible, activeTab, delivery]);

    const loadAvailableDates = async () => {
        setLoadingDates(true);
        try {
            const res = await subscriptionService.getAvailableRescheduleDates(subscriptionId, delivery.date, delivery.slot);
            if (res.success && res.data) {
                setAvailableDates(res.data.availableDates);
            }
        } catch (error) {
            logger.error('Failed to load dates', error);
        } finally {
            setLoadingDates(false);
        }
    };

    const handleChangeSlot = async () => {
        if (selectedSlot === delivery.slot) {
            onClose();
            return;
        }
        setSubmitting(true);
        try {
            await subscriptionService.changeDeliverySlot(subscriptionId, delivery.date, selectedSlot);
            Alert.alert("Success", "Delivery slot updated.");
            onUpdate();
            onClose();
        } catch (error: any) {
            Alert.alert("Error", error.response?.data?.message || "Failed to update slot");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReschedule = async () => {
        if (!selectedDate) {
            Alert.alert("Required", "Please select a new date.");
            return;
        }
        setSubmitting(true);
        try {
            // newDate is likely ISO string from Date object
            const dateStr = new Date(selectedDate).toISOString();
            await subscriptionService.rescheduleDelivery(subscriptionId, delivery.date, dateStr, newDateSlot);
            Alert.alert("Success", "Delivery rescheduled.");
            onUpdate();
            onClose();
        } catch (error: any) {
            Alert.alert("Error", error.response?.data?.message || "Failed to reschedule");
        } finally {
            setSubmitting(false);
        }
    };

    if (!delivery) return null;

    return (
        <BlurBottomSheet visible={visible} onClose={onClose}>
            <View style={styles.modalContent}>
                {/* Header */}
                <View style={styles.header}>
                    <MonoText size="l" weight="bold">Modify Delivery</MonoText>
                    <TouchableOpacity onPress={onClose}>
                        <MonoText size="l" color={colors.textLight}>✕</MonoText>
                    </TouchableOpacity>
                </View>

                {/* Product Summary */}
                {delivery.products && delivery.products.length > 0 && (
                    <View style={{ marginBottom: spacing.l }}>
                        <MonoText weight="bold" style={{ marginBottom: spacing.s }}>Products</MonoText>
                        {delivery.products.map((p: any, index: number) => (
                            <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <MonoText size="s" color={colors.text}>{p.productName}</MonoText>
                                <MonoText size="s" weight="bold">{p.quantityValue} {p.quantityUnit}</MonoText>
                            </View>
                        ))}
                    </View>
                )}

                {/* Tabs */}
                <View style={styles.tabs}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'slot' && styles.activeTab]}
                        onPress={() => setActiveTab('slot')}
                    >
                        <MonoText weight={activeTab === 'slot' ? 'bold' : 'regular'} color={activeTab === 'slot' ? colors.primary : colors.textLight}>Change Slot</MonoText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'date' && styles.activeTab]}
                        onPress={() => setActiveTab('date')}
                    >
                        <MonoText weight={activeTab === 'date' ? 'bold' : 'regular'} color={activeTab === 'date' ? colors.primary : colors.textLight}>Reschedule Date</MonoText>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {activeTab === 'slot' ? (
                        <View>
                            <MonoText style={styles.label}>Select New Slot for {format(new Date(delivery.date), 'dd MMM')}</MonoText>
                            <View style={styles.optionsRow}>
                                {['morning', 'evening'].map((s) => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[styles.optionBtn, selectedSlot === s && styles.optionBtnActive]}
                                        onPress={() => setSelectedSlot(s as 'morning' | 'evening')}
                                    >
                                        <MonoText color={selectedSlot === s ? colors.primary : colors.text} style={{ textTransform: 'capitalize' }}>{s}</MonoText>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.actionBtn, submitting && { opacity: 0.7 }]}
                                onPress={handleChangeSlot}
                                disabled={submitting}
                            >
                                {submitting ? <ActivityIndicator color={colors.white} /> : <MonoText weight="bold" color={colors.white}>Update Slot</MonoText>}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            <MonoText style={styles.label}>Select New Date</MonoText>
                            {loadingDates ? (
                                <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesScroll}>
                                    {availableDates.map((d: any) => (
                                        <TouchableOpacity
                                            key={d.date}
                                            style={[styles.dateChip, selectedDate === d.date && styles.dateChipActive]}
                                            onPress={() => setSelectedDate(d.date)}
                                        >
                                            <MonoText size="xs" color={colors.textLight} style={{ marginBottom: 4 }}>
                                                {format(new Date(d.date), 'EEE')}
                                            </MonoText>
                                            <MonoText weight="bold" color={selectedDate === d.date ? colors.white : colors.text} size="l">
                                                {format(new Date(d.date), 'dd')}
                                            </MonoText>
                                            <MonoText size="xs" color={selectedDate === d.date ? colors.white : colors.textLight}>
                                                {format(new Date(d.date), 'MMM')}
                                            </MonoText>
                                        </TouchableOpacity>
                                    ))}
                                    {availableDates.length === 0 && (
                                        <MonoText color={colors.textLight} style={{ padding: spacing.m }}>No available dates found within range.</MonoText>
                                    )}
                                </ScrollView>
                            )}

                            <MonoText style={[styles.label, { marginTop: spacing.l }]}>Select Slot</MonoText>
                            <View style={styles.optionsRow}>
                                {['morning', 'evening'].map((s) => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[styles.optionBtn, newDateSlot === s && styles.optionBtnActive]}
                                        onPress={() => setNewDateSlot(s as 'morning' | 'evening')}
                                    >
                                        <MonoText color={newDateSlot === s ? colors.primary : colors.text} style={{ textTransform: 'capitalize' }}>{s}</MonoText>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.actionBtn, submitting && { opacity: 0.7 }]}
                                onPress={handleReschedule}
                                disabled={submitting}
                            >
                                {submitting ? <ActivityIndicator color={colors.white} /> : <MonoText weight="bold" color={colors.white}>Confirm Reschedule</MonoText>}
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </View>
        </BlurBottomSheet>
    );
};

const styles = StyleSheet.create({
    modalContent: {
        paddingBottom: spacing.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        marginBottom: spacing.l,
    },
    tab: {
        paddingVertical: spacing.m,
        marginRight: spacing.l,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: colors.primary,
    },
    content: {
        paddingBottom: spacing.xl,
    },
    label: {
        marginBottom: spacing.m,
        color: colors.textLight,
    },
    optionsRow: {
        flexDirection: 'row',
        gap: spacing.m,
        marginBottom: spacing.l,
    },
    optionBtn: {
        flex: 1,
        padding: spacing.m,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        alignItems: 'center',
    },
    optionBtnActive: {
        borderColor: colors.primary,
        backgroundColor: '#E3F2FD',
    },
    actionBtn: {
        backgroundColor: colors.primary,
        padding: spacing.m,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: spacing.m,
    },
    datesScroll: {
        marginBottom: spacing.m,
    },
    dateChip: {
        width: 70,
        height: 90,
        borderRadius: 12,
        backgroundColor: '#F5F5F5',
        marginRight: spacing.s,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    dateChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    }
});
