# 🚀 Production Readiness Report - LushAndPure Frontend

## Executive Summary

This report outlines all tasks required before deploying the LushAndPure React Native app to production. Issues are categorized by priority.

---

## 🔴 CRITICAL: Environment Variables

### Current State

Found in `src/utils/env.ts`:
```typescript
export const ENV = {
    API_URL: 'http://10.0.2.2:3000/api/v1',        // ❌ Localhost!
    GOOGLE_MAPS_API_KEY: 'AIzaSyBZkClivKdjixXbLHgYQlXzzR2IDxBx4VQ',
    RAZORPAY_KEY_ID: 'rzp_test_emJjA3F79kvnXw',    // ❌ Test key!
};
```

### Issues Found

| File | Issue | Line |
|------|-------|------|
| `src/utils/env.ts` | Localhost API URL | 2 |
| `src/utils/env.ts` | Hardcoded Google Maps API key | 3 |
| `src/utils/env.ts` | Razorpay TEST key exposed | 4 |
| `src/screens/customer/Checkout/CheckoutScreen.tsx` | Hardcoded Razorpay key | 226, 302 |
| `src/screens/customer/Checkout/AddAddressScreen.tsx` | Duplicate Google Maps key | 17 |
| `src/screens/customer/Orders/OrderTrackingScreen.tsx` | Hardcoded localhost URL | 16 |
| `src/screens/customer/Subscription/AddProductToSubscriptionScreen.tsx` | Hardcoded Razorpay key | 201 |

### Required Actions

1. **Create `.env` file** at project root:
```env
# API Configuration
API_URL=https://your-production-api.com/api/v1
SOCKET_URL=https://your-production-api.com

# Google Maps
GOOGLE_MAPS_API_KEY=your_production_google_maps_key

# Razorpay (use live key for production)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
```

2. **Install react-native-dotenv**:
```bash
npm install react-native-dotenv
```

3. **Update `babel.config.js`**:
```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
      safe: false,
      allowUndefined: true,
    }],
  ],
};
```

4. **Update `src/utils/env.ts`**:
```typescript
import { API_URL, GOOGLE_MAPS_API_KEY, RAZORPAY_KEY_ID, SOCKET_URL } from '@env';

export const ENV = {
    API_URL: API_URL || 'https://your-production-api.com/api/v1',
    SOCKET_URL: SOCKET_URL || 'https://your-production-api.com',
    GOOGLE_MAPS_API_KEY: GOOGLE_MAPS_API_KEY || '',
    RAZORPAY_KEY_ID: RAZORPAY_KEY_ID || '',
};
```

5. **Create `.env.example`** (for version control):
```env
API_URL=
SOCKET_URL=
GOOGLE_MAPS_API_KEY=
RAZORPAY_KEY_ID=
```

6. **Add `.env` to `.gitignore`** ✅ (already present)

---

## 🟠 HIGH: Files Requiring Updates

### 1. OrderTrackingScreen.tsx (Line 16)
```typescript
// REMOVE THIS LINE:
const SERVER_URL = 'http://10.0.2.2:3000';

// Replace socket connection (Line 83) with:
import { ENV } from '../../../utils/env';
// ...
socketRef.current = io(ENV.SOCKET_URL, {
    transports: ['websocket'],
});
```

### 2. AddAddressScreen.tsx (Line 17)
```typescript
// REMOVE duplicate key:
const GOOGLE_MAPS_API_KEY = "AIzaSyBZkClivKdjixXbLHgYQlXzzR2IDxBx4VQ";

// Use ENV instead:
import { ENV } from '../../../utils/env';
// Use ENV.GOOGLE_MAPS_API_KEY
```

### 3. CheckoutScreen.tsx (Lines 226, 302)
```typescript
// Replace hardcoded key with:
key: ENV.RAZORPAY_KEY_ID,
```

### 4. AddProductToSubscriptionScreen.tsx (Line 201)
```typescript
// Replace hardcoded key with:
key: ENV.RAZORPAY_KEY_ID,
```

---

## 🟡 MEDIUM: Console.log Cleanup

Found 30+ console.log statements that should be removed or wrapped in `__DEV__` checks for production.

