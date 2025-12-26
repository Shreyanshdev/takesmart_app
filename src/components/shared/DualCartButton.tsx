import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { MonoText } from '../shared/MonoText';

interface DualCartButtonProps {
    normalCount: number;
    subCount: number;
}

export const DualCartButton = ({ normalCount, subCount }: DualCartButtonProps) => {
    if (normalCount === 0 && subCount === 0) return null;

    return (
        <View style={styles.container}>
            {/* Implementation Pending - Will be added to Sticky Footer or Floating Action Button later */}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {}
})
