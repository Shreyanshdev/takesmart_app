import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView, Animated, StatusBar, Platform, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MonoText } from '../../../components/shared/MonoText';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useAuthStore } from '../../../store/authStore';
import { api } from '../../../services/core/api';

const HEADER_CONTENT_HEIGHT = 56;

const EditProfileHeader = ({ navigation }: { navigation: any }) => {
    const insets = useSafeAreaInsets();
    const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;

    return (
        <View style={[styles.headerContainer, { height: headerHeight, paddingTop: insets.top }]}>
            <View style={StyleSheet.absoluteFill}>
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="light"
                    blurAmount={20}
                    reducedTransparencyFallbackColor="white"
                />
            </View>
            <View style={styles.headerContent}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M19 12H5" />
                        <Path d="M12 19l-7-7 7-7" />
                    </Svg>
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <MonoText size="l" weight="bold" color={colors.text}>Edit Profile</MonoText>
                </View>
                <View style={{ width: 40 }} />
            </View>
        </View>
    );
};

const CustomInput = ({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize }: any) => (
    <View style={styles.inputWrapper}>
        <View style={styles.labelContainer}>
            <MonoText size="xs" color={colors.primary} weight="medium">{label}</MonoText>
        </View>
        <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textLight}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
        />
    </View>
);

export const EditProfileScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { user, updateUser } = useAuthStore();

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [loading, setLoading] = useState(false);

    const handleUpdate = async () => {
        setLoading(true);
        try {
            await api.put('/profile', { name, email, phone });
            updateUser({ ...user, name, email, phone });
            Alert.alert("Success", "Profile updated successfully");
            navigation.goBack();
        } catch (error) {
            console.error('Update profile error:', error);
            Alert.alert("Error", "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const firstLetter = name ? name.charAt(0).toUpperCase() : (user?.name?.charAt(0).toUpperCase() || 'U');

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <EditProfileHeader navigation={navigation} />

            <ScrollView
                contentContainerStyle={[styles.content, { paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.avatarContainer}>
                    <View style={styles.imageWrapper}>
                        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                            <MonoText size="xl" weight="bold" color={colors.white}>{firstLetter}</MonoText>
                        </View>
                        <TouchableOpacity style={styles.editIconBadge}>
                            <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                <Circle cx="12" cy="12" r="1" />
                            </Svg>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.form}>
                    <CustomInput
                        label="Name"
                        value={name}
                        onChangeText={setName}
                        placeholder="Your Name"
                    />
                    <CustomInput
                        label="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        placeholder="email@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <CustomInput
                        label="Mobile Number"
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="(205) 555-0100"
                        keyboardType="phone-pad"
                    />
                </View>

                <TouchableOpacity
                    style={styles.updateBtn}
                    onPress={handleUpdate}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <MonoText weight="bold" color={colors.white} size="m">Update</MonoText>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
    },
    headerContent: {
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
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: spacing.l,
        paddingBottom: 40,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    imageWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editIconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.white,
    },
    form: {
        gap: 20,
        marginBottom: 40,
    },
    inputWrapper: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        position: 'relative',
    },
    labelContainer: {
        position: 'absolute',
        top: -10,
        left: 12,
        backgroundColor: colors.white,
        paddingHorizontal: 4,
    },
    input: {
        fontSize: 16,
        color: colors.text,
        paddingVertical: 8,
        fontFamily: 'NotoSansMono-Regular',
    },
    updateBtn: {
        backgroundColor: colors.primary,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
});
