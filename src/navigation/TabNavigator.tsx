import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/customer/Home/HomeScreen';
import { View, Text } from 'react-native'; // Placeholder for other screens
import { CollapsibleTabBar } from '../components/navigation/CollapsibleTabBar';

const Tab = createBottomTabNavigator();

import { OrderHistoryScreen } from '../screens/customer/Orders/OrderHistoryScreen';

import { SubscriptionScreen } from '../screens/customer/Subscription/SubscriptionScreen'; // Real Screen
import { CategoriesScreen } from '../screens/customer/Product/CategoriesScreen';
// const OrdersScreen = () => <View style={{ flex: 1, backgroundColor: 'white' }}><Text>Orders</Text></View>;
// const CategoriesScreen = () => <View style={{ flex: 1, backgroundColor: 'white' }}><Text>Categories</Text></View>;

export const TabNavigator = () => {
    return (
        <Tab.Navigator
            tabBar={(props) => <CollapsibleTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Subscription" component={SubscriptionScreen} />
            <Tab.Screen name="Orders" component={OrderHistoryScreen} />
            <Tab.Screen name="Categories" component={CategoriesScreen} />
        </Tab.Navigator>
    );
};
