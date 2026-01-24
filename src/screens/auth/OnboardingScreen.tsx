import React, { useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    FlatList,
    Image,
    TouchableOpacity,
    Platform,
    StatusBar,
    NativeSyntheticEvent,
    NativeScrollEvent,
    ImageBackground
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingSlide {
    id: string;
    title: string;
    subtitle?: string;
    description: string;
    image: any; // Using require for local images or URL for remote
    backgroundColor: string;
}

const slides: OnboardingSlide[] = [
    {
        id: '1',
        title: 'Farm Fresh',
        subtitle: 'Vegetables',
        description: 'Directly from local farms to your kitchen in minutes',
        image: require('../../assets/images/onboarding/onboarding_vegetables_1768995733244.jpg'),
        backgroundColor: '#E8F5E9',
    },
    {
        id: '2',
        title: 'Pure & Fresh',
        subtitle: 'Dairy Products',
        description: 'Start your morning with the freshest milk and eggs',
        image: require('../../assets/images/onboarding/onboarding_dairy_1768995857083.jpg'),
        backgroundColor: '#FFF8E1',
    },
    {
        id: '3',
        title: 'Premium',
        subtitle: 'Quality Fruits',
        description: 'Handpicked exotic and seasonal fruits for your family',
        image: require('../../assets/images/onboarding/onboarding_fruits_1768995962940.jpg'),
        backgroundColor: '#FFF3E0',
    },
    {
        id: '4',
        title: 'Unbeatable',
        subtitle: 'Prices & Deals',
        description: 'Best market prices guaranteed on all your daily needs',
        image: require('../../assets/images/onboarding/onboarding_discounts_1768996105098.jpg'),
        backgroundColor: '#FFEBEE',
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

    const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => {
        return (
            <View style={styles.slide}>
                {/* Background Image */}
                <ImageBackground
                    source={item.image}
                    style={styles.backgroundImage}
                    resizeMode="cover"
                >
                    {/* Gradient Overlay for text readability */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.7)']}
                        locations={[0, 0.4, 1]}
                        style={styles.gradientOverlay}
                    />

                    {/* Content */}
                    <View style={[styles.contentContainer, { paddingTop: insets.top + 40 }]}>
                        {/* Title Section */}
                        <View style={styles.titleSection}>
                            <MonoText size="xxl" weight="bold" color={colors.white} style={styles.title}>
                                {item.title}
                            </MonoText>
                            {item.subtitle && (
                                <MonoText size="xxl" weight="bold" color={colors.white} style={styles.title}>
                                    {item.subtitle}
                                </MonoText>
                            )}
                        </View>

                        {/* Logo */}
                        <View style={styles.logoContainer}>
                            <View style={styles.logoCircle}>
                                <Image
                                    source={require('../../assets/images/logo.png')}
                                    style={styles.logo}
                                    resizeMode="contain"

                                />
                            </View>
                        </View>

                        {/* Description */}
                        <View style={styles.descriptionContainer}>
                            <MonoText size="s" color="rgba(255,255,255,0.9)" style={styles.description}>
                                {item.description}
                            </MonoText>
                        </View>
                    </View>
                </ImageBackground>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Slides */}
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

            {/* Bottom Section - Fixed Position */}
            <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
                {/* Pagination Dots */}
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

                {/* Glassmorphism Get Started Button */}
                <TouchableOpacity
                    style={styles.getStartedBtn}
                    onPress={handleNext}
                    activeOpacity={0.9}
                >
                    {Platform.OS === 'ios' && (
                        <BlurView
                            style={StyleSheet.absoluteFill}
                            blurType="light"
                            blurAmount={20}
                            reducedTransparencyFallbackColor="white"
                        />
                    )}
                    <LinearGradient
                        colors={[colors.primary, '#FF6B2B']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <MonoText weight="bold" color={colors.white} size="m">
                            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
                        </MonoText>
                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 8 }}>
                            <Path
                                d="M5 12h14M12 5l7 7-7 7"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                    </LinearGradient>
                </TouchableOpacity>

            </View>

            {/* Skip Button - Moved to Top Right - Outside BottomSection */}
            {currentIndex < slides.length - 1 && (
                <TouchableOpacity
                    style={[styles.skipBtn, { top: insets.top + 10 }]}
                    onPress={handleGetStarted}
                    activeOpacity={0.7}
                >
                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType="light"
                        blurAmount={10}
                        reducedTransparencyFallbackColor="rgba(255,255,255,0.3)"
                    />
                    <MonoText size="s" weight="bold" color={colors.white} style={styles.skipText}>Skip</MonoText>
                </TouchableOpacity>
            )}
        </View>
    );
};



const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.black,
    },
    slide: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: spacing.xl,
    },
    titleSection: {
        marginTop: 20,
    },
    // Text readability improvements
    title: {
        fontSize: 32,
        lineHeight: 40,
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 30,
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.9)', // Added back for visibility
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    logo: {
        width: 70,
        height: 70,
    },
    descriptionContainer: {
        marginTop: 20,
        alignItems: 'center',
        paddingHorizontal: spacing.l,
    },
    description: {
        textAlign: 'center',
        lineHeight: 24,
        fontSize: 16,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 8,
    },
    bottomSection: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
    },
    pagination: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.4)',
        marginHorizontal: 4,
    },
    dotActive: {
        width: 24,
        backgroundColor: colors.primary,
    },
    getStartedBtn: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
            },
            android: {
                elevation: 8,
                backgroundColor: colors.primary,
            },
        }),
    },
    buttonGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipBtn: {
        position: 'absolute',
        right: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.2)',
        zIndex: 10,
    },
    skipText: {
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});
