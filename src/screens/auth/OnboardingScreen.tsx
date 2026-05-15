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
    Image,
    SafeAreaView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { GroceriesSvg } from '../../components/onboarding/svg/GroceriesSvg';
import { TakeawaySvg } from '../../components/onboarding/svg/TakeawaySvg';
import { Groceries2Svg } from '../../components/onboarding/svg/Groceries2Svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingSlide {
    id: string;
    title: string;
    description: string;
    image: any;
    ImageComponent: React.FC<{ width: number | string; height: number | string }>;
}

const slides: OnboardingSlide[] = [
    {
        id: '1',
        title: 'Fresh Groceries for Every Home',
        description: 'Fresh vegetables, fruits, and daily grocery essentials carefully selected for your home.',
        image: require('../../assets/loadscreen/groceries.png'),
        ImageComponent: GroceriesSvg,
    },
    {
        id: '2',
        title: 'Groceries Delivered to Your Door Anytime',
        description: 'Order your daily essentials whenever you need and enjoy fast and reliable home delivery.',
        image: require('../../assets/loadscreen/takeaway.png'),
        ImageComponent: TakeawaySvg,
    },
    {
        id: '3',
        title: 'Farm Fresh Quality at Your Convenience',
        description: 'We source directly from farmers to ensure the best quality for your family.',
        image: require('../../assets/loadscreen/groceries2.png'),
        ImageComponent: Groceries2Svg,
    },
];

const GRADIENTS = [
    ['#DEFCE1', '#FFFFFF'], // Step 1: Green
    ['#FFE6D9', '#FFFFFF'], // Step 2: Orange/Peach
    ['#DEFCE1', '#FFFFFF'], // Step 3: Green
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
        const ImageComponent = item.ImageComponent;
        return (
            <View style={styles.slide}>
                <View style={styles.imageContainer}>
                    {ImageComponent ? (
                        <ImageComponent width="100%" height="100%" />
                    ) : (
                        <Image
                            source={item.image}
                            style={styles.mainImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
                <View style={styles.contentContainer}>
                    <MonoText weight="bold" style={styles.title}>
                        {item.title}
                    </MonoText>
                    <MonoText style={styles.description}>
                        {item.description}
                    </MonoText>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.rootContainer}>
            {/* Background Layer */}
            <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
                {/* 1. Base Top Color Gradient */}
                <LinearGradient
                    colors={[GRADIENTS[currentIndex]?.[0] || '#DEFCE1', 'rgba(255,255,255,0)']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 0.6 }}
                />

                {/* 2. Pattern Image Layer */}
                <View style={[StyleSheet.absoluteFill, { opacity: 0.06 }]}>
                    <Image
                        source={require('../../assets/loadscreen/bgimage.jpg')}
                        style={styles.patternImage}
                        resizeMode="repeat"
                    />
                </View>

                {/* 3. Bottom White Fade (Ensures content readability) */}
                <LinearGradient
                    colors={['rgba(255,255,255,0)', '#FFFFFF']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 0.5 }}
                />
            </View>

            {/* Header Content */}
            <View style={[styles.header, { top: insets.top + spacing.m }]}>
                <Image
                    source={require('../../assets/loadscreen/toplogo.png')}
                    style={styles.topLogo}
                    resizeMode="contain"
                />
                <TouchableOpacity
                    onPress={handleGetStarted}
                    activeOpacity={0.7}
                >
                    <MonoText size="m" weight="bold" color="#FF6B2B">Skip</MonoText>
                </TouchableOpacity>
            </View>

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

            <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 40 }]}>
                {/* Pagination and Next Button Row */}
                <View style={styles.bottomRow}>
                    <View style={styles.pagination}>
                        {slides.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    currentIndex === index ? styles.dotActive : styles.dotInactive
                                ]}
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        style={styles.nextBtn}
                        onPress={handleNext}
                        activeOpacity={0.8}
                    >
                        <MonoText weight="bold" color={colors.primary} size="m">
                            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
                        </MonoText>
                    </TouchableOpacity>
                </View>
                </View>
        </View>
    );
};

const styles = StyleSheet.create({
    rootContainer: {
        flex: 1,
    },
    header: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.l,
        zIndex: 10,
    },
    topLogo: {
        width: 140,
        height: 40,
    },
    listContainer: {
        flex: 1,
    },
    slide: {
        width: SCREEN_WIDTH,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'flex-start', // Shift everything up
        paddingTop: 100, // Reduced top padding to bring illustration closer to logo
    },
    imageContainer: {
        flex: 1, // Reduced flex to take less vertical space
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        width: '100%',
    },
    mainImage: {
        width: '100%', // Sightly larger to fill width as in SS
        height: '100%',
    },
    contentContainer: {
        flex: 0.5,
        alignItems: 'flex-start',
        width: '100%',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.m, // Reduced padding
    },
    title: {
        fontSize: 24, // More impactful
        lineHeight: 38,
        fontWeight: '900',
        marginBottom: spacing.s,
        color: '#1A1A1A',
        textAlign: 'left',
    },
    description: {
        fontSize: 12,
        lineHeight: 24,
        color: '#555555',
        textAlign: 'left',
        paddingRight: spacing.xl,
    },
    bottomSection: {
        paddingHorizontal: spacing.xl,
        width: '100%',
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    pagination: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        height: 10,
        borderRadius: 5,
        marginHorizontal: 3,
    },
    dotInactive: {
        width: 10,
        backgroundColor: '#E0E0E0',
    },
    dotActive: {
        width: 40,
        backgroundColor: colors.primary,
    },
    patternContainer: {
        ...StyleSheet.absoluteFill,
        overflow: 'hidden',
    },
    patternImage: {
        width: '100%',
        height: '100%',
        transform: [{ scale: 3 }],
    },
    nextBtn: {
        minWidth: 100,
        height: 44,
        backgroundColor: 'rgba(255, 71, 0, 0.08)',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255, 71, 0, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
});
