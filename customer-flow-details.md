# Customer Flow Details

This document provides a comprehensive overview of the Customer application flow, including normal orders, and order tracking.

---

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Authentication & Navigation](#authentication--navigation)
4. [Home Screen & Product Discovery](#home-screen--product-discovery)
5. [Normal Order Flow](#normal-order-flow)
6. [Order Tracking](#order-tracking)
7. [Profile & Address Management](#profile--address-management)
8. [Socket Events](#socket-events)
9. [API Endpoints](#api-endpoints)
10. [Status Reference](#status-reference)
11. [Screen Details](#screen-details)

---

## Overview

The Customer app enables users to:
- Browse and purchase dairy products (milk, curd, etc.)
- Place one-time orders with real-time tracking
- Track deliveries in real-time with live location
- View order history

### Key Principles
- **Location-based**: Products and branches assigned by customer location
- **Real-time tracking**: Live delivery partner location via Socket.io
- **Two confirmation flows**: Customer confirms delivery receipt

---

## Project Structure

### Core Directories
- `src/screens/customer/`: Page-level components
- `src/components/`: Reusable UI modules
- `src/services/customer/`: API and domain logic
- `src/store/`: Global state management (Zustand)

### Detailed File Hierarchy

#### Screens (`src/screens/customer/`)
- `Home/HomeScreen.tsx`: Main landing with product grid
- `Product/`: `SearchScreen.tsx`, `CategoriesScreen.tsx`
- `Checkout/`: `AddAddressScreen.tsx`, `CheckoutScreen.tsx`
- `Orders/`: `OrderHistoryScreen.tsx`, `OrderTrackingScreen.tsx`
- `Profile/`: `ProfileScreen.tsx`, `EditProfileScreen.tsx`, `FeedbackScreen.tsx`

#### Home Components (`src/components/home/`)
- `HomeHeader.tsx`: Location display and search bar
- `HeroSection.tsx`: Dynamic banners and brand messaging
- `PromoCarousel.tsx`: Marketing banners
- `ProductCard.tsx`: Individual product item with add-to-cart
- `ProductDetailsModal.tsx`: Comprehensive product view with variants
- `AddressSelectionModal.tsx`: Location & branch allocation logic
- `CategoryGrid.tsx`: Quick category navigation

#### Shared & Checkout Components
- `checkout/`: `ApplyCouponModal.tsx`, `CheckoutAddressModal.tsx`
- `shared/MonoText.tsx`: Design system typography
- `shared/OrderSuccessModal.tsx`: Order confirmation status
- `shared/RatingModal.tsx`: Post-delivery feedback
- `shared/BlurBottomSheet.tsx`: Glassmorphism modal base

#### Services (`src/services/customer/`)
- `product.service.ts`: Products, variants, and inventory validation
- `order.service.ts`: Order creation, tracking, and payment verification
- `address.service.ts`: CRUD for customer addresses
- `branch.service.ts`: Nearest branch detection and coverage
- `coupon.service.ts`: Promo code validation
- `invoice.service.ts`: PDF generation and sharing

#### State Management (`src/store/`)
- `cart.store.ts`: Cart items, stock sync, and total calculations
- `authStore.ts`: User session and profile data
- `home.store.ts`: Cached home screen data (products/banners)
- `branch.store.ts`: Currently allocated branch information

---

## Authentication & Navigation

### Login Flow
1. Customer enters phone number on `AuthScreen`
2. OTP sent via backend → customer enters OTP
3. Backend returns `user` object with `role: 'Customer'`
4. Token stored in secure storage
5. `RootNavigator` renders `CustomerTabNavigator`

### Navigation Structure
```
CustomerTabNavigator
├── Home (HomeScreen)           → Product browsing & banners
├── Orders (OrdersScreen)       → Active & past orders
   └── Profile (ProfileScreen)     → Account settings
```

---

## Home Screen & Product Discovery

### Home Screen Sections

```
┌─────────────────────────────────────────────────────────────┐
│  HomeScreen Structure                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ HomeHeader ─────────────────────────────────────────┐   │
│  │  Location Selector │ Search │ Notifications          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Location Banner ────────────────────────────────────┐   │
│  │  Tap to set your delivery location                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Product Categories ─────────────────────────────────┐   │
│  │  Milk │ Curd │ Butter │ ...                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Product Grid ───────────────────────────────────────┐   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐              │   │
│  │  │ Product │  │ Product │  │ Product │              │   │
│  │  │  Card   │  │  Card   │  │  Card   │  ...         │   │
│  │  └─────────┘  └─────────┘  └─────────┘              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Product Discovery Flow

1. **Location Detection**
   - App requests location permission
   - Uses GPS or manual address selection
   - Assigns nearest branch based on coordinates

2. **Product Loading**
   - Fetches products for assigned branch
   - Categories and filters available

3. **Product Selection**
   - Tap product card → `ProductDetailsModal`
   - Shows price, description, variant options (weight/unit)
   - Add to cart button (checks current stock and per-order limits)

4. **Cart Management**
   - Persistent cart stored locally using `AsyncStorage` via `cart.store.ts`
   - Automatic validation of stock for each increment
   - Supports multiple variants of the same product as separate line items (grouped by inventoryId)

---

## Normal Order Flow

### Complete Order Lifecycle (Customer Perspective)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        NORMAL ORDER LIFECYCLE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. ADDRESS & BRANCH ALLOCATION                                          │
│     │                                                                    │
│     ├── Customer opens Cart/Checkout                                     │
│     ├── Address Selection Modal opens automatically if no address set    │
│     ├── User selects/adds address                                        │
│     └── System detects Nearest Branch & Branch Inventory for this address │
│                                                                          │
│  2. CART VALIDATION & STOCK SYNC                                         │
│     │                                                                    │
│     ├── System validates ALL items against the selected branch inventory  │
│     ├── If stock matches: Proceed                                        │
│     └── If stock insufficient: Automatically adjust quantities or mark   │
│         items as Out of Stock in cart. User gets adjustment notice.      │
│                                                                          │
│  3. CHECKOUT & PAYMENT                                                   │
│     │                                                                    │
│     ├── User reviews final bill (MRP, Discounts, Tax, Delivery Fee)      │
│     ├── User chooses Payment Method (Razorpay Online or Cash on Delivery)│
│     ├── User places order                                                │
│     └── Order status set to "pending"                                    │
│                                                                          │
│  4. DELIVERY PARTNER ASSIGNMENT                                          │
│     │                                                                    │
│     ├── System notifies nearest partners via socket                      │
│     ├── Partner accepts order → status: "accepted"                       │
│     └── Customer sees Partner details and contact button                 │
│                                                                          │
│  5. LIVE TRACKING & DELIVERY                                             │
│     │                                                                    │
│     ├── Partner picks up → status: "in-progress" / "out_for_delivery"    │
│     ├── Live tracking starts on map (live location / ETA)                │
│     ├── Partner reaches → status: "awaitconfirmation"                    │
│     ├── Customer confirms delivery → status: "delivered"                 │
│     └── Order success summary & review products                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Order Status Transitions (Customer View)

| Status | Customer Sees | Can Do |
|--------|---------------|--------|
| `pending` | "Finding Delivery Partner" | Cancel order |
| `accepted` | "Partner Assigned" + name | Track partner, Call partner |
| `in-progress` | "On The Way" (Out for Delivery) | Track partner, Call partner |
| `awaitconfirmation` | "Confirm Delivery" button | Confirm receipt (Verify package) |
| `delivered` | "Delivered" + summary | Rate products, Download Invoice |
| `cancelled` | "Cancelled" | View reason if available |

---


## Order Tracking

### Live Tracking Features

| Feature | Description |
|---------|-------------|
| Partner Location | Real-time GPS on map view |
| ETA | Estimated arrival time |
| Partner Info | Name and phone (tap to call) |
| Status Updates | Push notifications for each change |
| Route | Path from partner to customer |

### Tracking Screen Components

```
┌─────────────────────────────────────────────────────────────┐
│  Order Tracking Screen                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ Map View ───────────────────────────────────────────┐   │
│  │                                                       │   │
│  │      🏪 Branch                                        │   │
│  │         \                                             │   │
│  │          \  route                                     │   │
│  │           \                                           │   │
│  │            🛵 Partner (live)                          │   │
│  │               \                                       │   │
│  │                \                                      │   │
│  │                 📍 Customer                           │   │
│  │                                                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Status Card ────────────────────────────────────────┐   │
│  │  🚚 On The Way                                        │   │
│  │  ETA: ~5 mins                                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Partner Info ───────────────────────────────────────┐   │
│  │  [Avatar]  Raj Kumar                                  │   │
│  │            Delivery Partner        [📞 Call]          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Order Items ────────────────────────────────────────┐   │
│  │  • A2 Cow Milk 1L × 2                                 │   │
│  │  • Buffalo Curd 400g × 1                              │   │
│  │                          Total: ₹245                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---
## Profile & Address Management

### Profile Screen Features

- **Personal Details**: Editable name and email
- **Phone**: Display only (verified number)
- **My Addresses**: Manage saved addresses
- **Payment Methods**: Saved cards/UPI
- **Privacy Policy**: Legal information
- **Logout**: End session

### Address Management

### Address Selection & Branch Logic

The app uses a strict address-to-inventory mapping:

1. **Address Selection**: User selects a saved address or adds a new one via the `AddressSelectionModal`.
2. **Branch Detection**: Backend detects the nearest branch and checks if it's within the service radius.
3. **Cart Re-validation**:
   - The system calls `validateCartStock` whenever a new address is selected or an item quantity is updated.
   - If the new branch has less stock than the cart quantity, the cart is automatically adjusted down to the available stock.
   - If an item is not available in the new branch, it is marked as Out of Stock (0 quantity).
4. **Distance & Charges**: Delivery charges are calculated based on the distance between the selected address and the allocated branch.

| Action | Component | Logic |
|--------|-----------|-------|
| Add Address | `AddAddressScreen` | Places pin on map, gets geocoded address |
| Select Address | `AddressSelectionModal` | Triggers branch search & stock sync |
| Delete Address | `AddressSelectionModal` | Removes address from profile |
| Default Address | `Profile` | Sets the preferred delivery location |

---

## Socket Events

### Events Customer Listens To

| Event | Room | When | Action |
|-------|------|------|--------|
| `orderStatusUpdated` | `order-{orderId}` | Any status change | Update order UI |
| `orderPickedUp` | `order-{orderId}` | Partner picked up | Show tracking |
| `awaitingCustomerConfirmation` | `customer-{userId}` | Partner delivered | Show confirm button |
| `partnerLocationUpdate` | `order-{orderId}` | Partner moving | Update map marker |

### Rooms Customer Joins

| Room | Purpose | When to Join |
|------|---------|--------------|
| `customer-{userId}` | Personal notifications | On app start |
| `order-{orderId}` | Specific order updates | When tracking order |

---

## API Endpoints

### Authentication

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/auth/send-otp` | Send OTP to phone |
| `POST` | `/auth/verify-otp` | Verify OTP and login |
| `GET` | `/auth/me` | Get current user |
| `POST` | `/auth/refresh` | Refresh auth token |

### Products

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/products` | Get all products |
| `GET` | `/products/:id` | Get product details |
| `GET` | `/products/category/:cat` | Get by category |
| `GET` | `/products/branch/:branchId` | Products for branch |

### Orders

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/orders` | Create new order |
| `GET` | `/orders/my-orders` | Get customer's orders |
| `GET` | `/orders/:id` | Get order details |
| `POST` | `/orders/:id/confirm` | Confirm delivery |
| `POST` | `/orders/:id/cancel` | Cancel order |



### Addresses

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/addresses` | Get saved addresses |
| `POST` | `/addresses` | Add new address |
| `PUT` | `/addresses/:id` | Update address |
| `DELETE` | `/addresses/:id` | Delete address |

---

## Status Reference

### Order Statuses

| Status | Customer Sees | Description |
|--------|---------------|-------------|
| `pending` | Finding Partner | Order placed, awaiting partner |
| `accepted` | Partner Assigned | Partner accepted the order |
| `in-progress` | Out for Delivery | Partner has picked up from branch |
| `awaitconfirmation` | Confirm Receipt | Partner at customer location |
| `delivered` | Delivered | Customer confirmed receipt |
| `cancelled` | Cancelled | Order was cancelled |


---

## Screen Details

### 1. Home Screen

**Purpose**: Central hub for product discovery and quick actions

**Components**:
- `HomeHeader`: Location, search, notifications
- `ProductDetailsModal`: Product details with add

### 2. Orders Screen

**Purpose**: View and manage all orders

**Sections**:
- Active Orders (trackable)
- Past Orders (completed/cancelled)
- Order cards with status badges
- Tap to track or view details

### 4. Profile Screen

**Purpose**: Account and settings management

**Sections**:
- Profile header with avatar
- Editable personal details
- Address management
- Payment methods
- Logout option

---

## File Structure

```
src/
├── components/
│   ├── home/
│   │   ├── HomeHeader.tsx           # Header with location
│   │   ├── ProductCard.tsx          # Product grid item
│   │   ├── ProductDetailsModal.tsx  # Product details
│   │   └── AddressSelectionModal.tsx
│   │
│   │
│   └── shared/
│       ├── MonoText.tsx             # Custom text
│       └── BlurBottomSheet.tsx      # Modal component
│
├── screens/customer/
│   ├── Home/HomeScreen.tsx
│   ├── Orders/OrdersScreen.tsx
│   ├── Orders/OrderTrackingScreen.tsx
│   ├── Profile/ProfileScreen.tsx
│   └── Checkout/
│       ├── CartScreen.tsx
│       ├── CheckoutScreen.tsx
│       └── AddAddressScreen.tsx
│
├── services/customer/
│   ├── product.service.ts
│   ├── order.service.ts
│   └── address.service.ts
│
├── store/
│   ├── authStore.ts                 # Auth state
│   ├── cartStore.ts                 # Cart state
│   └── homeStore.ts                 # Home data
│
└── navigation/
    ├── CustomerTabNavigator.tsx
    └── RootNavigator.tsx
```

---

## Testing Checklist

### Normal Order Flow
- [ ] Browse products on home screen
- [ ] Add product to cart
- [ ] Proceed to checkout
- [ ] Select/add delivery address
- [ ] Complete payment
- [ ] Verify order appears in Orders tab
- [ ] Track order (accepted → in-progress)
- [ ] Confirm delivery
- [ ] Check order in history



### Profile & Settings
- [ ] Edit profile name/email
- [ ] Add new address with map
- [ ] Set default address
- [ ] Delete an address
- [ ] Logout and re-login

---


