import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    Image,
    Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Svg, { Circle, Line, Path, Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import { SafeBlurView as BlurView } from '../../../components/shared/SafeBlurView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { MonoText } from '../../../components/shared/MonoText';
import { SkeletonItem } from '../../../components/shared/SkeletonLoader';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { productService, SubCategoryGrouped, SubCategory, Category } from '../../../services/customer/product.service';
import { FloatingCarts } from '../../../components/home/FloatingCarts';
import { useBranchStore } from '../../../store/branch.store';
import { NoServiceScreen } from '../../../components/shared/NoServiceScreen';
import { BrandFooter } from '../../../components/shared/BrandFooter';
import Icon from 'react-native-vector-icons/Feather';

type CategoriesScreenRouteProp = RouteProp<{ params: { initialCategory?: string } }, 'params'>;

const HEADER_CONTENT_HEIGHT = 56;
const TAB_BAR_HEIGHT = 80;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Subcategory card grid: 3 columns
const NUM_COLUMNS = 3;
const CARD_GAP = 12;
const CONTENT_PADDING = 20;
const CARD_WIDTH = (SCREEN_WIDTH - CONTENT_PADDING * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const CARD_HEIGHT_SHORT = CARD_WIDTH * 1.15;
const CARD_HEIGHT_TALL = CARD_WIDTH * 1.45;

// Unified theme palette based on colors.primary
const THEME_PALETTE = { start: colors.primary, end: '#FF8C5F', bg: '#FFF5F0' };

// ─── GLASS HEADER ─────────────────────────────────────
const CategoriesHeader = ({ navigation }: { navigation: any }) => {
    const insets = useSafeAreaInsets();
    const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;

    return (
        <View style={[styles.headerContainer, { height: headerHeight, paddingTop: insets.top }]}>
            <View style={styles.headerContent}>
                {navigation.canGoBack() && (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M19 12H5M12 19l-7-7 7-7" />
                        </Svg>
                    </TouchableOpacity>
                )}
                <MonoText size="l" weight="bold" color={colors.text} style={styles.headerTitle}>
                    Explore Categories
                </MonoText>
                <TouchableOpacity onPress={() => navigation.navigate('Search')} style={styles.searchBtn}>
                    <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <Circle cx="11" cy="11" r="8" />
                        <Line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </Svg>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ─── CATEGORY TAB PILL ─────────────────────────────────
const CategoryTab = React.memo(({
    category,
    isSelected,
    onPress,
    index,
}: {
    category: Category;
    isSelected: boolean;
    onPress: () => void;
    index: number;
}) => {
    const [imageError, setImageError] = useState(false);
    const hasImage = !!category.image && !imageError;
    const palette = THEME_PALETTE;

    return (
        <Animated.View entering={FadeInUp.delay(index * 60).duration(400).springify()}>
            <TouchableOpacity
                style={[
                    styles.categoryTab,
                    isSelected && {
                        backgroundColor: palette.bg,
                        borderColor: palette.start,
                        borderWidth: 1.5,
                    },
                    !isSelected && {
                        backgroundColor: '#F8F9FA',
                        borderColor: 'transparent',
                        borderWidth: 1.5,
                    }
                ]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.tabImageWrapper,
                    isSelected && { backgroundColor: palette.bg },
                ]}>
                    {hasImage ? (
                        <Image
                            source={{ uri: category.image, cache: 'force-cache' }}
                            style={styles.tabImage}
                            resizeMode="cover"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <View style={[styles.tabImagePlaceholder, { backgroundColor: palette.bg }]}>
                            <Icon name="grid" size={18} color={palette.start} />
                        </View>
                    )}
                </View>
                <MonoText
                    size="xs"
                    weight={isSelected ? 'bold' : 'medium'}
                    color={isSelected ? palette.start : '#6B7280'}
                    numberOfLines={1}
                    style={styles.tabLabel}
                >
                    {category.name}
                </MonoText>
            </TouchableOpacity>
        </Animated.View>
    );
});

// ─── SUBCATEGORY CARD (Premium) ────────────────────────
const SubcategoryCard = React.memo(({
    subcategory,
    onPress,
    index,
    isTall,
}: {
    subcategory: SubCategory;
    onPress: (sub: SubCategory) => void;
    index: number;
    isTall: boolean;
}) => {
    const [imageError, setImageError] = useState(false);
    const hasImage = !!subcategory.image && !imageError;
    const cardHeight = isTall ? CARD_HEIGHT_TALL : CARD_HEIGHT_SHORT;
    const palette = THEME_PALETTE;

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 50).duration(350).springify()}
            style={{ width: CARD_WIDTH, marginBottom: CARD_GAP }}
        >
            <TouchableOpacity
                style={[styles.subcategoryCard, { height: cardHeight }]}
                onPress={() => onPress(subcategory)}
                activeOpacity={0.85}
            >
                {/* Background Image */}
                {hasImage ? (
                    <Image
                        source={{ uri: subcategory.image, cache: 'force-cache' }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.bg }]}>
                        <View style={styles.placeholderIconContainer}>
                            <Icon name="package" size={28} color={palette.start} />
                        </View>
                    </View>
                )}

                {/* Subtle Gradient Overlay at bottom for text readability */}
                <View style={styles.cardGradientOverlay}>
                    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <Defs>
                            <SvgLinearGradient id={`grad-${subcategory._id}`} x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor="#000" stopOpacity="0" />
                                <Stop offset="1" stopColor="#000" stopOpacity="0.15" />
                            </SvgLinearGradient>
                        </Defs>
                        <Rect width="100" height="100" fill={`url(#grad-${subcategory._id})`} />
                    </Svg>
                </View>

                {/* Name Label */}
                <View style={styles.cardLabelContainer}>
                    <MonoText
                        size="xs"
                        weight="bold"
                        color="#FFFFFF"
                        numberOfLines={2}
                        style={styles.cardLabel}
                    >
                        {subcategory.name}
                    </MonoText>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

// ─── CATEGORY SECTION HEADER ──────────────────────────
const CategorySectionHeader = ({
    category,
    subcategoryCount,
}: {
    category: Category;
    subcategoryCount: number;
}) => {
    const palette = THEME_PALETTE;
    return (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionAccentBar, { backgroundColor: palette.start }]} />
                <View>
                    <MonoText size="l" weight="bold" color="#1F2937">
                        {category.name}
                    </MonoText>
                    <MonoText size="xs" color="#9CA3AF" style={{ marginTop: 2 }}>
                        {subcategoryCount} {subcategoryCount === 1 ? 'item' : 'items'}
                    </MonoText>
                </View>
            </View>
        </Animated.View>
    );
};

