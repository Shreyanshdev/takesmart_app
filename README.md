# LushAndPure

A premium dairy product application built with React Native.

## Tech Stack
- **React Native**: 0.81.4
- **State Management**: Zustand
- **Navigation**: React Navigation (Native Stack)
- **Maps**: React Native Maps (Google Maps)
- **Payments**: Razorpay
- **Performance**: FlashList, Reanimated
- **Styling**: Custom Theme (Colors, Typography)

## Prerequisites
- Node.js >= 20
- JDK 17
- Android Studio (for Android)
- Xcode (for iOS)

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **iOS Setup**:
   ```bash
   cd ios && pod install && cd ..
   ```

## Running the App

### Android
```bash
npm run android
```

### iOS
```bash
npm run ios
```

## Project Structure
- `src/navigation`: Navigation setup (RootNavigator)
- `src/screens`: App screens (Customer, Partner, Auth)
- `src/components`: Reusable components
- `src/store`: Zustand stores
- `src/theme`: Theme configuration (Colors, Typography)
- `src/utils`: Utility functions and Environment variables

## Notes
- **Google Maps API Key**: Configured in `src/utils/env.ts` and `AndroidManifest.xml`.
- **Razorpay**: Integrated for payments.
