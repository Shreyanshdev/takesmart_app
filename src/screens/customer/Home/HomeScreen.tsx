import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeHeader } from '../../../components/home/HomeHeader';
import { CategoryGrid } from '../../../components/home/CategoryGrid';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { MonoText } from '../../../components/shared/MonoText';
import { useHomeStore, HomeState } from '../../../store/home.store';
import { ProductDetailsModal } from '../../../components/home/ProductDetailsModal';
import { FloatingCarts } from '../../../components/home/FloatingCarts';
import { ProductGridCard } from '../../../components/shared/ProductGridCard';
import { ProductSkeleton } from '../../../components/shared/ProductSkeleton';
import { BannerSkeleton, CategoryGridSkeleton, HomeFullSkeleton } from '../../../components/home/HomeSkeletons';
import { BrandFooter } from '../../../components/shared/BrandFooter';
import { useCartStore } from '../../../store/cart.store';
import { useToastStore } from '../../../store/toast.store';
import { Product } from '../../../services/customer/product.service';
import { PromoCarousel } from '../../../components/home/PromoCarousel';
import { DynamicSection } from '../../../components/home/DynamicSection';
import { SectionHeader } from '../../../components/home/SectionHeader';
import { StackScreenProps } from '@react-navigation/stack';
import { useShallow } from 'zustand/react/shallow';
import { Dimensions } from 'react-native';
import { useBranchStore } from '../../../store/branch.store';
import { NoServiceScreen } from '../../../components/shared/NoServiceScreen';
import { FlashList } from '@shopify/flash-list';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2; // 12 padding on sides + 12 gap = 36

