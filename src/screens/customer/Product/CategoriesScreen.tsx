import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform, Image, FlatList, Dimensions } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MonoText } from '../../../components/shared/MonoText';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useHomeStore } from '../../../store/home.store';
import { useShallow } from 'zustand/react/shallow';
import { ProductGridCard } from '../../../components/shared/ProductGridCard';
import { ProductSkeleton } from '../../../components/shared/ProductSkeleton';
import { Product } from '../../../services/customer/product.service';
import { useBranchStore } from '../../../store/branch.store';
import { useCartStore } from '../../../store/cart.store';
import { useToastStore } from '../../../store/toast.store';
import { ProductDetailsModal } from '../../../components/home/ProductDetailsModal';
import { FloatingCarts } from '../../../components/home/FloatingCarts';
import { NoServiceScreen } from '../../../components/shared/NoServiceScreen';

type CategoriesScreenRouteProp = RouteProp<{ params: { initialCategory?: string } }, 'params'>;

const HEADER_CONTENT_HEIGHT = 56;
const HEADER_HEIGHT = HEADER_CONTENT_HEIGHT + 50; // Approximate safe area top
const SIDEBAR_WIDTH = 90;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Right content width = screen width - sidebar - spacing
const RIGHT_CONTENT_WIDTH = SCREEN_WIDTH - SIDEBAR_WIDTH;
const CARD_WIDTH = (RIGHT_CONTENT_WIDTH - 24) / 2; // 8 padding sides + 8 gap = 24

