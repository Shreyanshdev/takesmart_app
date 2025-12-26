import React, { useEffect } from 'react';
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
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { useHomeStore } from '../../store/home.store';
import { BlurView } from '@react-native-community/blur';

export const CollapsibleTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
    const isTabBarVisible = useHomeStore(state => state.isTabBarVisible);
    const translateY = useSharedValue(0);

    useEffect(() => {
        translateY.value = withTiming(isTabBarVisible ? 0 : 100, { duration: 300 });
    }, [isTabBarVisible]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <BlurView
                style={StyleSheet.absoluteFill}
                blurType="light"
                blurAmount={20}
                reducedTransparencyFallbackColor={colors.white}
            />
            <View style={styles.contentContainer}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const label =
                        options.tabBarLabel !== undefined
                            ? options.tabBarLabel
                            : options.title !== undefined
                                ? options.title
                                : route.name;

                    const isFocused = state.index === index;

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
                                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                                        <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                        <Polyline points="9 22 9 12 15 12 15 22" />
                                    </Svg>
                                );
                            case 'Subscription':
                                return (
                                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                                        <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <Line x1="16" y1="2" x2="16" y2="6" />
                                        <Line x1="8" y1="2" x2="8" y2="6" />
                                        <Line x1="3" y1="10" x2="21" y2="10" />
                                    </Svg>
                                );
                            case 'Orders':
                                return (
                                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                                        <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                        <Line x1="3" y1="6" x2="21" y2="6" />
                                        <Path d="M16 10a4 4 0 0 1-8 0" />
                                    </Svg>
                                );
                            case 'Categories':
                                return (
                                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
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
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            testID={options.tabBarTestID}
                            onPress={onPress}
                            style={styles.tab}
                            activeOpacity={0.7}
                        >
                            <View style={{ marginBottom: 4 }}>
                                {getIcon(route.name, isFocused)}
                            </View>
                            <MonoText
                                size="xs"
                                color={isFocused ? colors.primary : colors.textLight}
                                weight={isFocused ? "bold" : "medium"}
                            >
                                {label as string}
                            </MonoText>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    contentContainer: {
        flexDirection: 'row',
        height: Platform.OS === 'ios' ? 85 : 70,
        paddingBottom: Platform.OS === 'ios' ? 20 : 10,
        paddingTop: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.8)', // Fallback for no blur
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconPlaceholder: {
        width: 24,
        height: 24,
        backgroundColor: colors.disabled,
        borderRadius: 12,
        marginBottom: 4,
    },
    activeIcon: {
        backgroundColor: colors.primary,
    }
});
