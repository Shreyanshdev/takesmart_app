import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, Platform } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { MonoText } from '../../../components/shared/MonoText';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

// Terms Section Component
const TermsSection = ({ title, content }: { title: string; content: string[] }) => (
    <View style={styles.section}>
        <MonoText size="m" weight="bold" style={styles.sectionTitle}>{title}</MonoText>
        {content.map((paragraph, index) => (
            <MonoText key={index} size="s" color={colors.textLight} style={styles.paragraph}>
                {paragraph}
            </MonoText>
        ))}
    </View>
);

export const TermsScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const termsData = [
        {
            title: '1. Acceptance of Terms',
            content: [
                'By accessing and using the TechMart application, you accept and agree to be bound by the terms and provision of this agreement.',
                'If you do not agree to abide by the above, please do not use this service.'
            ]
        },
        {
            title: '2. Use License',
            content: [
                'Permission is granted to temporarily download one copy of TechMart mobile application for personal, non-commercial transitory viewing only.',
                'This is the grant of a license, not a transfer of title, and under this license you may not: modify or copy the materials, use the materials for any commercial purpose, attempt to decompile or reverse engineer any software contained in TechMart application.'
            ]
        },
        {
            title: '3. User Account',
            content: [
                'To access certain features of the application, you may be required to create an account. You are responsible for maintaining the confidentiality of your account information.',
                'You agree to accept responsibility for all activities that occur under your account or password.'
            ]
        },
        {
            title: '4. Orders and Payments',
            content: [
                'All orders placed through TechMart are subject to acceptance and availability. We reserve the right to refuse or cancel any order for any reason.',
                'Prices for products are subject to change without notice. We shall not be liable to you or any third party for any modification, price change, suspension, or discontinuance of any product.'
            ]
        },
        {
            title: '5. Delivery Policy',
            content: [
                'We aim to deliver your order within the estimated delivery time. However, delivery times are estimates and actual delivery may vary.',
                'We are not responsible for delays caused by circumstances beyond our control, including but not limited to weather conditions, traffic, or other external factors.'
            ]
        },
        {
            title: '6. Refund and Cancellation',
            content: [
                'Orders can be cancelled before they are dispatched for delivery. Once dispatched, orders cannot be cancelled.',
                'Refunds for eligible returns will be processed within 5-7 business days to your original payment method.'
            ]
        },
        {
            title: '7. Intellectual Property',
            content: [
                'The TechMart application and its original content, features, and functionality are owned by TechMart and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.'
            ]
        },
        {
            title: '8. Limitation of Liability',
            content: [
                'In no event shall TechMart, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your access to or use of the application.'
            ]
        },
        {
            title: '9. Changes to Terms',
            content: [
                'We reserve the right to modify or replace these terms at any time. It is your responsibility to check these terms periodically for changes.',
                'Your continued use of the application following the posting of any changes constitutes acceptance of those changes.'
            ]
        },
        {
            title: '10. Contact Us',
            content: [
                'If you have any questions about these Terms and Conditions, please contact us at support@techmart.com'
            ]
        }
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M19 12H5" />
                            <Path d="M12 19l-7-7 7-7" />
                        </Svg>
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <MonoText size="l" weight="bold" color={colors.white}>Terms & Conditions</MonoText>
                    </View>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            {/* Content */}
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Intro */}
                <View style={styles.introCard}>
                    <MonoText size="s" color={colors.textLight} style={{ lineHeight: 22 }}>
                        Please read these Terms and Conditions carefully before using the TechMart application.
                        These terms govern your use of our mobile application and services.
                    </MonoText>
                    <MonoText size="xs" color={colors.textLight} style={{ marginTop: 12, fontStyle: 'italic' }}>
                        Last Updated: January 2026
                    </MonoText>
                </View>

                {/* Terms Sections */}
                {termsData.map((section, index) => (
                    <TermsSection key={index} title={section.title} content={section.content} />
                ))}

                {/* Footer */}
                <View style={styles.footer}>
                    <MonoText size="xs" color={colors.textLight} style={{ textAlign: 'center' }}>
                        By using TechMart, you acknowledge that you have read, understood, and agree to these Terms and Conditions.
                    </MonoText>
                </View>
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
        backgroundColor: colors.primary,
        paddingBottom: 20,
    },
    headerContent: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: spacing.l,
        paddingTop: spacing.l,
        paddingBottom: 40,
    },
    introCard: {
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        padding: spacing.l,
        marginBottom: spacing.l,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    section: {
        marginBottom: spacing.l,
        paddingBottom: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    sectionTitle: {
        color: colors.text,
        marginBottom: spacing.s,
    },
    paragraph: {
        lineHeight: 22,
        marginBottom: spacing.s,
    },
    footer: {
        marginTop: spacing.l,
        paddingTop: spacing.l,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
});
