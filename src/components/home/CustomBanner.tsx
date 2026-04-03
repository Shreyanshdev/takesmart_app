import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import FastImage from 'react-native-fast-image';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useNavigation } from '@react-navigation/native';
import { productService } from '../../services/customer/product.service';
import { ProductDetailsModal } from './ProductDetailsModal';

const { width } = Dimensions.get('window');

interface CustomBannerProps {
    imageUrl: string;
    actionType?: 'PRODUCT' | 'CATEGORY' | 'BRAND' | 'NONE' | 'SEARCH' | 'DEALS' | 'TRENDING' | 'NEW' | string;
    targetValue?: string;
}

export const CustomBanner = ({ imageUrl, actionType = 'NONE', targetValue }: CustomBannerProps) => {
    const navigation = useNavigation<any>();
    const [modalVisible, setModalVisible] = React.useState(false);
    const [selectedProduct, setSelectedProduct] = React.useState<any>(null);

    const handlePress = async () => {
        if (actionType === 'NONE' || !targetValue) return;

        try {
            switch (actionType) {
                case 'PRODUCT':
                    const product = await productService.getProductById(targetValue);
                    if (product) {
                        setSelectedProduct(product);
                        setModalVisible(true);
                    }
                    break;
                case 'CATEGORY':
                    navigation.navigate('BrowseProducts', {
                        type: 'category',
                        value: targetValue,
                        categoryId: targetValue,
                        title: targetValue // Dynamic title parsing can be added
                    });
                    break;
                case 'BRAND':
                    navigation.navigate('BrowseProducts', {
                        type: 'brand',
                        value: targetValue,
                        title: targetValue
                    });
                    break;
                case 'SEARCH':
                    navigation.navigate('BrowseProducts', {
                        type: 'search',
                        value: targetValue,
                        title: `Search: ${targetValue}`
                    });
                    break;
                case 'DEALS':
                case 'TRENDING':
                case 'NEW':
                    navigation.navigate('BrowseProducts', {
                        type: actionType.toLowerCase(),
                        value: targetValue,
                        title: targetValue || actionType
                    });
                    break;
            }
        } catch (error) {
            console.error('Banner action failed:', error);
        }
    };

    if (!imageUrl) return null;

    return (
        <View style={styles.container}>
            <TouchableOpacity
                activeOpacity={actionType !== 'NONE' ? 0.9 : 1}
                onPress={handlePress}
                style={styles.touchable}
            >
                <FastImage
                    source={{ uri: imageUrl, priority: FastImage.priority.normal }}
                    style={styles.image}
                    resizeMode={FastImage.resizeMode.cover}
                />
            </TouchableOpacity>

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
        marginHorizontal: spacing.m,
        marginTop: spacing.l,
    },
    touchable: {
        borderRadius: 12,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
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
        height: 160,
        borderRadius: 12,
    },
});
