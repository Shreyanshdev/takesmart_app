import React, { useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    FlatList,
    TouchableOpacity,
    Platform,
    StatusBar,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SvgXml } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { onboardingImages } from './OnboardingImages';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingSlide {
    id: string;
    title: string;
    description: string;
    imageXml: string;
}

const slides: OnboardingSlide[] = [
    {
        id: '1',
        title: 'Need Groceries Now?',
        description: 'Select wide range of products from fresh fruits to delicious snacks',
        imageXml: onboardingImages.image1,
    },
    {
        id: '2',
        title: 'Farm Fresh Quality',
        description: 'We source directly from farmers to ensure the best quality for your family',
        imageXml: onboardingImages.image2,
    },
    {
        id: '3',
        title: 'Great Deals & Offers',
        description: 'Save big on your daily essentials with our unbeatable prices and seasonal discounts',
        imageXml: onboardingImages.image3,
    },
    {
        id: '4',
        title: 'Lightning Fast Delivery',
        description: 'Get your order delivered to your doorstep in minutes, live track your delivery',
        imageXml: onboardingImages.image4,
    },
];

export const OnboardingScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setCurrentIndex(index);
    };

    const handleGetStarted = () => {
        navigation.replace('CustomerLogin');
    };

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
        } else {
            handleGetStarted();
        }
    };

    const renderSlide = ({ item }: { item: OnboardingSlide }) => {
        return (
            <View style={styles.slide}>
                <View style={styles.imageContainer}>
                    <SvgXml xml={item.imageXml} width={SCREEN_WIDTH * 0.8} height={SCREEN_WIDTH * 0.8} />
                </View>
                <View style={styles.contentContainer}>
                    <MonoText size="xl" weight="bold" color={colors.text} style={styles.title}>
                        {item.title}
                    </MonoText>
                    <MonoText size="m" color={colors.textLight} style={styles.description}>
                        {item.description}
                    </MonoText>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} translucent={false} />

            {currentIndex < slides.length - 1 && (
                <TouchableOpacity
                    style={[styles.skipBtn, { top: insets.top + 10 }]}
                    onPress={handleGetStarted}
                    activeOpacity={0.7}
                >
                    <MonoText size="s" weight="bold" color={colors.primary} style={styles.skipText}>Skip</MonoText>
                </TouchableOpacity>
            )}

            <View style={styles.listContainer}>
                <FlatList
                    ref={flatListRef}
                    data={slides}
                    renderItem={renderSlide}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    bounces={false}
                />
            </View>

            <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
                {/* Pagination */}
                <View style={styles.pagination}>
                    {slides.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                currentIndex === index && styles.dotActive
                            ]}
                        />
                    ))}
                </View>


                {/* Button */}
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleNext}
                    activeOpacity={0.8}
                >
                    <MonoText weight="bold" color={colors.white} size="m">
                        {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
                    </MonoText>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    listContainer: {
        flex: 1,
    },
    slide: {
        width: SCREEN_WIDTH,
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    imageContainer: {
        flex: 0.6,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    contentContainer: {
        flex: 0.4,
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    title: {
        textAlign: 'center',
        marginBottom: spacing.m,
        fontSize: 24, // Matches screenshot scale
    },
    description: {
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: spacing.m,
        opacity: 0.8,
    },
    bottomSection: {
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        marginBottom: spacing.l,
    },
    pagination: {
        flexDirection: 'row',
        marginBottom: 32,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 4,
    },
    dotActive: {
        width: 24,
        backgroundColor: colors.primary,
    },
    skipBtn: {
        position: 'absolute',
        right: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 107, 43, 0.1)', // Glass Orange tint
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 43, 0.2)',
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipText: {
        fontSize: 14,
        letterSpacing: 0.5,
    },
    button: {
        width: '100%',
        height: 56,
        backgroundColor: colors.primary,
        borderRadius: 28, // Fully rounded
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
});
