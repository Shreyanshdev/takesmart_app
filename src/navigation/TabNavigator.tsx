import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/customer/Home/HomeScreen';
import { CollapsibleTabBar } from '../components/navigation/CollapsibleTabBar';
import { OrderHistoryScreen } from '../screens/customer/Orders/OrderHistoryScreen';
import { CategoriesScreen } from '../screens/customer/Product/CategoriesScreen';
import { ProfileScreen } from '../screens/customer/Profile/ProfileScreen';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
    return (
        <Tab.Navigator
            tabBar={(props) => <CollapsibleTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Categories" component={CategoriesScreen} />
            <Tab.Screen name="Orders" component={OrderHistoryScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
};
