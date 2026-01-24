import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
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
import { BrandFooter } from '../../../components/shared/BrandFooter';
import { useCartStore } from '../../../store/cart.store';
import { useToastStore } from '../../../store/toast.store';
import { Product } from '../../../services/customer/product.service';
import { bannerService, Banner } from '../../../services/customer/banner.service';
import { PromoCarousel } from '../../../components/home/PromoCarousel';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useShallow } from 'zustand/react/shallow';
import { logger } from '../../../utils/logger';
import { Dimensions } from 'react-native';
import { useBranchStore } from '../../../store/branch.store';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { NoServiceScreen } from '../../../components/shared/NoServiceScreen';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2; // 12 padding on sides + 12 gap = 36

type HomeScreenProps = NativeStackScreenProps<any, 'Home'>;

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
    const insets = useSafeAreaInsets();
    const {
        setTabBarVisible,
        fetchHomeData,
        categories,
        normalProducts,
        isLoading,
        error
    } = useHomeStore(useShallow((state: HomeState) => ({
        setTabBarVisible: state.setTabBarVisible,
        fetchHomeData: state.fetchHomeData,
        categories: state.categories,
        normalProducts: state.normalProducts,
        isLoading: state.isLoading,
        error: state.error
    })));

    const { currentBranch, isServiceAvailable } = useBranchStore();
    const { addToCart, removeFromCart, getItemQuantity } = useCartStore();
    const { showToast } = useToastStore();

    const [detailsModalVisible, setDetailsModalVisible] = React.useState(false);
    const [selectedDetailProduct, setSelectedDetailProduct] = React.useState<Product | null>(null);
    const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
    const [banners, setBanners] = React.useState<Record<string, Banner>>({});

    const handleProductPress = (product: Product, variantId?: string) => {
        setSelectedDetailProduct(product);
        setSelectedVariantId(variantId || null);
        setDetailsModalVisible(true);
    };

    const handleAddToCart = (product: Product, variant: any) => {
        const cartItemId = variant?._id || variant?.inventoryId || product._id;
        const productImage = variant?.variant?.images?.[0] || product.images?.[0] || product.image;

        const success = addToCart({
            ...product,
            _id: cartItemId,
            name: product.name,
            image: productImage || '',
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
    };

    const flattenedProducts = React.useMemo(() => {
        if (!normalProducts) return [];
        const flattened: any[] = [];
        normalProducts.forEach((product: Product) => {
            const variants = (product as any).variants || [];
            // Only show product if it has available variants in this branch
            if (variants.length > 0) {
                variants.forEach((variant: any) => {
                    if (variant.isAvailable) {
                        flattened.push({ ...product, _displayVariant: variant });
                    }
                });
            }
        });
        return flattened;
    }, [normalProducts]);

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
        const data = await bannerService.getBanners();
        setBanners(data);
    };

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

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <HomeHeader scrollY={scrollY} />

            <Animated.ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingTop: dynamicPaddingTop }]}
                showsVerticalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                removeClippedSubviews={true}
            >
                {/* No Service State */}
                {!isServiceAvailable ? (
                    <NoServiceScreen />
                ) : (
                    <>
                        {/* Main Promo Banner */}
                        {banners['HOME_MAIN'] && banners['HOME_MAIN'].slides.length > 0 && (
                            <PromoCarousel slides={banners['HOME_MAIN'].slides} height={220} />
                        )}

                        <CategoryGrid categories={categories} />

                        {/* Secondary Promo Banner */}
                        {banners['HOME_SECONDARY'] && banners['HOME_SECONDARY'].slides.length > 0 && (
                            <PromoCarousel
                                slides={banners['HOME_SECONDARY'].slides}
                                height={180}
                                variant="card"
                            />
                        )}

                        {/* All Products */}
                        <View style={styles.section}>
                            <MonoText size="l" weight="bold" style={styles.sectionTitle}>Shop Now</MonoText>
                            {isLoading ? (
                                <View style={styles.grid}>
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <ProductSkeleton key={i} width={CARD_WIDTH} />
                                    ))}
                                </View>
                            ) : flattenedProducts.length > 0 ? (
                                <View style={styles.grid}>
                                    {flattenedProducts.map((p, index) => {
                                        const variant = p._displayVariant;
                                        const cartItemId = variant?._id || variant?.inventoryId || p._id;
                                        return (
                                            <ProductGridCard
                                                key={`${p._id}_${variant?._id || index}`}
                                                product={p}
                                                variant={variant}
                                                quantity={getItemQuantity(cartItemId)}
                                                width={CARD_WIDTH}
                                                onPress={handleProductPress}
                                                onAddToCart={handleAddToCart}
                                                onRemoveFromCart={removeFromCart}
                                            />
                                        );
                                    })}
                                </View>
                            ) : (
                                <View style={styles.noProductsSection}>
                                    <MonoText size="m" color={colors.textLight} style={{ textAlign: 'center', marginBottom: 8 }}>
                                        No inventory available in your area.
                                    </MonoText>
                                    <MonoText size="s" color={colors.textLight} style={{ textAlign: 'center' }}>
                                        Try changing your location to see products from other branches.
                                    </MonoText>
                                </View>
                            )}
                        </View>
                    </>
                )}

                <BrandFooter />

            </Animated.ScrollView>

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
        paddingHorizontal: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
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
    }
});

