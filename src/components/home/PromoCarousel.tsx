import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    Dimensions,
    Image,
    TouchableOpacity,
    NativeSyntheticEvent,
    NativeScrollEvent,
    Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MonoText } from '../shared/MonoText';
import { colors } from '../../theme/colors';
import { BannerSlide } from '../../services/customer/banner.service';
import { ProductDetailsModal } from '../home/ProductDetailsModal';
import { productService } from '../../services/customer/product.service';

const { width } = Dimensions.get('window');

interface PromoCarouselProps {
    slides: BannerSlide[];
    height?: number;
    interval?: number;
    variant?: 'full' | 'card';
}

export const PromoCarousel = ({ slides, height = 200, interval = 4000, variant = 'full' }: PromoCarouselProps) => {
    const navigation = useNavigation<any>();
    const flatListRef = useRef<FlatList>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    // Card variant adjustment: narrower width if card
    const ITEM_WIDTH = variant === 'card' ? width - 32 : width;
    const CONTAINER_PADDING = variant === 'card' ? 16 : 0;

    // Auto-slide logic
    useEffect(() => {
        if (slides.length <= 1) return;

        const timer = setInterval(() => {
            let nextIndex = activeIndex + 1;
            if (nextIndex >= slides.length) {
                nextIndex = 0;
            }
            flatListRef.current?.scrollToIndex({
                index: nextIndex,
                animated: true
            });
            setActiveIndex(nextIndex);
        }, interval);

        return () => clearInterval(timer);
    }, [activeIndex, slides.length, interval]);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / ITEM_WIDTH);
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
                            categoryId: slide.targetValue
                        });
                    }
                    break;
                case 'BRAND':
                    if (slide.targetValue) {
                        navigation.navigate('BrowseProducts', {
                            type: 'brand',
                            value: slide.targetValue
                        });
                    }
                    break;
            }
        } catch (error) {
            console.error('Redirection failed:', error);
        }
    };

    const renderItem = ({ item }: { item: BannerSlide }) => (
        <TouchableOpacity
            activeOpacity={item.actionType !== 'NONE' ? 0.9 : 1}
            onPress={() => handlePress(item)}
            style={[
                styles.slide,
                { height, width: ITEM_WIDTH },
                variant === 'card' && styles.cardSlide
            ]}
        >
            <Image
                source={{ uri: item.imageUrl }}
                style={[styles.image, variant === 'card' && styles.cardImage]}
                resizeMode="cover"
            />
            {/* Overlay Content */}
            {(item.title || item.buttonText) && (
                <View style={[styles.overlay, variant === 'card' && styles.cardOverlay]}>
                    {item.title && (
                        <MonoText size="xl" weight="bold" color={colors.white} style={styles.title}>
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
                </View>
            )}
        </TouchableOpacity>
    );

    if (!slides || slides.length === 0) return null;

    return (
        <View style={[styles.container, { paddingHorizontal: CONTAINER_PADDING }]}>
            <FlatList
                ref={flatListRef}
                data={slides}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                keyExtractor={(item) => item._id}
                getItemLayout={(_, index) => ({
                    length: ITEM_WIDTH,
                    offset: ITEM_WIDTH * index,
                    index,
                })}
            // If card, we might need snapping adjustment or contentContainerStyle if we want spacing between cards
            // But for single card view paging enabled, this is fine.
            />

            {/* Pagination Dots */}
            {slides.length > 1 && (
                <View style={[styles.pagination, variant === 'card' && { bottom: 20 }]}>
                    {slides.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                { backgroundColor: index === activeIndex ? colors.white : 'rgba(255,255,255,0.5)' }
                            ]}
                        />
                    ))}
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
        marginBottom: 16,
    },
    slide: {
        position: 'relative',
    },
    cardSlide: {
        borderRadius: 16,
        overflow: 'hidden',
        // Shadow for card
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
        backgroundColor: colors.white, // Ensure shadow works
    },
    image: {
        width: '100%',
        height: '100%',
    },
    cardImage: {
        borderRadius: 16,
    },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.3)', // Subtle gradient replacement for simplicity
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
    },
    cardOverlay: {
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
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
    },
    pagination: {
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    }
});
