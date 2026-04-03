import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    Dimensions,
    TouchableOpacity,
    NativeSyntheticEvent,
    NativeScrollEvent,
    Platform
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { MonoText } from '../shared/MonoText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { BannerSlide } from '../../services/customer/banner.service';
import { ProductDetailsModal } from './ProductDetailsModal';
import { productService } from '../../services/customer/product.service';

const { width } = Dimensions.get('window');
const CAROUSEL_MARGIN = spacing.m;
const ITEM_WIDTH = width - CAROUSEL_MARGIN - 20; // Allow next item to peek

interface PromoCarouselProps {
    slides: BannerSlide[];
    height?: number;
    interval?: number;
    isEdgeToEdge?: boolean;
}

export const PromoCarousel = ({ slides, height = 180, interval = 4000, isEdgeToEdge = false }: PromoCarouselProps) => {
    const navigation = useNavigation<any>();
    const flatListRef = useRef<FlatList>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    const actualItemWidth = isEdgeToEdge ? width : ITEM_WIDTH;

    // Auto-slide
    useEffect(() => {
        if (slides.length <= 1) return;
        const timer = setInterval(() => {
            let nextIndex = activeIndex + 1;
            if (nextIndex >= slides.length) nextIndex = 0;
            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
            setActiveIndex(nextIndex);
        }, interval);
        return () => clearInterval(timer);
    }, [activeIndex, slides.length, interval]);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / actualItemWidth);
        setActiveIndex(index);
    };

    const handlePress = async (slide: BannerSlide) => {
        if (slide.actionType === 'NONE') return;
        try {
            switch (slide.actionType) {
                case 'PRODUCT':
                    if (slide.targetValue) {
                        const product = await productService.getProductById(slide.targetValue);
                        if (product) {
                            setSelectedProduct(product);
                            setModalVisible(true);
                        }
                    }
                    break;
                case 'CATEGORY':
                    if (slide.targetValue) {
                        navigation.navigate('BrowseProducts', {
                            type: 'category',
                            value: slide.targetValue,
                            categoryId: slide.targetValue,
                            title: slide.title || slide.targetValue
                        });
                    }
                    break;
                case 'BRAND':
                    if (slide.targetValue) {
                        navigation.navigate('BrowseProducts', {
                            type: 'brand',
                            value: slide.targetValue,
                            title: slide.title || slide.targetValue
                        });
                    }
                    break;
                case 'SEARCH':
                    if (slide.targetValue) {
                        navigation.navigate('BrowseProducts', {
                            type: 'search',
                            value: slide.targetValue,
                            title: slide.title || `Search: ${slide.targetValue}`
                        });
                    }
                    break;
            }
        } catch (error) {
            console.error('Banner action failed:', error);
        }
    };

    const renderItem = ({ item }: { item: BannerSlide }) => (
        <TouchableOpacity
            activeOpacity={item.actionType !== 'NONE' ? 0.92 : 1}
            onPress={() => handlePress(item)}
            style={[
                styles.slide,
                { height, width: actualItemWidth },
                isEdgeToEdge && { borderRadius: 0 } // Remove border radius for edge-to-edge
            ]}
        >
            <FastImage
                source={{ uri: item.imageUrl, priority: FastImage.priority.high }}
                style={[
                    styles.image,
                    isEdgeToEdge && { borderRadius: 0 }
                ]}
                resizeMode={FastImage.resizeMode.cover}
            />
            {/* Bottom gradient for text readability */}
            {(item.title || item.buttonText) && (
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.55)']}
                    style={styles.gradient}
                >
                    {item.title && (
                        <MonoText size="l" weight="bold" color={colors.white} style={styles.title}>
                            {item.title}
                        </MonoText>
                    )}
                    {item.buttonText && (
                        <View style={styles.button}>
                            <MonoText size="s" weight="bold" color={colors.primary}>
                                {item.buttonText}
                            </MonoText>
                        </View>
                    )}
                </LinearGradient>
            )}
        </TouchableOpacity>
    );

    if (!slides || slides.length === 0) return null;

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={slides}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                keyExtractor={(item, index) => item._id || `slide-${index}`}
                getItemLayout={(_, index) => ({
                    length: isEdgeToEdge ? actualItemWidth : (actualItemWidth + 12),
                    offset: (isEdgeToEdge ? actualItemWidth : (actualItemWidth + 12)) * index,
                    index,
                })}
                snapToInterval={isEdgeToEdge ? actualItemWidth : (actualItemWidth + 12)}
                decelerationRate="fast"
                contentContainerStyle={{
                    paddingHorizontal: isEdgeToEdge ? 0 : CAROUSEL_MARGIN,
                    gap: isEdgeToEdge ? 0 : 12,
                    paddingBottom: isEdgeToEdge ? 0 : 20 // Shadow space
                }}
            />

            {/* Pagination Pill inside bottom right of active slide area visually */}
            {slides.length > 1 && (
                <View style={styles.paginationContainer} pointerEvents="none">
                    <View style={styles.paginationPill}>
                        <MonoText size="xxs" weight="bold" color={colors.white} style={{ marginRight: 4 }}>
                            {activeIndex + 1}/{slides.length}
                        </MonoText>
                        <View style={styles.dotsRow}>
                            {slides.map((_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.dot,
                                        index === activeIndex ? styles.activeDot : styles.inactiveDot
                                    ]}
                                />
                            ))}
                        </View>
                    </View>
                </View>
            )}

            <ProductDetailsModal
                visible={modalVisible}
                product={selectedProduct}
                onClose={() => {
                    setModalVisible(false);
                    setSelectedProduct(null);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        backgroundColor: 'transparent',
    },
    slide: {
        position: 'relative',
        borderRadius: 16,
        backgroundColor: colors.white,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 10,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingBottom: 24, // extra bottom padding so text clears the pill
        paddingTop: 50,
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
    },
    title: {
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    button: {
        backgroundColor: colors.white,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    paginationContainer: {
        position: 'absolute',
        bottom: 30, // Inside the shadow padding + card padding
        right: CAROUSEL_MARGIN + 12, // Align with the right edge of the *active* card
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
    },
    paginationPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    dot: {
        borderRadius: 3,
    },
    activeDot: {
        width: 10, // slightly wider active dot
        height: 6,
        backgroundColor: colors.white,
    },
    inactiveDot: {
        width: 6,
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
});
