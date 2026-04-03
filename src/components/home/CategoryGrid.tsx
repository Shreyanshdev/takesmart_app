import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Dimensions, Platform } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { SectionHeader } from './SectionHeader';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { Category } from '../../services/customer/product.service';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 4;
const GRID_PADDING = spacing.m;
const GRID_GAP = 10;
const ITEM_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

// Curated accent colors for each category position
const THEME_ORANGE = colors.primary;
const THEME_BG = '#FFF5F0';

const ACCENT_COLORS = [THEME_ORANGE];
const ACCENT_BGS = [THEME_BG];

interface CategoryGridProps {
    categories: Category[];
    title?: string;
}

const CategoryItem = ({ cat, index }: { cat: Category; index: number }) => {
    const [imgError, setImgError] = React.useState(false);
    const navigation = useNavigation<any>();
    const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];
    const accentBg = ACCENT_BGS[index % ACCENT_BGS.length];

    return (
        <Animated.View entering={FadeInDown.delay(index * 50).duration(350).springify()}>
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('Subcategories', { categoryId: cat._id, subcategoryName: cat.name })}
                activeOpacity={0.8}
            >
                <View style={[styles.imageWrapper, { backgroundColor: cat.color || accentBg }]}>
                    {!imgError && cat.image ? (
                        <>
                            <Image
                                source={{ uri: cat.image }}
                                style={styles.image}
                                resizeMode="cover"
                                onError={() => setImgError(true)}
                            />
                            {/* Subtle bottom gradient for depth */}
                            <View style={styles.imageOverlay}>
                                <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <Defs>
                                        <SvgLinearGradient id={`cat-g-${index}`} x1="0" y1="0" x2="0" y2="1">
                                            <Stop offset="0" stopColor="#000" stopOpacity="0" />
                                            <Stop offset="1" stopColor="#000" stopOpacity="0.12" />
                                        </SvgLinearGradient>
                                    </Defs>
                                    <Rect width="100" height="100" fill={`url(#cat-g-${index})`} />
                                </Svg>
                            </View>
                        </>
                    ) : (
                        <View style={[styles.placeholderContainer, { backgroundColor: accentBg }]}>
                            <Icon name="grid" size={22} color={accent} />
                        </View>
                    )}
                </View>
                <MonoText size="xs" weight="semiBold" numberOfLines={2} style={styles.name} color="#374151">
                    {cat.name}
                </MonoText>
            </TouchableOpacity>
        </Animated.View>
    );
};

export const CategoryGrid = ({ categories, title = 'Shop by Category' }: CategoryGridProps) => {
    const navigation = useNavigation<any>();

    if (!categories || categories.length === 0) return null;

    const maxShow = 8;
    const displayCategories = categories.slice(0, maxShow);
    const hasMore = categories.length > maxShow;

    return (
        <View style={styles.container}>
            <SectionHeader
                title={title}
                onSeeAll={hasMore ? () => navigation.navigate('Categories') : undefined}
            />
            <View style={styles.grid}>
                {displayCategories.map((cat, index) => (
                    <CategoryItem key={cat._id} cat={cat} index={index} />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.l,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: GRID_PADDING,
        columnGap: GRID_GAP,
        rowGap: GRID_GAP + 8,
    },
    card: {
        width: ITEM_WIDTH,
        alignItems: 'center',
    },
    imageWrapper: {
        width: ITEM_WIDTH,
        height: ITEM_WIDTH,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginBottom: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
    },
    placeholderContainer: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    accentDot: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 5,
        height: 5,
        borderRadius: 3,
        opacity: 0.8,
    },
    name: {
        textAlign: 'center',
        lineHeight: 16,
        maxWidth: ITEM_WIDTH + 4,
    },
});
