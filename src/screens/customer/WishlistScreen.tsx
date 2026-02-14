import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Dimensions,
    ActivityIndicator
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { MonoText } from '../../components/shared/MonoText';
import { Product } from '../../services/customer/product.service';
import { useWishlistStore } from '../../store/wishlist.store';
import { useCartStore } from '../../store/cart.store';
import { useToastStore } from '../../store/toast.store';
import { useBranchStore } from '../../store/branch.store';
import { ProductDetailsModal } from '../../components/home/ProductDetailsModal';
import { ProductGridCard } from '../../components/shared/ProductGridCard';
import { ProductSkeleton } from '../../components/shared/ProductSkeleton';
import { FloatingCarts } from '../../components/home/FloatingCarts';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2;

export const WishlistScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { wishlist, syncWishlist } = useWishlistStore();
    const { items, addToCart, removeFromCart, getItemQuantity, getTotalPrice } = useCartStore();
    const { showToast } = useToastStore();
    const { currentBranch } = useBranchStore();

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        const fetchWishlist = async () => {
            setLoading(true);
            await syncWishlist(currentBranch?._id);
            setLoading(false);
        };
        fetchWishlist();
    }, [currentBranch?._id]);

    // Wishlist products are now pre-flattened from API (each has embedded variant data)

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
            const currentQuantity = getItemQuantity(cartItemId);
            if (currentQuantity >= (variant?.stock || 0)) {
                showToast('Maximum stock limit reached!');
            } else {
                showToast('Product is out of stock!');
            }
        }
    }, [addToCart, getItemQuantity, showToast]);

    const renderProductCard = React.useCallback(({ item }: { item: any }) => {
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
                    onRemoveFromCart={removeFromCart}
                />
            </View>
        );
    }, [items, getItemQuantity, handleProductPress, handleAddToCart, removeFromCart]);

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
                        My Wishlist
                    </MonoText>

                    <TouchableOpacity onPress={() => navigation.navigate('Search')} style={styles.headerBtn}>
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                            <Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </Svg>
                    </TouchableOpacity>
                </SafeAreaView>
            </BlurView>

            {loading && wishlist.length === 0 ? (
                <View style={styles.listContent}>
                    <View style={styles.columnWrapper}>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <ProductSkeleton key={i} width={CARD_WIDTH} style={{ marginBottom: 16 }} />
                        ))}
                    </View>
                </View>
            ) : (
                <View style={{ flex: 1, paddingHorizontal: 6 }}>
                    <FlashListOptimized
                        data={wishlist}
                        keyExtractor={(item: any, index: number) => `${item._id}_${item.inventoryId || index}`}
                        numColumns={2}
                        contentContainerStyle={[
                            styles.listContent,
                            {
                                paddingBottom: totalItemsCount > 0 ? 120 : 40,
                                // paddingTop: insets.top + 60 + 12 // Moved to ListHeaderComponent
                            }
                        ]}
                        renderItem={renderProductCard}
                        showsVerticalScrollIndicator={false}
                        estimatedItemSize={280}
                        ListHeaderComponent={<View style={{ height: insets.top + 60 + 12 }} />}
                        ListEmptyComponent={
                            <Animated.View entering={FadeInUp} style={styles.emptyContainer}>
                                <Svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="1" opacity={0.5}>
                                    <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                </Svg>
                                <MonoText size="l" weight="bold" color={colors.textLight} style={{ marginTop: 24 }}>
                                    No products in wishlist yet
                                </MonoText>
                                <TouchableOpacity
                                    style={styles.browseBtn}
                                    onPress={() => navigation.navigate('Home')}
                                >
                                    <MonoText size="s" weight="bold" color={colors.white}>Start Shopping</MonoText>
                                </TouchableOpacity>
                            </Animated.View>
                        }
                        ListFooterComponent={<View style={{ height: 40 }} />}
                    />
                </View>
            )}

            {/* Integrated Floating Cart */}
            <FloatingCarts
                showWithTabBar={false}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })}
            />

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
    },
    listContent: {
        // paddingTop: 120, // Removed fixed padding, now dynamic
        // paddingHorizontal: 6, // Moved to parent container
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    browseBtn: {
        marginTop: 24,
        backgroundColor: colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 12,
    },
});
