import React, { useEffect, useState } from 'react';
import { View, StyleSheet, StatusBar, Dimensions, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Polyline, Line, Rect } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { MonoText } from '../../../components/shared/MonoText';
import { ProductCard } from '../../../components/home/ProductCard';
import { useHomeStore } from '../../../store/home.store';
import { useShallow } from 'zustand/react/shallow';
import { SubscriptionModal } from '../../../components/subscription/SubscriptionModal';
import { ProductDetailsModal } from '../../../components/home/ProductDetailsModal';
import { Product } from '../../../services/customer/product.service';
import { useAuthStore } from '../../../store/authStore';
import { subscriptionService } from '../../../services/customer/subscription.service';
import { FloatingCarts } from '../../../components/home/FloatingCarts';
import { logger } from '../../../utils/logger';

const { width } = Dimensions.get('window');

export const SubscriptionScreen = () => {
    const navigation = useNavigation<any>();
    const { subscriptionProducts, fetchHomeData, userProfile } = useHomeStore(useShallow(state => ({
        subscriptionProducts: state.subscriptionProducts,
        fetchHomeData: state.fetchHomeData,
        userProfile: state.userProfile
    })));

    const { user } = useAuthStore();

    const [subModalVisible, setSubModalVisible] = useState(false);
    const [selectedSubProduct, setSelectedSubProduct] = useState<Product | null>(null);

    // Product Details Modal
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);

    const [fetchingSubscription, setFetchingSubscription] = useState(false);

    const scrollY = useSharedValue(0);

    useEffect(() => {
        if (subscriptionProducts.length === 0) {
            fetchHomeData();
        }
    }, []);

    const scrollHandler = useAnimatedScrollHandler((event) => {
        scrollY.value = event.contentOffset.y;
    });

    const handleSubscribe = async (product: Product) => {
        // If user has active subscription, redirect to add product to existing subscription
        if (userProfile?.hasActiveSubscription) {
            try {
                setFetchingSubscription(true);
                const subscription = await subscriptionService.getMySubscription();
                if (subscription) {
                    navigation.navigate('AddProductToSubscription', {
                        subscriptionId: subscription._id,
                        subscription: subscription,
                        preselectedProduct: product
                    });
                    return;
                }
            } catch (error) {
                logger.log('Error fetching subscription, falling back to modal:', error);
            } finally {
                setFetchingSubscription(false);
            }
        }

        // For new subscribers, show the subscription modal
        setSelectedSubProduct(product);
        setSubModalVisible(true);
    };

    const handleProductPress = (product: Product) => {
        setSelectedDetailProduct(product);
        setDetailsModalVisible(true);
    };

    const features = [
        { icon: <Svg width="24" height="24" viewBox="0 0 24 24" stroke={colors.black} strokeWidth="2"><Rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><Line x1="16" y1="2" x2="16" y2="6" /><Line x1="8" y1="2" x2="8" y2="6" /><Line x1="3" y1="10" x2="21" y2="10" /></Svg>, title: "Flexible Schedule", desc: "Choose your days" },
        { icon: <Svg width="24" height="24" viewBox="0 0 24 24" stroke={colors.black} strokeWidth="2"><Polyline points="23 4 23 10 17 10" /><Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></Svg>, title: "Easy Reschedule", desc: "Change anytime" },
        { icon: <Svg width="24" height="24" viewBox="0 0 24 24" stroke={colors.black} strokeWidth="2"><Path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Svg>, title: "Health Updates", desc: "Daily animal report" },
        { icon: <Svg width="24" height="24" viewBox="0 0 24 24" stroke={colors.black} strokeWidth="2"><Path d="M23 7l-7 5 7 5V7z" /><Rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></Svg>, title: "Live Farm View", desc: "Watch milking live" },
    ];

    const hasActiveSubscription = userProfile?.hasActiveSubscription;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

            {/* Loading overlay when fetching subscription */}
            {fetchingSubscription && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            )}

            {/* Standard Header matching OrderHistoryScreen */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2.5">
                        <Path d="M19 12H5M12 19l-7-7 7-7" />
                    </Svg>
                </TouchableOpacity>
                <View>
                    <MonoText size="l" weight="bold">My Subscriptions</MonoText>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <Animated.ScrollView
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={true}
            >
                {/* Hero Section - Only show for non-subscribers */}
                {!hasActiveSubscription && (
                    <LinearGradient
                        colors={[colors.primary, colors.secondary]}
                        style={styles.heroSection}
                    >
                        <View style={styles.heroContent}>
                            <MonoText size="xxl" weight="bold" style={{ marginBottom: 8 }}>Subscribe & Relax</MonoText>
                            <MonoText size="m" color={colors.textLight}>
                                Experience the convenience of daily milk delivery along with premium dashboard features.
                            </MonoText>

                            {/* Feature Grid */}
                            <View style={styles.featureGrid}>
                                {features.map((feature, index) => (
                                    <View key={index} style={styles.featureItem}>
                                        <View style={styles.featureIcon}>
                                            {feature.icon}
                                        </View>
                                        <MonoText size="xs" weight="bold" style={{ marginTop: 4 }}>{feature.title}</MonoText>
                                        <MonoText size="xxs" color={colors.textLight}>{feature.desc}</MonoText>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </LinearGradient>
                )}

                {/* Products Grid */}
                <View style={styles.section}>
                    <MonoText size="xl" weight="bold" style={styles.sectionTitle}>
                        {hasActiveSubscription ? 'Add More Products' : 'Subscription Products'}
                    </MonoText>
                    <MonoText size="s" color={colors.textLight} style={{ marginBottom: spacing.l }}>
                        {hasActiveSubscription
                            ? 'Tap on a product to add it to your existing subscription.'
                            : 'Select a product to start your scheduled delivery plan.'}
                    </MonoText>

                    <View style={styles.grid}>
                        {subscriptionProducts.map((p) => (
                            <ProductCard
                                key={p._id}
                                product={p}
                                isSubscriptionEligible={true}
                                subscriptionOnly={true} // Only show Subscribe button, no + button
                                onSubscribe={handleSubscribe}
                                onPress={handleProductPress}
                            />
                        ))}
                    </View>
                </View>

            </Animated.ScrollView>

            {/* Subscription Modal - For new subscribers */}
            <SubscriptionModal
                visible={subModalVisible}
                product={selectedSubProduct}
                onClose={() => setSubModalVisible(false)}
            />

            {/* Product Details Modal */}
            <ProductDetailsModal
                visible={detailsModalVisible}
                product={selectedDetailProduct}
                onClose={() => setDetailsModalVisible(false)}
                onSubscribePress={handleSubscribe}
            />

            {/* Floating Carts for new users */}
            {<FloatingCarts />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 44 : 56,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F8F9FA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingBottom: 100, // Tab bar space
    },
    heroSection: {
        padding: spacing.l,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        marginBottom: spacing.l,
        paddingTop: 40, // Extra for visual balance
    },
    heroContent: {
        alignItems: 'center',
    },
    featureGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: spacing.l,
        gap: spacing.m,
        width: '100%',
    },
    featureItem: {
        width: '45%',
        backgroundColor: 'rgba(255,255,255,0.6)',
        padding: spacing.m,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    featureIcon: {
        width: 40,
        height: 40,
        backgroundColor: colors.white,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 9,
    },
    section: {
        paddingHorizontal: spacing.m,
        marginBottom: 30
    },
    sectionTitle: {
        marginBottom: spacing.xs,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
});
