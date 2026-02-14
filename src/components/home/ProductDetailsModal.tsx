import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    Dimensions,
    ScrollView,
    FlatList,
    LayoutAnimation,
    UIManager,
    Platform,
    ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { colors } from '../../theme/colors';
import { MonoText } from '../shared/MonoText';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { Product, Inventory, InventoryVariant, InventoryPricing, productService } from '../../services/customer/product.service';
import { useBranchStore } from '../../store/branch.store';
import { ProductGridCard } from '../shared/ProductGridCard';
import { ProductSkeleton } from '../shared/ProductSkeleton';
import { SkeletonItem } from '../shared/SkeletonLoader';
import { reviewService, Review, RatingDistribution } from '../../services/customer/review.service';
import { useCartStore } from '../../store/cart.store';
import { useToastStore } from '../../store/toast.store';
import { useAuthStore } from '../../store/authStore';
import { useWishlistStore } from '../../store/wishlist.store';
import { FloatingCarts } from './FloatingCarts';
import { SuccessToast } from '../SuccessToast';
import { logger } from '../../utils/logger';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

interface ProductDetailsModalProps {
    visible: boolean;
    product: Product | null;
    initialVariantId?: string | null;
    onClose: () => void;
}

// Variant item type for display
interface VariantItem {
    _id: string;
    inventoryId: string;
    variant: InventoryVariant;
    pricing: InventoryPricing;
    stock: number;
    isAvailable: boolean;
}

