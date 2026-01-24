import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    StatusBar,
    Platform,
    Animated,
    Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { MonoText } from '../../../components/shared/MonoText';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useHomeStore } from '../../../store/home.store';
import { useShallow } from 'zustand/react/shallow';
import { ProductGridCard } from '../../../components/shared/ProductGridCard';
import { ProductSkeleton } from '../../../components/shared/ProductSkeleton';
import { Product } from '../../../services/customer/product.service';
import { useCartStore } from '../../../store/cart.store';
import { useToastStore } from '../../../store/toast.store';
import { ProductDetailsModal } from '../../../components/home/ProductDetailsModal';
import { FloatingCarts } from '../../../components/home/FloatingCarts';
import { BrandFooter } from '../../../components/shared/BrandFooter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 16 padding sides + 16 gap = 48

export const SearchScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const inputRef = useRef<TextInput>(null);

    // Global Data
    const { normalProducts, isLoading } = useHomeStore(useShallow(state => ({
        normalProducts: state.normalProducts,
        isLoading: state.isLoading,
    })));
    const { addToCart, removeFromCart, getItemQuantity } = useCartStore();
    const { showToast } = useToastStore();

    // State
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // Modals
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

    // Animation values
    const searchBarWidth = useRef(new Animated.Value(0)).current;
    const titleOpacity = useRef(new Animated.Value(1)).current;

    // Auto-focus input
    useEffect(() => {
        if (inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
                handleSearchFocus();
            }, 300);
        }
    }, []);

    const handleSearchFocus = () => {
        setIsSearchFocused(true);
        Animated.parallel([
            Animated.timing(searchBarWidth, {
                toValue: 1,
                duration: 250,
                useNativeDriver: false
            }),
            Animated.timing(titleOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false
            })
        ]).start();
    };

    const handleSearchBlur = () => {
        if (!query) {
            setIsSearchFocused(false);
            Animated.parallel([
                Animated.timing(searchBarWidth, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: false
                }),
                Animated.timing(titleOpacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: false
                })
            ]).start();
        }
    };

    // Combine Products
    const allProducts = useMemo(() => {
        return normalProducts;
    }, [normalProducts]);

    // Trending Products
    const trendingProducts = useMemo(() => {
        return allProducts.slice(0, 4);
    }, [allProducts]);

    // Filter Logic
    const filteredProducts = useMemo(() => {
        if (!query) return [];
        const q = query.toLowerCase();
        return allProducts.filter(p => p.name.toLowerCase().includes(q));
    }, [query, allProducts]);

    // Suggestions
    const suggestions = useMemo(() => {
        if (!query) return [];
        return filteredProducts.map(p => p.name).slice(0, 8);
    }, [filteredProducts, query]);

    const handleSearchSubmit = () => {
        if (query.trim()) {
            setShowResults(true);
            inputRef.current?.blur();
        }
    };

    const handleSuggestionPress = (suggestion: string) => {
        setQuery(suggestion);
        setShowResults(true);
        inputRef.current?.blur();
    };

    const clearSearch = () => {
        setQuery('');
        setShowResults(false);
        inputRef.current?.focus();
    };

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
            const currentQuantity = getItemQuantity(cartItemId);
            if (currentQuantity >= (variant?.stock || 0)) {
                showToast('Maximum stock limit reached!');
            } else {
                showToast('Product is out of stock!');
            }
        }
    };

    const renderProductItem = ({ item }: { item: any }) => {
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

    // Animated width for search input
    const animatedSearchWidth = searchBarWidth.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    // 1. Initial State -> Trending Grid
    const renderInitialState = () => (
        <View>
            <View style={styles.trendingBanner}>
                <MonoText size="l" weight="bold" color="#D32F2F" style={{ marginBottom: 4 }}>TRENDING DEALS</MonoText>
                <MonoText size="s" color={colors.text}>Unique Product • Unbeatable Prices</MonoText>
            </View>

            <MonoText size="m" weight="bold" style={styles.sectionTitle}>Trending Products</MonoText>

            {isLoading ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                    {[1, 2, 3, 4].map(i => (
                        <ProductSkeleton key={i} width={CARD_WIDTH} style={{ marginBottom: 16 }} />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={trendingProducts.flatMap(p => {
                        const variants = (p as any).variants || [];
                        if (variants.length <= 1) return [p];
                        return variants.map((v: any) => ({ product: p, variant: v }));
                    })}
                    renderItem={renderProductItem}
                    keyExtractor={(item, index) => (item.product?._id || item._id) + (item.variant?.inventoryId || index)}
                    numColumns={2}
                    scrollEnabled={false}
                    columnWrapperStyle={{ gap: 16 }}
                />
            )}
        </View>
    );

    // 2. Suggestions List
    const renderSuggestions = () => (
        <View>
            {suggestions.map((item, index) => (
                <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionPress(item)}
                >
                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" strokeLinecap="round" style={{ marginRight: spacing.m }}>
                        <Circle cx="11" cy="11" r="8" />
                        <Line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </Svg>
                    <View style={{ flex: 1 }}>
                        <MonoText size="m" color={colors.text}>
                            {item}
                        </MonoText>
                    </View>
                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" strokeLinecap="round">
                        <Path d="M7 17L17 7" />
                        <Path d="M7 7h10v10" />
                    </Svg>
                </TouchableOpacity>
            ))}
        </View>
    );

    // 3. Results Grid
    const renderResults = () => (
        <View>
            <MonoText size="s" color={colors.textLight} style={{ marginBottom: spacing.m }}>
                Showing results for "{query}"
            </MonoText>

            {filteredProducts.length === 0 ? (
                <View style={styles.emptyState}>
                    <Svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="1.5">
                        <Circle cx="11" cy="11" r="8" />
                        <Line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </Svg>
                    <MonoText size="m" weight="bold" style={{ marginTop: 16 }}>No products found</MonoText>
                    <MonoText size="s" color={colors.textLight} style={{ marginTop: 4 }}>Try a different search term</MonoText>
                </View>
            ) : (
                <FlatList
                    data={filteredProducts.flatMap(p => {
                        const variants = (p as any).variants || [];
                        if (variants.length <= 1) return [p];
                        return variants.map((v: any) => ({ product: p, variant: v }));
                    })}
                    renderItem={renderProductItem}
                    keyExtractor={(item, index) => (item.product?._id || item._id) + (item.variant?.inventoryId || index)}
                    numColumns={2}
                    scrollEnabled={false}
                    columnWrapperStyle={{ gap: 16 }}
                />
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Glass Header - View on Android for better visibility/performance */}
            {Platform.OS === 'ios' ? (
                <BlurView blurType="light" blurAmount={20} style={[styles.header, { paddingTop: insets.top }]}>
                    <View style={styles.headerContent}>
                        {/* Back Button */}
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                                <Path d="M19 12H5M12 19l-7-7 7-7" />
                            </Svg>
                        </TouchableOpacity>

                        {/* Search Input - Always visible on search screen */}
                        <View style={styles.searchContainer}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                <Circle cx="11" cy="11" r="8" />
                                <Path d="M21 21l-4.35-4.35" />
                            </Svg>
                            <TextInput
                                ref={inputRef}
                                style={styles.searchInput}
                                placeholder="Search for products..."
                                placeholderTextColor={colors.textLight}
                                value={query}
                                onChangeText={(text) => {
                                    setQuery(text);
                                    setShowResults(false);
                                }}
                                onSubmitEditing={handleSearchSubmit}
                                returnKeyType="search"
                                autoCapitalize="none"
                                autoFocus={true}
                            />
                            {query.length > 0 && (
                                <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
                                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                        <Path d="M18 6L6 18M6 6l12 12" />
                                    </Svg>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Results Count */}
                    {showResults && filteredProducts.length > 0 && (
                        <View style={styles.resultsHeader}>
                            <MonoText size="s" color={colors.textLight}>
                                {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} found
                            </MonoText>
                        </View>
                    )}
                </BlurView>
            ) : (
                <View style={[styles.header, { paddingTop: insets.top }]}>
                    <View style={styles.headerContent}>
                        {/* Back Button */}
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                                <Path d="M19 12H5M12 19l-7-7 7-7" />
                            </Svg>
                        </TouchableOpacity>

                        {/* Search Input - Always visible on search screen */}
                        <View style={styles.searchContainer}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                <Circle cx="11" cy="11" r="8" />
                                <Path d="M21 21l-4.35-4.35" />
                            </Svg>
                            <TextInput
                                ref={inputRef}
                                style={styles.searchInput}
                                placeholder="Search for products..."
                                placeholderTextColor={colors.textLight}
                                value={query}
                                onChangeText={(text) => {
                                    setQuery(text);
                                    setShowResults(false);
                                }}
                                onSubmitEditing={handleSearchSubmit}
                                returnKeyType="search"
                                autoCapitalize="none"
                                autoFocus={true}
                            />
                            {query.length > 0 && (
                                <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
                                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                        <Path d="M18 6L6 18M6 6l12 12" />
                                    </Svg>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Results Count */}
                    {showResults && filteredProducts.length > 0 && (
                        <View style={styles.resultsHeader}>
                            <MonoText size="s" color={colors.textLight}>
                                {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} found
                            </MonoText>
                        </View>
                    )}
                </View>
            )}

            {/* Content */}
            <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={() => inputRef.current?.blur()}>
                <FlatList
                    data={[]}
                    renderItem={null}
                    contentContainerStyle={[styles.content, { paddingTop: insets.top + 80 }]}
                    ListHeaderComponent={
                        <View>
                            {!query ? renderInitialState() : (showResults ? renderResults() : renderSuggestions())}
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={<BrandFooter />}
                />
            </TouchableOpacity>

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
        backgroundColor: colors.white,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        ...Platform.select({
            android: {
                elevation: 4,
            },
        }),
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
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 12,
        paddingHorizontal: 12,
        marginHorizontal: 8,
        height: 44,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: 15,
        color: colors.text,
        marginLeft: 8,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    clearBtn: {
        padding: 4,
    },
    resultsHeader: {
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    sectionTitle: {
        marginBottom: spacing.m,
    },
    trendingBanner: {
        backgroundColor: '#FFEBEE',
        padding: spacing.m,
        borderRadius: 16,
        marginBottom: spacing.l,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    gridItemWrapper: {
        width: '48%',
        marginBottom: spacing.m,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 40,
    }
});

export default SearchScreen;