### Files with console.log

| File | Count | Purpose |
|------|-------|---------|
| `socket.service.ts` | 8 | Socket connection logging |
| `partner.service.ts` | 2 | API debugging |
| `OrderTrackingScreen.tsx` | 4 | Tracking debugging |
| `PartnerHomeScreen.tsx` | 5 | Order debugging |
| `ActiveOrdersScreen.tsx` | 3 | Order status debugging |
| `CheckoutScreen.tsx` | 2 | Cleanup logging |
| `SubscriptionCalendarBanner.tsx` | 3 | Subscription debugging |
| Others | 3+ | Various |

### Recommended Fix

Create a utility logger:
```typescript
// src/utils/logger.ts
export const logger = {
    log: (...args: any[]) => {
        if (__DEV__) {
            console.log(...args);
        }
    },
    warn: (...args: any[]) => {
        if (__DEV__) {
            console.warn(...args);
        }
    },
    error: (...args: any[]) => {
        // Always log errors, or send to crash reporting
        console.error(...args);
    }
};
```

---

## 🔵 LOW: Android Production Build

### Current Issues

1. **Signing Config** - Using debug keystore for release build
   - File: `android/app/build.gradle` (Line 103)
   - Need to generate production keystore

2. **Version Code/Name** - Currently at 1.0
   - Update `versionCode` and `versionName` before release

### Required Steps for Android Release

1. **Generate Release Keystore**:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore lushandpure-release-key.keystore -alias lushandpure -keyalg RSA -keysize 2048 -validity 10000
```

2. **Create `android/keystore.properties`**:
```properties
storePassword=your_store_password
keyPassword=your_key_password
keyAlias=lushandpure
storeFile=lushandpure-release-key.keystore
```

3. **Update `build.gradle`** for release signing

4. **Add to `.gitignore`**:
```
*.keystore
keystore.properties
```

---

## ✅ Production Checklist

### Environment Setup
- [ ] Create `.env` file with production values
- [ ] Install `react-native-dotenv`
- [ ] Update `babel.config.js`
- [ ] Update all files using hardcoded values
- [ ] Test with production API

### Code Cleanup
- [ ] Remove/wrap all console.log statements
- [ ] Remove TODO comments (found 1 in CheckoutScreen)
- [ ] Test all payment flows with live Razorpay key

### Android
- [ ] Generate production keystore
- [ ] Configure release signing
- [ ] Update versionCode/versionName
- [ ] Enable ProGuard for release build
- [ ] Test release APK on physical device

### iOS
- [ ] Configure provisioning profiles
- [ ] Set up App Store Connect
- [ ] Archive and upload to TestFlight

### API & Backend
- [ ] Deploy backend to production server
- [ ] Configure production MongoDB
- [ ] Set up SSL certificates
- [ ] Configure production environment variables

### Security
- [ ] Restrict Google Maps API key to app bundle ID
- [ ] Use Razorpay live key
- [ ] Enable request signing if needed
- [ ] Review all API permissions

### Testing
- [ ] Full end-to-end testing on production API
- [ ] Test payment flows (Razorpay with live key)
- [ ] Test socket connections
- [ ] Test push notifications
- [ ] Performance testing

---

## Quick Fix Script

Run these commands to make the initial fixes:

```bash
# 1. Install dotenv
npm install react-native-dotenv

# 2. Create .env file
cat > .env << 'EOF'
# Production Configuration
API_URL=https://your-api-domain.com/api/v1
SOCKET_URL=https://your-api-domain.com
GOOGLE_MAPS_API_KEY=your_production_key
RAZORPAY_KEY_ID=rzp_live_xxxx
EOF

# 3. Create .env.example for git
cat > .env.example << 'EOF'
API_URL=
SOCKET_URL=
GOOGLE_MAPS_API_KEY=
RAZORPAY_KEY_ID=
EOF
```

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 7 | Hardcoded secrets/URLs |
| 🟠 High | 4 | Files need updates |
| 🟡 Medium | 30+ | Console.log statements |
| 🔵 Low | 2 | Build configuration |

**Estimated Time to Fix**: 2-4 hours

---

*Generated: December 2024*
