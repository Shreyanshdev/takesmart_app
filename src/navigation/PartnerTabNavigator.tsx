import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { MonoText } from '../components/shared/MonoText';
import { usePartnerStore } from '../store/partnerStore';

import { PartnerHomeScreen } from '../screens/partner/PartnerHomeScreen';
import { ActiveOrdersScreen } from '../screens/partner/ActiveOrdersScreen';
import { SubscriptionDeliveriesScreen } from '../screens/partner/SubscriptionDeliveriesScreen';
import { HistoryScreen } from '../screens/partner/HistoryScreen';

const Tab = createBottomTabNavigator();

interface TabIconProps {
    focused: boolean;
    color: string;
    iconType: 'home' | 'active' | 'subscriptions' | 'history';
}

const TabIcon: React.FC<TabIconProps> = ({ focused, color, iconType }) => {
    const size = 22;
    const strokeWidth = focused ? 2.5 : 2;

    switch (iconType) {
        case 'home':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <Path d="M9 22V12h6v10" />
                </Svg>
            );
        case 'active':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </Svg>
            );
        case 'subscriptions':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                    <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <Path d="M16 2v4M8 2v4M3 10h18" />
                    <Path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
                </Svg>
            );
        case 'history':
            return (
                <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                    <Circle cx="12" cy="12" r="10" />
                    <Path d="M12 6v6l4 2" />
                </Svg>
            );
        default:
            return null;
    }
};

export const PartnerTabNavigator = () => {
    // Get available orders count for badge
    const availableOrdersCount = usePartnerStore(state => state.availableOrders.length);

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textLight,
                tabBarLabelStyle: styles.tabLabel,
                tabBarItemStyle: styles.tabItem,
            }}
        >
            <Tab.Screen
                name="PartnerHome"
                component={PartnerHomeScreen}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon focused={focused} color={color} iconType="home" />
                    ),
                    // Show badge with available orders count
                    tabBarBadge: availableOrdersCount > 0 ? availableOrdersCount : undefined,
                    tabBarBadgeStyle: styles.badge,
                }}
            />
            <Tab.Screen
                name="ActiveOrders"
                component={ActiveOrdersScreen}
                options={{
                    tabBarLabel: 'Active',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon focused={focused} color={color} iconType="active" />
                    ),
                }}
            />
            <Tab.Screen
                name="Subscriptions"
                component={SubscriptionDeliveriesScreen}
                options={{
                    tabBarLabel: 'Subscriptions',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon focused={focused} color={color} iconType="subscriptions" />
                    ),
                }}
            />
            <Tab.Screen
                name="History"
                component={HistoryScreen}
                options={{
                    tabBarLabel: 'History',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon focused={focused} color={color} iconType="history" />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: Platform.OS === 'ios' ? 85 : 70,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: spacing.xs,
        paddingBottom: Platform.OS === 'ios' ? 20 : 21,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    tabItem: {
        paddingTop: 4,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    badge: {
        backgroundColor: colors.primary,
        fontSize: 10,
        fontWeight: '700',
        minWidth: 18,
        height: 18,
    },
});