// Glass Header (Always Visible)
const CategoriesHeader = ({ navigation, title }: { navigation: any, title: string }) => {
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
                {/* Search Icon */}
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

export const CategoriesScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<CategoriesScreenRouteProp>();
    const insets = useSafeAreaInsets();
    const dynamicHeaderHeight = insets.top + HEADER_CONTENT_HEIGHT;

    // Global State
    const { categories, normalProducts, isLoading } = useHomeStore(useShallow(state => ({
        categories: state.categories,
        normalProducts: state.normalProducts,
        isLoading: state.isLoading,
    })));

    const { currentBranch, isServiceAvailable } = useBranchStore();
    const { addToCart, removeFromCart, getItemQuantity } = useCartStore();

    // Local State
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

    // Initial Selection
    useEffect(() => {
        if (route.params?.initialCategory) {
            setSelectedCategory(route.params.initialCategory);
        } else if (categories.length > 0) {
            // Default to first real category if 'All' isn't explicitly wanted as default, 
            // but for Sidebar UI, 'All' might be weird?
            // Screenshot shows specific categories. Let's keep 'All' logic or select first.
            // If we want sidebar to strictly match categories, let's select first category by default if no param
            if (selectedCategory === 'All') {
                setSelectedCategory(categories[0]._id);
            }
        }
    }, [route.params?.initialCategory, categories]);

    // Combined Products
    const allProducts = useMemo(() => {
        return normalProducts;
    }, [normalProducts]);

    const filteredProducts = useMemo(() => {
        if (!selectedCategory) return [];
        // if (selectedCategory === 'All') return allProducts; // If we support 'All'

        return allProducts.filter(p => {
            if (!p.category) return false;
            //@ts-ignore
            const catId = typeof p.category === 'string' ? p.category : p.category._id;
            return catId === selectedCategory;
        });
    }, [allProducts, selectedCategory]);

    // Handlers
    const handleProductPress = (product: Product, variantId?: string) => {
        setSelectedProduct(product);
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
            const { useToastStore } = require('../../../store/toast.store');
            const currentQuantity = getItemQuantity(cartItemId);
            if (currentQuantity >= (variant?.stock || 0)) {
                useToastStore.getState().showToast('Maximum stock limit reached!');
            } else {
                useToastStore.getState().showToast('Product is out of stock!');
            }
        }
    };

    const renderRightItem = ({ item }: { item: any }) => {
        const product = item.product || item;
        const variant = item.variant || product.variants?.[0];
        const cartItemId = variant?._id || variant?.inventoryId || product._id;
        const quantity = getItemQuantity(cartItemId);

        return (
            <ProductGridCard
                product={product}
                variant={variant}
                quantity={quantity}
                width={CARD_WIDTH}
                onPress={handleProductPress}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={removeFromCart}
                isSoldOut={!variant?.isAvailable}
            />
        );
    };

    const getCategoryName = () => {
        const cat = categories.find(c => c._id === selectedCategory);
        return cat ? cat.name : 'Products';
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Split Layout */}
            <View style={styles.contentRow}>
                {/* Left Sidebar */}
                <View style={styles.sidebar}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingTop: dynamicHeaderHeight + spacing.m, paddingBottom: 100 }}
                    >
                        {categories.map((cat) => {
                            const isSelected = selectedCategory === cat._id;
                            return (
                                <TouchableOpacity
                                    key={cat._id}
                                    style={[styles.sidebarItem, isSelected && styles.sidebarItemActive]}
                                    onPress={() => {
                                        setSelectedCategory(cat._id);
                                        // Reset scrollY logic if needed, but shared value is singular.
                                        // Ideally we scroll right list to top.
                                    }}
                                >
                                    {/* Category Icon/Image */}
                                    <View style={[styles.catIconContainer, isSelected && { backgroundColor: colors.white }]}>
                                        {cat.image ? (
                                            <Image source={{ uri: cat.image }} style={styles.catImage} />
                                        ) : (
                                            <View style={[styles.catPlaceholder, { backgroundColor: cat.color || '#eee' }]} />
                                        )}
                                    </View>
                                    <MonoText
                                        size="xs"
                                        weight={isSelected ? "bold" : "medium"}
                                        color={isSelected ? colors.primary : colors.text}
                                        style={styles.catText}
                                    >
                                        {cat.name}
                                    </MonoText>
                                    {isSelected && <View style={styles.activeIndicator} />}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Right Content */}
                <View style={styles.rightContent}>
                    {isServiceAvailable && isLoading ? (
                        <FlatList
                            data={[1, 2, 3, 4, 5, 6]}
                            keyExtractor={(i) => `skeleton-${i}`}
                            renderItem={() => <ProductSkeleton width={CARD_WIDTH} />}
                            numColumns={2}
                            contentContainerStyle={{
                                paddingTop: dynamicHeaderHeight + spacing.m,
                                paddingHorizontal: 8,
                                paddingBottom: 120
                            }}
                            showsVerticalScrollIndicator={false}
                            columnWrapperStyle={{ gap: 8 }}
                        />
                    ) : !isServiceAvailable ? (
                        <NoServiceScreen />
                    ) : (
                        <FlatList
                            data={filteredProducts.flatMap(p => {
                                const variants = (p as any).variants || [];
                                // Only keep variants that are available in this branch
                                const availableVariants = variants.filter((v: any) => v.isAvailable);

                                if (availableVariants.length === 0) return [];
                                if (availableVariants.length === 1) return [p];
                                return availableVariants.map((v: any) => ({ product: p, variant: v }));
                            })}
                            keyExtractor={(item, index) => (item.product?._id || item._id) + (item.variant?.inventoryId || index)}
                            renderItem={renderRightItem}
                            numColumns={2}
                            contentContainerStyle={{
                                paddingTop: dynamicHeaderHeight + spacing.m,
                                paddingHorizontal: 8,
                                paddingBottom: 120
                            }}
                            showsVerticalScrollIndicator={false}
                            columnWrapperStyle={{ gap: 8 }}
                            ListEmptyComponent={() => (
                                <View style={styles.emptyState}>
                                    <MonoText color={colors.textLight}>No products available in this category.</MonoText>
                                </View>
                            )}
                        />
                    )}
                </View>
            </View>

            {/* Header Overlay */}
            <CategoriesHeader
                navigation={navigation}
                title={getCategoryName()}
            />



            <ProductDetailsModal
                visible={detailsModalVisible}
                product={selectedProduct}
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
    contentRow: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebar: {
        width: SIDEBAR_WIDTH,
        backgroundColor: '#F5F5F5', // Light grey sidebar
        borderRightWidth: 1,
        borderRightColor: '#E0E0E0',
    },
    rightContent: {
        flex: 1,
        backgroundColor: colors.white,
    },
    sidebarItem: {
        alignItems: 'center',
        paddingVertical: spacing.m,
        paddingHorizontal: 4,
        marginBottom: spacing.s,
    },
    sidebarItemActive: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
        // Actually typical left nav has no radius or radius on right.
    },
    catIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        overflow: 'hidden',
    },
    catImage: {
        width: 40,
        height: 40,
    },
    catPlaceholder: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    catText: {
        textAlign: 'center',
        fontSize: 10,
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: 15,
        bottom: 15,
        width: 4,
        backgroundColor: colors.primary,
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
    },
    gridItemWrapper: {
        width: CARD_WIDTH,
        marginBottom: 12,
    },
    emptyState: {
        marginTop: spacing.xl,
        alignItems: 'center',
        padding: spacing.l,
    },
    noServiceContainer: {
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40, // Let the contentContainerStyle handle the top spacing
    },
    noServiceTitle: {
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    noServiceText: {
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 10,
    },
});
