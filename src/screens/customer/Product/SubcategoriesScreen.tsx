import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform, Dimensions, ActivityIndicator, Image } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MonoText } from '../../../components/shared/MonoText';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { ProductGridCard } from '../../../components/shared/ProductGridCard';
import { ProductSkeleton } from '../../../components/shared/ProductSkeleton';
import { Product, productService, SubCategory } from '../../../services/customer/product.service';
import { useBranchStore } from '../../../store/branch.store';
import { useCartStore } from '../../../store/cart.store';
import { ProductDetailsModal } from '../../../components/home/ProductDetailsModal';
import { FloatingCarts } from '../../../components/home/FloatingCarts';
import { NoServiceScreen } from '../../../components/shared/NoServiceScreen';
import { BrandFooter } from '../../../components/shared/BrandFooter';

type SubcategoriesScreenRouteProp = RouteProp<{ params: { subcategoryId: string; subcategoryName?: string; categoryId?: string } }, 'params'>;

const HEADER_CONTENT_HEIGHT = 56;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = 85;
const CONTENT_WIDTH = SCREEN_WIDTH - SIDEBAR_WIDTH;
const CARD_WIDTH = (CONTENT_WIDTH - 24) / 2; // 12 padding each side

// Glass Header
const SubcategoriesHeader = ({ navigation, title }: { navigation: any, title: string }) => {
    const insets = useSafeAreaInsets();
    const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;

    return (
        <View style={[styles.headerContainer, { height: headerHeight, paddingTop: insets.top }]}>
            <View style={StyleSheet.absoluteFill}>
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="light"
                    blurAmount={20}
                    reducedTransparencyFallbackColor="white"
                />
            </View>
            <View style={styles.headerContent}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M19 12H5" />
                        <Path d="M12 19l-7-7 7-7" />
                    </Svg>
                </TouchableOpacity>
                <MonoText size="l" weight="bold" color={colors.text} style={styles.headerTitle}>{title}</MonoText>
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

// Sidebar Item Component
const SidebarItem = ({
    subcategory,
    isSelected,
    onPress
}: {
    subcategory: SubCategory;
    isSelected: boolean;
    onPress: () => void;
}) => (
    <TouchableOpacity
        style={[styles.sidebarItem, isSelected && styles.sidebarItemSelected]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        {isSelected && <View style={styles.selectedIndicator} />}
        <View style={[styles.sidebarImageContainer, isSelected && styles.sidebarImageContainerSelected]}>
            {subcategory.image ? (
                <Image
                    source={{ uri: subcategory.image }}
                    style={styles.sidebarImage}
                    resizeMode="cover"
                />
            ) : (
                <View style={styles.sidebarPlaceholder}>
                    <MonoText size="xs" color={colors.textLight}>IMG</MonoText>
                </View>
            )}
        </View>
        <MonoText
            size="xs"
            weight={isSelected ? 'bold' : 'medium'}
            color={isSelected ? colors.primary : colors.text}
            style={styles.sidebarText}
            numberOfLines={2}
        >
            {subcategory.name}
        </MonoText>
    </TouchableOpacity>
);

export const SubcategoriesScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<SubcategoriesScreenRouteProp>();
    const insets = useSafeAreaInsets();
    const dynamicHeaderHeight = insets.top + HEADER_CONTENT_HEIGHT;
    const sidebarScrollRef = useRef<ScrollView>(null);

    // Get params
    const initialSubcategoryId = route.params?.subcategoryId;
    const initialSubcategoryName = route.params?.subcategoryName || 'Products';
    const categoryIdFromRoute = route.params?.categoryId;

    const { currentBranch, isServiceAvailable } = useBranchStore();
    const { addToCart, removeFromCart, getItemQuantity } = useCartStore();
    const cartItems = useCartStore(state => state.items);

    // Local State
    const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
    const [selectedSubcategory, setSelectedSubcategory] = useState<SubCategory | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

    const branchId = currentBranch?._id;

    // Fetch subcategories on mount
    useEffect(() => {
        if (isServiceAvailable) {
            fetchSubcategories();
        }
    }, [isServiceAvailable]);

    // Fetch products when selected subcategory changes
    useEffect(() => {
        if (selectedSubcategory && branchId && isServiceAvailable) {
            fetchSubcategoryProducts();
        }
    }, [selectedSubcategory, branchId]);

    const fetchSubcategories = async () => {
        setIsLoadingSubcategories(true);
        try {
            // Fetch all subcategories grouped to find siblings
            const groupedData = await productService.getSubCategoriesGrouped();

            // Find which category the initial subcategory belongs to
            let foundSubcategories: SubCategory[] = [];
            let foundInitialSub: SubCategory | null = null;

            for (const group of groupedData) {
                const match = group.subcategories.find(s => s._id === initialSubcategoryId);
                if (match) {
                    foundSubcategories = group.subcategories;
                    foundInitialSub = match;
                    break;
                }
            }

            // If not found, try to get subcategories by category ID if provided
            if (foundSubcategories.length === 0 && categoryIdFromRoute) {
                foundSubcategories = await productService.getSubCategoriesByCategory(categoryIdFromRoute);
                foundInitialSub = foundSubcategories.find(s => s._id === initialSubcategoryId) || foundSubcategories[0] || null;
            }

            // Fallback: just use the initial subcategory
            if (foundSubcategories.length === 0 && initialSubcategoryId) {
                foundSubcategories = [{
                    _id: initialSubcategoryId,
                    name: initialSubcategoryName,
                    image: '',
                    category: ''
                }];
                foundInitialSub = foundSubcategories[0];
            }

            setSubcategories(foundSubcategories);
            setSelectedSubcategory(foundInitialSub);
        } catch (error) {
            console.error('Failed to fetch subcategories:', error);
            // Fallback
            setSubcategories([{
                _id: initialSubcategoryId,
                name: initialSubcategoryName,
                image: '',
                category: ''
            }]);
            setSelectedSubcategory({
                _id: initialSubcategoryId,
                name: initialSubcategoryName,
                image: '',
                category: ''
            });
        } finally {
            setIsLoadingSubcategories(false);
        }
    };

    const fetchSubcategoryProducts = async () => {
        if (!branchId || !selectedSubcategory) return;

        setIsLoading(true);
        setProducts([]);
        setNextCursor(null);
        setHasMore(true);

        try {
            const feedData = await productService.getProductsFeed(branchId, {
                limit: 20,
                subcategory: selectedSubcategory._id
            });

            setProducts(feedData.products);
            setNextCursor(feedData.nextCursor);
            setHasMore(feedData.hasMore);
        } catch (error) {
            console.error('Failed to fetch subcategory products:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMoreProducts = async () => {
        if (isLoadingMore || !hasMore || !branchId || !nextCursor || !selectedSubcategory) return;

        setIsLoadingMore(true);
        try {
            const feedData = await productService.getProductsFeed(branchId, {
                limit: 20,
                cursor: nextCursor,
                subcategory: selectedSubcategory._id
            });

            setProducts(prev => [...prev, ...feedData.products]);
            setNextCursor(feedData.nextCursor);
            setHasMore(feedData.hasMore);
        } catch (error) {
            console.error('Failed to load more products:', error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleSubcategorySelect = (subcategory: SubCategory) => {
        setSelectedSubcategory(subcategory);
    };

    const handleProductPress = useCallback((product: Product, variantId?: string) => {
        setSelectedProduct(product);
        setSelectedVariantId(variantId || null);
        setDetailsModalVisible(true);
    }, []);

    const handleAddToCart = useCallback((product: Product, variant: any) => {
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
            const { useToastStore } = require('../../../store/toast.store');
            const currentQuantity = getItemQuantity(cartItemId);
            if (currentQuantity >= (variant?.stock || 0)) {
                useToastStore.getState().showToast('Maximum stock limit reached!');
            } else {
                useToastStore.getState().showToast('Product is out of stock!');
            }
        }
    }, [addToCart, getItemQuantity]);

    const renderItem = useCallback(({ item }: { item: any }) => {
        const cartItemId = item.inventoryId || item._id;
        const variantData = {
            _id: item.inventoryId,
            inventoryId: item.inventoryId,
            variant: item.variant,
            pricing: item.pricing,
            stock: item.stock,
            isAvailable: item.isAvailable
        };
        const quantity = getItemQuantity(cartItemId);

        return (
            <ProductGridCard
                product={item}
                variant={variantData}
                quantity={quantity}
                width={CARD_WIDTH}
                onPress={handleProductPress}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={removeFromCart}
                isSoldOut={!item.isAvailable}
            />
        );
    }, [cartItems, getItemQuantity, handleProductPress, handleAddToCart, removeFromCart]);

    const headerTitle = selectedSubcategory?.name || initialSubcategoryName;

    // No service screen
    if (!isServiceAvailable) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        paddingTop: dynamicHeaderHeight + spacing.xl
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.noServiceFullContainer}>
                        <NoServiceScreen />
                    </View>
                    <BrandFooter />
                </ScrollView>
                <SubcategoriesHeader navigation={navigation} title={headerTitle} />
                <FloatingCarts showWithTabBar={false} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <View style={[styles.mainContent, { paddingTop: dynamicHeaderHeight }]}>
                {/* Sidebar */}
                <View style={styles.sidebar}>
                    <ScrollView
                        ref={sidebarScrollRef}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.sidebarContent}
                    >
                        {isLoadingSubcategories ? (
                            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
                        ) : (
                            subcategories.map((sub) => (
                                <SidebarItem
                                    key={sub._id}
                                    subcategory={sub}
                                    isSelected={selectedSubcategory?._id === sub._id}
                                    onPress={() => handleSubcategorySelect(sub)}
                                />
                            ))
                        )}
                    </ScrollView>
                </View>

                {/* Product Grid */}
                <View style={styles.productGrid}>
                    {isLoading ? (
                        <FlashList
                            data={[1, 2, 3, 4, 5, 6]}
                            keyExtractor={(i: number) => `skeleton-${i}`}
                            renderItem={() => <ProductSkeleton width={CARD_WIDTH} />}
                            numColumns={2}
                            contentContainerStyle={{
                                paddingHorizontal: 6,
                                paddingTop: spacing.m,
                                paddingBottom: 120
                            }}
                            estimatedItemSize={280}
                            showsVerticalScrollIndicator={false}
                        />
                    ) : (
                        <FlashList
                            data={products}
                            keyExtractor={(item: Product, index: number) => `${item._id}_${item.inventoryId || index}`}
                            renderItem={renderItem}
                            numColumns={2}
                            contentContainerStyle={{
                                paddingHorizontal: 6,
                                paddingTop: spacing.m,
                                paddingBottom: 120
                            }}
                            estimatedItemSize={280}
                            showsVerticalScrollIndicator={false}
                            onEndReached={loadMoreProducts}
                            onEndReachedThreshold={0.5}
                            ListFooterComponent={isLoadingMore ? (
                                <View style={styles.loadingMore}>
                                    <ActivityIndicator size="small" color={colors.primary} />
                                    <MonoText size="s" color={colors.textLight} style={{ marginLeft: 8 }}>Loading more...</MonoText>
                                </View>
                            ) : null}
                            ListEmptyComponent={() => (
                                <View style={styles.emptyState}>
                                    <MonoText color={colors.textLight}>No products available in this subcategory.</MonoText>
                                </View>
                            )}
                        />
                    )}
                </View>
            </View>

            {/* Header Overlay */}
            <SubcategoriesHeader navigation={navigation} title={headerTitle} />

            <ProductDetailsModal
                visible={detailsModalVisible}
                product={selectedProduct}
                initialVariantId={selectedVariantId}
                onClose={() => setDetailsModalVisible(false)}
            />

            <FloatingCarts showWithTabBar={false} />
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
    },
    headerContent: {
        height: HEADER_CONTENT_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
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
            android: {
                elevation: 3,
            },
        }),
    },
    headerTitle: {
        flex: 1,
        marginLeft: 12,
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
            android: {
                elevation: 3,
            },
        }),
    },
    mainContent: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebar: {
        width: SIDEBAR_WIDTH,
        backgroundColor: '#F5F5F5',
        borderRightWidth: 1,
        borderRightColor: '#E0E0E0',
    },
    sidebarContent: {
        paddingVertical: spacing.s,
    },
    sidebarItem: {
        alignItems: 'center',
        paddingVertical: spacing.s,
        paddingHorizontal: 4,
        marginVertical: 2,
        position: 'relative',
    },
    sidebarItemSelected: {
        backgroundColor: colors.white,
    },
    selectedIndicator: {
        position: 'absolute',
        left: 0,
        top: 8,
        bottom: 8,
        width: 3,
        backgroundColor: colors.primary,
        borderTopRightRadius: 2,
        borderBottomRightRadius: 2,
    },
    sidebarImageContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: colors.white,
        overflow: 'hidden',
        marginBottom: 4,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    sidebarImageContainerSelected: {
        borderWidth: 2,
        borderColor: colors.primary,
    },
    sidebarImage: {
        width: '100%',
        height: '100%',
    },
    sidebarPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
    },
    sidebarText: {
        textAlign: 'center',
        lineHeight: 13,
    },
    productGrid: {
        flex: 1,
        backgroundColor: colors.white,
    },
    emptyState: {
        marginTop: spacing.xl,
        alignItems: 'center',
        padding: spacing.l,
    },
    noServiceFullContainer: {
        flex: 1,
        minHeight: 400,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingMore: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.l,
        marginTop: spacing.m,
    },
});
