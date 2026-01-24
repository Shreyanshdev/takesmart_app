import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import Icon from 'react-native-vector-icons/Feather';

const CATEGORIES = [
    { id: '1', name: 'Milk', color: '#E3F2FD' },
    { id: '2', name: 'Ghee', color: '#FFF8E1' },
    { id: '3', name: 'Curd', color: '#F3E5F5' },
    { id: '4', name: 'Paneer', color: '#E8F5E9' },
    { id: '5', name: 'Butter', color: '#FFF3E0' },
];

import { Category } from '../../services/customer/product.service';

interface CategoryGridProps {
    categories: Category[];
}

import { ENV } from '../../utils/env';

import { useNavigation } from '@react-navigation/native';

const CategoryItem = ({ cat, index }: { cat: Category, index: number }) => {
    const [imgError, setImgError] = React.useState<string | null>(null);
    const navigation = useNavigation<any>();

    return (
        <Animated.View
            entering={FadeInRight.delay(index * 100).springify()}
        >
            <TouchableOpacity
                style={[styles.card, { backgroundColor: cat.color || '#F5F5F5' }]}
                onPress={() => navigation.navigate('Categories', { initialCategory: cat._id })}
            >
                {/* Use Real Image if available, else placeholder */}
                {!imgError && cat.image ? (
                    <Image
                        source={{ uri: cat.image }}
                        style={styles.image}
                        resizeMode="cover"
                        onError={() => setImgError('Failed')}
                    />
                ) : (
                    <View style={[styles.imagePlaceholder, { justifyContent: 'center', alignItems: 'center' }]}>
                        <Icon name="image" size={20} color={colors.textLight} />
                    </View>
                )}
                <MonoText size="s" weight="semiBold" style={styles.name}>{cat.name}</MonoText>
            </TouchableOpacity>
        </Animated.View>
    );
};

export const CategoryGrid = ({ categories }: CategoryGridProps) => {
    if (!categories || categories.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    <View style={styles.decorativeLine} />
                    <MonoText size="l" weight="bold" style={styles.headerTitle}>Explore Categories</MonoText>
                    <View style={styles.decorativeLine} />
                </View>
                {/* Optional: Add See All if many categories */}
                {/* <MonoText size="s" color={colors.primary} weight="bold">See All</MonoText> */}
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {categories.map((cat, index) => (
                    <CategoryItem key={cat._id} cat={cat} index={index} />
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.l,
    },
    header: {
        marginBottom: spacing.m,
        paddingHorizontal: spacing.m,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.s,
    },
    headerTitle: {
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: colors.textLight,
    },
    decorativeLine: {
        height: 1,
        backgroundColor: colors.border,
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.m,
        gap: spacing.m,
    },
    card: {
        width: 80,
        height: 100,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.s,
    },
    imagePlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.5)',
        marginBottom: spacing.s,
    },
    name: {
        textAlign: 'center',
    },
    image: {
        width: 40,
        height: 40,
        marginBottom: spacing.s,
        borderRadius: 20,
    }
});
