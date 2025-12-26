import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import Icon from 'react-native-vector-icons/Feather';

const FEATURES = [
    { id: '1', title: 'Calendar', subtitle: 'Manage Deliveries', icon: 'calendar', color: '#E3F2FD' },
    { id: '2', title: 'Live', subtitle: 'Milking Stream', icon: 'video', color: '#FFEBEE' },
    { id: '3', title: 'Health', subtitle: 'Cow Report', icon: 'activity', color: '#E8F5E9' },
    { id: '4', title: 'Modify', subtitle: 'Subscription', icon: 'edit', color: '#FFF3E0' },
];

export const SubscriptionWidget = () => {
    return (
        <View style={styles.container}>
            <MonoText size="l" weight="bold" style={styles.title}>Your Subscription</MonoText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {FEATURES.map((feature) => (
                    <TouchableOpacity key={feature.id} style={[styles.card, { backgroundColor: feature.color }]}>
                        <View style={styles.iconContainer}>
                            <Icon name={feature.icon} size={20} color={colors.text} />
                        </View>
                        <View>
                            <MonoText size="s" weight="bold">{feature.title}</MonoText>
                            <MonoText size="xs" color={colors.textLight}>{feature.subtitle}</MonoText>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.l,
    },
    title: {
        paddingHorizontal: spacing.m,
        marginBottom: spacing.m,
    },
    scrollContent: {
        paddingHorizontal: spacing.m,
        gap: spacing.m,
    },
    card: {
        width: 140,
        padding: spacing.m,
        borderRadius: 16,
        gap: spacing.m,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    }
});
