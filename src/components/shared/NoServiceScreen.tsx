import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from './MonoText';

const { width, height } = Dimensions.get('window');

export const NoServiceScreen = () => {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="1.5">
                        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <Circle cx="12" cy="10" r="3" />
                        <Line x1="4" y1="4" x2="20" y2="20" />
                    </Svg>
                    <View style={styles.pulseRing} />
                </View>

                <MonoText size="xl" weight="bold" style={styles.title}>
                    No Service in Your Area
                </MonoText>

                <MonoText size="m" color={colors.textLight} style={styles.subtitle}>
                    We're currently not serving this location.{'\n'}Please change your location to explore products.
                </MonoText>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minHeight: 350,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        maxWidth: 400,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.l,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    pulseRing: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 60,
        borderWidth: 2,
        borderColor: colors.textLight,
        opacity: 0.1,
        transform: [{ scale: 1.2 }],
    },
    title: {
        textAlign: 'center',
        marginBottom: spacing.m,
        color: colors.text,
    },
    subtitle: {
        textAlign: 'center',
        lineHeight: 24,
    },
});