// ─── SKELETON ─────────────────────────────────────────
const CategoriesSkeletonLoader = () => {
    const insets = useSafeAreaInsets();
    return (
        <View style={{ flex: 1, backgroundColor: '#FAFBFC' }}>
            {/* Tab bar skeleton */}
            <View style={{
                paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 12,
                paddingHorizontal: CONTENT_PADDING,
            }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <View key={i} style={{ marginRight: 10, alignItems: 'center' }}>
                            <SkeletonItem width={68} height={68} borderRadius={20} style={{ marginBottom: 6 }} />
                            <SkeletonItem width={52} height={10} borderRadius={4} />
                        </View>
                    ))}
                </ScrollView>
            </View>
            {/* Section header skeleton */}
            <View style={{ paddingHorizontal: CONTENT_PADDING, marginTop: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                <SkeletonItem width={4} height={28} borderRadius={2} style={{ marginRight: 12 }} />
                <View>
                    <SkeletonItem width={120} height={18} borderRadius={4} style={{ marginBottom: 6 }} />
                    <SkeletonItem width={60} height={10} borderRadius={4} />
                </View>
            </View>
            {/* Grid skeleton */}
            <View style={{ paddingHorizontal: CONTENT_PADDING, flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonItem
                        key={i}
                        width={CARD_WIDTH}
                        height={i % 3 === 0 ? CARD_HEIGHT_TALL : CARD_HEIGHT_SHORT}
                        borderRadius={16}
                    />
                ))}
            </View>
        </View>
    );
};

