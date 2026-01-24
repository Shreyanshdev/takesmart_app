import React, { ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import Svg, { Path } from 'react-native-svg';
import { MonoText } from './MonoText';
import { colors } from '../../theme/colors';

// Standard header height (content area, excludes safe area)
const HEADER_CONTENT_HEIGHT = 56;

interface ScreenHeaderProps {
    title: string;
    onBack: () => void;
    rightAction?: ReactNode;
    showBlur?: boolean;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
    title,
    onBack,
    rightAction,
    showBlur = true,
}) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Glassmorphism Blur Layer */}
            {showBlur && (
                <View style={StyleSheet.absoluteFill}>
                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType="light"
                        blurAmount={20}
                        reducedTransparencyFallbackColor="white"
                    />
                </View>
            )}

            <View style={styles.content}>
                {/* Back Button */}
                <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M19 12H5" />
                        <Path d="M12 19l-7-7 7-7" />
                    </Svg>
                </TouchableOpacity>

                {/* Title */}
                <MonoText size="l" weight="bold" color={colors.text} style={styles.title} numberOfLines={1}>
                    {title}
                </MonoText>

                {/* Right Action */}
                {rightAction ? (
                    <View style={styles.rightAction}>{rightAction}</View>
                ) : (
                    <View style={styles.placeholder} />
                )}
            </View>
        </View>
    );
};

// Export standard height for use in content padding
export const SCREEN_HEADER_HEIGHT = HEADER_CONTENT_HEIGHT;

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
    },
    content: {
        height: HEADER_CONTENT_HEIGHT,
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
    title: {
        flex: 1,
        marginLeft: 12,
    },
    rightAction: {
        marginLeft: 12,
    },
    placeholder: {
        width: 40,
    },
});
