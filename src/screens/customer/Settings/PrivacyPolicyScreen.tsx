import React from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    StatusBar,
    Platform,
    TouchableOpacity,
    Linking,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { MonoText } from '../../../components/shared/MonoText';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

export const PrivacyPolicyScreen = () => {
    const navigation = useNavigation();

    const handleContactPress = () => {
        Linking.openURL('mailto:contact@lushandpures.com');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2">
                        <Path d="M19 12H5" />
                        <Path d="M12 19l-7-7 7-7" />
                    </Svg>
                </TouchableOpacity>
                <MonoText size="l" weight="bold">Privacy Policy</MonoText>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Banner */}
                <View style={styles.banner}>
                    <View style={styles.bannerIcon}>
                        <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                            <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </Svg>
                    </View>
                    <MonoText size="m" weight="bold" style={{ marginTop: spacing.s }}>Your Privacy Matters</MonoText>
                    <MonoText size="xs" color={colors.textLight} style={{ marginTop: 4, textAlign: 'center' }}>
                        Effective Date: November 6, 2024
                    </MonoText>
                </View>

                {/* Introduction */}
                <View style={styles.section}>
                    <MonoText size="s" color={colors.textLight} style={styles.paragraph}>
                        LUSHPURE RURALFIELDS PRIVATE LIMITED ("LUSHPURE RURALFIELDS", "we", "us", or "our") respects your privacy and is committed to protecting the personal information you provide through our app. This Privacy Policy describes the types of information we collect, how we use it, and the choices you have about your information.
                    </MonoText>
                </View>

                {/* Information We Collect */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <Path d="M14 2v6h6" />
                                <Line x1="16" y1="13" x2="8" y2="13" />
                                <Line x1="16" y1="17" x2="8" y2="17" />
                            </Svg>
                        </View>
                        <MonoText size="m" weight="bold">Information We Collect</MonoText>
                    </View>

                    <MonoText size="s" weight="semiBold" style={styles.subTitle}>Personal Information</MonoText>
                    <MonoText size="s" color={colors.textLight} style={styles.paragraph}>
                        This includes information that can be used to identify you directly, such as your name, email address, phone number, billing address, and delivery address. We only collect this information when you voluntarily provide it to us, such as when you create an account, place an order, or contact us.
                    </MonoText>

                    <MonoText size="s" weight="semiBold" style={styles.subTitle}>App Usage Data</MonoText>
                    <MonoText size="s" color={colors.textLight} style={styles.paragraph}>
                        This includes information that cannot be used to identify you directly, such as your device type, operating system, app usage patterns, and crash logs. We collect this information automatically to improve our app and services.
                    </MonoText>
                </View>

                {/* Location Data */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <Circle cx="12" cy="10" r="3" />
                            </Svg>
                        </View>
                        <MonoText size="m" weight="bold">Location Services</MonoText>
                    </View>
                    <MonoText size="s" color={colors.textLight} style={styles.paragraph}>
                        We use your device's location to:
                    </MonoText>
                    <View style={styles.bulletList}>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>Determine your delivery address accurately</MonoText>
                        </View>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>Show nearby service availability</MonoText>
                        </View>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>Track delivery partner location in real-time</MonoText>
                        </View>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>Optimize delivery routes</MonoText>
                        </View>
                    </View>
                </View>

                {/* Notifications */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </Svg>
                        </View>
                        <MonoText size="m" weight="bold">Push Notifications</MonoText>
                    </View>
                    <MonoText size="s" color={colors.textLight} style={styles.paragraph}>
                        We send push notifications to keep you informed about:
                    </MonoText>
                    <View style={styles.bulletList}>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>Order confirmations and status updates</MonoText>
                        </View>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>Delivery partner arrival notifications</MonoText>
                        </View>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>Subscription delivery reminders</MonoText>
                        </View>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>Promotional offers (if opted in)</MonoText>
                        </View>
                    </View>
                </View>

                {/* How We Use Your Information */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                <Circle cx="12" cy="12" r="10" />
                                <Path d="M12 16v-4M12 8h.01" />
                            </Svg>
                        </View>
                        <MonoText size="m" weight="bold">How We Use Your Information</MonoText>
                    </View>
                    <View style={styles.bulletList}>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>To process your orders and fulfill your requests</MonoText>
                        </View>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>To send important order and delivery updates</MonoText>
                        </View>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>To personalize your app experience</MonoText>
                        </View>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>To improve the app and our services</MonoText>
                        </View>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>To analyze trends and usage statistics</MonoText>
                        </View>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>To comply with legal requirements</MonoText>
                        </View>
                    </View>
                </View>

                {/* Sharing Your Information */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                <Circle cx="18" cy="5" r="3" />
                                <Circle cx="6" cy="12" r="3" />
                                <Circle cx="18" cy="19" r="3" />
                                <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                            </Svg>
                        </View>
                        <MonoText size="m" weight="bold">Sharing Your Information</MonoText>
                    </View>
                    <MonoText size="s" color={colors.textLight} style={styles.paragraph}>
                        We will not share your personal information with any third parties except in the following circumstances:
                    </MonoText>
                    <View style={styles.bulletList}>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>With delivery partners to fulfill your orders</MonoText>
                        </View>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>With payment processors to complete transactions</MonoText>
                        </View>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>To comply with legal requirements</MonoText>
                        </View>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>In the event of a business transfer</MonoText>
                        </View>
                    </View>
                </View>

                {/* Data Security */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </Svg>
                        </View>
                        <MonoText size="m" weight="bold">Data Security</MonoText>
                    </View>
                    <MonoText size="s" color={colors.textLight} style={styles.paragraph}>
                        We take reasonable steps to protect your information from unauthorized access, disclosure, alteration, or destruction. However, no internet transmission is completely secure. We cannot guarantee the security of your information.
                    </MonoText>
                </View>

                {/* Your Choices */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                                <Path d="M9 12l2 2 4-4" />
                            </Svg>
                        </View>
                        <MonoText size="m" weight="bold">Your Choices</MonoText>
                    </View>
                    <View style={styles.bulletList}>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>You can disable location services in your device settings</MonoText>
                        </View>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>You can opt-out of push notifications</MonoText>
                        </View>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>You can access and update your information in the app</MonoText>
                        </View>
                        <View style={styles.bulletItem}>
                            <View style={styles.bullet} />
                            <MonoText size="s" color={colors.textLight}>You can request account deletion by contacting us</MonoText>
                        </View>
                    </View>
                </View>

                {/* Children's Privacy */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2">
                                <Path d="M12 9v2M12 15h.01" />
                                <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            </Svg>
                        </View>
                        <MonoText size="m" weight="bold">Children's Privacy</MonoText>
                    </View>
                    <MonoText size="s" color={colors.textLight} style={styles.paragraph}>
                        The app is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13.
                    </MonoText>
                </View>

                {/* Changes to Privacy Policy */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </Svg>
                        </View>
                        <MonoText size="m" weight="bold">Changes to This Policy</MonoText>
                    </View>
                    <MonoText size="s" color={colors.textLight} style={styles.paragraph}>
                        We may update this Privacy Policy from time to time. We will post any changes on this page. You are encouraged to review this Privacy Policy periodically to stay informed about updates.
                    </MonoText>
                </View>

                {/* Contact Us */}
                <View style={styles.contactSection}>
                    <MonoText size="m" weight="bold" style={{ marginBottom: spacing.m }}>Contact Us</MonoText>

                    {/* Phone */}
                    <TouchableOpacity
                        style={styles.contactRow}
                        onPress={() => Linking.openURL('tel:+917017877512')}
                    >
                        <View style={styles.contactIcon}>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </Svg>
                        </View>
                        <View style={{ flex: 1 }}>
                            <MonoText size="xs" color={colors.textLight}>PHONE</MonoText>
                            <MonoText size="s" weight="semiBold">+91 7017877512</MonoText>
                        </View>
                    </TouchableOpacity>

                    {/* Email */}
                    <TouchableOpacity
                        style={styles.contactRow}
                        onPress={handleContactPress}
                    >
                        <View style={styles.contactIcon}>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <Path d="M22 6l-10 7L2 6" />
                            </Svg>
                        </View>
                        <View style={{ flex: 1 }}>
                            <MonoText size="xs" color={colors.textLight}>EMAIL</MonoText>
                            <MonoText size="s" weight="semiBold">contact@lushandpures.com</MonoText>
                        </View>
                    </TouchableOpacity>

                    {/* Address */}
                    <View style={styles.contactRow}>
                        <View style={styles.contactIcon}>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <Circle cx="12" cy="10" r="3" />
                            </Svg>
                        </View>
                        <View style={{ flex: 1 }}>
                            <MonoText size="xs" color={colors.textLight}>ADDRESS</MonoText>
                            <MonoText size="s" weight="semiBold">Kasera, Mathura</MonoText>
                            <MonoText size="xs" color={colors.textLight}>UTTAR PRADESH (281202)</MonoText>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <MonoText size="m" weight="bold" color={colors.primary}>LushandPure</MonoText>
                    <MonoText size="xs" color={colors.textLight} style={{ marginTop: 4 }}>
                        Fresh & Pure Dairy Delivered
                    </MonoText>
                    <MonoText size="xs" color={colors.textLight} style={{ marginTop: spacing.s }}>
                        © 2024 LushPure RuralFields Private Limited
                    </MonoText>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
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
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + spacing.s : 50,
        paddingBottom: spacing.m,
        paddingHorizontal: spacing.m,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.m,
    },
    banner: {
        backgroundColor: `${colors.primary}10`,
        borderRadius: 16,
        padding: spacing.l,
        alignItems: 'center',
        marginBottom: spacing.l,
    },
    bannerIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    section: {
        marginBottom: spacing.l,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    sectionIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: `${colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.s,
    },
    subTitle: {
        marginTop: spacing.m,
        marginBottom: spacing.xs,
    },
    paragraph: {
        lineHeight: 22,
    },
    bulletList: {
        marginTop: spacing.xs,
    },
    bulletItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.xs,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
        marginTop: 7,
        marginRight: spacing.s,
    },
    contactSection: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: spacing.l,
        marginTop: spacing.m,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        padding: spacing.m,
        borderRadius: 12,
        marginBottom: spacing.s,
        width: '100%',
    },
    contactIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.m,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.l,
        paddingVertical: spacing.m,
        borderRadius: 12,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        marginTop: spacing.l,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
});
