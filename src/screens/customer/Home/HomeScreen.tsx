import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, Platform } from 'react-native';
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
import { BannerSkeleton, CategoryGridSkeleton } from '../../../components/home/HomeSkeletons';
import { BrandFooter } from '../../../components/shared/BrandFooter';
import { useCartStore } from '../../../store/cart.store';
import { useToastStore } from '../../../store/toast.store';
import { Product } from '../../../services/customer/product.service';
import { bannerService, Banner } from '../../../services/customer/banner.service';
import { PromoCarousel } from '../../../components/home/PromoCarousel';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useShallow } from 'zustand/react/shallow';
import { Dimensions } from 'react-native';
import { useBranchStore } from '../../../store/branch.store';
import { NoServiceScreen } from '../../../components/shared/NoServiceScreen';
import { FlashList } from '@shopify/flash-list';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2; // 12 padding on sides + 12 gap = 36

type HomeScreenProps = NativeStackScreenProps<any, 'Home'>;

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
    const insets = useSafeAreaInsets();
    const {
        setTabBarVisible,
        fetchHomeData,
        loadMoreProducts,
        categories,
        normalProducts,
        isLoading,
        isLoadingMore,
        hasMore,
        error
    } = useHomeStore(useShallow((state: HomeState) => ({
        setTabBarVisible: state.setTabBarVisible,
        fetchHomeData: state.fetchHomeData,
        loadMoreProducts: state.loadMoreProducts,
        categories: state.categories,
        normalProducts: state.normalProducts,
        isLoading: state.isLoading,
        isLoadingMore: state.isLoadingMore,
        hasMore: state.hasMore,
        error: state.error
    })));

    const { currentBranch, isServiceAvailable } = useBranchStore();
    const { addToCart, removeFromCart, getItemQuantity } = useCartStore();
    // Subscribe to cart items separately to ensure re-renders
    const cartItems = useCartStore(state => state.items);
    const { showToast } = useToastStore();

    const [detailsModalVisible, setDetailsModalVisible] = React.useState(false);
    const [selectedDetailProduct, setSelectedDetailProduct] = React.useState<Product | null>(null);
    const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
    const [banners, setBanners] = React.useState<Record<string, Banner>>({});
    const [isBannersLoading, setIsBannersLoading] = React.useState(false);

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

        console.log('Add to cart result:', success, 'Product ID:', cartItemId, 'Inventory ID:', variant?.inventoryId);
        console.log('Cart items after add:', cartItems.length);

        if (!success) {
            const currentQuantity = getItemQuantity(cartItemId);
            if (currentQuantity >= (variant?.stock || 0)) {
                showToast('Maximum stock limit reached!');
            } else {
                showToast('Product is out of stock!');
            }
        }
    }, [addToCart, getItemQuantity, showToast, cartItems]);

    // Products are now pre-flattened from the API (each variant = separate product entry)
    // No filtering needed - API returns only available, in-stock variants

    const scrollY = useSharedValue(0);
    const lastScrollY = useSharedValue(0);

    const updateTabBar = (visible: boolean) => {
        setTabBarVisible(visible);
    };

    useEffect(() => {
        fetchHomeData();
        loadBanners();
    }, [fetchHomeData, currentBranch]);

    const loadBanners = async () => {
        setIsBannersLoading(true);
        try {
            const data = await bannerService.getBanners();
            setBanners(data);
        } finally {
            setIsBannersLoading(false);
        }
    };

    // Optimized infinite scroll using FlashList onEndReached
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
                runOnJS(updateTabBar)(true);
            } else if (Math.abs(diff) > 20) {
                if (diff > 0) {
                    runOnJS(updateTabBar)(false);
                } else {
                    runOnJS(updateTabBar)(true);
                }
            }

            lastScrollY.value = currentY;
            scrollY.value = currentY;
        },
    });

    // Remove early return and handle isLoading inside the main render for a smoother feel

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
                    <MonoText size="s" weight="bold" color={colors.black}>Try Again</MonoText>
                </TouchableOpacity>
            </View>
        );
    }

    // Header content height = topRow(40) + marginBottom(12) + bottomRow(48) + paddingBottom(16) = 116
    const headerPaddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : insets.top;
    const dynamicPaddingTop = headerPaddingTop + 116;

    const renderHeader = React.useCallback(() => (
        <View style={{ paddingTop: dynamicPaddingTop }}>
            {/* No Service State */}
            {!isServiceAvailable ? (
                <NoServiceScreen />
            ) : (
                <>
                    {/* Main Promo Banner */}
                    {isBannersLoading ? (
                        <BannerSkeleton height={220} variant="full" />
                    ) : banners['HOME_MAIN'] && banners['HOME_MAIN'].slides.length > 0 && (
                        <PromoCarousel slides={banners['HOME_MAIN'].slides} height={220} />
                    )}

                    {isLoading ? (
                        <CategoryGridSkeleton />
                    ) : (
                        <CategoryGrid categories={categories} />
                    )}

                    {/* Secondary Promo Banner */}
                    {isBannersLoading ? (
                        <BannerSkeleton height={180} variant="card" />
                    ) : banners['HOME_SECONDARY'] && banners['HOME_SECONDARY'].slides.length > 0 && (
                        <PromoCarousel
                            slides={banners['HOME_SECONDARY'].slides}
                            height={180}
                            variant="card"
                        />
                    )}

                    {/* Section Title */}
                    <MonoText size="l" weight="bold" style={styles.sectionTitle}>Shop Now</MonoText>

                    {/* Initial Loading Skeletons */}
                    {isLoading && (
                        <View style={styles.grid}>
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <ProductSkeleton key={`initial-${i}`} width={CARD_WIDTH} />
                            ))}
                        </View>
                    )}
                </>
            )}
        </View>
    ), [isServiceAvailable, isBannersLoading, banners, isLoading, categories, dynamicPaddingTop]);

    const renderFooter = React.useCallback(() => (
        <View style={{ paddingBottom: 100 }}>
            {/* Skeleton loaders for infinite scroll */}
            {isLoadingMore && (
                <View style={styles.grid}>
                    {[1, 2, 3, 4].map((i) => (
                        <ProductSkeleton key={`loading-${i}`} width={CARD_WIDTH} />
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
        // Use inventoryId for cart lookup (each variant has unique inventoryId)
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
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

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
                removeClippedSubviews={Platform.OS === 'android'}
                estimatedItemSize={280}
            />

            {/* Product Details Modal */}
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
        backgroundColor: '#FAFAFA',
    },
    scrollContent: {
        paddingBottom: 100,
    },
    section: {
        marginBottom: spacing.l,
        paddingHorizontal: 12,
    },
    sectionTitle: {
        marginBottom: spacing.m,
        paddingHorizontal: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-evenly',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    noServiceContainer: {
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
    },
    noServiceTitle: {
        marginTop: 24,
        marginBottom: 12,
        textAlign: 'center',
    },
    noServiceText: {
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
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
    loadingMore: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.l,
        marginTop: spacing.m,
    }
});

