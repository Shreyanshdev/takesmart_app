import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Svg, { Circle, Line } from 'react-native-svg';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MonoText } from '../../../components/shared/MonoText';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { productService, SubCategoryGrouped, SubCategory, Category } from '../../../services/customer/product.service';
import { FloatingCarts } from '../../../components/home/FloatingCarts';
import { useBranchStore } from '../../../store/branch.store';
import { NoServiceScreen } from '../../../components/shared/NoServiceScreen';
import { BrandFooter } from '../../../components/shared/BrandFooter';

type CategoriesScreenRouteProp = RouteProp<{ params: { initialCategory?: string } }, 'params'>;

const HEADER_CONTENT_HEIGHT = 56;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 4;
const CARD_SIZE = (SCREEN_WIDTH - 32 - (NUM_COLUMNS - 1) * 12) / NUM_COLUMNS;

// Glass Header
const CategoriesHeader = ({ navigation }: { navigation: any }) => {
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
                <MonoText size="xl" weight="bold" color={colors.text} style={styles.headerTitle}>Categories</MonoText>
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

// Subcategory Card Component
const SubcategoryCard = ({
    subcategory,
    onPress
}: {
    subcategory: SubCategory;
    onPress: (sub: SubCategory) => void;
}) => {
    return (
        <TouchableOpacity
            style={styles.subcategoryCard}
            onPress={() => onPress(subcategory)}
            activeOpacity={0.7}
        >
            <View style={styles.imageContainer}>
                {subcategory.image ? (
                    <Image
                        source={{ uri: subcategory.image }}
                        style={styles.subcategoryImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.placeholderImage, { backgroundColor: '#f0f0f0' }]}>
                        <MonoText size="xs" color={colors.textLight}>No img</MonoText>
                    </View>
                )}
            </View>
            <MonoText
                size="xs"
                weight="medium"
                color={colors.text}
                style={styles.subcategoryName}
                numberOfLines={2}
            >
                {subcategory.name}
            </MonoText>
        </TouchableOpacity>
    );
};

// Category Section Component
const CategorySection = ({
    category,
    subcategories,
    onSubcategoryPress,
    onLayout
}: {
    category: Category;
    subcategories: SubCategory[];
    onSubcategoryPress: (sub: SubCategory) => void;
    onLayout?: (event: any) => void;
}) => {
    return (
        <View style={styles.categorySection} onLayout={onLayout}>
            <MonoText size="m" weight="bold" color={colors.text} style={styles.categoryTitle}>
                {category.name}
            </MonoText>
            <View style={styles.subcategoriesGrid}>
                {subcategories.map((sub) => (
                    <SubcategoryCard
                        key={sub._id}
                        subcategory={sub}
                        onPress={onSubcategoryPress}
                    />
                ))}
            </View>
        </View>
    );
};

export const CategoriesScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<CategoriesScreenRouteProp>();
    const insets = useSafeAreaInsets();
    const dynamicHeaderHeight = insets.top + HEADER_CONTENT_HEIGHT;
    const scrollViewRef = useRef<ScrollView>(null);

    const { isServiceAvailable, currentBranch } = useBranchStore();
    const initialCategory = route.params?.initialCategory;

    const [groupedData, setGroupedData] = useState<SubCategoryGrouped[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [categoryOffsets, setCategoryOffsets] = useState<Record<string, number>>({});
    const [hasScrolledToInitial, setHasScrolledToInitial] = useState(false);

    // Fetch data when service is available
    useEffect(() => {
        if (isServiceAvailable) {
            fetchGroupedSubcategories();
        } else {
            setGroupedData([]);
            setIsLoading(false);
        }
    }, [isServiceAvailable, currentBranch]);

    // Scroll to initial category when data is loaded
    useEffect(() => {
        if (initialCategory && !hasScrolledToInitial && groupedData.length > 0 && categoryOffsets[initialCategory]) {
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({
                    y: categoryOffsets[initialCategory] - dynamicHeaderHeight - 16,
                    animated: true
                });
                setHasScrolledToInitial(true);
            }, 100);
        }
    }, [initialCategory, categoryOffsets, groupedData, hasScrolledToInitial]);

    const fetchGroupedSubcategories = async () => {
        setIsLoading(true);
        try {
            const data = await productService.getSubCategoriesGrouped();
            setGroupedData(data);
        } catch (error) {
            console.error('Failed to fetch grouped subcategories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubcategoryPress = useCallback((subcategory: SubCategory) => {
        navigation.navigate('Subcategories', {
            subcategoryId: subcategory._id,
            subcategoryName: subcategory.name,
            categoryId: subcategory.category
        });
    }, [navigation]);

    const handleCategoryLayout = (categoryId: string, event: any) => {
        const { y } = event.nativeEvent.layout;
        setCategoryOffsets(prev => ({ ...prev, [categoryId]: y }));
    };

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
                <CategoriesHeader navigation={navigation} />
                <FloatingCarts />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={{
                    paddingTop: dynamicHeaderHeight + spacing.m,
                    paddingHorizontal: 16,
                    paddingBottom: 180
                }}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <MonoText size="s" color={colors.textLight} style={{ marginTop: 12 }}>
                            Loading categories...
                        </MonoText>
                    </View>
                ) : groupedData.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MonoText color={colors.textLight}>No categories available.</MonoText>
                    </View>
                ) : (
                    groupedData.map((group) => (
                        <CategorySection
                            key={group.category._id}
                            category={group.category}
                            subcategories={group.subcategories}
                            onSubcategoryPress={handleSubcategoryPress}
                            onLayout={(event) => handleCategoryLayout(group.category._id, event)}
                        />
                    ))
                )}
                <BrandFooter />
            </ScrollView>

            {/* Header Overlay */}
            <CategoriesHeader navigation={navigation} />

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
    headerTitle: {
        flex: 1,
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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
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
    categorySection: {
        marginBottom: spacing.xl,
    },
    categoryTitle: {
        marginBottom: spacing.m,
    },
    subcategoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
    },
    subcategoryCard: {
        width: CARD_SIZE,
        marginHorizontal: 6,
        marginBottom: 16,
        alignItems: 'center',
    },
    imageContainer: {
        width: CARD_SIZE - 8,
        height: CARD_SIZE - 8,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: colors.white,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    subcategoryImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    subcategoryName: {
        marginTop: 6,
        textAlign: 'center',
        lineHeight: 14,
    },
});

