import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    TextInput,
    ActivityIndicator,
    Animated,
    Dimensions,
    Platform,
    KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { couponService, CouponData } from '../../services/customer/coupon.service';

const { width } = Dimensions.get('window');

interface ApplyCouponModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (coupon: CouponData, discount: number) => void;
    cartTotal: number;
    branchId?: string;
    userId?: string;
}

export const ApplyCouponModal: React.FC<ApplyCouponModalProps> = ({
    visible,
    onClose,
    onApply,
    cartTotal,
    branchId,
    userId
}) => {
    const insets = useSafeAreaInsets();

    const [coupons, setCoupons] = useState<CouponData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchMode, setSearchMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [applyingCode, setApplyingCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Animation values
    const titlePosition = useRef(new Animated.Value(0)).current;
    const searchInputOpacity = useRef(new Animated.Value(0)).current;
    const searchInputWidth = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            fetchCoupons();
            setSearchMode(false);
            setSearchQuery('');
            setError(null);
        }
    }, [visible]);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const response = await couponService.getAvailableCoupons(branchId, userId);
            setCoupons(response.coupons || []);
        } catch (err) {
            console.error('Failed to fetch coupons:', err);
            setCoupons([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchPress = () => {
        if (!searchMode) {
            setSearchMode(true);
            // Animate title to side and show search input
            Animated.parallel([
                Animated.timing(titlePosition, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: false
                }),
                Animated.timing(searchInputOpacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: false
                }),
                Animated.timing(searchInputWidth, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: false
                })
            ]).start();
        }
    };

    const handleSearchClose = () => {
        setSearchMode(false);
        setSearchQuery('');
        // Reset animation
        Animated.parallel([
            Animated.timing(titlePosition, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false
            }),
            Animated.timing(searchInputOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false
            }),
            Animated.timing(searchInputWidth, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false
            })
        ]).start();
        fetchCoupons(); // Reset to all coupons
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length >= 2) {
            setSearching(true);
            try {
                const response = await couponService.searchCoupons(query, branchId, userId);
                setCoupons(response.coupons || []);
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setSearching(false);
            }
        } else if (query.length === 0) {
            fetchCoupons();
        }
    };

    const handleApplyCoupon = async (coupon: CouponData) => {
        setApplyingCode(coupon.code);
        setError(null);
        try {
            const response = await couponService.validateCoupon(
                coupon.code,
                cartTotal,
                branchId,
                userId
            );

            if (response.success && response.discount !== undefined) {
                onApply(coupon, response.discount);
                onClose();
            } else {
                setError(response.message || 'Failed to apply coupon');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to apply coupon');
        } finally {
            setApplyingCode(null);
        }
    };

    const renderCouponCard = ({ item }: { item: CouponData }) => {
        const isApplicable = couponService.isApplicable(item, cartTotal);
        const isApplying = applyingCode === item.code;

        return (
            <View style={[styles.couponCardContainer, !isApplicable && styles.couponCardDisabled]}>
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="light"
                    blurAmount={15}
                    reducedTransparencyFallbackColor="white"
                />

                {/* Content Layer */}
                <View style={styles.couponCardContent}>
                    {/* Top Section: Title & Description */}
                    <View style={styles.cardTopSection}>
                        <MonoText size="m" weight="bold" color={colors.text}>
                            {couponService.formatDiscount(item)}
                        </MonoText>

                        {item.description && (
                            <MonoText size="xs" color={colors.textLight} style={{ marginTop: 4 }}>
                                {item.description}
                            </MonoText>
                        )}

                        <MonoText size="xs" color={colors.textLight} style={{ marginTop: 8 }}>
                            {couponService.formatMinOrder(item)}
                        </MonoText>

                        {/* Validity & Usage Info */}
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                            <View style={styles.infoBadge}>
                                <MonoText size="xxs" color={colors.textLight}>
                                    Valid till {new Date(item.validUntil).toLocaleDateString()}
                                </MonoText>
                            </View>
                            {typeof item.remainingUses === 'number' && (
                                <View style={styles.infoBadge}>
                                    <MonoText size="xxs" color={colors.primary} weight="bold">
                                        {item.remainingUses} left
                                    </MonoText>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Divider Line */}
                    <View style={styles.cardDivider} />

                    {/* Bottom Section: Code & Apply Button */}
                    <View style={styles.cardBottomRow}>
                        <View style={styles.codeBadgeNeoglass}>
                            <MonoText size="xs" weight="bold" color={isApplicable ? colors.primary : colors.textLight}>
                                {item.code}
                            </MonoText>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.applyBtnNeoglass,
                                !isApplicable && styles.applyBtnDisabledNeoglass,
                                isApplying && styles.applyBtnLoading
                            ]}
                            onPress={() => handleApplyCoupon(item)}
                            disabled={!isApplicable || isApplying}
                        >
                            {isApplying ? (
                                <ActivityIndicator size="small" color={colors.white} />
                            ) : (
                                <MonoText size="s" weight="bold" color={colors.white}>
                                    Apply
                                </MonoText>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const titleTranslateX = titlePosition.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -40]
    });

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="overFullScreen"
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Glass Header */}
                <BlurView blurType="light" blurAmount={20} style={[styles.header, { paddingTop: insets.top }]}>
                    <View style={styles.headerContent}>
                        {/* Back Button */}
                        <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                                <Path d="M19 12H5M12 19l-7-7 7-7" />
                            </Svg>
                        </TouchableOpacity>

                        {/* Animated Title / Search Area */}
                        <View style={styles.headerCenter}>
                            {!searchMode ? (
                                <MonoText size="l" weight="bold" style={{ textAlign: 'center' }}>
                                    Apply Coupon
                                </MonoText>
                            ) : (
                                <View style={styles.searchContainer}>
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Enter coupon code..."
                                        placeholderTextColor={colors.textLight}
                                        value={searchQuery}
                                        onChangeText={handleSearch}
                                        autoFocus
                                        autoCapitalize="characters"
                                    />
                                    <TouchableOpacity onPress={handleSearchClose} style={styles.searchCloseBtn}>
                                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                            <Path d="M18 6L6 18M6 6l12 12" />
                                        </Svg>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Search Button */}
                        {!searchMode && (
                            <TouchableOpacity onPress={handleSearchPress} style={styles.headerBtn}>
                                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                                    <Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </Svg>
                            </TouchableOpacity>
                        )}
                        {searchMode && <View style={{ width: 40 }} />}
                    </View>

                    {/* Search Results Header */}
                    {searchMode && searchQuery.length > 0 && (
                        <View style={styles.searchResultsHeader}>
                            <MonoText size="s" color={colors.textLight}>
                                Results for "{searchQuery}"
                            </MonoText>
                        </View>
                    )}
                </BlurView>

                {/* Error Message */}
                {error && (
                    <View style={[styles.errorBanner, { top: insets.top + 80 }]}>
                        <MonoText size="s" color={colors.error}>{error}</MonoText>
                    </View>
                )}

                {/* Coupon Count Badge */}
                {!loading && !searchMode && (
                    <View style={[styles.countBadge, { top: insets.top + 60 }]}>
                        <MonoText size="s" weight="bold" color={colors.primary}>
                            {coupons.length} coupon{coupons.length !== 1 ? 's' : ''} available
                        </MonoText>
                    </View>
                )}

                {/* Coupons List */}
                {loading || searching ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <MonoText size="s" color={colors.textLight} style={{ marginTop: 12 }}>
                            {searching ? 'Searching...' : 'Loading coupons...'}
                        </MonoText>
                    </View>
                ) : (
                    <FlatList
                        data={coupons}
                        keyExtractor={(item) => item._id}
                        renderItem={renderCouponCard}
                        contentContainerStyle={[
                            styles.listContent,
                            { paddingTop: insets.top + 100 }
                        ]}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="1.5">
                                    <Path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </Svg>
                                <MonoText size="m" weight="bold" style={{ marginTop: 16 }}>
                                    No coupons found
                                </MonoText>
                                <MonoText size="s" color={colors.textLight} style={{ marginTop: 4, textAlign: 'center' }}>
                                    {searchMode ? 'Try a different code' : 'Check back later for new offers!'}
                                </MonoText>
                            </View>
                        }
                    />
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    headerBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 12,
        paddingHorizontal: 12,
        marginHorizontal: 8,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 15,
        color: colors.text,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    searchCloseBtn: {
        padding: 4,
    },
    searchResultsHeader: {
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    loaderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 150,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    countBadge: {
        position: 'absolute',
        top: 100, // Will be overridden with insets.top + offset dynamically
        left: 16,
        right: 16,
        zIndex: 5,
        backgroundColor: `${colors.primary}10`,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    errorBanner: {
        position: 'absolute',
        top: 130, // Will be overridden with insets.top + offset dynamically
        left: 16,
        right: 16,
        zIndex: 5,
        backgroundColor: '#FEE2E2',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    couponCardContainer: {
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    couponCardContent: {
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    cardTopSection: {
        marginBottom: 16,
    },
    cardDivider: {
        height: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        marginBottom: 16,
    },
    cardBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    couponCardDisabled: {
        opacity: 0.6,
    },
    codeBadgeNeoglass: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.primary,
        borderStyle: 'dashed',
        backgroundColor: 'rgba(255, 71, 0, 0.05)',
    },
    applyBtnNeoglass: {
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 12,
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    applyBtnDisabledNeoglass: {
        backgroundColor: colors.textLight,
        shadowOpacity: 0,
        elevation: 0,
    },
    applyBtnLoading: {
        paddingHorizontal: 30,
    },
    infoBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        paddingHorizontal: 40,
    },
});

export default ApplyCouponModal;
