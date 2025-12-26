import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { format } from 'date-fns';
import { subscriptionService } from '../../services/customer/subscription.service';
import { logger } from '../../utils/logger';

interface MultipleRescheduleModalProps {
    visible: boolean;
    onClose: () => void;
    deliveryDates: string[]; // ISO strings
    subscriptionId: string;
    onUpdate: () => void;
}

export const MultipleRescheduleModal = ({ visible, onClose, deliveryDates, subscriptionId, onUpdate }: MultipleRescheduleModalProps) => {
    // Reschedule State
    const [availableDates, setAvailableDates] = useState<any[]>([]);
    const [loadingDates, setLoadingDates] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<'morning' | 'evening'>('morning');
    const [submitting, setSubmitting] = useState(false);

    React.useEffect(() => {
        if (visible && deliveryDates.length > 0) {
            loadAvailableDates();
        }
    }, [visible, deliveryDates]);

    const loadAvailableDates = async () => {
        setLoadingDates(true);
        try {
            // We use the first date's info to query. 
            // consecutiveDays ensures we find a block big enough.
            // slot is irrelevant for strict day-busy logic but required by API.
            const res = await subscriptionService.getAvailableRescheduleDates(
                subscriptionId,
                deliveryDates[0], // Use first date as anchor
                'morning', // Slot irrelevant for strict check
                deliveryDates.length // consecutiveDays
            );
            if (res.success && res.data) {
                setAvailableDates(res.data.availableDates);
            }
        } catch (error) {
            logger.error('Failed to load dates', error);
        } finally {
            setLoadingDates(false);
        }
    };

    const handleConfirm = async () => {
        if (!selectedDate) {
            Alert.alert("Required", "Please select a new start date.");
            return;
        }
        setSubmitting(true);
        try {
            await subscriptionService.rescheduleMultipleDeliveries(
                subscriptionId,
                deliveryDates,
                selectedDate, // newStartDate
                selectedSlot
            );
            Alert.alert("Success", `Rescheduled ${deliveryDates.length} deliveries.`);
            onUpdate();
            onClose();
        } catch (error: any) {
            Alert.alert("Error", error.response?.data?.message || "Failed to reschedule multiple deliveries");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <MonoText size="l" weight="bold">Bulk Reschedule</MonoText>
                        <TouchableOpacity onPress={onClose}>
                            <MonoText size="l" color={colors.textLight}>✕</MonoText>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        <MonoText style={styles.infoText}>
                            Rescheduling {deliveryDates.length} deliveries.
                            System will find available consecutive days.
                        </MonoText>

                        <MonoText style={styles.label}>Select New Start Date</MonoText>
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
                                    <MonoText color={colors.textLight} style={{ padding: spacing.m }}>No available consecutive dates found.</MonoText>
                                )}
                            </ScrollView>
                        )}

                        <MonoText style={[styles.label, { marginTop: spacing.l }]}>New Slot</MonoText>
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
                            onPress={handleConfirm}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <MonoText weight="bold" color={colors.white}>Confirm Reschedule ({deliveryDates.length})</MonoText>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backdrop: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.l,
        minHeight: 500,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.l,
    },
    content: {
        paddingBottom: spacing.xl,
    },
    infoText: {
        color: colors.textLight,
        marginBottom: spacing.l,
    },
    label: {
        marginBottom: spacing.s,
        color: colors.textLight,
        fontWeight: 'bold',
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
        marginTop: spacing.xl,
    },
});
