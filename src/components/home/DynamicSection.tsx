import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { HomeLayoutSection } from '../../services/customer/home.service';
import { PromoCarousel } from './PromoCarousel';
import { CategoryGrid } from './CategoryGrid';
import { ProductStrip } from './ProductStrip';
import { BrandSpotlight } from './BrandSpotlight';
import { CustomBanner } from './CustomBanner';
import { FeaturedSection } from './FeaturedSection';
import { CategoryGridSkeleton, ProductStripSkeleton } from './HomeSkeletons';
import { ProductSkeleton } from '../shared/ProductSkeleton';
import { Product } from '../../services/customer/product.service';

interface DynamicSectionProps {
    section: HomeLayoutSection;
    index: number;
    onProductPress: (product: Product, variantId?: string) => void;
    isLoading?: boolean;
}

/**
 * Renders the correct component based on section type.
 * This is the heart of the dynamic home screen layout.
 */
export const DynamicSection = ({ section, index, onProductPress, isLoading }: DynamicSectionProps) => {
    const navigation = useNavigation<any>();
    const { type, title, subtitle, resolvedData } = section;

    if (isLoading) {
        switch (type) {
            case 'CATEGORY_GRID':
                return <CategoryGridSkeleton />;
            case 'PRODUCT_STRIP':
            case 'CATEGORY_SHOWCASE':
                return <ProductStripSkeleton title={title} />;
            default:
                return null;
        }
    }

    if (!resolvedData) return null;

    switch (type) {
        case 'BANNER_CAROUSEL': {
            const slides = resolvedData.slides || [];
            if (slides.length === 0) return null;
            return <PromoCarousel slides={slides} height={180} isEdgeToEdge={index === 0} />;
        }

        case 'CATEGORY_GRID': {
            const categories = resolvedData.categories || [];
            if (categories.length === 0) return null;
            return <CategoryGrid categories={categories} title={title || 'Shop by Category'} />;
        }

        case 'PRODUCT_STRIP': {
            const { products, actionType, targetValue, isFeatured, backgroundColor, gradientColors } = resolvedData;
            if (!products || products.length === 0) return null;

            const onSeeAll = () => {
                navigation.navigate('BrowseProducts', {
                    title: title,
                    type: actionType || 'none',
                    value: targetValue || ''
                });
            };

            if (isFeatured) {
                return (
                    <FeaturedSection
                        title={title}
                        subtitle={subtitle}
                        products={products}
                        backgroundColor={backgroundColor}
                        gradientColors={gradientColors}
                        onProductPress={onProductPress}
                        onSeeAll={onSeeAll}
                    />
                );
            }

            return (
                <ProductStrip
                    title={title}
                    subtitle={subtitle}
                    products={products}
                    onProductPress={onProductPress}
                    onSeeAll={onSeeAll}
                />
            );
        }

        case 'FEATURED_SECTION': {
            const { products, actionType, targetValue, backgroundColor, gradientColors } = resolvedData;
            if (!products || products.length === 0) return null;
            return (
                <FeaturedSection
                    title={title}
                    subtitle={subtitle}
                    products={products}
                    backgroundColor={backgroundColor}
                    gradientColors={gradientColors}
                    onProductPress={onProductPress}
                    onSeeAll={() => {
                        navigation.navigate('BrowseProducts', {
                            title: title,
                            type: actionType || 'none',
                            value: targetValue || ''
                        });
                    }}
                />
            );
        }

        case 'BRAND_SPOTLIGHT': {
            const { brandName, brandLogo, backgroundColor, products, actionType, targetValue } = resolvedData;
            if (!products || products.length === 0) return null;
            return (
                <BrandSpotlight
                    title={title}
                    brandName={brandName || ''}
                    brandLogo={brandLogo}
                    backgroundColor={backgroundColor}
                    products={products}
                    onProductPress={onProductPress}
                    onSeeAll={() => {
                        navigation.navigate('BrowseProducts', {
                            title: title || brandName,
                            type: actionType || 'brand',
                            value: targetValue || brandName
                        });
                    }}
                />
            );
        }

        case 'CATEGORY_SHOWCASE': {
            // Reuse ProductStrip for category showcase (shows category products in a horizontal strip)
            const products = resolvedData.products || [];
            if (products.length === 0) return null;
            return (
                <ProductStrip
                    title={title || resolvedData.category?.name || 'Products'}
                    subtitle={subtitle}
                    products={products}
                    onProductPress={onProductPress}
                />
            );
        }

        case 'CUSTOM_BANNER': {
            const { imageUrl, actionType, targetValue } = resolvedData;
            if (!imageUrl) return null;
            return (
                <CustomBanner
                    imageUrl={imageUrl}
                    actionType={actionType}
                    targetValue={targetValue}
                />
            );
        }

        default:
            return null;
    }
};
