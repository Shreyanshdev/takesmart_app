import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    Dimensions,
    StatusBar,
    ActivityIndicator,
    Platform
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { productService, Product } from '../../services/customer/product.service';
import { useCartStore } from '../../store/cart.store';
import { useBranchStore } from '../../store/branch.store';
import { ProductDetailsModal } from '../../components/home/ProductDetailsModal';
import { BrandFooter } from '../../components/shared/BrandFooter';

import { ProductGridCard } from '../../components/shared/ProductGridCard';
import { ProductSkeleton } from '../../components/shared/ProductSkeleton';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2; // 12 padding on sides + 12 gap = 36

type BrowseRouteParams = {
    type: 'brand' | 'category';
    value: string;
    categoryId?: string;
};

export const BrowseProductsScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<{ params: BrowseRouteParams }, 'params'>>();
    const { type, value, categoryId } = route.params;
    const insets = useSafeAreaInsets();

    // Products state with cursor pagination
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();
    const [modalVisible, setModalVisible] = useState(false);

    const { items, addToCart, removeFromCart, getItemQuantity, getTotalPrice } = useCartStore();
    const { currentBranch, isServiceAvailable } = useBranchStore();
    const branchId = currentBranch?._id;

    useEffect(() => {
        if (branchId) {
            fetchProducts();
        }
    }, [type, value, branchId]); // Refresh if branch changes

    const fetchProducts = async () => {
        if (!branchId) return;

        setLoading(true);
        setProducts([]);
        setNextCursor(null);
        setHasMore(true);

        try {
            // Use optimized feed API for both category and brand browsing
            const feedData = await productService.getProductsFeed(branchId, {
                limit: 20,
                category: type === 'category' ? (categoryId || value) : undefined,
                brand: type === 'brand' ? value : undefined
            });

            // Products are now pre-flattened from API
            setProducts(feedData.products || []);
            setNextCursor(feedData.nextCursor);
            setHasMore(feedData.hasMore);
        } catch (err) {
            console.error('Failed to fetch products:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = async () => {
        if (isLoadingMore || !hasMore || !branchId || !nextCursor) return;

        setIsLoadingMore(true);
        try {
            const feedData = await productService.getProductsFeed(branchId, {
                limit: 20,
                cursor: nextCursor,
                category: type === 'category' ? (categoryId || value) : undefined,
                brand: type === 'brand' ? value : undefined
            });

            // Products are pre-flattened from API - append with deduplication safeguard
            setProducts(prev => {
                const existingIds = new Set(prev.map(p => p.inventoryId || p._id));
                const seenInBatch = new Set<string>();

                const newProducts = (feedData.products || []).filter(p => {
                    const id = p.inventoryId || p._id;
                    if (id && (existingIds.has(id) || seenInBatch.has(id))) return false;
                    if (id) seenInBatch.add(id);
                    return true;
                });
                return [...prev, ...newProducts];
            });
            setNextCursor(feedData.nextCursor);
            setHasMore(feedData.hasMore);
        } catch (err) {
            console.error('Failed to load more products:', err);
        } finally {
            setIsLoadingMore(false);
        }
    };


    const handleProductPress = React.useCallback((product: Product, variantId?: string) => {
        setSelectedProduct(product);
        setSelectedVariantId(variantId);
        setModalVisible(true);
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
            const { useToastStore } = require('../../store/toast.store');
            const currentQuantity = getItemQuantity(cartItemId);
            if (currentQuantity >= (variant?.stock || 0)) {
                useToastStore.getState().showToast('Maximum stock limit reached!');
            } else {
                useToastStore.getState().showToast('Product is out of stock!');
            }
        }
    }, [addToCart, getItemQuantity]);

    const handleRemoveFromCart = React.useCallback((cartItemId: string) => {
        removeFromCart(cartItemId);
    }, [removeFromCart]);

    const renderProductCard = React.useCallback(({ item }: { item: Product }) => {
        // Products now have embedded variant/pricing/stock data from API
        const variantData = {
            _id: item.inventoryId,
            inventoryId: item.inventoryId,
            variant: item.variant,
            pricing: item.pricing,
            stock: item.stock,
            isAvailable: item.isAvailable
        };
        // Use inventoryId for cart lookup (each variant has unique inventoryId)
        const cartItemId = item.inventoryId || item._id;

        return (
            <View style={{ marginHorizontal: 6 }}>
                <ProductGridCard
                    product={item}
                    variant={variantData}
                    quantity={getItemQuantity(cartItemId)}
                    width={CARD_WIDTH}
                    onPress={handleProductPress}
                    onAddToCart={handleAddToCart}
                    onRemoveFromCart={handleRemoveFromCart}
                />
            </View>
        );
    }, [items, getItemQuantity, handleProductPress, handleAddToCart, handleRemoveFromCart]);

    // Calculate total items from items array
    const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = getTotalPrice();

    const FlashListOptimized = FlashList as any;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Glass Header */}
            <BlurView blurType="light" blurAmount={20} style={styles.header}>
                <SafeAreaView edges={['top']} style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                            <Path d="M19 12H5M12 19l-7-7 7-7" />
                        </Svg>
                    </TouchableOpacity>

                    <MonoText size="l" weight="bold" style={{ flex: 1, textAlign: 'center' }}>
                        {value}
                    </MonoText>

                    <TouchableOpacity onPress={() => navigation.navigate('Search')} style={styles.headerBtn}>
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                            <Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </Svg>
                    </TouchableOpacity>
                </SafeAreaView>
            </BlurView>

            {/* Products Grid */}
            {loading ? (
                <View style={styles.listContent}>
                    <View style={styles.columnWrapper}>
                        <ProductSkeleton width={CARD_WIDTH} />
                        <ProductSkeleton width={CARD_WIDTH} />
                    </View>
                    <View style={styles.columnWrapper}>
                        <ProductSkeleton width={CARD_WIDTH} />
                        <ProductSkeleton width={CARD_WIDTH} />
                    </View>
                    <View style={styles.columnWrapper}>
                        <ProductSkeleton width={CARD_WIDTH} />
                        <ProductSkeleton width={CARD_WIDTH} />
                    </View>
                </View>
            ) : !isServiceAvailable ? (
                <View style={styles.noServiceContainer}>
                    <Svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="1">
                        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <Circle cx="12" cy="10" r="3" />
                        <Line x1="4" y1="4" x2="20" y2="20" />
                    </Svg>
                    <MonoText size="l" weight="bold" style={styles.noServiceTitle}>No Service in Your Area</MonoText>
                    <MonoText size="s" color={colors.textLight} style={styles.noServiceText}>
                        Sorry, we have not opened any store in your area yet.
                    </MonoText>
                </View>
            ) : (
                <View style={{ flex: 1, paddingHorizontal: 6 }}>
                    <FlashListOptimized
                        data={products}
                        keyExtractor={(item: Product, index: number) => `${item._id}_${item.inventoryId || index}`}
                        numColumns={2}
                        contentContainerStyle={[
                            styles.listContent,
                            {
                                paddingBottom: totalItemsCount > 0 ? 120 : 40,
                                // paddingTop: insets.top + 60 + 12 // Moved to ListHeaderComponent
                            }
                        ]}
                        renderItem={renderProductCard}
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.5}
                        showsVerticalScrollIndicator={false}
                        estimatedItemSize={280}
                        ListHeaderComponent={() => (
                            <View style={{ height: insets.top + 60 + 12 }} />
                        )}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyContainer}>
                                <MonoText color={colors.textLight}>No products available in this store.</MonoText>
                            </View>
                        )}
                        ListFooterComponent={
                            <>
                                {isLoadingMore && (
                                    <View style={styles.loadingMore}>
                                        <ActivityIndicator size="small" color={colors.primary} />
                                        <MonoText size="s" color={colors.textLight} style={{ marginLeft: 8 }}>Loading more...</MonoText>
                                    </View>
                                )}
                                <BrandFooter />
                            </>
                        }
                    />
                </View>
            )}


            {/* Cart Bar */}
            {totalItemsCount > 0 && (
                <View style={[styles.cartBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <View style={styles.cartInfo}>
                        <MonoText size="s" weight="bold" color={colors.white}>
                            {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
                        </MonoText>
                        <MonoText size="xs" color="rgba(255,255,255,0.8)">
                            ₹{cartTotal.toFixed(0)}
                        </MonoText>
                    </View>
                    <TouchableOpacity
                        style={styles.checkoutBtn}
                        onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })}
                    >
                        <MonoText size="s" weight="bold" color={colors.primary}>
                            View Cart
                        </MonoText>
                        <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                            <Path d="M9 18l6-6-6-6" />
                        </Svg>
                    </TouchableOpacity>
                </View>
            )}

            {/* Product Details Modal */}
            <ProductDetailsModal
                visible={modalVisible}
                product={selectedProduct}
                initialVariantId={selectedVariantId}
                onClose={() => {
                    setModalVisible(false);
                    setSelectedProduct(null);
                    setSelectedVariantId(undefined);
                }}
            />
        </View>
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
    loaderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 150,
    },
    listContent: {
        // paddingTop: 120, // Removed fixed padding, now dynamic
        // paddingHorizontal: 6, // Moved to parent container
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    productCard: {
        width: CARD_WIDTH,
        marginBottom: 20,
        backgroundColor: colors.white,
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
    },
    variantBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    addBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 32,
        height: 32,
        backgroundColor: colors.white,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    qtyContainer: {
        position: 'absolute',
        top: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    qtyBtn: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyText: {
        paddingHorizontal: 6,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    strikePrice: {
        textDecorationLine: 'line-through',
        marginLeft: 6,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    cartBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    cartInfo: {
        flex: 1,
    },
    checkoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    noServiceContainer: {
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 150,
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
    loadingMore: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.l,
        marginTop: spacing.m,
    },
});

export default BrowseProductsScreen;
