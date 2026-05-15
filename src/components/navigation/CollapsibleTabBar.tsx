import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
    useAnimatedStyle,
    withTiming,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import Svg, { Path, Polyline, Rect, Line } from 'react-native-svg';
import { colors } from '../../theme/colors';

import { MonoText } from '../shared/MonoText';
import { useHomeStore } from '../../store/home.store';
import { useCartStore } from '../../store/cart.store';
import { SafeBlurView as BlurView } from '../shared/SafeBlurView';

export const CollapsibleTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
    const isTabBarVisible = useHomeStore(state => state.isTabBarVisible);
    const awaitingConfirmationCount = useHomeStore(state => state.awaitingConfirmationCount);

    // Cart State to trigger Tab Bar shrinking
    const { items: cartItems } = useCartStore();
    const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const hasCart = cartItemCount > 0;

    // Filter out 'Profile' from the tabs
    const visibleRoutes = state.routes.filter(route => route.name !== 'Profile');

    // Animation Shared Values
    const translateY = useSharedValue(0);
    const tabBarRight = useSharedValue(20);
    const indicatorPosition = useSharedValue(0);

    const [containerWidth, setContainerWidth] = useState(0);
    const tabWidth = containerWidth > 0 ? containerWidth / visibleRoutes.length : 0;

    // Visibility Toggle
    useEffect(() => {
        translateY.value = withTiming(isTabBarVisible ? 0 : 150, { duration: 300 });
    }, [isTabBarVisible]);

    // Shrink Tab Bar when Cart appears
    useEffect(() => {
        // 175 leaves a perfect gap next to the smaller responsive cart
        tabBarRight.value = withSpring(hasCart ? 175 : 20, {
            damping: 22,
            stiffness: 150
        });
    }, [hasCart]);

    // Smooth Sliding Indicator
    useEffect(() => {
        if (tabWidth > 0) {
            const activeRouteKey = state.routes[state.index].key;
            const visualIndex = visibleRoutes.findIndex(r => r.key === activeRouteKey);

            if (visualIndex !== -1) {
                indicatorPosition.value = withSpring(visualIndex * tabWidth, {
                    damping: 22,
                    stiffness: 150,
                });
            }
        }
    }, [state.index, tabWidth, visibleRoutes]);

    const containerAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
            right: tabBarRight.value,
        };
    });

    const indicatorAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: indicatorPosition.value }],
            width: tabWidth,
        };
    });

    return (
        <Animated.View style={[styles.outerContainer, containerAnimatedStyle]}>
            <View style={styles.shadowWrapper}>
                <View style={styles.contentContainer}>
                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType="light"
                        blurAmount={20}
                        reducedTransparencyFallbackColor={colors.white}
                    />

                    <View
                        style={styles.tabsWrapper}
                        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
                    >
                        {tabWidth > 0 && (
                            <Animated.View style={[styles.activeIndicator, indicatorAnimatedStyle]} />
                        )}

                        {visibleRoutes.map((route) => {
                            const { options } = descriptors[route.key];
                            const label = options.tabBarLabel ?? options.title ?? route.name;
                            const isFocused = state.routes[state.index].key === route.key;

                            const onPress = () => {
                                const event = navigation.emit({
                                    type: 'tabPress',
                                    target: route.key,
                                    canPreventDefault: true,
                                });

                                if (!isFocused && !event.defaultPrevented) {
                                    navigation.navigate(route.name);
                                }
                            };

                            const getIcon = (name: string, focused: boolean) => {
                                const color = focused ? colors.primary : colors.textLight;
                                const strokeWidth = focused ? "2.5" : "2";

                                switch (name) {
                                    case 'Home':
                                        return (
                                            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                                                <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                <Polyline points="9 22 9 12 15 12 15 22" />
                                            </Svg>
                                        );
                                    case 'Orders':
                                        return (
                                            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                                                <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                                <Line x1="3" y1="6" x2="21" y2="6" />
                                                <Path d="M16 10a4 4 0 0 1-8 0" />
                                            </Svg>
                                        );
                                    case 'Categories':
                                        return (
                                            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                                                <Rect x="3" y="3" width="7" height="7" />
                                                <Rect x="14" y="3" width="7" height="7" />
                                                <Rect x="14" y="14" width="7" height="7" />
                                                <Rect x="3" y="14" width="7" height="7" />
                                            </Svg>
                                        );
                                    default:
                                        return <View style={styles.iconPlaceholder} />;
                                }
                            };

                            return (
                                <TouchableOpacity
                                    key={route.key}
                                    accessibilityRole="button"
                                    accessibilityState={isFocused ? { selected: true } : {}}
                                    onPress={onPress}
                                    style={styles.tab}
                                    activeOpacity={0.7}
                                >
                                    <View style={{ marginBottom: 4 }}>
                                        {getIcon(route.name, isFocused)}
                                        {route.name === 'Orders' && awaitingConfirmationCount > 0 && (
                                            <View style={styles.badge}>
                                                <MonoText size="xs" color="white" weight="bold" style={{ fontSize: 10 }}>
                                                    {awaitingConfirmationCount}
                                                </MonoText>
                                            </View>
                                        )}
                                    </View>
                                    <MonoText
                                        size="xs"
                                        color={isFocused ? colors.primary : colors.textLight}
                                        weight={isFocused ? "bold" : "medium"}
                                        style={{ fontSize: 11 }}
                                    >
                                        {label as string}
                                    </MonoText>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 34 : 20,
        left: 20,
    },
    shadowWrapper: {
        borderRadius: 40,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.08,
                shadowRadius: 20,
            },
            android: { elevation: 10 },
        }),
        backgroundColor: 'transparent',
    },
    contentContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 40,
        overflow: 'hidden',
        paddingVertical: 6,
        paddingHorizontal: 6,
    },
    tabsWrapper: {
        flexDirection: 'row',
        position: 'relative',
    },
    activeIndicator: {
        position: 'absolute',
        height: '100%',
        backgroundColor: `${colors.primary}1A`,
        borderRadius: 34,
        zIndex: 0,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        zIndex: 1,
    },
    iconPlaceholder: {
        width: 22,
        height: 22,
        backgroundColor: colors.disabled,
        borderRadius: 11,
        marginBottom: 2,
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -10,
        backgroundColor: colors.primary,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'white',
        zIndex: 10,
    }
});