type HomeScreenProps = StackScreenProps<any, 'Home'>;

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
    const insets = useSafeAreaInsets();
    const {
        setTabBarVisible,
        fetchHomeData,
        fetchHomeLayout,
        loadMoreProducts,
        categories,
        normalProducts,
        homeLayoutSections,
        isLayoutLoading,
        isLoading,
        isLoadingMore,
        hasMore,
        error
    } = useHomeStore(useShallow((state: HomeState) => ({
        setTabBarVisible: state.setTabBarVisible,
        fetchHomeData: state.fetchHomeData,
        fetchHomeLayout: state.fetchHomeLayout,
        loadMoreProducts: state.loadMoreProducts,
        categories: state.categories,
        normalProducts: state.normalProducts,
        homeLayoutSections: state.homeLayoutSections,
        isLayoutLoading: state.isLayoutLoading,
        isLoading: state.isLoading,
        isLoadingMore: state.isLoadingMore,
        hasMore: state.hasMore,
        error: state.error
    })));



    const { currentBranch, isServiceAvailable } = useBranchStore();
    const { addToCart, removeFromCart, getItemQuantity } = useCartStore();
    const cartItems = useCartStore(state => state.items);
    const { showToast } = useToastStore();

    const [detailsModalVisible, setDetailsModalVisible] = React.useState(false);
    const [selectedDetailProduct, setSelectedDetailProduct] = React.useState<Product | null>(null);
    const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
    const [refreshing, setRefreshing] = React.useState(false);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([fetchHomeData(), fetchHomeLayout()]);
        } finally {
            setRefreshing(false);
        }
    }, [fetchHomeData, fetchHomeLayout]);

    const handleProductPress = React.useCallback((product: Product, variantId?: string) => {
        setSelectedDetailProduct(product);
        setSelectedVariantId(variantId || null);
        setDetailsModalVisible(true);
    }, []);

    const handleAddToCart = React.useCallback((product: Product, variant: any) => {
        const cartItemId = variant?._id || variant?.inventoryId || product._id;
        const productImage = variant?.variant?.images?.[0] || product.images?.[0] || product.image;

        const success = addToCart({
            ...product,
            _id: cartItemId,
            name: product.name,
            image: productImage || '',
            images: productImage ? [productImage] : (product.images || []),
            price: variant?.pricing?.mrp || 0,
            discountPrice: variant?.pricing?.sellingPrice || 0,
            stock: variant?.stock || 0,
            quantity: variant?.variant ? {
                value: variant.variant.weightValue,
                unit: variant.variant.weightUnit
            } : undefined,
            formattedQuantity: variant?.variant ? `${variant.variant.weightValue} ${variant.variant.weightUnit}` : undefined
        } as any);

        if (!success) {
            const currentQuantity = getItemQuantity(cartItemId);
            if (currentQuantity >= (variant?.stock || 0)) {
                showToast('Maximum stock limit reached!');
            } else {
                showToast('Product is out of stock!');
            }
        }
    }, [addToCart, getItemQuantity, showToast, cartItems]);

    const scrollY = useSharedValue(0);
    const lastScrollY = useSharedValue(0);
    const isTabBarVisibleSV = useSharedValue(true);

    const updateTabBar = (visible: boolean) => {
        setTabBarVisible(visible);
    };

    useEffect(() => {
        fetchHomeData();
        fetchHomeLayout();
    }, [fetchHomeData, fetchHomeLayout, currentBranch]);

    const handleLoadMore = React.useCallback(() => {
        if (hasMore && !isLoadingMore && isServiceAvailable && !isLoading) {
            loadMoreProducts();
        }
    }, [hasMore, isLoadingMore, isServiceAvailable, loadMoreProducts, isLoading]);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            const currentY = event.contentOffset.y;
            const diff = currentY - lastScrollY.value;

            if (currentY <= 0) {
                if (!isTabBarVisibleSV.value) {
                    isTabBarVisibleSV.value = true;
                    runOnJS(updateTabBar)(true);
                }
            } else if (Math.abs(diff) > 20) {
                if (diff > 0) {
                    if (isTabBarVisibleSV.value) {
                        isTabBarVisibleSV.value = false;
                        runOnJS(updateTabBar)(false);
                    }
                } else {
                    if (!isTabBarVisibleSV.value) {
                        isTabBarVisibleSV.value = true;
                        runOnJS(updateTabBar)(true);
                    }
                }
            }

            lastScrollY.value = currentY;
            scrollY.value = currentY;
        },
    });

    if (error) {
        return (
            <View style={[styles.container, styles.center, { padding: spacing.l }]}>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
                <MonoText size="l" weight="bold" color={colors.error} style={{ marginBottom: spacing.s }}>
                    Oops!
                </MonoText>
                <MonoText size="s" color={colors.text} style={{ textAlign: 'center', marginBottom: spacing.l }}>
                    {error}
                </MonoText>
                <TouchableOpacity
                    style={{ backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 }}
                    onPress={fetchHomeData}
                >
                    <MonoText size="s" weight="bold" color={colors.white}>Try Again</MonoText>
                </TouchableOpacity>
            </View>
        );
    }

    const headerPaddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : insets.top;
    const dynamicPaddingTop = headerPaddingTop + 116;

    // Check if we have dynamic sections to render
    const hasDynamicSections = homeLayoutSections.length > 0;

    const renderHeader = React.useCallback(() => {
        // Find if the first dynamic section is a banner carousel
        const isFirstSectionBanner = hasDynamicSections && homeLayoutSections[0]?.type === 'BANNER_CAROUSEL';
        const topBannerSection = isFirstSectionBanner ? homeLayoutSections[0] : null;
        const otherSections = isFirstSectionBanner ? homeLayoutSections.slice(1) : homeLayoutSections;

        return (
            <View style={{ paddingTop: dynamicPaddingTop }}>
                {/* Main Content Zone */}
                <View style={styles.contentZone}>
                    {!isServiceAvailable ? (
                        <View style={{ backgroundColor: colors.white, borderRadius: 12, padding: 16 }}>
                            <NoServiceScreen />
                        </View>
                    ) : (
                        <>
                            {hasDynamicSections ? (
                                <>
                                    {topBannerSection && (
                                        <View style={{ paddingBottom: 16 }}>
                                            <DynamicSection
                                                key={topBannerSection._id}
                                                section={topBannerSection}
                                                index={0}
                                                onProductPress={handleProductPress}
                                                isLoading={isLoading}
                                            />
                                        </View>
                                    )}
                                    {otherSections.map((section, idx) => (
                                        <DynamicSection
                                            key={section._id}
                                            section={section}
                                            index={isFirstSectionBanner ? idx + 1 : idx}
                                            onProductPress={handleProductPress}
                                            isLoading={isLoading}
                                        />
                                    ))}
                                </>
                            ) : (
                                <>
                                    {/* Fallback */}
                                    {isLayoutLoading || isLoading ? (
                                        <HomeFullSkeleton />
                                    ) : (
                                        <CategoryGrid categories={categories} />
                                    )}
                                </>
                            )}

                            {/* "Shop All Products" section title */}
                            <SectionHeader title="Shop All Products" subtitle="Browse our entire collection" />

                            {/* Initial Loading Skeletons */}
                            {isLoading && (
                                <View style={styles.grid}>
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <View key={`initial-${i}`} style={{ paddingHorizontal: 6, width: '50%' }}>
                                            <ProductSkeleton width={CARD_WIDTH} />
                                        </View>
                                    ))}
                                </View>
                            )}
                        </>
                    )}
                </View>
            </View>
        );
    }, [isServiceAvailable, hasDynamicSections, homeLayoutSections, isLayoutLoading, isLoading, categories, dynamicPaddingTop, handleProductPress]);

    const renderFooter = React.useCallback(() => (
        <View style={{ paddingBottom: 100 }}>
            {isLoadingMore && (
                <View style={styles.grid}>
                    {[1, 2, 3, 4].map((i) => (
                        <View key={`loading-${i}`} style={{ paddingHorizontal: 6, width: '50%' }}>
                            <ProductSkeleton width={CARD_WIDTH} />
                        </View>
                    ))}
                </View>
            )}

            {!isLoading && normalProducts.length === 0 && isServiceAvailable && (
                <View style={styles.noProductsSection}>
                    <MonoText size="m" color={colors.textLight} style={{ textAlign: 'center', marginBottom: 8 }}>
                        No inventory available in your area.
                    </MonoText>
                    <MonoText size="s" color={colors.textLight} style={{ textAlign: 'center' }}>
                        Try changing your location to see products from other branches.
                    </MonoText>
                </View>
            )}

            <BrandFooter />
        </View>
    ), [isLoadingMore, isLoading, normalProducts.length, isServiceAvailable]);

    const renderProduct = React.useCallback(({ item }: { item: any }) => {
        const cartItemId = item.inventoryId || item._id;
        const quantity = getItemQuantity(cartItemId);

        const variantData = {
            _id: item.inventoryId,
            inventoryId: item.inventoryId,
            variant: item.variant,
            pricing: item.pricing,
            stock: item.stock,
            isAvailable: item.isAvailable
        };

        return (
            <View style={{ paddingHorizontal: 6 }}>
                <ProductGridCard
                    product={item}
                    variant={variantData}
                    quantity={quantity}
                    width={CARD_WIDTH}
                    onPress={handleProductPress}
                    onAddToCart={handleAddToCart}
                    onRemoveFromCart={removeFromCart}
                />
            </View>
        );
    }, [cartItems, getItemQuantity, handleProductPress, handleAddToCart, removeFromCart]);

    const AnimatedFlashList = React.useMemo(() => Animated.createAnimatedComponent(FlashList as any) as any, []);

    return (
        <View style={styles.container}>

            <HomeHeader scrollY={scrollY} />

            <AnimatedFlashList
                data={isServiceAvailable ? normalProducts : []}
                renderItem={renderProduct}
                keyExtractor={(item: any, index: number) => `${item._id}_${item.inventoryId || index}`}
                numColumns={2}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={scrollHandler}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                        progressViewOffset={dynamicPaddingTop}
                    />
                }
                estimatedItemSize={280}
            />

            <ProductDetailsModal
                visible={detailsModalVisible}
                product={selectedDetailProduct}
                initialVariantId={selectedVariantId}
                onClose={() => setDetailsModalVisible(false)}
            />

            <FloatingCarts />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white, // Changed from #FAFAFA to match white zone
    },
    scrollContent: {
        paddingBottom: 100,
        backgroundColor: colors.white, // Ensure rest of the list is white
    },
    contentZone: {
        flex: 1,
        backgroundColor: colors.white,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 6,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    noProductsSection: {
        paddingVertical: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        borderRadius: 16,
        marginHorizontal: 4,
    },
});