// ─── MAIN SCREEN ──────────────────────────────────────
export const CategoriesScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<CategoriesScreenRouteProp>();
    const insets = useSafeAreaInsets();
    const dynamicHeaderHeight = insets.top + HEADER_CONTENT_HEIGHT;
    const tabScrollRef = useRef<ScrollView>(null);
    const contentScrollRef = useRef<ScrollView>(null);

    const { isServiceAvailable, currentBranch } = useBranchStore();
    const initialCategory = route.params?.initialCategory;

    const [groupedData, setGroupedData] = useState<SubCategoryGrouped[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    // Fetch data
    useEffect(() => {
        if (isServiceAvailable) {
            fetchGroupedSubcategories();
        } else {
            setGroupedData([]);
            setIsLoading(false);
        }
    }, [isServiceAvailable, currentBranch]);

    const fetchGroupedSubcategories = async () => {
        setIsLoading(true);
        try {
            const data = await productService.getSubCategoriesGrouped();
            setGroupedData(data);
            // Auto-select first or initial category
            if (data.length > 0) {
                const initial = initialCategory
                    ? data.find(g => g.category._id === initialCategory)
                    : data[0];
                setSelectedCategoryId(initial?.category._id || data[0].category._id);
            }
        } catch (error) {
            console.error('Failed to fetch grouped subcategories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Derive selected group
    const selectedGroup = useMemo(() =>
        groupedData.find(g => g.category._id === selectedCategoryId) || null,
        [groupedData, selectedCategoryId]
    );

    const selectedPalette = THEME_PALETTE;

    const handleCategorySelect = useCallback((categoryId: string) => {
        setSelectedCategoryId(categoryId);
        // Scroll content to top on category switch
        contentScrollRef.current?.scrollTo({ y: 0, animated: true });
    }, []);

    const handleSubcategoryPress = useCallback((subcategory: SubCategory) => {
        navigation.navigate('Subcategories', {
            subcategoryId: subcategory._id,
            subcategoryName: subcategory.name,
            categoryId: subcategory.category,
        });
    }, [navigation]);

    // Build staggered pattern for the grid
    const staggeredSubcategories = useMemo(() => {
        if (!selectedGroup) return [];
        return selectedGroup.subcategories.map((sub, i) => ({
            ...sub,
            // Create a repeating stagger: tall, short, short, short, tall, short...
            isTall: i % 5 === 0 || i % 5 === 3,
        }));
    }, [selectedGroup]);

    // ─── No Service ───
    if (!isServiceAvailable) {
        return (
            <View style={styles.container}>
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        paddingTop: dynamicHeaderHeight + spacing.xl,
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.noServiceContainer}>
                        <NoServiceScreen />
                    </View>
                    <BrandFooter />
                </ScrollView>
                <CategoriesHeader navigation={navigation} />
                <FloatingCarts />
            </View>
        );
    }

    // ─── Loading ───
    if (isLoading) {
        return (
            <View style={styles.container}>
                <CategoriesSkeletonLoader />
                <CategoriesHeader navigation={navigation} />
            </View>
        );
    }

    // ─── Empty ───
    if (groupedData.length === 0) {
        return (
            <View style={styles.container}>
                <View style={[styles.emptyState, { paddingTop: dynamicHeaderHeight + TAB_BAR_HEIGHT + 60 }]}>
                    <Icon name="inbox" size={48} color="#D1D5DB" />
                    <MonoText size="m" color="#9CA3AF" style={{ marginTop: 12 }}>
                        No categories available
                    </MonoText>
                </View>
                <CategoriesHeader navigation={navigation} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                ref={contentScrollRef}
                contentContainerStyle={{
                    paddingTop: dynamicHeaderHeight + TAB_BAR_HEIGHT,
                    paddingBottom: 160,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Selected Category Content */}
                {selectedGroup && (
                    <View key={selectedCategoryId}>
                        {/* Section Header */}
                        <CategorySectionHeader
                            category={selectedGroup.category}
                            subcategoryCount={selectedGroup.subcategories.length}
                        />

                        {/* Staggered Grid */}
                        <View style={styles.subcategoryGrid}>
                            {staggeredSubcategories.map((sub, index) => (
                                <SubcategoryCard
                                    key={sub._id}
                                    subcategory={sub}
                                    onPress={handleSubcategoryPress}
                                    index={index}
                                    isTall={(sub as any).isTall}
                                />
                            ))}
                        </View>
                    </View>
                )}

                <BrandFooter />
            </ScrollView>

            {/* ── Top Fade Layer ── */}
            <View style={[styles.topFadeContainer, { top: dynamicHeaderHeight + TAB_BAR_HEIGHT }]}>
                <Svg width="100%" height="24" viewBox="0 0 100 24" preserveAspectRatio="none">
                    <Defs>
                        <SvgLinearGradient id="fade-g" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={colors.white} stopOpacity="1" />
                            <Stop offset="1" stopColor={colors.white} stopOpacity="0" />
                        </SvgLinearGradient>
                    </Defs>
                    <Rect width="100" height="24" fill="url(#fade-g)" />
                </Svg>
            </View>

            {/* ── Sticky Tab Bar ── */}
            <Animated.View
                entering={FadeInDown.duration(300)}
                style={[styles.tabBarContainer, { top: dynamicHeaderHeight }]}
            >
                <ScrollView
                    ref={tabScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabBarContent}
                >
                    {groupedData.map((group, index) => {
                        return (
                            <CategoryTab
                                key={group.category._id}
                                category={group.category}
                                isSelected={group.category._id === selectedCategoryId}
                                onPress={() => handleCategorySelect(group.category._id)}
                                index={index}
                            />
                        );
                    })}
                </ScrollView>
            </Animated.View>

            {/* Glass Header */}
            <CategoriesHeader navigation={navigation} />

            <FloatingCarts />
        </View>
    );
};

// ─── STYLES ───────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBFC',
    },

    // ── Header ──
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: colors.white,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    headerContent: {
        height: HEADER_CONTENT_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    headerTitle: {
        flex: 1,
        marginLeft: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
            },
            android: { elevation: 3 },
        }),
    },
    searchBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
            },
            android: { elevation: 3 },
        }),
    },

    // ── Tab Bar ──
    tabBarContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 90,
        height: TAB_BAR_HEIGHT,
        backgroundColor: colors.white, // Solid white so nothing shows behind
        top: 0,
    },
    tabBarContent: {
        paddingHorizontal: CONTENT_PADDING - 4,
        alignItems: 'center',
        height: TAB_BAR_HEIGHT,
        paddingVertical: 6, // ✅ FIX (better alignment)
        gap: 8,
    },
    categoryTab: {
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 12,
        width: 88, // Fixed size for consistency
    },
    tabImageWrapper: {
        width: 42,
        height: 42,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#F0F1F3',
        marginBottom: 4,
    },
    tabImage: {
        width: '100%',
        height: '100%',
    },
    tabImagePlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabLabel: {
        maxWidth: 68,
        textAlign: 'center',
    },

    // ── Section Header ──
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: CONTENT_PADDING,
        marginBottom: 20,
        marginTop: 20,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionAccentBar: {
        width: 4,
        height: 32,
        borderRadius: 2,
        marginRight: 12,
    },

    // ── Subcategory Grid ──
    subcategoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: CONTENT_PADDING,
        gap: CARD_GAP,
    },
    subcategoryCard: {
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: '#F0F1F3',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: { elevation: 4 },
        }),
    },
    placeholderIconContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardGradientOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '40%',
    },
    cardLabelContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 10,
        paddingBottom: 10,
        paddingTop: 4,
    },
    cardLabel: {
        lineHeight: 15,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    accentDot: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 6,
        height: 6,
        borderRadius: 3,
    },

    // ── States ──
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noServiceContainer: {
        flex: 1,
        minHeight: 400,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topFadeContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 85,
        height: 24,
        pointerEvents: 'none',
    },
});
