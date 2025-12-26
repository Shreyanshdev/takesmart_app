import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue, runOnJS } from 'react-native-reanimated';
import { HomeHeader } from '../../../components/home/HomeHeader';
import { CategoryGrid } from '../../../components/home/CategoryGrid';
import { ProductCard } from '../../../components/home/ProductCard';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { MonoText } from '../../../components/shared/MonoText';
import { useHomeStore } from '../../../store/home.store';
import { SubscriptionModal } from '../../../components/subscription/SubscriptionModal';
import { ProductDetailsModal } from '../../../components/home/ProductDetailsModal';
import { FloatingCarts } from '../../../components/home/FloatingCarts'; // New Import
import { SubscriptionCalendarBanner } from '../../../components/home/SubscriptionCalendarBanner'; // Calendar Banner
import { SubscriptionPromoBanner } from '../../../components/home/SubscriptionPromoBanner'; // Banner import
import { SubscriptionExpiredBanner } from '../../../components/home/SubscriptionExpiredBanner'; // Expired Banner import
import { Product } from '../../../services/customer/product.service';
import { subscriptionService } from '../../../services/customer/subscription.service';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useShallow } from 'zustand/react/shallow';
import { logger } from '../../../utils/logger';

type HomeScreenProps = NativeStackScreenProps<any, 'Home'>;

