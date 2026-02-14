import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, StatusBar, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { colors } from '../theme/colors';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { PartnerTabNavigator } from './PartnerTabNavigator';
import { CustomerLoginScreen } from '../screens/auth/CustomerLoginScreen';
import { OTPScreen } from '../screens/auth/OTPScreen';
import { PartnerLoginScreen } from '../screens/auth/PartnerLoginScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { CompleteProfileScreen } from '../screens/auth/CompleteProfileScreen';
import { AddressSelectionScreen } from '../screens/customer/Checkout/AddressSelectionScreen';
import { AddAddressScreen } from '../screens/customer/Checkout/AddAddressScreen';
import { CheckoutScreen } from '../screens/customer/Checkout/CheckoutScreen';
import { OrderTrackingScreen } from '../screens/customer/Orders/OrderTrackingScreen';
import { PartnerOrderTrackingScreen } from '../screens/partner/PartnerOrderTrackingScreen';
import { useAuthStore } from '../store/authStore';
import { useBranchStore } from '../store/branch.store';
import { CategoriesScreen } from '../screens/customer/Product/CategoriesScreen';
import { SubcategoriesScreen } from '../screens/customer/Product/SubcategoriesScreen';
import { SearchScreen } from '../screens/customer/Product/SearchScreen';
import { ProfileScreen } from '../screens/customer/Profile/ProfileScreen';
import { EditProfileScreen } from '../screens/customer/Profile/EditProfileScreen';
import { OrderHistoryScreen } from '../screens/customer/Orders/OrderHistoryScreen';
import { PrivacyPolicyScreen } from '../screens/customer/Settings/PrivacyPolicyScreen';
import { FeedbackScreen } from '../screens/customer/Profile/FeedbackScreen';
import { BrowseProductsScreen } from '../screens/customer/BrowseProductsScreen';
import { WishlistScreen } from '../screens/customer/WishlistScreen';
import { TermsScreen } from '../screens/customer/Profile/TermsScreen';
import { logger } from '../utils/logger';

const Stack = createNativeStackNavigator();

// Maximum time to wait on splash screen before forcing navigation (3 seconds)
const MAX_SPLASH_TIME_MS = 3000;
const ONBOARDING_KEY = 'hasSeenOnboarding';

import { navigationRef } from '../services/navigation/NavigationService';

import { SuccessToast } from '../components/SuccessToast';

export const RootNavigator = () => {
    const { isAuthenticated, isLoading, user, initialize } = useAuthStore();
    const { currentBranch, initialize: initBranch } = useBranchStore();
    const [forceShowApp, setForceShowApp] = useState(false);
    const [initStarted, setInitStarted] = useState(false);
    useEffect(() => {
        logger.debug('[RootNavigator] Component mounted, starting initialization...');

        setInitStarted(true);
        // Initialize auth and branch stores
        Promise.all([
            initialize(),
            initBranch()
        ]).catch((err) => {
            logger.error('RootNavigator Initialize error:', err);
        });


        // Failsafe: Force show the app after MAX_SPLASH_TIME_MS even if isLoading is still true
        const timeoutId = setTimeout(() => {
            logger.debug('[RootNavigator] Timeout reached, forcing app to show');
            setForceShowApp(true);
        }, MAX_SPLASH_TIME_MS);

        return () => clearTimeout(timeoutId);
    }, []);

    // Show splash only if still loading AND we haven't hit the timeout
    const shouldShowSplash = isLoading && !forceShowApp;

    if (shouldShowSplash) {
        return (
            <LinearGradient
                colors={[colors.primary, '#FFFFFF']}
                style={styles.splashContainer}
            >
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <Image
                    source={require('../assets/images/logo.png')}
                    style={styles.splashImage}
                    resizeMode="contain"
                />
            </LinearGradient>
        );
    }

    // Determine if user is a delivery partner
    const isDeliveryPartner = user?.role === 'DeliveryPartner';

    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    contentStyle: { backgroundColor: colors.white },
                }}
            >
                {isAuthenticated ? (
                    isDeliveryPartner ? (
                        // Delivery Partner Navigation
                        <Stack.Group>
                            <Stack.Screen name="PartnerTabs" component={PartnerTabNavigator} />
                            <Stack.Screen name="PartnerOrderTracking" component={PartnerOrderTrackingScreen} />
                            <Stack.Screen name="Profile" component={ProfileScreen} />
                            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                            <Stack.Screen name="Terms" component={TermsScreen} />
                        </Stack.Group>
                    ) : (
                        // Customer Navigation
                        <Stack.Group>
                            <Stack.Screen name="MainTabs" component={TabNavigator} />
                            <Stack.Screen name="AddressSelection" component={AddressSelectionScreen} />
                            <Stack.Screen name="AddAddress" component={AddAddressScreen} />
                            <Stack.Screen name="AddAddressMap" component={AddAddressScreen} />
                            <Stack.Screen name="Checkout" component={CheckoutScreen} />
                            <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
                            <Stack.Screen name="Categories" component={CategoriesScreen} />
                            <Stack.Screen name="Subcategories" component={SubcategoriesScreen} />
                            <Stack.Screen name="Search" component={SearchScreen} />
                            <Stack.Screen name="Profile" component={ProfileScreen} />
                            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                            <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
                            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                            <Stack.Screen name="Terms" component={TermsScreen} />
                            <Stack.Screen name="Feedback" component={FeedbackScreen} />
                            <Stack.Screen name="BrowseProducts" component={BrowseProductsScreen} />
                            <Stack.Screen name="Wishlist" component={WishlistScreen} />
                            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
                        </Stack.Group>
                    )
                ) : (
                    <>
                        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                        <Stack.Screen name="CustomerLogin" component={CustomerLoginScreen} />
                        <Stack.Screen name="OTPScreen" component={OTPScreen} />
                        <Stack.Screen name="PartnerLogin" component={PartnerLoginScreen} />
                    </>
                )}
            </Stack.Navigator>
            <SuccessToast />
        </NavigationContainer>
    );
};
const styles = StyleSheet.create({
    splashContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    splashImage: {
        width: 200,
        height: 200,
    },
});

