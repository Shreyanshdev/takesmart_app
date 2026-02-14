import { API_URL, SOCKET_URL, GOOGLE_MAPS_API_KEY, RAZORPAY_KEY_ID } from '@env';
import { Platform } from 'react-native';

// Fallback values for release builds if env is not loaded properly
const PRODUCTION_API_URL = 'https://techsmart-backend.onrender.com/api/v1';
const PRODUCTION_SOCKET_URL = 'https://techsmart-backend.onrender.com';

// Local testing URLs
const IOS_LOCAL_API_URL = 'http://localhost:3000/api/v1/';
const ANDROID_LOCAL_API_URL = 'http://10.0.2.2:3000/api/v1/';

const LOCAL_API_URL = Platform.OS === 'android' ? ANDROID_LOCAL_API_URL : IOS_LOCAL_API_URL;
const LOCAL_SOCKET_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const FALLBACK_GOOGLE_MAPS_KEY = 'AIzaSyB8fTLvY6pE36-1J_xaop1I1-i4xwMx4_A';
const FALLBACK_RAZORPAY_KEY = 'rzp_test_S7onxlQ7tN2FFA';

export const ENV = {
    API_URL: __DEV__
        ? LOCAL_API_URL
        : PRODUCTION_API_URL,
    SOCKET_URL: __DEV__
        ? (SOCKET_URL && !SOCKET_URL.includes('10.0.2.2') && !SOCKET_URL.includes('localhost') ? SOCKET_URL : LOCAL_SOCKET_URL)
        : PRODUCTION_SOCKET_URL,
    GOOGLE_MAPS_API_KEY: GOOGLE_MAPS_API_KEY || FALLBACK_GOOGLE_MAPS_KEY,
    RAZORPAY_KEY_ID: RAZORPAY_KEY_ID || FALLBACK_RAZORPAY_KEY,
};

