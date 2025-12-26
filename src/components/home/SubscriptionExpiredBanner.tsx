import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Line, Circle, Polyline } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';

const { width } = Dimensions.get('window');

export const SubscriptionExpiredBanner = () => {
    const navigation = useNavigation<any>();

    return (
        <LinearGradient
            colors={['#EF4444', '#B91C1C', '#991B1B']} // Richer, deeper red gradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <View style={styles.content}>
                <View style={styles.alertContent}>
                    <View style={styles.iconContainer}>
                        <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2">
                            <Circle cx="12" cy="12" r="10" />
                            <Line x1="12" y1="8" x2="12" y2="12" />
                            <Line x1="12" y1="16" x2="12.01" y2="16" />
                        </Svg>
                    </View>

                    <MonoText size="xl" weight="bold" color={colors.white} style={styles.title}>
                        Subscription Expired
                    </MonoText>

                    <MonoText size="s" color={colors.white} style={styles.description}>
                        Your fresh milk delivery has stopped. Renew now to resume your daily schedule.
                    </MonoText>

                    {/* Missed Features List */}
                    <View style={styles.missedFeatures}>
                        <MonoText size="xs" weight="bold" color={colors.white} style={{ marginBottom: 8, opacity: 0.9 }}>You are missing:</MonoText>
                        <View style={styles.featureRow}>
                            <View style={styles.featureItem}>
                                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2">
                                    <Path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                </Svg>
                                <MonoText size="xs" color={colors.white} style={{ marginLeft: 6 }}>Health Updates</MonoText>
                            </View>
                            <View style={styles.featureItem}>
                                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2">
                                    <Path d="M3 3v18h18" />
                                    <Polyline points="18 15 12 9 6 15" />
                                </Svg>
                                <MonoText size="xs" color={colors.white} style={{ marginLeft: 6 }}>Daily Delivery</MonoText>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.renewBtn}
                        onPress={() => navigation.navigate('Subscription')}
                        activeOpacity={0.9}
                    >
                        <MonoText weight="bold" color="#B91C1C" size="m">Renew Subscription</MonoText>
                    </TouchableOpacity>
                </View>

                {/* Secondary Action */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => navigation.navigate('SubscriptionHistory')}
                    >
                        <View style={styles.actionIcon}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2">
                                <Path d="M12 8v4l3 3" />
                                <Circle cx="12" cy="12" r="10" />
                            </Svg>
                        </View>
                        <MonoText size="xs" weight="medium" color={colors.white}>View History</MonoText>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Gradient Fade at Bottom to remove hard border look */}
            <LinearGradient
                colors={['rgba(250, 250, 250, 0)', '#FAFAFA']}
                style={styles.gradient}
                pointerEvents="none"
            />
        </LinearGradient >
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: spacing.l,
        paddingTop: 140, // Match Header Height
        shadowColor: "#B91C1C",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
        zIndex: 1,
    },
    content: {
        paddingHorizontal: spacing.l,
        paddingBottom: spacing.l + 20, // Add padding for gradient
    },
    alertContent: {
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 12,
        borderRadius: 50,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    title: {
        marginBottom: 8,
        textAlign: 'center',
        paddingHorizontal: spacing.m, // Prevent text touching edges
    },
    description: {
        textAlign: 'center',
        opacity: 0.9,
        marginBottom: 20,
        paddingHorizontal: 30, // More padding for cleaner look
        lineHeight: 20,
    },
    missedFeatures: {
        alignItems: 'center',
        marginBottom: 24,
        backgroundColor: 'rgba(0,0,0,0.1)',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    featureRow: {
        flexDirection: 'row',
        gap: 16,
        justifyContent: 'center',
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    renewBtn: {
        backgroundColor: colors.white,
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 30, // More pill-like
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
        width: '90%',
        alignItems: 'center',
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 8,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    actionIcon: {
        marginRight: 6,
    }
});
