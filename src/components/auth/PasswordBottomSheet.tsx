import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { BlurBottomSheet } from '../shared/BlurBottomSheet';
import { MonoText } from '../shared/MonoText';
import { PillButton } from '../shared/PillButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import Svg, { Path } from 'react-native-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface PasswordBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    onLogin: (password: string) => void;
}

export const PasswordBottomSheet: React.FC<PasswordBottomSheetProps> = ({
    visible,
    onClose,
    onLogin,
}) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    return (
        <BlurBottomSheet visible={visible} onClose={onClose}>
            <View style={styles.container}>
                <MonoText size="l" weight="bold" style={styles.title}>ENTER PASSWORD</MonoText>

                <TouchableOpacity onPress={onClose} style={styles.wrongEmailBtn}>
                    <MonoText size="xs" color={colors.primary} weight="medium">Wrong email? Go back</MonoText>
                </TouchableOpacity>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        placeholder="***********"
                        placeholderTextColor={colors.textLight}
                    />
                    <TouchableOpacity
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('impactLight');
                            setShowPassword(!showPassword);
                        }}
                        style={styles.eyeIcon}
                    >
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <Path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                        </Svg>
                    </TouchableOpacity>
                </View>

                <View style={styles.forgotContainer}>
                    <TouchableOpacity>
                        <MonoText size="s" color={colors.primary}>Forgot password?</MonoText>
                    </TouchableOpacity>
                </View>

                <PillButton
                    title="LOGIN"
                    onPress={() => onLogin(password)}
                    disabled={!password}
                    style={styles.button}
                />
            </View>
        </BlurBottomSheet>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: spacing.s,
    },
    title: {
        marginBottom: spacing.xl,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: spacing.m,
        marginBottom: spacing.m,
        height: 50,
    },
    input: {
        flex: 1,
        fontFamily: 'NotoSansMono-Regular',
        fontSize: 16,
        color: colors.text,
    },
    eyeIcon: {
        padding: spacing.xs,
    },
    forgotContainer: {
        alignItems: 'flex-end',
        marginBottom: spacing.xl,
    },
    button: {
        width: '100%',
    },
    wrongEmailBtn: {
        marginBottom: spacing.m,
    },
});
