<div align="center">
  <img src="public/logo.png" width="160" alt="TakeSmart Logo" />
  <h1>TakeSmart</h1>
  <p><strong>A Premium Dairy Delivery & Subscription Management Ecosystem</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React_Native-v0.81.4-61DAFB?logo=react&logoColor=black" alt="React Native" />
    <img src="https://img.shields.io/badge/TypeScript-v5.8.3-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Zustand-State_Mgmt-orange" alt="Zustand" />
    <img src="https://img.shields.io/badge/Socket.io-Real--time-010101?logo=socket.io&logoColor=white" alt="Socket.io" />
  </p>
</div>

---

## 📱 Project Overview

TakeSmart is a high-performance, real-time mobile application built with React Native. It provides a seamless bridge between customers and dairy branches, offering both one-time orders and recurring subscriptions. The platform is built with a dual-app architecture (Customer and Delivery Partner) integrated into a single codebase with role-based routing.

### Key Capabilities
- **Location-Based Discovery**: Automatically detects the nearest branch and serves inventory based on the customer's coordinates.
- **Real-Time Tracking**: Live GPS tracking of delivery partners via Socket.io for precise ETAs.
- **Subscription Engine**: Manage recurring daily deliveries (milk, curd, etc.) with automated scheduling.
- **Dual Confirmation**: Secure delivery verification where both partner and customer confirm the handover.
- **Premium UI**: Modern glassmorphism design system with smooth Reanimated transitions.

---

## 🚀 Tech Stack

### Frontend (Mobile)
- **Core**: React Native, TypeScript
- **State Management**: Zustand (Global Store), React Hook Form (Forms)
- **Navigation**: React Navigation (Stack & Tabs)
- **Animations**: React Native Reanimated, Lottie
- **Maps**: React Native Maps, Geolocation Service
- **Real-time**: Socket.io-client
- **Storage**: AsyncStorage
- **Payments**: Razorpay

### Backend (Infrastructure)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Real-time**: Socket.io
- **Payments**: Razorpay SDK
- **Notifications**: Notifee & Push Notifications

---

## 🛠️ Application Showcase

> [!NOTE]
> Screenshots below are wrapped in a mobile frame. Please ensure images are placed in the `public/` directory for correct rendering.

### 1. Customer Flow

#### Authentication & Setup
| Onboarding | Login Screen | OTP Verification |
| :---: | :---: | :---: |
| <img src="public/onboarding.png" width="220" /> | <img src="public/customer_login.png" width="220" /> | <img src="public/customer_otp.png" width="220" /> |
*Secure and seamless onboarding process with mobile-first authentication. Features include high-fidelity animated walkthroughs, mobile number validation, and instant OTP verification for a frictionless entry into the ecosystem.*

#### Discovery & Shopping
| Home Dashboard | Categories | Browse Products |
| :---: | : :---: | :---: |
| <img src="public/customer_home.png" width="220" /> | <img src="public/customer_categories.png" width="220" /> | <img src="public/customer_browse.png" width="220" /> |
*Dynamic and intuitive product discovery. The home dashboard features location-aware branch selection, category-based browsing, and personalized product recommendations powered by a high-performance caching layer.*

#### Product Details & Search
| Search Results | Subcategories | Product Details |
| :---: | :---: | :---: |
| <img src="public/customer_search.png" width="220" /> | <img src="public/customer_subcat.png" width="220" /> | <img src="public/customer_details.png" width="220" /> |
*Granular product exploration and powerful search capabilities. Includes real-time search filtering, nested category navigation, and detailed product specifications with a sophisticated wishlist management system.*

#### Checkout & Fulfillment
| Address Selection | Add Address (Map) | Checkout / Payment |
| :---: | :---: | :---: |
| <img src="public/customer_address.png" width="220" /> | <img src="public/customer_map.png" width="220" /> | <img src="public/customer_checkout.png" width="220" /> |
*A streamlined multi-step checkout flow. Integrates Google Maps API for precise geo-location address tagging, multiple secure payment gateway options (Razorpay), and a clear, summary-based final order review.*

#### Tracking & History
| Real-time Tracking | Order History | Order Details |
| :---: | :---: | :---: |
| <img src="public/customer_tracking.png" width="220" /> | <img src="public/customer_orders.png" width="220" /> | <img src="public/customer_order_details.png" width="220" /> |
*End-to-end order transparency. High-fidelity tracking with live delivery partner movement via Socket.io, status transition timelines, and a comprehensive historical archive of all past purchases and active subscriptions.*

#### Profile & Feedback
| User Profile | Edit Profile | Feedback & Ratings |
| :---: | :---: | :---: |
| <img src="public/customer_profile.png" width="220" /> | <img src="public/customer_edit_profile.png" width="220" /> | <img src="public/customer_feedback.png" width="220" /> |
*Comprehensive account management and quality assurance. Users can manage profiles, track loyalty stats, and provide granular feedback with rating modals for every interaction to maintain high service standards.*

### 2. Delivery Partner Flow

#### Dashboard & Acceptance
| Partner Login | Available Orders | Order Detail Modal |
| :---: | :---: | :---: |
| <img src="public/partner_login.png" width="220" /> | <img src="public/partner_home.png" width="220" /> | <img src="public/partner_order_modal.png" width="220" /> |
*Optimized command center for delivery partners. Real-time 'Available Orders' queue with distance-based sorting and detailed order expansion modals for rapid task evaluation and acceptance.*

