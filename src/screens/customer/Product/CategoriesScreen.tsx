import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform, Image, FlatList } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { BlurView } from '@react-native-community/blur';
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

type CategoriesScreenRouteProp = RouteProp<{ params: { initialCategory?: string } }, 'params'>;

const HEADER_HEIGHT = Platform.OS === 'ios' ? 90 : 70;
const SIDEBAR_WIDTH = 90;

// Glass Header (Always Visible)
const CategoriesHeader = ({ navigation, title }: { navigation: any, title: string }) => {
    return (
        <View style={[styles.headerContainer, { backgroundColor: 'rgba(255, 255, 255, 0.85)' }]}>
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
                <MonoText size="l" weight="bold" color={colors.text} style={{ marginLeft: spacing.m, flex: 1 }}>{title}</MonoText>
                {/* Search Icon Placeholder */}
                <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

    // Global State
    const { categories, subscriptionProducts, normalProducts } = useHomeStore(useShallow(state => ({
        categories: state.categories,
        subscriptionProducts: state.subscriptionProducts,
        normalProducts: state.normalProducts,
    })));

    // Local State
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [subModalVisible, setSubModalVisible] = useState(false);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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
        // Merge lists
        const combined = [...subscriptionProducts, ...normalProducts];
        // Deduplicate
        return Array.from(new Map(combined.map(item => [item._id, item])).values());
    }, [subscriptionProducts, normalProducts]);

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
    const handleSubscribe = (product: Product) => {
        setSelectedProduct(product);
        setSubModalVisible(true);
    };

    const handleProductPress = (product: Product) => {
        setSelectedProduct(product);
        setDetailsModalVisible(true);
    };

    const renderRightItem = ({ item }: { item: Product }) => (
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
                        contentContainerStyle={{ paddingTop: HEADER_HEIGHT + spacing.m, paddingBottom: 100 }}
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
                    <FlatList
                        data={filteredProducts}
                        keyExtractor={(item) => item._id}
                        renderItem={renderRightItem}
                        numColumns={2}
                        contentContainerStyle={{
                            paddingTop: HEADER_HEIGHT + spacing.m,
                            paddingHorizontal: spacing.s,
                            paddingBottom: 120
                        }}
                        showsVerticalScrollIndicator={false}
                        columnWrapperStyle={{ justifyContent: 'space-between' }}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyState}>
                                <MonoText color={colors.textLight}>No products in this category.</MonoText>
                            </View>
                        )}
                    />
                </View>
            </View>

            {/* Header Overlay */}
            <CategoriesHeader
                navigation={navigation}
                title={getCategoryName()}
            />

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
    headerContainer: {
        position: 'absolute',
        top: 5,
        left: 0,
        right: 0,
        height: HEADER_HEIGHT,
        zIndex: 100,
        justifyContent: 'flex-end',
        paddingBottom: spacing.s,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.l,
    },
    backBtn: {
        padding: 4,
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
        flex: 1,
        maxWidth: '48%',
        marginBottom: spacing.m,
    },
    emptyState: {
        marginTop: spacing.xl,
        alignItems: 'center',
        padding: spacing.l,
    }
});
