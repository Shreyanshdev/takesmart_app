import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Line } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { MonoText } from '../../../components/shared/MonoText';
import { feedbackService } from '../../../services/customer/feedback.service';

const TOPICS = ['General', 'Product Quality', 'App Experience', 'Delivery', 'Other'];

export const FeedbackScreen = () => {
    const navigation = useNavigation();
    const [message, setMessage] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('General');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!message.trim()) {
            Alert.alert('Error', 'Please enter your feedback message');
            return;
        }

        setSubmitting(true);
        try {
            await feedbackService.submitFeedback(message, selectedTopic);
            Alert.alert('Success', 'Thank you for your feedback!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M19 12H5M12 19l-7-7 7-7" />
                    </Svg>
                </TouchableOpacity>
                <MonoText size="l" weight="bold">Share Feedback</MonoText>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <MonoText size="m" color={colors.textLight} style={{ marginBottom: spacing.l }}>
                        We value your opinion! Let us know how we can improve your experience.
                    </MonoText>

                    {/* Topic Selection */}
                    <MonoText size="s" weight="bold" style={{ marginBottom: spacing.s }}>Topic</MonoText>
                    <View style={styles.topicRow}>
                        {TOPICS.map((topic) => (
                            <TouchableOpacity
                                key={topic}
                                style={[
                                    styles.topicChip,
                                    selectedTopic === topic && styles.topicChipActive
                                ]}
                                onPress={() => setSelectedTopic(topic)}
                            >
                                <MonoText
                                    size="xs"
                                    color={selectedTopic === topic ? colors.white : colors.text}
                                    weight={selectedTopic === topic ? 'bold' : 'regular'}
                                >
                                    {topic}
                                </MonoText>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Message Input */}
                    <MonoText size="s" weight="bold" style={{ marginTop: spacing.l, marginBottom: spacing.s }}>
                        Your Feedback
                    </MonoText>
                    <TextInput
                        style={styles.input}
                        multiline
                        numberOfLines={6}
                        placeholder="Tell us what you think..."
                        placeholderTextColor="#9CA3AF"
                        value={message}
                        onChangeText={setMessage}
                        textAlignVertical="top"
                    />

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitBtn, !message.trim() && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting || !message.trim()}
                    >
                        {submitting ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <>
                                <MonoText weight="bold" color={colors.white}>Submit Feedback</MonoText>
                                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <Line x1="22" y1="2" x2="11" y2="13" />
                                    <Path d="M22 2L15 22L11 13L2 9L22 2z" />
                                </Svg>
                            </>
                        )}
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backBtn: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    content: {
        padding: spacing.l,
    },
    topicRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    topicChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    topicChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    input: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: spacing.m,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        minHeight: 150,
        fontSize: 16,
        color: colors.text,
        fontFamily: 'SpaceMono-Regular', // Consistent with MonoText
    },
    submitBtn: {
        backgroundColor: colors.black,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: spacing.xl,
    },
    submitBtnDisabled: {
        backgroundColor: '#9CA3AF',
        opacity: 0.7,
    },
});
