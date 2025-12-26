import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, LayoutAnimation, Platform, UIManager } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, Polyline, Line } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { useNavigation } from '@react-navigation/native';
import { logger } from '../../utils/logger';

const { width } = Dimensions.get('window');

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

export const SubscriptionPromoBanner = () => {
    const navigation = useNavigation<any>();
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = () => {
        try {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        } catch (e) {
            logger.log('LayoutAnimation error', e);
        }
        setExpanded(prev => !prev);
    };

    const features = [
        {
            icon: (
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                    <Path d="M16 2v4M8 2v4M3 10h18" />
                </Svg>
            ),
            title: "Schedule Delivery",
            desc: "Personalized calendar"
        },
        {
            icon: (
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <Circle cx="12" cy="12" r="10" />
                    <Polyline points="12 6 12 12 16 14" />
                </Svg>
            ),
            title: "Easy Reschedule",
            desc: "Flexible planning"
        },
        {
            icon: (
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </Svg>
            ),
            title: "Health Updates",
            desc: "Daily cow monitoring"
        },
        {
            icon: (
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M23 7l-7 5 7 5V7z" />
                    <Path d="M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
                </Svg>
            ),
            title: "Live Farm View",
            desc: "Watch milking live"
        }
    ];

    const steps = [
        "1. Select your favorite products",
        "2. Choose 'Subscribe' option",
        "3. Set frequency & start date",
        "4. Enjoy fresh deliveries!"
    ];

    return (
        <LinearGradient
            colors={[colors.primary, colors.primary, '#FAFAFA']}
            locations={[0, 0.8, 1]}
            style={styles.container}
        >
            {/* Content properly padded for Header */}
            <View style={styles.content}>
                <MonoText size="xxl" weight="bold" style={{ marginBottom: 4 }}>
                    Subscribe & Relax
                </MonoText>
                <MonoText size="m" style={{ marginBottom: 20, opacity: 0.8 }}>
                    Get fresh essentials delivered to your doorstep.
                </MonoText>

                {/* Features Grid */}
                <View style={styles.grid}>
                    {features.map((f, i) => (
                        <View key={i} style={styles.featureItem}>
                            <View style={styles.iconCircle}>
                                {f.icon}
                            </View>
                            <MonoText size="xs" weight="bold" style={{ marginTop: 8, textAlign: 'center' }}>{f.title}</MonoText>
                            <MonoText size="xxs" style={{ textAlign: 'center', opacity: 0.7 }}>{f.desc}</MonoText>
                        </View>
                    ))}
                </View>

                {/* How to Subscribe (Collapsible) */}
                <TouchableOpacity onPress={toggleExpand} activeOpacity={0.9} style={styles.expandBtn}>
                    <View style={styles.expandHeader}>
                        <View style={styles.expandIconContainer}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2.5">
                                <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <Polyline points="22 4 12 14.01 9 11.01" />
                            </Svg>
                        </View>
                        <MonoText weight="bold" size="m">How to Subscribe?</MonoText>
                    </View>
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                        <Path d={expanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
                    </Svg>
                </TouchableOpacity>

                {expanded && (
                    <View style={styles.stepsContainer}>
                        <View style={styles.stepRow}>
                            <MonoText size="s" style={styles.stepText}>1. Select products & tap </MonoText>
                            <View style={styles.inlineIcon}>
                                <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2.5">
                                    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <Polyline points="17 8 12 3 7 8" />
                                    <Line x1="12" y1="3" x2="12" y2="15" />
                                </Svg>
                            </View>
                            <MonoText size="s" weight="bold" style={styles.stepText}> "Subscribe"</MonoText>
                        </View>
                        <MonoText size="s" style={styles.stepText}>2. Set frequency (Daily, Alternate Days, etc.)</MonoText>
                        <MonoText size="s" style={styles.stepText}>3. Pick start date (Deliveries start next morning)</MonoText>
                        <MonoText size="s" style={styles.stepText}>4. Relax! We handle the rest.</MonoText>
                    </View>
                )}
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: spacing.l,
        paddingTop: 140, // Match Header Height logic
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    content: {
        zIndex: 10,
        paddingHorizontal: spacing.l,
        paddingBottom: spacing.l,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 24,
    },
    featureItem: {
        width: (width - spacing.l * 2 - 12) / 2,
        backgroundColor: 'rgba(255,255,255,0.4)',
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 2,
    },
    expandBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.6)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.white,
    },
    expandHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    expandIconContainer: {
        backgroundColor: colors.white,
        padding: 6,
        borderRadius: 8,
    },
    stepsContainer: {
        backgroundColor: 'rgba(255,255,255,0.5)',
        padding: 20,
        borderRadius: 16,
        marginTop: 4,
        borderWidth: 1,
        borderColor: colors.white,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    stepText: {
        marginBottom: 8,
        lineHeight: 20,
    },
    inlineIcon: {
        backgroundColor: colors.black,
        borderRadius: 6,
        padding: 4,
        marginHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
