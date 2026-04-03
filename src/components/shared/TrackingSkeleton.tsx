import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonItem } from './SkeletonLoader';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const { width } = Dimensions.get('window');
const HEADER_CONTENT_HEIGHT = 56;

export const TrackingSkeleton = () => {
    const insets = useSafeAreaInsets();
    const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;

    return (
        <View style={styles.container}>
            {/* Header Skeleton */}
            <View style={[styles.header, { height: headerHeight, paddingTop: insets.top }]}>
                <SkeletonItem width={40} height={40} borderRadius={20} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <SkeletonItem width={120} height={20} borderRadius={4} />
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Tracking Card Skeleton (Floating at top below header) */}
            <View style={[styles.inlineTrackingCard, { top: headerHeight + 12 }]}>
                <View style={styles.cardHeader}>
                    <View>
                        <SkeletonItem width={100} height={12} borderRadius={4} style={{ marginBottom: 6 }} />
                        <SkeletonItem width={80} height={24} borderRadius={4} />
                    </View>
                    <SkeletonItem width={100} height={36} borderRadius={18} />
                </View>
            </View>

            {/* Bottom Content Skeleton */}
            <View style={[styles.bottomSheet, { marginTop: headerHeight + 110 }]}>
                {/* Tab Selector Skeleton */}
                <View style={styles.glassTabContainer}>
                    <SkeletonItem width="48%" height={40} borderRadius={10} />
                    <SkeletonItem width="48%" height={40} borderRadius={10} />
                </View>

                {/* Timeline Section */}
                <View style={styles.section}>
                    {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={styles.stepContainer}>
                            <SkeletonItem width={20} height={20} borderRadius={10} />
                            <View style={styles.stepContent}>
                                <SkeletonItem width="60%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                                {i === 1 && <SkeletonItem width="30%" height={12} borderRadius={4} />}
                            </View>
                        </View>
                    ))}
                </View>

                {/* Info Card Placeholder */}
                <View style={styles.detailsCard}>
                    <SkeletonItem width="40%" height={14} borderRadius={4} style={{ marginBottom: 16 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <SkeletonItem width={44} height={44} borderRadius={8} />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <SkeletonItem width="50%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                            <SkeletonItem width="30%" height={12} borderRadius={4} />
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        zIndex: 100,
    },
    inlineTrackingCard: {
        position: 'absolute',
        left: 16,
        right: 16,
        height: 86,
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        zIndex: 101,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bottomSheet: {
        flex: 1,
        backgroundColor: '#FAFAFA',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    glassTabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: 4,
        borderRadius: 16,
        marginBottom: 24,
        height: 48,
        alignItems: 'center',
    },
    section: {
        marginBottom: 24,
    },
    stepContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    stepContent: {
        marginLeft: 16,
        flex: 1,
    },
    detailsCard: {
        backgroundColor: colors.white,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
});
