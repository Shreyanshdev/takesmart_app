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
            <View style={[styles.header, { paddingTop: 20 }]}>
                <SkeletonItem width={40} height={40} borderRadius={20} />
                <SkeletonItem width="40%" height={24} borderRadius={4} style={{ marginLeft: 16 }} />
            </View>

            {/* Collapsed Map Area Placeholder (Matches inlineTrackingCard) */}
            <View style={styles.collapsedMapPlaceholder}>
                <SkeletonItem width="100%" height={84} borderRadius={16} />
            </View>

            {/* Bottom Content Skeleton */}
            <View style={styles.bottomContent}>



                {/* Tab Selector Skeleton */}
                <View style={styles.tabSelector}>
                    <SkeletonItem width="48%" height={44} borderRadius={12} />
                    <SkeletonItem width="48%" height={44} borderRadius={12} />
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
        height: 56 + 44, // HEADER_CONTENT_HEIGHT + typical inset
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    collapsedMapPlaceholder: {
        paddingHorizontal: 16,
        marginTop: 4,
        marginBottom: 4,
    },
    bottomContent: {
        flex: 1,
        paddingHorizontal: spacing.l,
        paddingTop: 8,
        backgroundColor: colors.white,
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
        backgroundColor: 'rgba(248, 250, 252, 0.5)',
        padding: 4,
        borderRadius: 16,
        marginBottom: 24,
        height: 52,
        alignItems: 'center',
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
