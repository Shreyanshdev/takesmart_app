import { API_URL, SOCKET_URL, GOOGLE_MAPS_API_KEY, RAZORPAY_KEY_ID } from '@env';

// Fallback values for release builds if env is not loaded properly
const PRODUCTION_API_URL = 'https://lushandpurebackend.onrender.com/api/v1';
const PRODUCTION_SOCKET_URL = 'https://lushandpurebackend.onrender.com';
// NOTE: Replace these with your actual production keys before release
const FALLBACK_GOOGLE_MAPS_KEY = 'AIzaSyBZkClivKdjixXbLHgYQlXzzR2IDxBx4VQ';
const FALLBACK_RAZORPAY_KEY = 'rzp_test_emJjA3F79kvnXw'; // TODO: Replace with rzp_live_xxx for production

export const ENV = {
    API_URL: API_URL || PRODUCTION_API_URL,
    SOCKET_URL: SOCKET_URL || PRODUCTION_SOCKET_URL,
    GOOGLE_MAPS_API_KEY: GOOGLE_MAPS_API_KEY || FALLBACK_GOOGLE_MAPS_KEY,
    RAZORPAY_KEY_ID: RAZORPAY_KEY_ID || FALLBACK_RAZORPAY_KEY,
};

