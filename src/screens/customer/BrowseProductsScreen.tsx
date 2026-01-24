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

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();
    const [modalVisible, setModalVisible] = useState(false);

    const { items, addToCart, removeFromCart, getItemQuantity, getTotalPrice } = useCartStore();
    const { currentBranch, isServiceAvailable } = useBranchStore();
    const branchId = currentBranch?._id;

    useEffect(() => {
        fetchProducts();
    }, [type, value, branchId]); // Refresh if branch changes

    const fetchProducts = async (pageNum = 1) => {
        setLoading(pageNum === 1);
        try {
            let newProducts: Product[] = [];
            let pagination: any = null;

            if (type === 'brand') {
                const response = await productService.getProductsByBrand(value, branchId, pageNum, 20);
                newProducts = response.products || [];
                pagination = response.pagination;
            } else {
                const response = await productService.getProductsByCategory(categoryId || value, branchId);
                newProducts = Array.isArray(response) ? response : [];
            }

            // Flatten products with variants for the grid
            const flattened: any[] = [];

            newProducts.forEach(product => {
                const variants = (product as any).variants || [];
                if (variants.length > 0) {
                    variants.forEach((variant: any) => {
                        // Only show if variant is available in this branch context
                        if (variant.isAvailable) {
                            flattened.push({ ...product, _displayVariant: variant });
                        }
                    });
                }
            });

            if (pageNum === 1) {
                setProducts(flattened);
            } else {
                setProducts(prev => [...prev, ...flattened]);
            }
            setHasMore(pagination ? pagination.hasNext : false);
        } catch (err) {
            console.error('Failed to fetch products:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            setPage(p => p + 1);
            fetchProducts(page + 1);
        }
    };

    const handleProductPress = (product: Product, variantId?: string) => {
        setSelectedProduct(product);
        setSelectedVariantId(variantId);
        setModalVisible(true);
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
            const { useToastStore } = require('../../store/toast.store');
            const currentQuantity = getItemQuantity(cartItemId);
            if (currentQuantity >= (variant?.stock || 0)) {
                useToastStore.getState().showToast('Maximum stock limit reached!');
            } else {
                useToastStore.getState().showToast('Product is out of stock!');
            }
        }
    };

    const handleRemoveFromCart = (cartItemId: string) => {
        removeFromCart(cartItemId);
    };

    const renderProductCard = ({ item }: { item: any }) => {
        const variant = item._displayVariant;

        return (
            <ProductGridCard
                product={item}
                variant={variant}
                quantity={getItemQuantity(variant?._id || variant?.inventoryId || item._id)}
                width={CARD_WIDTH}
                onPress={handleProductPress}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
            />
        );
    };

    // Calculate total items from items array
    const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = getTotalPrice();

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
                <FlatList
                    data={products as any[]}
                    keyExtractor={(item, index) => `${item._id}_${item._displayVariant?._id || index}`}
                    numColumns={2}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: totalItemsCount > 0 ? 120 : 40 }
                    ]}
                    columnWrapperStyle={styles.columnWrapper}
                    renderItem={renderProductCard}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <MonoText color={colors.textLight}>No products available in this store.</MonoText>
                        </View>
                    )}
                    ListFooterComponent={<BrandFooter />}
                />
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
        paddingTop: 120,
        paddingHorizontal: 12,
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
});

export default BrowseProductsScreen;
