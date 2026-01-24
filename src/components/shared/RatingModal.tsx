import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import Svg, { Path, Line } from 'react-native-svg';
import { reviewService } from '../../services/customer/review.service';
import { logger } from '../../utils/logger';

interface RatingModalProps {
    visible: boolean;
    onClose: () => void;
    productId: string;
    productName: string;
    productImage?: string;
    orderId?: string;
    onSuccess?: () => void;
    initialRating?: number;
    initialTitle?: string;
    initialComment?: string;
    readOnly?: boolean;
}

export const RatingModal: React.FC<RatingModalProps> = ({
    visible,
    onClose,
    productId,
    productName,
    productImage,
    orderId,
    onSuccess,
    initialRating = 0,
    initialTitle = '',
    initialComment = '',
    readOnly = false
}) => {
    const insets = useSafeAreaInsets();
    const [rating, setRating] = useState(initialRating);
    const [title, setTitle] = useState(initialTitle);
    const [comment, setComment] = useState(initialComment);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Update state when modal becomes visible or props change
    React.useEffect(() => {
        if (visible) {
            setRating(initialRating);
            setTitle(initialTitle);
            setComment(initialComment);
            setError(null);
        }
    }, [visible, initialRating, initialTitle, initialComment]);

    const handleSubmit = async () => {
        if (readOnly) return;
        if (rating === 0) {
            setError('Please select a rating');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await reviewService.createReview({
                productId,
                rating,
                title: title.trim() || undefined,
                comment: comment.trim() || undefined,
                orderId
            });

            // Reset form
            setRating(0);
            setTitle('');
            setComment('');

            onSuccess?.();
            onClose();
        } catch (err: any) {
            logger.error('Failed to submit review:', err);
            setError(err.response?.data?.error || 'Failed to submit review. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStar = (index: number) => {
        const isFilled = index <= rating;
        return (
            <TouchableOpacity
                key={index}
                onPress={() => setRating(index)}
                style={styles.starButton}
                disabled={isSubmitting || readOnly}
            >
                <Svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill={isFilled ? '#FBBF24' : 'none'}
                    stroke={isFilled ? '#FBBF24' : colors.border}
                    strokeWidth="1.5"
                >
                    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </Svg>
            </TouchableOpacity>
        );
    };

    const getRatingLabel = () => {
        switch (rating) {
            case 1: return 'Very Poor';
            case 2: return 'Poor';
            case 3: return 'Average';
            case 4: return 'Good';
            case 5: return 'Excellent';
            default: return 'Tap to rate';
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.pill} />
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Svg width="22" height="22" viewBox="0 0 24 24" stroke={colors.black} strokeWidth="2.5">
                                <Line x1="18" y1="6" x2="6" y2="18" />
                                <Line x1="6" y1="6" x2="18" y2="18" />
                            </Svg>
                        </TouchableOpacity>
                    </View>

                    {/* Product Info */}
                    <View style={styles.productInfo}>
                        {productImage && (
                            <Image
                                source={{ uri: productImage }}
                                style={styles.productImage}
                                resizeMode="contain"
                            />
                        )}
                        <MonoText size="m" weight="bold" style={styles.productName} numberOfLines={2}>
                            {productName}
                        </MonoText>
                    </View>

                    {/* Title */}
                    <MonoText size="l" weight="bold" style={styles.title}>
                        How was the product?
                    </MonoText>

                    {/* Star Rating */}
                    <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map(renderStar)}
                    </View>
                    <MonoText
                        size="s"
                        color={rating > 0 ? colors.primary : colors.textLight}
                        style={styles.ratingLabel}
                    >
                        {getRatingLabel()}
                    </MonoText>

                    {/* Review Title (Optional) */}
                    <TextInput
                        style={styles.titleInput}
                        placeholder="Review title (optional)"
                        placeholderTextColor={colors.textLight}
                        value={title}
                        onChangeText={setTitle}
                        maxLength={100}
                        editable={!isSubmitting && !readOnly}
                    />

                    {/* Comment (Optional) */}
                    <TextInput
                        style={styles.commentInput}
                        placeholder="Share your experience (optional)"
                        placeholderTextColor={colors.textLight}
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        numberOfLines={4}
                        maxLength={500}
                        textAlignVertical="top"
                        editable={!isSubmitting && !readOnly}
                    />

                    {/* Error */}
                    {error && (
                        <MonoText size="xs" color="#DC2626" style={styles.error}>
                            {error}
                        </MonoText>
                    )}

                    {/* Submit Button */}
                    {!readOnly && (
                        <TouchableOpacity
                            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <MonoText size="m" weight="bold" color={colors.white}>
                                    Submit Review
                                </MonoText>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 12,
        position: 'relative',
    },
    pill: {
        width: 40,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
    },
    closeButton: {
        position: 'absolute',
        right: 0,
        top: 8,
        padding: 8,
        backgroundColor: colors.background,
        borderRadius: 20,
    },
    productInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    productImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: colors.background,
        marginRight: 12,
    },
    productName: {
        flex: 1,
    },
    title: {
        textAlign: 'center',
        marginBottom: 16,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 8,
    },
    starButton: {
        padding: 4,
    },
    ratingLabel: {
        textAlign: 'center',
        marginBottom: 20,
    },
    titleInput: {
        backgroundColor: colors.background,
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        marginBottom: 12,
    },
    commentInput: {
        backgroundColor: colors.background,
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        minHeight: 100,
        marginBottom: 12,
    },
    error: {
        textAlign: 'center',
        marginBottom: 12,
    },
    submitButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
});

export default RatingModal;
