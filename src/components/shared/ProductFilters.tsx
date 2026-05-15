import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    TextInput,
    Platform,
    Dimensions,
    KeyboardAvoidingView,
} from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { SafeBlurView as BlurView } from './SafeBlurView';
import { MonoText } from './MonoText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────
export interface FilterState {
    sort: string;
    brand: string;
    minPrice: string;
    maxPrice: string;
    onSale: boolean;
}

export const DEFAULT_FILTERS: FilterState = {
    sort: '',
    brand: '',
    minPrice: '',
    maxPrice: '',
    onSale: false,
};

interface ProductFiltersProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    currentFilters: FilterState;
    availableBrands: string[];
}

// ─── Sort Options ───────────────────────────────────────────
const SORT_OPTIONS = [
    { key: '', label: 'Relevance' },
    { key: 'price_asc', label: 'Price: Low to High' },
    { key: 'price_desc', label: 'Price: High to Low' },
    { key: 'newest', label: 'Newest First' },
    { key: 'discount', label: 'Highest Discount' },
];

// ─── Component ──────────────────────────────────────────────
export const ProductFilters = ({
    visible,
    onClose,
    onApply,
    currentFilters,
    availableBrands,
}: ProductFiltersProps) => {
    const [filters, setFilters] = useState<FilterState>(currentFilters);

    useEffect(() => {
        if (visible) {
            setFilters(currentFilters);
        }
    }, [visible, currentFilters]);

    const handleApply = useCallback(() => {
        onApply(filters);
        onClose();
    }, [filters, onApply, onClose]);

    const handleReset = useCallback(() => {
        const resetFilters = { ...DEFAULT_FILTERS };
        setFilters(resetFilters);
        onApply(resetFilters);
        onClose();
    }, [onApply, onClose]);

    const hasActiveFilters =
        filters.sort !== '' ||
        filters.brand !== '' ||
        filters.minPrice !== '' ||
        filters.maxPrice !== '' ||
        filters.onSale;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <TouchableOpacity
                        style={styles.sheet}
                        activeOpacity={1}
                        onPress={() => {}}
                    >
                        {/* Handle */}
                        <View style={styles.handleRow}>
                            <View style={styles.handle} />
                        </View>

                        {/* Header */}
                        <View style={styles.header}>
                            <MonoText size="l" weight="bold">Filters</MonoText>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                    <Line x1="18" y1="6" x2="6" y2="18" />
                                    <Line x1="6" y1="6" x2="18" y2="18" />
                                </Svg>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* ── Sort By ────────────────────────── */}
                            <View style={styles.section}>
                                <MonoText size="m" weight="bold" style={styles.sectionTitle}>Sort By</MonoText>
                                <View style={styles.chipRow}>
                                    {SORT_OPTIONS.map((opt) => {
                                        const isActive = filters.sort === opt.key;
                                        return (
                                            <TouchableOpacity
                                                key={opt.key}
                                                style={[styles.chip, isActive && styles.chipActive]}
                                                onPress={() => setFilters(f => ({ ...f, sort: opt.key }))}
                                            >
                                                <MonoText
                                                    size="xs"
                                                    weight={isActive ? 'bold' : 'medium'}
                                                    color={isActive ? colors.white : colors.text}
                                                >
                                                    {opt.label}
                                                </MonoText>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* ── Brand ──────────────────────────── */}
                            {availableBrands.length > 0 && (
                                <View style={styles.section}>
                                    <MonoText size="m" weight="bold" style={styles.sectionTitle}>Brand</MonoText>
                                    <View style={styles.chipRow}>
                                        <TouchableOpacity
                                            style={[styles.chip, filters.brand === '' && styles.chipActive]}
                                            onPress={() => setFilters(f => ({ ...f, brand: '' }))}
                                        >
                                            <MonoText
                                                size="xs"
                                                weight={filters.brand === '' ? 'bold' : 'medium'}
                                                color={filters.brand === '' ? colors.white : colors.text}
                                            >
                                                All
                                            </MonoText>
                                        </TouchableOpacity>
                                        {availableBrands.map((b) => {
                                            const isActive = filters.brand === b;
                                            return (
                                                <TouchableOpacity
                                                    key={b}
                                                    style={[styles.chip, isActive && styles.chipActive]}
                                                    onPress={() => setFilters(f => ({ ...f, brand: b }))}
                                                >
                                                    <MonoText
                                                        size="xs"
                                                        weight={isActive ? 'bold' : 'medium'}
                                                        color={isActive ? colors.white : colors.text}
                                                    >
                                                        {b}
                                                    </MonoText>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}

                            {/* ── Price Range ────────────────────── */}
                            <View style={styles.section}>
                                <MonoText size="m" weight="bold" style={styles.sectionTitle}>Price Range</MonoText>
                                <View style={styles.priceRow}>
                                    <View style={styles.priceInputWrap}>
                                        <MonoText size="xs" color={colors.textLight} style={{ marginBottom: 4 }}>Min (₹)</MonoText>
                                        <TextInput
                                            style={styles.priceInput}
                                            value={filters.minPrice}
                                            onChangeText={(v) => setFilters(f => ({ ...f, minPrice: v.replace(/[^0-9]/g, '') }))}
                                            placeholder="0"
                                            placeholderTextColor={colors.border}
                                            keyboardType="number-pad"
                                            returnKeyType="done"
                                        />
                                    </View>
                                    <View style={styles.priceDash}>
                                        <MonoText size="m" color={colors.textLight}>—</MonoText>
                                    </View>
                                    <View style={styles.priceInputWrap}>
                                        <MonoText size="xs" color={colors.textLight} style={{ marginBottom: 4 }}>Max (₹)</MonoText>
                                        <TextInput
                                            style={styles.priceInput}
                                            value={filters.maxPrice}
                                            onChangeText={(v) => setFilters(f => ({ ...f, maxPrice: v.replace(/[^0-9]/g, '') }))}
                                            placeholder="Any"
                                            placeholderTextColor={colors.border}
                                            keyboardType="number-pad"
                                            returnKeyType="done"
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* ── On Sale Toggle ─────────────────── */}
                            <View style={styles.section}>
                                <TouchableOpacity
                                    style={styles.toggleRow}
                                    onPress={() => setFilters(f => ({ ...f, onSale: !f.onSale }))}
                                    activeOpacity={0.7}
                                >
                                    <View style={{ flex: 1 }}>
                                        <MonoText size="m" weight="bold">On Sale</MonoText>
                                        <MonoText size="xs" color={colors.textLight}>Show only discounted products</MonoText>
                                    </View>
                                    <View style={[styles.toggle, filters.onSale && styles.toggleActive]}>
                                        <View style={[styles.toggleThumb, filters.onSale && styles.toggleThumbActive]} />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>

                        {/* ── Footer Buttons ─────────────────── */}
                        <View style={styles.footer}>
                            {hasActiveFilters && (
                                <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                                    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth="2">
                                        <Path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
                                        <Path d="M3 3v5h5" />
                                    </Svg>
                                    <MonoText size="s" weight="bold" color={colors.error} style={{ marginLeft: 6 }}>
                                        Reset
                                    </MonoText>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.applyBtn, !hasActiveFilters && { flex: 1 }]}
                                onPress={handleApply}
                            >
                                <MonoText size="m" weight="bold" color={colors.white}>
                                    Apply Filters
                                </MonoText>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ─── Sort/Filter Bar (Pill Buttons) ──────────────────
export const SortFilterBar = ({
    activeFilterCount,
    activeSort,
    onFilterPress,
    onSortPress,
}: {
    activeFilterCount: number;
    activeSort: string;
    onFilterPress: () => void;
    onSortPress?: () => void;
}) => {
    const sortLabel = SORT_OPTIONS.find(o => o.key === activeSort)?.label || 'Sort';

    return (
        <View style={styles.filterBarOuter}>
            {/* Filter Button */}
            <TouchableOpacity
                style={[styles.separateFilterBtn, activeFilterCount > 0 && styles.filterBarBtnActive]}
                onPress={onFilterPress}
                activeOpacity={0.7}
            >
                <View style={styles.filterIconWrap}>
                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={activeFilterCount > 0 ? colors.white : colors.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                    </Svg>
                </View>
                <MonoText
                    size="xs"
                    weight="bold"
                    color={activeFilterCount > 0 ? colors.white : colors.text}
                    style={{ marginLeft: 6 }}
                >
                    Filters
                </MonoText>
                {activeFilterCount > 0 && (
                    <View style={styles.filterBadge}>
                        <MonoText size="xxs" weight="bold" color={colors.primary}>
                            {activeFilterCount}
                        </MonoText>
                    </View>
                )}
            </TouchableOpacity>

            {/* Sort Button */}
            <TouchableOpacity
                style={[styles.separateFilterBtn, activeSort !== '' && styles.filterBarBtnActive]}
                onPress={onSortPress || onFilterPress}
                activeOpacity={0.7}
            >
                <View style={styles.filterIconWrap}>
                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={activeSort !== '' ? colors.white : colors.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M3 6h18M3 12h12M3 18h6" />
                    </Svg>
                </View>
                <MonoText
                    size="xs"
                    weight="bold"
                    color={activeSort !== '' ? colors.white : colors.text}
                    style={{ marginLeft: 6 }}
                    numberOfLines={1}
                >
                    {sortLabel}
                </MonoText>
            </TouchableOpacity>
        </View>
    );
};

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
            },
            android: {
                elevation: 20,
            },
        }),
    },
    handleRow: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 4,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    section: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    sectionTitle: {
        marginBottom: 12,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    chipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
    },
    priceInputWrap: {
        flex: 1,
    },
    priceInput: {
        height: 44,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 14,
        fontSize: 15,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        color: colors.text,
        backgroundColor: '#FAFBFC',
    },
    priceDash: {
        paddingBottom: 10,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toggle: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#E2E8F0',
        padding: 3,
        justifyContent: 'center',
    },
    toggleActive: {
        backgroundColor: colors.primary,
    },
    toggleThumb: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.white,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    toggleThumbActive: {
        alignSelf: 'flex-end',
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        gap: 12,
        paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    },
    resetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.error,
        backgroundColor: 'rgba(239,68,68,0.05)',
    },
    applyBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: colors.primary,
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    // ── Separate Filter Buttons ──
    filterBarOuter: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: colors.white,
        gap: 10,
    },
    separateFilterBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    filterBarBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterIconWrap: {
        width: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBadge: {
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
        paddingHorizontal: 3,
    },
});
