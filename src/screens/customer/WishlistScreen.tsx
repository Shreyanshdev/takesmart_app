import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Dimensions,
    ScrollView,
    Platform
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { SafeBlurView as BlurView } from '../../components/shared/SafeBlurView';
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
            <View style={{ paddingHorizontal: 6, marginBottom: 12 }}>
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


    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header — matching OrderHistoryScreen */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="light"
                    blurAmount={20}
                    reducedTransparencyFallbackColor="white"
                />
                <View style={styles.headerContent}>
                    {navigation.canGoBack() && (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2">
                                <Path d="M19 12H5M12 19l-7-7 7-7" />
                            </Svg>
                        </TouchableOpacity>
                    )}

                    <MonoText size="l" weight="bold" style={styles.headerTitle}>
                        My Wishlist
                    </MonoText>

                    <TouchableOpacity onPress={() => navigation.navigate('Search')} style={styles.headerBtn}>
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2">
                            <Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </Svg>
                    </TouchableOpacity>
                </View>
            </View>

            {loading && wishlist.length === 0 ? (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 12, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.grid}>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <View key={i} style={{ width: '50%', paddingHorizontal: 6 }}>
                                <ProductSkeleton width={CARD_WIDTH} style={{ marginBottom: 12 }} />
                            </View>
                        ))}
                    </View>
                </ScrollView>
            ) : (
                <View style={{ flex: 1, paddingHorizontal: 6 }}>
                    <FlashList
                        data={wishlist}
                        keyExtractor={(item: any, index: number) => `${item._id}_${item.inventoryId || index}`}
                        numColumns={2}
                        contentContainerStyle={[
                            styles.listContent,
                            {
                                paddingBottom: totalItemsCount > 0 ? 120 : 40,
                            }
                        ]}
                        renderItem={renderProductCard}
                        showsVerticalScrollIndicator={false}

                        ListHeaderComponent={<View style={{ height: 12 }} />}
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
                                onPress={() => {
                                    navigation.dispatch(
                                        CommonActions.reset({
                                            index: 0,
                                            routes: [{ name: 'MainTabs' }],
                                        })
                                    );
                                }}
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
        backgroundColor: '#FAFAFA',
    },
    header: {
        position: 'relative',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        overflow: 'hidden',
    },
    headerContent: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    headerTitle: {
        flex: 1,
        marginLeft: 12,
    },
    headerBtn: {
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
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
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