#### Delivery Management
| Active Deliveries | Partner Tracking Map | Fulfillment Status |
| :---: | :---: | :---: |
| <img src="public/partner_active.png" width="220" /> | <img src="public/partner_map.png" width="220" /> | <img src="public/partner_status.png" width="220" /> |
*Precision operational tools for field fulfillment. Includes active task lists, integrated turn-by-turn navigation tracking, and a secure status-transition workflow (Pick-up -> On-the-way -> Delivered).*

#### History
| Earning History |
| :---: |
| <img src="public/partner_history.png" width="220" /> |
*Transparent performance and financial tracking. Delivery partners can monitor their payout logs, completed delivery history, and earnings breakdown in a clear, time-series historical view.*

---

## 📂 Detailed Project Structure

### 📱 Mobile App (takesmart/)

```text
takesmart/src/
├── components/
│   ├── auth/                   # OtpBottomSheet.tsx, PasswordBottomSheet.tsx
│   ├── checkout/               # ApplyCouponModal.tsx, CheckoutAddressModal.tsx
│   ├── home/                   # HeroSection.tsx, CategoryGrid.tsx, ProductCard.tsx, 
│   │                           # HomeHeader.tsx, CustomBanner.tsx, DynamicSection.tsx
│   ├── navigation/             # CollapsibleTabBar.tsx
│   ├── onboarding/             # Onboarding SVGs (Groceries, Takeaway)
│   ├── partner/                # ActiveOrderCard.tsx, AvailableOrderCard.tsx, 
│   │                           # OrderDetailModal.tsx, PartnerHeader.tsx
│   └── shared/                 # MonoText.tsx, BlurBottomSheet.tsx, RatingModal.tsx,
│                               # ScreenHeader.tsx, SkeletonLoader.tsx, ErrorBoundary.tsx
├── hooks/
│   └── useLocationLogic.ts     # Core location and branch detection logic
├── navigation/
│   ├── PartnerTabNavigator.tsx # Delivery partner tabs (Home, Active, History)
│   ├── RootNavigator.tsx       # Auth gate and role-based stack routing
│   └── TabNavigator.tsx        # Customer tabs (Home, Categories, Orders, Profile)
├── screens/
│   ├── auth/                   # OnboardingScreen.tsx, CustomerLoginScreen.tsx, 
│   │                           # OTPScreen.tsx, PartnerLoginScreen.tsx
│   ├── customer/
│   │   ├── Home/               # HomeScreen.tsx
│   │   ├── Product/            # CategoriesScreen.tsx, SearchScreen.tsx, Subcategories.tsx
│   │   ├── Checkout/           # CheckoutScreen.tsx, AddAddressScreen.tsx
│   │   ├── Orders/             # OrderHistoryScreen.tsx, OrderTrackingScreen.tsx
│   │   └── Profile/            # ProfileScreen.tsx, EditProfile.tsx, Feedback.tsx
│   └── partner/
│       ├── PartnerHomeScreen.tsx
│       ├── ActiveOrdersScreen.tsx
│       ├── PartnerOrderTrackingScreen.tsx
│       └── HistoryScreen.tsx
├── services/
│   ├── core/                   # api.ts (Axios), socket.service.ts, storage.ts
│   ├── customer/               # product.service.ts, order.service.ts, address.service.ts,
│   │                           # branch.service.ts, invoice.service.ts, wishlist.service.ts
│   ├── partner/                # partner.service.ts
│   ├── notification/           # notification.service.ts (Notifee)
│   └── navigation/             # NavigationService.ts (Ref-based navigation)
├── store/                      # Zustand Stores
│   ├── authStore.ts            # Session management
│   ├── cart.store.ts           # Basket & Inventory validation
│   ├── home.store.ts           # Dashboard data caching
│   ├── branch.store.ts         # Active branch context
│   ├── partnerStore.ts         # Partner active orders & stats
│   └── wishlist.store.ts       # Saved products
├── theme/
│   ├── colors.ts               # Brand palette & dark mode variants
│   ├── spacing.ts              # Consistent layout margins/padding
│   └── typography.ts           # Font families & scale
├── types/
│   ├── auth.ts                 # User & Session interfaces
│   ├── partner.ts              # Order & Delivery models
│   └── env.d.ts                # Environment variable typings
└── utils/
    ├── env.ts                  # Safe environment variable access
    └── logger.ts               # Custom application logger
```

### 🔙 Backend (backend/)

```text
backend/src/
├── config/                     # Database and environment config
├── controllers/                # Request handlers (User, Order, Branch)
├── middleware/                 # Auth guards and validation
├── models/                     # Database schemas
├── routes/                     # API endpoint definitions
├── services/                   # Core business logic
├── scripts/                    # Database seeding and migrations
└── utils/                      # Helper functions
```

---

## ⚙️ Installation & Development

### Prerequisites
- Node.js (>= 20)
- React Native Development Environment ([Setup Guide](https://reactnative.dev/docs/environment-setup))
- Android Studio (for Android) / Xcode (for iOS)

### Setup Steps
1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   Create a `.env` file in the root directory:
   ```env
   BASE_URL=your_api_url
   SOCKET_URL=your_socket_url
   RAZORPAY_KEY_ID=your_key
   ```

3. **Start Metro Bundler**
   ```bash
   npm run start
   ```

4. **Launch Application**
   ```bash
   # For Android
   npm run android

   # For iOS
   npm run ios
   ```

---

## 📜 Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run start` | Starts the Metro bundler |
| `npm run android` | Installs and runs the app on Android |
| `npm run ios` | Installs and runs the app on iOS |
| `npm run lint` | Performs ESLint static code analysis |
| `npm test` | Executes Jest test suites |

---

<div align="center">
  <p><strong>Developed with passion for the next generation of delivery services.</strong></p>
  <p>© 2026 TakeSmart Platform</p>
</div>