export const ProductDetailsModal = ({ visible, product, initialVariantId, onClose }: ProductDetailsModalProps) => {
    const navigation = useNavigation<any>();
    const [activeSlide, setActiveSlide] = useState(0);
    const [selectedVariant, setSelectedVariant] = useState<VariantItem | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [ratingDistribution, setRatingDistribution] = useState<RatingDistribution | null>(null);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    // Review Pagination
    const [reviewPage, setReviewPage] = useState(1);
    const [hasMoreReviews, setHasMoreReviews] = useState(true);
    const INITIAL_REVIEW_LIMIT = 5;
    const LOAD_MORE_LIMIT = 5;

    // Related Products Pagination
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [brandProducts, setBrandProducts] = useState<Product[]>([]);
    const [loadingRelated, setLoadingRelated] = useState(false);
    const [relatedPage, setRelatedPage] = useState(1);
    const [hasNextRelated, setHasNextRelated] = useState(false);
    const [brandPage, setBrandPage] = useState(1);
    const [hasNextBrand, setHasNextBrand] = useState(false);
    const [isLoadingMoreRelated, setIsLoadingMoreRelated] = useState(false);
    const [isLoadingMoreBrand, setIsLoadingMoreBrand] = useState(false);

    const INITIAL_RELATED_LIMIT = 15;
    const LOAD_MORE_RELATED_LIMIT = 10;

    // Internal product state for switching products
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [isLoadingProduct, setIsLoadingProduct] = useState(false);

    // Fetch full product details when modal opens or product changes
    useEffect(() => {
        if (visible && product?._id) {
            fetchFullProduct(product._id);
        } else if (!visible) {
            // Reset state when modal closes
            setCurrentProduct(null);
            setIsLoadingProduct(false);
        }
    }, [visible, product?._id]);

    const fetchFullProduct = async (productId: string) => {
        setIsLoadingProduct(true);
        // Set initial product from props for immediate display
        setCurrentProduct(product);

        try {
            // Fetch full product details with branch-specific inventory
            const branchId = useBranchStore.getState().currentBranch?._id;
            const fullProduct = await productService.getProductById(productId, branchId);

            if (fullProduct) {
                logger.log('Full product loaded:', fullProduct.name, 'variants:', (fullProduct as any).variants?.length || 0);
                setCurrentProduct(fullProduct);
            }
        } catch (err) {
            logger.error('Failed to fetch full product details:', err);
            // Keep using prop data as fallback
        } finally {
            setIsLoadingProduct(false);
        }
    };

    // Review Filters
    const [filterRating, setFilterRating] = useState<number | null>(null);
    const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'highest' | 'lowest'>('helpful');

    const insets = useSafeAreaInsets();
    const { addToCart, removeFromCart, getItemQuantity } = useCartStore();
    const { showToast } = useToastStore();
    const { currentBranch } = useBranchStore();
    const { toggleWishlist, isInWishlist } = useWishlistStore();
    const branchId = currentBranch?._id;
    const heartScale = useSharedValue(1);

    const heartStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScale.value }]
    }));

    const ratingScrollRef = React.useRef<ScrollView>(null);

    // Fetch reviews when product changes or filters change (reset pagination)
    useEffect(() => {
        if (visible && currentProduct?._id) {
            setReviewPage(1);
            setReviews([]);
            setHasMoreReviews(true);
            fetchReviews(1, INITIAL_REVIEW_LIMIT, true);
        }
    }, [visible, currentProduct?._id, filterRating, sortBy]);

    // Fetch related products when product changes
    useEffect(() => {
        if (visible && currentProduct?._id) {
            fetchRelatedProducts();
        }
    }, [visible, currentProduct?._id]);

    const fetchRelatedProducts = async () => {
        if (!currentProduct) return;
        setLoadingRelated(true);
        setRelatedPage(1);
        setBrandPage(1);

        // Reset products only if we have a valid brand/section to show skeletons for
        setRelatedProducts([]);
        setBrandProducts([]);

        try {
            const [relatedRes, brandRes] = await Promise.all([
                productService.getRelatedProducts(currentProduct._id, branchId, 1, INITIAL_RELATED_LIMIT),
                currentProduct.brand
                    ? productService.getProductsByBrand(currentProduct.brand, branchId, 1, INITIAL_RELATED_LIMIT)
                    : Promise.resolve({ products: [], pagination: { hasNext: false } })
            ]);

            setRelatedProducts(relatedRes.products || []);
            setHasNextRelated(relatedRes.pagination?.hasNext || false);

            if (brandRes && brandRes.products) {
                const filteredBrand = brandRes.products.filter(p => p._id !== currentProduct._id);
                setBrandProducts(filteredBrand);
                setHasNextBrand(brandRes.pagination?.hasNext || false);
            }
        } catch (err) {
            logger.error('Failed to fetch related products:', err);
        } finally {
            setLoadingRelated(false);
        }
    };

    const loadMoreRelated = async () => {
        if (isLoadingMoreRelated || !hasNextRelated || !currentProduct) return;

        setIsLoadingMoreRelated(true);
        const nextPage = relatedPage + 1;

        try {
            const response = await productService.getRelatedProducts(
                currentProduct._id,
                branchId,
                nextPage,
                LOAD_MORE_RELATED_LIMIT
            );

            setRelatedProducts(prev => {
                const existingIds = new Set(prev.map(p => p.inventoryId || p._id));
                const seenInBatch = new Set<string>();
                const newItems = (response.products || []).filter(p => {
                    const id = p.inventoryId || p._id;
                    if (existingIds.has(id) || seenInBatch.has(id)) return false;
                    seenInBatch.add(id);
                    return true;
                });
                return [...prev, ...newItems];
            });
            setRelatedPage(nextPage);
            setHasNextRelated(response.pagination?.hasNext || false);
        } catch (err) {
            logger.error('Failed to load more related products:', err);
        } finally {
            setIsLoadingMoreRelated(false);
        }
    };

    const loadMoreBrand = async () => {
        if (isLoadingMoreBrand || !hasNextBrand || !currentProduct?.brand) return;

        setIsLoadingMoreBrand(true);
        const nextPage = brandPage + 1;

        try {
            const response = await productService.getProductsByBrand(
                currentProduct.brand,
                branchId,
                nextPage,
                LOAD_MORE_RELATED_LIMIT
            );

            const filteredProducts = response.products.filter(p => p._id !== currentProduct._id);
            setBrandProducts(prev => {
                const existingIds = new Set(prev.map(p => p.inventoryId || p._id));
                const seenInBatch = new Set<string>();
                const newItems = filteredProducts.filter(p => {
                    const id = p.inventoryId || p._id;
                    if (existingIds.has(id) || seenInBatch.has(id)) return false;
                    seenInBatch.add(id);
                    return true;
                });
                return [...prev, ...newItems];
            });
            setBrandPage(nextPage);
            setHasNextBrand(response.pagination?.hasNext || false);
        } catch (err) {
            logger.error('Failed to load more brand products:', err);
        } finally {
            setIsLoadingMoreBrand(false);
        }
    };

    const fetchReviews = async (page: number, limit: number, isInitial: boolean) => {
        if (!currentProduct) return;
        setLoadingReviews(true);
        try {
            let sortField = 'createdAt';
            let sortOrder: 'asc' | 'desc' = 'desc';

            switch (sortBy) {
                case 'helpful': sortField = 'helpfulCount'; break;
                case 'highest': sortField = 'rating'; sortOrder = 'desc'; break;
                case 'lowest': sortField = 'rating'; sortOrder = 'asc'; break;
                case 'recent': default: sortField = 'createdAt'; break;
            }

            const data = await reviewService.getProductReviews(
                currentProduct._id,
                page,
                limit,
                {
                    rating: filterRating,
                    sort: sortField,
                    order: sortOrder
                }
            );

            if (isInitial) {
                setReviews(data.reviews);
            } else {
                setReviews(prev => [...prev, ...data.reviews]);
            }

            // Check if there are more reviews to load
            setHasMoreReviews(data.reviews.length === limit);

            if (!filterRating) {
                setRatingDistribution(data.ratingDistribution);
            }
        } catch (err) {
            logger.error('Failed to fetch reviews:', err);
        } finally {
            setLoadingReviews(false);
        }
    };

    const loadMoreReviews = () => {
        const nextPage = reviewPage + 1;
        setReviewPage(nextPage);
        fetchReviews(nextPage, LOAD_MORE_LIMIT, false);
    };

    const { user } = useAuthStore();
    const currentUserId = user?._id;

    const handleMarkHelpful = async (reviewId: string) => {
        if (!currentUserId) return;

        const review = reviews.find(r => r._id === reviewId);
        if (!review) return;

        // Check customer - could be object or string
        const reviewCustomerId = typeof review.customer === 'string'
            ? review.customer
            : review.customer?._id;

        // Prevent self-marking
        if (reviewCustomerId === currentUserId) return;

        const isMarking = !(review.helpfulUsers?.includes(currentUserId));

        try {
            // Optimistic update
            setReviews(prev => prev.map(r => {
                if (r._id === reviewId) {
                    const newUsers = isMarking
                        ? [...(r.helpfulUsers || []), currentUserId]
                        : (r.helpfulUsers || []).filter(id => id !== currentUserId);

                    return {
                        ...r,
                        helpfulCount: isMarking ? r.helpfulCount + 1 : Math.max(0, r.helpfulCount - 1),
                        helpfulUsers: newUsers
                    };
                }
                return r;
            }));

            await reviewService.markHelpful(reviewId);
        } catch (err) {
            // Revert on error
            setReviews(prev => prev.map(r => {
                if (r._id === reviewId) {
                    const revertedUsers = !isMarking
                        ? [...(r.helpfulUsers || []), currentUserId]
                        : (r.helpfulUsers || []).filter(id => id !== currentUserId);

                    return {
                        ...r,
                        helpfulCount: !isMarking ? r.helpfulCount + 1 : Math.max(0, r.helpfulCount - 1),
                        helpfulUsers: revertedUsers
                    };
                }
                return r;
            }));
        }
    };

    // Get variants array (from inventory data) or create default from product
    const variants: VariantItem[] = currentProduct ? ((currentProduct as any).variants?.map((inv: any) => ({
        _id: inv._id || inv.inventoryId,
        inventoryId: inv._id || inv.inventoryId,
        variant: inv.variant,
        pricing: inv.pricing,
        stock: inv.stock,
        isAvailable: inv.isAvailable
    })) || ((currentProduct as any).variant && (currentProduct as any).pricing ? [{
        _id: (currentProduct as any).inventoryId || currentProduct._id,
        inventoryId: (currentProduct as any).inventoryId || currentProduct._id,
        variant: (currentProduct as any).variant,
        pricing: (currentProduct as any).pricing,
        stock: (currentProduct as any).stock || 0,
        isAvailable: (currentProduct as any).isAvailable ?? true
    }] : [])) : [];

    // Select variant based on initialVariantId or first variant
    useEffect(() => {
        if (visible && variants.length > 0) {
            if (initialVariantId) {
                const target = variants.find(v => v.inventoryId === initialVariantId);
                if (target) {
                    setSelectedVariant(target);
                    return;
                }
            }
            setSelectedVariant(variants[0]);
        } else if (!visible) {
            setSelectedVariant(null);
            setActiveSlide(0);
        }
    }, [visible, currentProduct?._id, initialVariantId, variants.length]);

    if (!currentProduct) return null;

    const currentVariant = selectedVariant || variants[0];

    const isFavorite = currentVariant ? isInWishlist(currentVariant.inventoryId) : (currentProduct ? isInWishlist(currentProduct._id) : false);

    const handleToggleWishlist = () => {
        if (!currentProduct) return;
        heartScale.value = withSequence(
            withSpring(1.3, { damping: 10, stiffness: 200 }),
            withSpring(1, { damping: 10, stiffness: 200 })
        );

        const { useToastStore } = require('../../store/toast.store');
        if (!isFavorite) {
            useToastStore.getState().showToast('Added to Wishlist!');
        } else {
            useToastStore.getState().showToast('Removed from Wishlist');
        }

        toggleWishlist(currentProduct, currentVariant?.inventoryId);
    };
    const quantity = getItemQuantity(currentVariant?.inventoryId || currentProduct._id);

    const images = (() => {
        // Priority: variant images > product images > single product image
        const variantImages = currentVariant?.variant?.images;
        if (variantImages && variantImages.length > 0) return variantImages;
        if (currentProduct.images && currentProduct.images.length > 0) return currentProduct.images;
        if (currentProduct.image) return [currentProduct.image];
        return [];
    })();

    // Format variant label (e.g., "500 ml", "1 kg")
    const formatVariantLabel = (v: InventoryVariant) => {
        if (!v) return '';
        if (!v.packSize || v.packSize === '1') {
            return `${v.weightValue} ${v.weightUnit}`;
        }
        // Check if packSize is a simple number (multiplier)
        const isMultiplier = /^\d+$/.test(v.packSize.trim());
        if (isMultiplier) {
            return `${v.packSize} × ${v.weightValue} ${v.weightUnit}`;
        }
        // If it's the same as the weight string, return once
        const weightStr = `${v.weightValue}${v.weightUnit}`.replace(/\s/g, '').toLowerCase();
        const packSizeStr = v.packSize.replace(/\s/g, '').toLowerCase();
        if (packSizeStr === weightStr) {
            return `${v.weightValue} ${v.weightUnit}`;
        }
        return v.packSize;
    };

    // Calculate discount percentage
    const getDiscountPercent = (pricing: InventoryPricing) => {
        if (!pricing) return 0;
        if (pricing.discount > 0) return Math.round(pricing.discount);

        const { sellingPrice, mrp } = pricing;
        if (mrp > sellingPrice) {
            return Math.round(((mrp - sellingPrice) / mrp) * 100);
        }
        return 0;
    };

    const getPricePerUnit = (pricing: InventoryPricing, variant: InventoryVariant) => {
        if (!pricing || !variant) return '';
        const multiplier = variant.weightUnit === 'l' || variant.weightUnit === 'kg' ? 1000 : 1;
        const totalWeight = (variant.weightValue || 1) * multiplier;
        const baseUnit = variant.weightUnit === 'ml' || variant.weightUnit === 'l' ? 'ml' : 'g';
        const pricePerUnit = pricing.sellingPrice / totalWeight;
        return `(₹${pricePerUnit.toFixed(2)} / ${baseUnit})`;
    };

    const handleAddToCart = () => {
        if (!currentVariant || !currentProduct) return;

        const success = addToCart({
            ...currentProduct,
            _id: currentVariant._id || currentVariant.inventoryId,
            image: images[0] || '',
            images: images && images.length > 0 ? [images[0]] : (currentProduct.images || []),
            price: currentVariant.pricing.mrp,
            discountPrice: currentVariant.pricing.sellingPrice,
            quantity: {
                value: currentVariant.variant.weightValue,
                unit: currentVariant.variant.weightUnit
            },
            stock: currentVariant.stock
        } as any);

        if (!success) {
            const currentQuantity = getItemQuantity(currentVariant.inventoryId);
            if (currentQuantity >= (currentVariant.stock || 0)) {
                showToast('Maximum stock limit reached!');
            } else {
                showToast('Product is out of stock!');
            }
        }
    };

    const handleRemoveFromCart = () => {
        if (!currentVariant) return;
        removeFromCart(currentVariant.inventoryId);
    };

    const renderImageItem = ({ item }: { item: string }) => (
        <View style={styles.slide}>
            <Image source={{ uri: item }} style={styles.image} resizeMode="cover" />
        </View>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1}>
                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType="dark"
                        blurAmount={10}
                        reducedTransparencyFallbackColor="black"
                    />
                </TouchableOpacity>

                <View style={[styles.modalContent, { height: height * 0.9 }]}>
                    {/* Header Floating Buttons */}
                    <View style={[styles.headerOverlay, { top: 16 }]}>
                        <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="3">
                                <Path d="M19 12H5M12 19l-7-7 7-7" />
                            </Svg>
                        </TouchableOpacity>

                        <View style={styles.headerRightActions}>
                            <Animated.View style={heartStyle}>
                                <TouchableOpacity style={styles.iconBtn} onPress={handleToggleWishlist}>
                                    <Svg width="20" height="20" viewBox="0 0 24 24"
                                        fill={isFavorite ? colors.error : 'none'}
                                        stroke={isFavorite ? colors.error : colors.black}
                                        strokeWidth="2.5"
                                    >
                                        <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                    </Svg>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 160 }}
                        scrollEventThrottle={16}
                    >
                        {/* Image Carousel */}
                        <View style={styles.sliderContainer}>
                            <FlatList
                                data={images}
                                renderItem={renderImageItem}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                onMomentumScrollEnd={(ev) => {
                                    const index = Math.round(ev.nativeEvent.contentOffset.x / width);
                                    setActiveSlide(index);
                                }}
                                keyExtractor={(_, i) => i.toString()}
                            />
                            {/* Pagination Dots */}
                            {images.length > 1 && (
                                <View style={styles.pagination}>
                                    {images.map((_, i) => (
                                        <View
                                            key={i}
                                            style={[styles.dot, i === activeSlide && styles.activeDot]}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.bodyContent}>
                            {/* Brand Name */}
                            {isLoadingProduct ? (
                                <SkeletonItem width={80} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
                            ) : currentProduct.brand && (
                                <MonoText size="xs" color={colors.textLight} weight="semiBold" style={{ marginBottom: 4, letterSpacing: 0.5 }}>
                                    {currentProduct.brand.toUpperCase()}
                                </MonoText>
                            )}

                            {/* Product Name */}
                            {isLoadingProduct ? (
                                <SkeletonItem width="90%" height={24} borderRadius={4} style={{ marginBottom: 12 }} />
                            ) : (
                                <MonoText size="xl" weight="bold" style={styles.productName}>
                                    {currentProduct.name}
                                </MonoText>
                            )}

                            {/* Rating Row Restoration */}
                            {isLoadingProduct ? (
                                <SkeletonItem width={120} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
                            ) : (
                                <View style={styles.ratingRowMain}>
                                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="#FBBF24" stroke="#FBBF24">
                                        <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
                                    </Svg>
                                    <MonoText size="s" weight="bold" style={{ marginLeft: 6 }}>
                                        {currentProduct.rating?.average || 4.2}
                                    </MonoText>
                                    <MonoText size="s" color={colors.textLight} style={{ marginLeft: 8 }}>
                                        ({currentProduct.rating?.count || 120} reviews)
                                    </MonoText>
                                </View>
                            )}

                            {isLoadingProduct ? (
                                <SkeletonItem width={100} height={14} borderRadius={4} style={{ marginTop: 8 }} />
                            ) : currentVariant?.stock === 0 ? (
                                <MonoText size="s" weight="bold" color={colors.error} style={{ marginTop: 8 }}>
                                    Out of Stock
                                </MonoText>
                            ) : (currentVariant?.stock > 0 && currentVariant?.stock <= 10) && (
                                <MonoText size="s" weight="bold" color={colors.error} style={{ marginTop: 8 }}>
                                    Only {currentVariant.stock} left
                                </MonoText>
                            )}

                            {/* Variant Selection */}
                            <View style={styles.variantContainer}>
                                <MonoText size="m" weight="bold" style={styles.variantTitle}>Select Unit</MonoText>
                                {isLoadingProduct ? (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.variantScroll}>
                                        {[1, 2, 3].map(i => (
                                            <View key={i} style={[styles.newVariantCard, { minWidth: 100, minHeight: 90 }]}>
                                                <SkeletonItem width="60%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                                                <SkeletonItem width="80%" height={14} borderRadius={4} style={{ marginBottom: 4 }} />
                                                <SkeletonItem width="50%" height={10} borderRadius={4} />
                                            </View>
                                        ))}
                                    </ScrollView>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.variantScroll}>
                                        {variants.map((v, index) => {
                                            const isSelected = currentVariant?.inventoryId === v.inventoryId;
                                            const discount = getDiscountPercent(v.pricing);

                                            return (
                                                <TouchableOpacity
                                                    key={v.inventoryId || index}
                                                    style={[
                                                        styles.newVariantCard,
                                                        isSelected && styles.newVariantCardSelected
                                                    ]}
                                                    onPress={() => v.isAvailable && setSelectedVariant(v)}
                                                >
                                                    {discount > 0 && (
                                                        <View style={styles.discountBadge}>
                                                            <MonoText size="xxs" weight="bold" color={colors.white}>{discount}% OFF</MonoText>
                                                        </View>
                                                    )}
                                                    <View style={styles.variantContent}>
                                                        <MonoText size="m" weight="bold">{formatVariantLabel(v.variant)}</MonoText>
                                                        <View style={styles.variantPriceRow}>
                                                            <MonoText size="s" weight="bold">₹{v.pricing.sellingPrice}</MonoText>
                                                            <MonoText size="xs" color={colors.textLight} style={styles.strikeText}>MRP ₹{v.pricing.mrp}</MonoText>
                                                        </View>
                                                        {/* Re-added Price per Unit */}
                                                        <MonoText size="xxs" color={colors.textLight} style={{ marginTop: 4 }}>
                                                            {getPricePerUnit(v.pricing, v.variant)}
                                                        </MonoText>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                )}
                            </View>

                            {/* Toggleable Details */}
                            {isLoadingProduct ? (
                                <View style={{ marginTop: 20 }}>
                                    <SkeletonItem width={150} height={18} borderRadius={4} style={{ marginBottom: 12 }} />
                                    <SkeletonItem width="100%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                                    <SkeletonItem width="100%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                                    <SkeletonItem width="70%" height={14} borderRadius={4} />
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.detailsToggle}
                                    onPress={() => {
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                        setShowDetails(!showDetails);
                                    }}
                                >
                                    <MonoText size="m" weight="bold" color={colors.accent}>View product details</MonoText>
                                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.5"
                                        style={{ transform: [{ rotate: showDetails ? '180deg' : '0deg' }] }}>
                                        <Path d="M6 9l6 6 6-6" />
                                    </Svg>
                                </TouchableOpacity>
                            )}

                            {showDetails && (
                                <View style={styles.detailsExpanded}>
                                    {currentProduct.description && (
                                        <View style={styles.detailBlock}>
                                            <MonoText size="s" weight="bold" style={styles.detailLabel}>Description</MonoText>
                                            <MonoText size="s" color={colors.textLight} style={styles.detailValue}>{currentProduct.description}</MonoText>
                                        </View>
                                    )}
                                    {currentProduct.attributes?.map(attr => (
                                        <View key={attr.key} style={styles.detailBlock}>
                                            <MonoText size="s" weight="bold" style={styles.detailLabel}>{attr.key}</MonoText>
                                            <MonoText size="s" color={colors.textLight} style={styles.detailValue}>{String(attr.value)}</MonoText>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Related Sections */}
                            {(loadingRelated || relatedProducts.length > 0) && (
                                <View style={styles.suggestSection}>
                                    <MonoText size="l" weight="bold" style={styles.suggestTitle}>Top products in this category</MonoText>
                                    {loadingRelated ? (
                                        <FlatList
                                            horizontal
                                            data={[1, 2, 3, 4]}
                                            keyExtractor={(i) => `cat-skeleton-${i}`}
                                            showsHorizontalScrollIndicator={false}
                                            renderItem={() => <ProductSkeleton width={width * 0.4} />}
                                            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                                        />
                                    ) : (
                                        <FlatList
                                            horizontal
                                            data={relatedProducts}
                                            keyExtractor={(item) => `${item._id}_${item.inventoryId}`}
                                            showsHorizontalScrollIndicator={false}
                                            renderItem={({ item }) => {
                                                // Products now have embedded variant data from API
                                                const variantData = {
                                                    _id: item.inventoryId,
                                                    inventoryId: item.inventoryId,
                                                    variant: item.variant,
                                                    pricing: item.pricing,
                                                    stock: item.stock,
                                                    isAvailable: item.isAvailable
                                                };
                                                const cartItemId = item.inventoryId || item._id;

                                                return (
                                                    <ProductGridCard
                                                        product={item}
                                                        variant={variantData}
                                                        quantity={getItemQuantity(cartItemId)}
                                                        width={width * 0.4}
                                                        onAddToCart={(prod, variant) => {
                                                            const cid = variant?.inventoryId || variant?._id || prod._id;
                                                            const productImage = variant?.variant?.images?.[0] || prod.images?.[0] || prod.image;
                                                            const success = addToCart({
                                                                ...prod,
                                                                _id: cid,
                                                                image: productImage || '',
                                                                price: variant?.pricing?.mrp || 0,
                                                                discountPrice: variant?.pricing?.sellingPrice || 0,
                                                                stock: variant?.stock || 0,
                                                                quantity: variant?.variant ? {
                                                                    value: variant.variant.weightValue,
                                                                    unit: variant.variant.weightUnit
                                                                } : undefined,
                                                                formattedQuantity: variant?.variant ? `${variant.variant.weightValue} ${variant.variant.weightUnit}` : undefined
                                                            } as any);
                                                            if (!success) {
                                                                const currentQuantity = getItemQuantity(cid);
                                                                if (currentQuantity >= (variant?.stock || 0)) {
                                                                    showToast('Maximum stock limit reached!');
                                                                } else {
                                                                    showToast('Product is out of stock!');
                                                                }
                                                            }
                                                        }}
                                                        onRemoveFromCart={removeFromCart}
                                                        onPress={(prod, vid) => {
                                                            setCurrentProduct(prod);
                                                            setActiveSlide(0);
                                                        }}
                                                    />
                                                );
                                            }}
                                            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                                            onEndReached={loadMoreRelated}
                                            onEndReachedThreshold={0.5}
                                            ListFooterComponent={() => isLoadingMoreRelated ? (
                                                <View style={{ flexDirection: 'row', paddingLeft: 12 }}>
                                                    <ProductSkeleton width={width * 0.4} />
                                                </View>
                                            ) : null}
                                        />
                                    )}
                                    {/* See All Button */}
                                    {!loadingRelated && relatedProducts.length > 0 && (
                                        <TouchableOpacity
                                            style={styles.seeAllBtn}
                                            onPress={() => {
                                                onClose();
                                                navigation.navigate('BrowseProducts', {
                                                    type: 'category',
                                                    value: (currentProduct.category as any)?.name || currentProduct.category || 'Products',
                                                    categoryId: (currentProduct.category as any)?._id || currentProduct.category
                                                });
                                            }}
                                        >
                                            <MonoText size="s" weight="bold" color={colors.primary} style={{ textDecorationLine: 'underline' }}>
                                                See all products in this category
                                            </MonoText>
                                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2.5" style={{ marginLeft: 4 }}>
                                                <Path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                                            </Svg>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            {(loadingRelated || brandProducts.length > 0) && (
                                <View style={styles.suggestSection}>
                                    <MonoText size="l" weight="bold" style={styles.suggestTitle}>More from {currentProduct.brand || 'Category'}</MonoText>
                                    {loadingRelated ? (
                                        <FlatList
                                            horizontal
                                            data={[1, 2, 3, 4]}
                                            keyExtractor={(i) => `brand-skeleton-${i}`}
                                            showsHorizontalScrollIndicator={false}
                                            renderItem={() => <ProductSkeleton width={width * 0.4} />}
                                            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                                        />
                                    ) : (
                                        <FlatList
                                            horizontal
                                            data={brandProducts}
                                            keyExtractor={(item) => `${item._id}_${item.inventoryId}`}
                                            showsHorizontalScrollIndicator={false}
                                            renderItem={({ item }) => {
                                                // Products now have embedded variant data from API
                                                const variantData = {
                                                    _id: item.inventoryId,
                                                    inventoryId: item.inventoryId,
                                                    variant: item.variant,
                                                    pricing: item.pricing,
                                                    stock: item.stock,
                                                    isAvailable: item.isAvailable
                                                };
                                                const cartItemId = item.inventoryId || item._id;

                                                return (
                                                    <ProductGridCard
                                                        product={item}
                                                        variant={variantData}
                                                        quantity={getItemQuantity(cartItemId)}
                                                        width={width * 0.4}
                                                        onAddToCart={(prod, variant) => {
                                                            const cid = variant?.inventoryId || variant?._id || prod._id;
                                                            const productImage = variant?.variant?.images?.[0] || prod.images?.[0] || prod.image;
                                                            const success = addToCart({
                                                                ...prod,
                                                                _id: cid,
                                                                image: productImage || '',
                                                                price: variant?.pricing?.mrp || 0,
                                                                discountPrice: variant?.pricing?.sellingPrice || 0,
                                                                stock: variant?.stock || 0,
                                                                quantity: variant?.variant ? {
                                                                    value: variant.variant.weightValue,
                                                                    unit: variant.variant.weightUnit
                                                                } : undefined,
                                                                formattedQuantity: variant?.variant ? `${variant.variant.weightValue} ${variant.variant.weightUnit}` : undefined
                                                            } as any);
                                                            if (!success) {
                                                                const currentQuantity = getItemQuantity(cid);
                                                                if (currentQuantity >= (variant?.stock || 0)) {
                                                                    showToast('Maximum stock limit reached!');
                                                                } else {
                                                                    showToast('Product is out of stock!');
                                                                }
                                                            }
                                                        }}
                                                        onRemoveFromCart={removeFromCart}
                                                        onPress={(prod, vid) => {
                                                            setCurrentProduct(prod);
                                                            setActiveSlide(0);
                                                        }}
                                                    />
                                                );
                                            }}
                                            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                                            onEndReached={loadMoreBrand}
                                            onEndReachedThreshold={0.5}
                                            ListFooterComponent={() => isLoadingMoreBrand ? (
                                                <View style={{ flexDirection: 'row', paddingLeft: 12 }}>
                                                    <ProductSkeleton width={width * 0.4} />
                                                </View>
                                            ) : null}
                                        />
                                    )}
                                    {/* See All Button */}
                                    {!loadingRelated && brandProducts.length > 0 && currentProduct.brand && (
                                        <TouchableOpacity
                                            style={styles.seeAllBtn}
                                            onPress={() => {
                                                onClose();
                                                navigation.navigate('BrowseProducts', {
                                                    type: 'brand',
                                                    value: currentProduct.brand
                                                });
                                            }}
                                        >
                                            <MonoText size="s" weight="bold" color={colors.primary} style={{ textDecorationLine: 'underline' }}>
                                                See all from {currentProduct.brand}
                                            </MonoText>
                                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2.5" style={{ marginLeft: 4 }}>
                                                <Path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                                            </Svg>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            {/* Reviews Section Restored */}
                            <View style={styles.reviewsSection}>
                                <View style={styles.reviewsHeader}>
                                    <MonoText size="l" weight="bold">Product Reviews</MonoText>
                                    <TouchableOpacity>
                                        <MonoText size="s" color={colors.primary} weight="bold">Write Review</MonoText>
                                    </TouchableOpacity>
                                </View>

                                {ratingDistribution && (
                                    <View style={styles.ratingOverview}>
                                        <View style={{ marginRight: 24, alignItems: 'center' }}>
                                            <MonoText size="xxxl" weight="bold">{currentProduct.rating?.average || 4.2}</MonoText>
                                            <View style={{ flexDirection: 'row', gap: 2, marginTop: 4 }}>
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <Svg key={i} width="12" height="12" viewBox="0 0 24 24"
                                                        fill={i <= Math.round(currentProduct.rating?.average || 4) ? "#FBBF24" : colors.border}>
                                                        <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
                                                    </Svg>
                                                ))}
                                            </View>
                                            <MonoText size="xs" color={colors.textLight} style={{ marginTop: 4 }}>Based on {currentProduct.rating?.count || 120} ratings</MonoText>
                                        </View>

                                        <View style={{ flex: 1 }}>
                                            {[5, 4, 3, 2, 1].map(rating => {
                                                const count = (ratingDistribution as any)[rating] || 0;
                                                const total = (currentProduct.rating?.count || 1);
                                                const percent = (count / total) * 100;
                                                return (
                                                    <View key={rating} style={styles.ratingBar}>
                                                        <MonoText size="xs" weight="bold" style={{ width: 12 }}>{rating}</MonoText>
                                                        <View style={styles.ratingBarTrack}>
                                                            <View style={[styles.ratingBarFill, { width: `${percent}%` }]} />
                                                        </View>
                                                        <MonoText size="xs" color={colors.textLight} style={{ width: 30, textAlign: 'right' }}>{count}</MonoText>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}

                                {/* Sort & Filter */}
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
                                    <TouchableOpacity
                                        style={[styles.filterChip, !filterRating && styles.filterChipActive]}
                                        onPress={() => setFilterRating(null)}
                                    >
                                        <MonoText size="xs" color={!filterRating ? colors.white : colors.text} weight="bold">All</MonoText>
                                    </TouchableOpacity>
                                    {[5, 4, 3, 2, 1].map(r => (
                                        <TouchableOpacity
                                            key={r}
                                            style={[styles.filterChip, filterRating === r && styles.filterChipActive]}
                                            onPress={() => setFilterRating(r)}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <MonoText size="xs" color={filterRating === r ? colors.white : colors.text} weight="bold">{r}</MonoText>
                                                <Svg width="10" height="10" viewBox="0 0 24 24" fill={filterRating === r ? colors.white : "#FBBF24"}>
                                                    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
                                                </Svg>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <View style={styles.reviewsList}>
                                    {loadingReviews && reviews.length === 0 ? (
                                        [1, 2, 3].map(i => (
                                            <View key={i} style={styles.reviewSkeletonItem}>
                                                <View style={styles.reviewHeader}>
                                                    <SkeletonItem width={40} height={40} borderRadius={20} />
                                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                                        <SkeletonItem width="40%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                                                        <SkeletonItem width="20%" height={10} borderRadius={4} />
                                                    </View>
                                                    <SkeletonItem width={30} height={16} borderRadius={8} />
                                                </View>
                                                <SkeletonItem width="100%" height={14} borderRadius={4} style={{ marginTop: 16 }} />
                                                <SkeletonItem width="80%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
                                            </View>
                                        ))
                                    ) : reviews.map((review) => {
                                        const isHelpful = review.helpfulUsers?.includes(currentUserId || '');
                                        return (
                                            <View key={review._id} style={styles.reviewItem}>
                                                <View style={styles.reviewHeader}>
                                                    <View style={styles.reviewerInfo}>
                                                        <View style={styles.reviewerAvatar}>
                                                            <MonoText size="s" weight="bold" color={colors.white}>
                                                                {review.customer.name.charAt(0).toUpperCase()}
                                                            </MonoText>
                                                        </View>
                                                        <View>
                                                            <MonoText size="s" weight="bold">{review.customer.name}</MonoText>
                                                            <MonoText size="xxs" color={colors.textLight}>{new Date(review.createdAt).toLocaleDateString()}</MonoText>
                                                        </View>
                                                    </View>
                                                    <View style={styles.reviewRating}>
                                                        <MonoText size="xs" weight="bold" color="#F59E0B">{review.rating}</MonoText>
                                                        <Svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" style={{ marginLeft: 2 }}>
                                                            <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
                                                        </Svg>
                                                    </View>
                                                </View>
                                                {review.comment && (
                                                    <MonoText size="s" color={colors.text} style={{ marginTop: 12, lineHeight: 20 }}>
                                                        {review.comment}
                                                    </MonoText>
                                                )}
                                                <TouchableOpacity
                                                    style={styles.helpfulBtn}
                                                    onPress={() => handleMarkHelpful(review._id)}
                                                    disabled={!currentUserId || (typeof review.customer === 'string' ? review.customer : review.customer?._id) === currentUserId}
                                                >
                                                    <Svg width="16" height="16" viewBox="0 0 24 24" fill={isHelpful ? colors.accent : "none"} stroke={isHelpful ? colors.accent : colors.textLight} strokeWidth="2">
                                                        <Path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                                                    </Svg>
                                                    <MonoText size="xs" weight="bold" color={isHelpful ? colors.accent : colors.textLight} style={{ marginLeft: 6 }}>
                                                        {review.helpfulCount > 0 ? `${review.helpfulCount} helpful` : 'Helpful'}
                                                    </MonoText>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}

                                    {hasMoreReviews && (
                                        <TouchableOpacity style={styles.showMoreBtn} onPress={loadMoreReviews} disabled={loadingReviews}>
                                            <MonoText size="s" weight="bold" color={colors.accent}>
                                                {loadingReviews ? 'Loading...' : 'Show more reviews'}
                                            </MonoText>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Integrated Floating Cart */}
                    <FloatingCarts
                        showWithTabBar={false}
                        offsetBottom={110}
                        onPress={() => {
                            onClose();
                            navigation.navigate('Checkout', { showAddressModal: true });
                        }}
                    />

                    {/* Bottom Bar - Price & Add Button */}
                    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                        <View style={styles.priceColumn}>
                            {currentVariant?.pricing && (
                                <>
                                    <View style={styles.bottomPriceRow}>
                                        <MonoText size="l" weight="bold">
                                            ₹{currentVariant.pricing.sellingPrice}
                                        </MonoText>
                                        <MonoText size="s" color={colors.textLight} style={styles.bottomStrikePrice}>
                                            MRP ₹{currentVariant.pricing.mrp}
                                        </MonoText>
                                        <View style={styles.bottomDiscountBadge}>
                                            <MonoText size="xxs" weight="bold" color={colors.primary}>
                                                {getDiscountPercent(currentVariant.pricing)}% OFF
                                            </MonoText>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                        <MonoText size="xxs" color={colors.textLight}>Inclusive of all taxes</MonoText>
                                        <MonoText size="xxs" color={colors.textLight}>•</MonoText>
                                        <MonoText size="xxs" color={colors.textLight} weight="medium">{getPricePerUnit(currentVariant.pricing, currentVariant.variant)}</MonoText>
                                    </View>
                                </>
                            )}
                        </View>

                        {(quantity === 0 || !currentVariant?.isAvailable || currentVariant?.stock <= 0) ? (
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    styles.addButton,
                                    (!currentVariant?.isAvailable || currentVariant?.stock <= 0) && styles.addButtonDisabled
                                ]}
                                onPress={handleAddToCart}
                                disabled={!currentVariant?.isAvailable || currentVariant?.stock <= 0}
                            >
                                <MonoText size="m" weight="bold" color={colors.white}>
                                    {(!currentVariant?.isAvailable || currentVariant?.stock <= 0) ? 'Out of Stock' : 'Add to cart'}
                                </MonoText>
                            </TouchableOpacity>
                        ) : (
                            <View style={[styles.actionButton, styles.quantityControl]}>
                                <TouchableOpacity style={styles.qtyButton} onPress={handleRemoveFromCart}>
                                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="3">
                                        <Line x1="5" y1="12" x2="19" y2="12" />
                                    </Svg>
                                </TouchableOpacity>
                                <MonoText size="m" weight="bold" color={colors.white} style={styles.qtyText}>
                                    {quantity}
                                </MonoText>
                                <TouchableOpacity style={styles.qtyButton} onPress={handleAddToCart}>
                                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="3">
                                        <Line x1="12" y1="5" x2="12" y2="19" />
                                        <Line x1="5" y1="12" x2="19" y2="12" />
                                    </Svg>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </View>
            {/* Toast rendered inside modal to appear above modal layer */}
            <SuccessToast />
        </Modal >
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    soldOutButton: {
        backgroundColor: colors.border,
        borderColor: colors.border,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    headerOverlay: {
        position: 'absolute',
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    headerRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white, 
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
                backgroundColor: colors.white // Solid background required for shadow efficiency
            },
            android: {
                elevation: 3,
            },
        }),
    },
    sliderContainer: {
        width: width,
        height: 380,
    },
    slide: {
        width: width,
        height: 380,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    pagination: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 20,
        right: 20,
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    activeDot: {
        backgroundColor: colors.white,
        width: 18,
    },
    bodyContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    timeBadgeOverlay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.accent}10`,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    ratingRowMain: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 4,
    },
    productName: {
        fontSize: 22,
        lineHeight: 28,
        color: colors.black,
    },
    variantContainer: {
        marginTop: 24,
    },
    variantTitle: {
        marginBottom: 12,
    },
    variantScroll: {
        paddingRight: 20,
    },
    newVariantCard: {
        width: 140,
        height: 90,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        marginRight: 12,
        padding: 12,
        justifyContent: 'center',
        backgroundColor: colors.white,
        position: 'relative',
        // overflow: 'hidden', // Removed to allow shadow to be visible. Badge radius handles clipping.
    },
    newVariantCardSelected: {
        borderColor: colors.accent,
        backgroundColor: `${colors.accent}10`,
    },
    discountBadge: {
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderBottomRightRadius: 8,
        borderTopLeftRadius: 16, // Match card radius since overflow is removed
    },
    variantContent: {
        marginTop: 4,
    },
    variantPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    strikeText: {
        textDecorationLine: 'line-through',
        fontSize: 10,
    },
    detailsToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        marginTop: 20,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#F3F4F6',
    },
    detailsExpanded: {
        paddingVertical: 16,
        gap: 16,
    },
    detailBlock: {
        gap: 4,
    },
    detailLabel: {
        color: colors.black,
    },
    detailValue: {
        lineHeight: 20,
    },
    suggestSection: {
        marginTop: 32,
    },
    suggestTitle: {
        marginBottom: 16,
    },
    // Removed floatingCartWrapper as FloatingCarts manages its own absolute position
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        zIndex: 110,
    },
    priceColumn: {
        flex: 1,
    },
    bottomPriceRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    bottomStrikePrice: {
        textDecorationLine: 'line-through',
        marginBottom: 2,
    },
    bottomDiscountBadge: {
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 2,
    },
    actionButton: {
        height: 52,
        width: 160,
        borderRadius: 14,
        overflow: 'hidden',
    },
    addButton: {
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonDisabled: {
        backgroundColor: colors.border,
    },
    quantityControl: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent,
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    qtyButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyText: {
        fontSize: 18,
    },
    // Keep Review styles if needed in future, but cleanup unused ones for now
    reviewsSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    reviewsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    ratingOverview: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingDistribution: {
        marginBottom: 16,
    },
    ratingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    ratingBarTrack: {
        flex: 1,
        height: 6,
        backgroundColor: '#F3F4F6',
        borderRadius: 3,
        marginHorizontal: 8,
        overflow: 'hidden',
    },
    ratingBarFill: {
        height: '100%',
        backgroundColor: '#FBBF24',
        borderRadius: 3,
    },
    reviewsList: {
        marginTop: 8,
    },
    reviewItem: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    reviewSkeletonItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    reviewerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reviewerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    reviewRating: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    miniRatingBadge: {
        backgroundColor: colors.accent,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginTop: 4,
    },
    filterScroll: {
        marginTop: 12,
        marginBottom: 16,
    },
    filterContent: {
        paddingRight: 20,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: colors.accent,
    },
    sortTabs: {
        flexDirection: 'row',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    helpfulBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },
    showMoreBtn: {
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: colors.accent,
        marginTop: 8,
        marginBottom: 24,
    },
    seeAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        paddingVertical: 8,
    },
});

export default ProductDetailsModal;
