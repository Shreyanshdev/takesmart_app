import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { MonoText } from './MonoText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import LinearGradient from 'react-native-linear-gradient';

export const BrandFooter = () => {
    return (
        <View style={styles.container}>
            <View style={styles.content}>

                {/* Brand Name */}
                <MonoText size="xxl" weight="bold" style={styles.brandText}>
                    TakeSmart
                </MonoText>

                {/* Gradient Underline */}
                <LinearGradient
                    colors={[colors.primary, '#FF8A65']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientLine}
                />

                {/* Slogan */}
                <View style={styles.sloganContainer}>
                    <View style={styles.dot} />
                    <MonoText size="l" weight="medium" style={styles.sloganText}>
                        शुद्धता देश के साथ
                    </MonoText>
                    <View style={styles.dot} />
                </View>

            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 80,
        paddingHorizontal: spacing.l,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAFA',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        display: 'none', // Removed simple divider
    },
    brandText: {
        fontSize: 42,
        color: '#1a1a1a',
        marginBottom: spacing.xs,
        letterSpacing: -1,
        textShadowColor: 'rgba(0, 0, 0, 0.05)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    gradientLine: {
        width: 60,
        height: 6,
        borderRadius: 3,
        marginTop: 4,
        marginBottom: spacing.l,
    },
    sloganContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sloganText: {
        color: '#64748B',
        fontSize: 18,
        letterSpacing: 0.5,
        backgroundColor: '#FFF1F2',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#FFE4E6',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#CBD5E1',
    },

});