export const HomeScreen = ({ navigation }: HomeScreenProps) => {

    // ...

    const {
        setTabBarVisible,
        fetchHomeData,
        categories,
        subscriptionProducts,
        normalProducts,
        userProfile,
        currentSubscription,
        isLoading,
        error
    } = useHomeStore(useShallow(state => ({
        setTabBarVisible: state.setTabBarVisible,
        fetchHomeData: state.fetchHomeData,
        categories: state.categories,
        subscriptionProducts: state.subscriptionProducts,
        normalProducts: state.normalProducts,
        userProfile: state.userProfile,
        currentSubscription: state.currentSubscription,
        isLoading: state.isLoading,
        error: state.error
    })));

    const [subModalVisible, setSubModalVisible] = React.useState(false);
    const [selectedSubProduct, setSelectedSubProduct] = React.useState<Product | null>(null);

    const [detailsModalVisible, setDetailsModalVisible] = React.useState(false);
    const [selectedDetailProduct, setSelectedDetailProduct] = React.useState<Product | null>(null);



    const handleSubscribe = async (product: Product) => {
        // If user has active subscription, redirect to add product to existing subscription
        if (userProfile?.hasActiveSubscription) {
            try {
                const subscription = await subscriptionService.getMySubscription();
                if (subscription) {
                    navigation.navigate('AddProductToSubscription', {
                        subscriptionId: subscription._id,
                        subscription: subscription,
                        preselectedProduct: product // Pass the product user clicked on
                    });
                    return;
                }
            } catch (error) {
                logger.log('Error fetching subscription, falling back to modal:', error);
            }
        } // Closing if (userProfile?.hasActiveSubscription)

        // For new subscribers or if fallback, show the subscription modal
        setSelectedSubProduct(product);
        setSubModalVisible(true);
    };

    const handleProductPress = (product: Product) => {
        setSelectedDetailProduct(product);
        setDetailsModalVisible(true);
    };

    const scrollY = useSharedValue(0);
    const lastScrollY = useSharedValue(0);

    const updateTabBar = (visible: boolean) => {
        setTabBarVisible(visible);
    };

    useEffect(() => {
        fetchHomeData();
    }, [fetchHomeData]);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            const currentY = event.contentOffset.y;
            const diff = currentY - lastScrollY.value;

            // Only toggle if we have scrolled enough to count as an intent
            if (currentY <= 0) {
                // At top, always show
                runOnJS(updateTabBar)(true);
            } else if (Math.abs(diff) > 20) {
                if (diff > 0) {
                    // Scrolling Down -> Hide
                    runOnJS(updateTabBar)(false);
                } else {
                    // Scrolling Up -> Show
                    runOnJS(updateTabBar)(true);
                }
            }

            lastScrollY.value = currentY;
            scrollY.value = currentY;
        },
    });

    if (isLoading) {
        return (
            <View style={[styles.container, styles.center]}>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
                <ActivityIndicator size="large" color={colors.primary} />
                <MonoText size="s" color={colors.textLight} style={{ marginTop: spacing.s }}>
                    Fetching fresh products...
                </MonoText>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, styles.center, { padding: spacing.l }]}>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
                <MonoText size="l" weight="bold" color={colors.error} style={{ marginBottom: spacing.s }}>
                    Oops!
                </MonoText>
                <MonoText size="s" color={colors.text} style={{ textAlign: 'center', marginBottom: spacing.l }}>
                    {error}
                </MonoText>
                <TouchableOpacity
                    style={{ backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 }}
                    onPress={fetchHomeData}
                >
                    <MonoText size="s" weight="bold" color={colors.black}>Try Again</MonoText>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <HomeHeader scrollY={scrollY} />

            <Animated.ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                removeClippedSubviews={true}
            >
                {/* Subscription Banners: Calendar for Active, Expired for past subscribers, Promo for New */}
                <View style={{ marginTop: -110 }}>
                    {userProfile?.hasActiveSubscription && currentSubscription?.status === 'active' ? (
                        // Active subscription - show calendar
                        <SubscriptionCalendarBanner />
                    ) : currentSubscription && (currentSubscription.status === 'cancelled' || currentSubscription.status === 'expired' || currentSubscription.status === 'paused' || new Date(currentSubscription.endDate) < new Date()) ? (
                        // Expired/Cancelled subscription - show renewal prompt
                        <SubscriptionExpiredBanner />
                    ) : (
                        // No subscription history - show promo
                        <SubscriptionPromoBanner />
                    )}
                </View>

                <CategoryGrid categories={categories} />

                {/* Featured Products (Subscription) */}
                <View style={styles.section}>
                    <MonoText size="l" weight="bold" style={styles.sectionTitle}>Subscribe & Save</MonoText>
                    {subscriptionProducts?.length > 0 ? (
                        <View style={styles.grid}>
                            {subscriptionProducts.map((p) => (
                                <ProductCard
                                    key={p._id}
                                    product={p}
                                    isSubscriptionEligible={true}
                                    onSubscribe={handleSubscribe}
                                    onPress={handleProductPress}
                                />
                            ))}
                        </View>
                    ) : (
                        <MonoText size="s" color={colors.textLight}>No subscription products available.</MonoText>
                    )}
                </View>

                {/* Normal Products */}
                <View style={styles.section}>
                    <MonoText size="l" weight="bold" style={styles.sectionTitle}>Daily Essentials</MonoText>
                    {normalProducts?.length > 0 ? (
                        <View style={styles.grid}>
                            {normalProducts.map((p) => (
                                <ProductCard
                                    key={p._id}
                                    product={p}
                                    onPress={handleProductPress}
                                />
                            ))}
                        </View>
                    ) : (
                        <MonoText size="s" color={colors.textLight}>No products found.</MonoText>
                    )}
                </View>

            </Animated.ScrollView>

            {/* Modals */}
            <SubscriptionModal
                visible={subModalVisible}
                product={selectedSubProduct}
                onClose={() => setSubModalVisible(false)}
            />

            <ProductDetailsModal
                visible={detailsModalVisible}
                product={selectedDetailProduct}
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
        backgroundColor: '#FAFAFA', // Slightly gray background for premium feel
    },
    scrollContent: {
        paddingTop: 110, // clear the header
        paddingBottom: 100, // clear the tab bar
    },
    section: {
        marginBottom: spacing.l,
        paddingHorizontal: spacing.m,
    },
    sectionTitle: {
        marginBottom: spacing.m,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    }
});
