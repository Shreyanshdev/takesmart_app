import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { SkeletonItem } from './SkeletonLoader';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const { width, height } = Dimensions.get('window');

export const TrackingSkeleton = () => {
    return (
        <View style={styles.container}>
            {/* Header Skeleton */}
            <View style={styles.header}>
                <SkeletonItem width={40} height={40} borderRadius={20} />
                <SkeletonItem width="40%" height={20} borderRadius={4} style={{ marginLeft: 16 }} />
            </View>

            {/* Collapsed Map Area Placeholder (Matches inlineTrackingCard) */}
            <View style={styles.collapsedMapPlaceholder}>
                <SkeletonItem width="100%" height={80} borderRadius={16} />
            </View>

            {/* Bottom Content Skeleton */}
            <View style={styles.bottomContent}>

                <View style={styles.handle} />

                {/* Tab Selector Skeleton */}
                <View style={styles.tabSelector}>
                    <SkeletonItem width="48%" height={40} borderRadius={10} />
                    <SkeletonItem width="48%" height={40} borderRadius={10} />
                </View>

                {/* Summary Card Skeleton */}
                <View style={styles.summaryCard}>
                    <SkeletonItem width="60%" height={24} borderRadius={4} style={{ marginBottom: 12 }} />
                    <SkeletonItem width="40%" height={16} borderRadius={4} />
                </View>

                {/* Timeline Section */}
                <View style={styles.section}>
                    <SkeletonItem width="30%" height={20} borderRadius={4} style={{ marginBottom: 20 }} />

                    {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={styles.timelineItem}>
                            <SkeletonItem width={20} height={20} borderRadius={10} />
                            <View style={{ marginLeft: 16, flex: 1 }}>
                                <SkeletonItem width="70%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                                {i === 1 && <SkeletonItem width="40%" height={12} borderRadius={4} />}
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        height: Platform.OS === 'ios' ? 110 : 70,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    collapsedMapPlaceholder: {
        paddingHorizontal: spacing.l,
        marginTop: Platform.OS === 'ios' ? 20 : 10,
        marginBottom: 10,
    },
    bottomContent: {
        flex: 1,
        paddingHorizontal: spacing.l,
        paddingTop: 10,
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    tabSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        padding: 4,
        borderRadius: 12,
        marginBottom: 24,
    },
    summaryCard: {
        padding: 24,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    section: {
        marginTop: 8,
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
});
