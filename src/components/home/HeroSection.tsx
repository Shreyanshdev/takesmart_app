import React from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

const { width } = Dimensions.get('window');

export const HeroSection = () => {
    return (
        <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            style={styles.container}
        >
            <View style={styles.card}>
                {/* Background Image would go here, using a gradient placeholder for now */}
                <View style={styles.gradient}>
                    <Svg height="100%" width="100%">
                        <Defs>
                            <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                                <Stop offset="0" stopColor="#FFD700" stopOpacity="1" />
                                <Stop offset="1" stopColor="#F5C518" stopOpacity="1" />
                            </LinearGradient>
                        </Defs>
                        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad)" />
                    </Svg>
                </View>

                <View style={styles.content}>
                    <View style={styles.tagContainer}>
                        <MonoText size="xxs" weight="bold" color={colors.primary} style={styles.tagText}>
                            PURE & FRESH
                        </MonoText>
                    </View>

                    <MonoText size="xxl" weight="bold" color={colors.black} style={styles.title}>
                        Golden Goodness{'\n'}Every Morning
                    </MonoText>

                    <MonoText size="s" color={colors.black} style={styles.subtitle}>
                        100% Organic A2 Gir Cow Ghee & Milk
                    </MonoText>

                    <View style={styles.button}>
                        <MonoText size="s" weight="bold" color={colors.white}>Subscribe Now</MonoText>
                    </View>
                </View>

                {/* Decorative Element / Image */}
                <View style={styles.imageContainer}>
                    {/* <Image source={...} /> */}
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: spacing.m,
        marginVertical: spacing.l,
        height: 200,
        borderRadius: 24,
        shadowColor: colors.primary,
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    card: {
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        padding: spacing.l,
        justifyContent: 'center',
        height: '100%',
        zIndex: 2,
    },
    tagContainer: {
        backgroundColor: colors.black,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: spacing.s,
    },
    tagText: {
        color: '#FFD700',
        letterSpacing: 1,
    },
    title: {
        marginBottom: spacing.xs,
        width: '70%',
    },
    subtitle: {
        marginBottom: spacing.m,
        opacity: 0.8,
        width: '60%',
    },
    button: {
        backgroundColor: colors.black,
        paddingHorizontal: spacing.l,
        paddingVertical: 12,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    imageContainer: {
        position: 'absolute',
        right: -20,
        bottom: -20,
        width: 150,
        height: 150,
        backgroundColor: 'rgba(255,255,255,0.2)', // Placeholder
        borderRadius: 75,
    }
});
