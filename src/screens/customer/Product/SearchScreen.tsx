import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, FlatList, StatusBar, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, Line } from 'react-native-svg'; // Standardizing icon imports
import { MonoText } from '../../../components/shared/MonoText';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useHomeStore } from '../../../store/home.store';
import { useShallow } from 'zustand/react/shallow';
import { ProductCard } from '../../../components/home/ProductCard';
import { Product } from '../../../services/customer/product.service';
import { SubscriptionModal } from '../../../components/subscription/SubscriptionModal';
import { ProductDetailsModal } from '../../../components/home/ProductDetailsModal';
import { FloatingCarts } from '../../../components/home/FloatingCarts';

export const SearchScreen = () => {
    const navigation = useNavigation<any>();
    const inputRef = useRef<TextInput>(null);

    // Global Data
    const { normalProducts, subscriptionProducts } = useHomeStore(useShallow(state => ({
        normalProducts: state.normalProducts,
        subscriptionProducts: state.subscriptionProducts,
    })));

    // State
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);

    // Modals
    const [subModalVisible, setSubModalVisible] = useState(false);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Auto-focus input
    useEffect(() => {
        if (inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, []);

    // Combine Products
    const allProducts = useMemo(() => {
        const combined = [...subscriptionProducts, ...normalProducts];
        return Array.from(new Map(combined.map(item => [item._id, item])).values());
    }, [normalProducts, subscriptionProducts]);

    // Trending Products (Simulated: Take first 4 random or specific ones)
    const trendingProducts = useMemo(() => {
        return allProducts.slice(0, 4); // First 4 as trending
    }, [allProducts]);

    // Filter Logic
    const filteredProducts = useMemo(() => {
        if (!query) return [];
        const q = query.toLowerCase();
        return allProducts.filter(p => p.name.toLowerCase().includes(q));
    }, [query, allProducts]);

    // Suggestions (Names only)
    const suggestions = useMemo(() => {
        if (!query) return [];
        return filteredProducts.map(p => p.name).slice(0, 8); // Top 8 suggestions
    }, [filteredProducts, query]);


    const handleSearchSubmit = () => {
        if (query.trim()) {
            setShowResults(true);
        }
    };

    const handleSuggestionPress = (suggestion: string) => {
        setQuery(suggestion);
        setShowResults(true);
    };

    const clearSearch = () => {
        setQuery('');
        setShowResults(false);
        inputRef.current?.focus(); // Re-focus
    };

    // Sub/Details Handlers
    const handleSubscribe = (product: Product) => {
        setSelectedProduct(product);
        setSubModalVisible(true);
    };

    const handleProductPress = (product: Product) => {
        setSelectedProduct(product);
        setDetailsModalVisible(true);
    };

    const renderProductItem = ({ item }: { item: Product }) => (
        <View style={styles.gridItemWrapper}>
            <ProductCard
                product={item}
                isSubscriptionEligible={item.isSubscriptionAvailable}
                onSubscribe={handleSubscribe}
                onPress={handleProductPress}
                style={{ width: '100%' }}
            />
        </View>
    );

    // --- Render Content Based on State ---

    // 1. Initial State (Query Empty) -> Trending Grid
    const renderInitialState = () => (
        <View>
            {/* Trending Deals Banner Placeholder */}
            <View style={styles.trendingBanner}>
                <MonoText size="l" weight="bold" color="#D32F2F" style={{ marginBottom: 4 }}>TRENDING DEALS</MonoText>
                <MonoText size="s" color={colors.text}>Unique Product • Unbeatable Prices</MonoText>
            </View>

            <MonoText size="m" weight="bold" style={styles.sectionTitle}>Trending Products</MonoText>

            <FlatList
                data={trendingProducts}
                renderItem={renderProductItem}
                keyExtractor={item => item._id}
                numColumns={2}
                scrollEnabled={false} // Let parent scroll
                columnWrapperStyle={{ justifyContent: 'space-between' }}
            />
        </View>
    );

    // 2. Typing State (Query Exists, Not Submitted) -> Suggestions List
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
                        {/* Highlight matching text part? Keeping simple for now */}
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

    // 3. Results State (Submitted) -> Product Grid
    const renderResults = () => (
        <View>
            <MonoText size="s" color={colors.textLight} style={{ marginBottom: spacing.m }}>
                Showing results for "{query}"
            </MonoText>

            {filteredProducts.length === 0 ? (
                <View style={styles.emptyState}>
                    <MonoText size="m" color={colors.textLight}>No products found.</MonoText>
                </View>
            ) : (
                <FlatList
                    data={filteredProducts}
                    renderItem={renderProductItem}
                    keyExtractor={item => item._id}
                    numColumns={2}
                    scrollEnabled={false}
                    columnWrapperStyle={{ justifyContent: 'space-between' }}
                />
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M15 18l-6-6 6-6" />
                    </Svg>
                </TouchableOpacity>

                <View style={styles.searchContainer}>
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        placeholder='Search for products...'
                        placeholderTextColor={colors.textLight}
                        value={query}
                        onChangeText={(text) => {
                            setQuery(text);
                            setShowResults(false); // Reset to suggestions when typing
                        }}
                        onSubmitEditing={handleSearchSubmit}
                        returnKeyType="search"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={clearSearch}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <Line x1="18" y1="6" x2="6" y2="18" />
                                <Line x1="6" y1="6" x2="18" y2="18" />
                            </Svg>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={() => inputRef.current?.blur()}>
                <FlatList
                    data={[]}
                    renderItem={null}
                    ListHeaderComponent={
                        <View style={styles.content}>
                            {!query ? renderInitialState() : (showResults ? renderResults() : renderSuggestions())}
                        </View>
                    }
                />
            </TouchableOpacity>

            {/* Modals */}
            <SubscriptionModal
                visible={subModalVisible}
                product={selectedProduct}
                onClose={() => setSubModalVisible(false)}
            />

            <ProductDetailsModal
                visible={detailsModalVisible}
                product={selectedProduct}
                onClose={() => setDetailsModalVisible(false)}
                onSubscribePress={handleSubscribe}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 50,
        paddingHorizontal: spacing.m,
        paddingBottom: spacing.m,
        backgroundColor: colors.white,
        elevation: 2,
    },
    backBtn: {
        padding: spacing.s,
        marginRight: spacing.s,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: spacing.m,
        height: 44,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: colors.black,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', // Fallback
    },
    content: {
        padding: spacing.l,
    },
    sectionTitle: {
        marginBottom: spacing.m,
    },
    trendingBanner: {
        backgroundColor: '#FFEBEE', // Light Red/Pink
        padding: spacing.m,
        borderRadius: 12,
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
        borderBottomColor: '#F0F0F0',
    },
    gridItemWrapper: {
        width: '48%',
        marginBottom: spacing.m,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: spacing.xl,
    }
});
