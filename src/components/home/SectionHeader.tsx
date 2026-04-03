import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MonoText } from '../shared/MonoText';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import Svg, { Path } from 'react-native-svg'; interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    onSeeAll?: () => void;
}

export const SectionHeader = ({ title, subtitle, onSeeAll }: SectionHeaderProps) => {
    return (
        <View style={styles.container}>
            <View style={styles.textContainer}>
                <MonoText size="xl" weight="bold" style={styles.title}>
                    {title}
                </MonoText>
                {subtitle ? (
                    <MonoText size="s" color={colors.textLight} style={styles.subtitle}>
                        {subtitle}
                    </MonoText>
                ) : null}
            </View>
            {onSeeAll ? (
                <TouchableOpacity onPress={onSeeAll} style={styles.seeAllBtn} activeOpacity={0.7}>
                    <MonoText size="m" weight="bold" color={colors.primary}>
                        See All
                    </MonoText>
                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2 }}>
                        <Path d="M9 18l6-6-6-6" />
                    </Svg>
                </TouchableOpacity>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.m,
        marginTop: spacing.l,
        marginBottom: spacing.m,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: '#111827',
        letterSpacing: -0.5,
    },
    subtitle: {
        marginTop: 2,
    },
    seeAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingLeft: 8,
    },
});
