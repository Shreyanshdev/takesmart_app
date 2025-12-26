import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER_DATA: 'userData',
};

export const storage = {
    setToken: async (accessToken: string, refreshToken: string) => {
        await AsyncStorage.multiSet([
            [KEYS.ACCESS_TOKEN, accessToken],
            [KEYS.REFRESH_TOKEN, refreshToken],
        ]);
    },

    getToken: async () => {
        const [accessToken, refreshToken] = await AsyncStorage.multiGet([
            KEYS.ACCESS_TOKEN,
            KEYS.REFRESH_TOKEN,
        ]);
        return {
            accessToken: accessToken[1],
            refreshToken: refreshToken[1],
        };
    },

    clearToken: async () => {
        await AsyncStorage.multiRemove([KEYS.ACCESS_TOKEN, KEYS.REFRESH_TOKEN, KEYS.USER_DATA]);
    },

    setUser: async (user: any) => {
        await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(user));
    },

    getUser: async () => {
        try {
            const user = await AsyncStorage.getItem(KEYS.USER_DATA);
            return user ? JSON.parse(user) : null;
        } catch (error) {
            // If JSON parsing fails (corrupted data), clear the storage and return null
            await AsyncStorage.removeItem(KEYS.USER_DATA);
            return null;
        }
    },
};
