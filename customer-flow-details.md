# Customer Flow Details

This document provides a comprehensive overview of the Customer application flow, including normal orders, subscription management, and order tracking.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Navigation](#authentication--navigation)
3. [Home Screen & Product Discovery](#home-screen--product-discovery)
4. [Normal Order Flow](#normal-order-flow)
5. [Subscription Order Flow](#subscription-order-flow)
6. [Order Tracking](#order-tracking)
7. [Subscription Management](#subscription-management)
8. [Profile & Address Management](#profile--address-management)
9. [Socket Events](#socket-events)
10. [API Endpoints](#api-endpoints)
11. [Status Reference](#status-reference)
12. [Screen Details](#screen-details)

---

## Overview

The Customer app enables users to:
- Browse and purchase dairy products (milk, curd, etc.)
- Place one-time orders with real-time tracking
- Subscribe to recurring daily/alternate-day deliveries
- Manage delivery schedules and pause/resume subscriptions
- Track deliveries in real-time with live location
- View order history and subscription details

### Key Principles
- **Location-based**: Products and branches assigned by customer location
- **Real-time tracking**: Live delivery partner location via Socket.io
- **Flexible subscriptions**: Pause, reschedule, modify anytime
- **Two confirmation flows**: Customer confirms delivery receipt

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
├── Subscription (SubscriptionScreen) → Subscription management
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
│  ┌─ Active Subscription Banner ─────────────────────────┐   │
│  │  Today's delivery status │ Manage subscription        │   │
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
│  ┌─ Subscription Widget ────────────────────────────────┐   │
│  │  Subscribe for Daily Fresh Delivery                   │   │
│  └──────────────────────────────────────────────────────┘   │
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
   - Subscription-eligible products marked

3. **Product Selection**
   - Tap product card → `ProductDetailsModal`
   - Shows price, description, quantity options
   - Add to cart or Subscribe button

---

## Normal Order Flow

### Complete Order Lifecycle (Customer Perspective)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        NORMAL ORDER LIFECYCLE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   CUSTOMER                         SYSTEM                    PARTNER     │
│   --------                         ------                    -------     │
│                                                                          │
│   Browses products                                                       │
│        │                                                                 │
│   Adds to cart                                                           │
│        │                                                                 │
│   Proceeds to checkout             Creates cart summary                  │
│        │                                                                 │
│   Selects/Adds address             Validates delivery area               │
│        │                                                                 │
│   Chooses payment method                                                 │
│        │                                                                 │
│   Places order ────────────────► Creates Order                          │
│        │                         status: pending                         │
│        │                              │                                  │
│   Sees "Order Placed"                 ├───────────► Partner notified     │
│   + Order ID                          │             (socket event)       │
│        │                              │                                  │
│        │                              │        Partner accepts ◄─────────│
│        │                              │              │                   │
│   Gets notification ◄── status: accepted ───────────┘                   │
│   "Partner Assigned"                  │                                  │
│        │                              │                                  │
│   Can track partner                   │        Partner picks up ◄────────│
│   live location                       │              │                   │
│        │                              │              │                   │
│   Gets notification ◄── status: in-progress ────────┘                   │
│   "On The Way"                        │                                  │
│        │                              │                                  │
│   Live tracking active ◄─── Location updates via socket                 │
│        │                              │                                  │
│        │                              │        Partner delivers ◄────────│
│        │                              │              │                   │
│   Gets notification ◄── status: awaitconfirmation ──┘                   │
│   "Confirm Receipt"                   │                                  │
│        │                              │                                  │
│   Taps "Confirm Delivery"             │                                  │
│        │                              │                                  │
│        ├──────────────────────► status: delivered                        │
│        │                              │                                  │
│   Sees order summary               Partner notified ─────────────────────│
│   + delivery time                                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Order Status Transitions (Customer View)

| Status | Customer Sees | Can Do |
|--------|---------------|--------|
| `pending` | "Finding Delivery Partner" | Cancel order |
| `accepted` | "Partner Assigned" + name | Track partner, Call partner |
| `in-progress` | "On The Way" + live map | Track partner, Call partner |
| `awaitconfirmation` | "Confirm Delivery" button | Confirm receipt |
| `delivered` | "Delivered" + summary | Rate, View receipt |
| `cancelled` | "Cancelled" | - |

---

## Subscription Order Flow

### Subscription Creation Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     SUBSCRIPTION CREATION FLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. Product Selection                                                   │
│      │                                                                   │
│      ├── Customer taps product card                                      │
│      ├── Opens ProductDetailsModal                                       │
│      └── Taps "Subscribe" button                                         │
│               │                                                          │
│   2. Subscription Modal                                                  │
│      │                                                                   │
│      ├── Select quantity (e.g., 500ml, 1L)                              │
│      ├── Select frequency (Daily / Alternate Days)                      │
│      ├── Select delivery slot (Morning / Evening)                       │
│      ├── Select start date                                              │
│      └── View price summary                                             │
│               │                                                          │
│   3. Checkout                                                            │
│      │                                                                   │
│      ├── Select/Add delivery address                                    │
│      ├── Choose payment method                                          │
│      └── Confirm subscription                                           │
│               │                                                          │
│   4. Subscription Created                                                │
│      │                                                                   │
│      ├── Status: active                                                 │
│      ├── Delivery calendar generated                                    │
│      ├── Partner assigned (if fixed)                                    │
│      └── Customer sees subscription in "My Subscriptions"               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Daily Subscription Delivery Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  SUBSCRIPTION DELIVERY LIFECYCLE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   SYSTEM (Automatic)               CUSTOMER                   PARTNER    │
│   -----------------               --------                   -------     │
│                                                                          │
│   Cutoff time reached                                                    │
│   (e.g., 4 AM for morning)                                              │
│        │                                                                 │
│   Generates today's                                                      │
│   deliveries                    Sees "Today's Delivery"                 │
│   status: scheduled             in app banner                            │
│        │                              │                                  │
│        │                              │         Partner starts ◄─────────│
│        │                              │              │                   │
│   status: reaching ◄──────────────────┴──────────────┘                   │
│        │                                                                 │
│   Customer gets                                                          │
│   "Partner on the way"                                                   │
│   notification                                                           │
│        │                                                                 │
│   Live tracking                                                          │
│   becomes available                                                      │
│        │                                                                 │
│        │                                          Partner arrives ◄──────│
│        │                                               │                 │
│   status: awaitingCustomer ◄───────────────────────────┘                 │
│        │                                                                 │
│   "Confirm Receipt"                                                      │
│   notification                                                           │
│        │                                                                 │
│   Customer taps                                                          │
│   "Confirm"                                                              │
│        │                                                                 │
│   status: delivered                                                      │
│   remainingDeliveries--                                                  │
│   deliveredCount++                                                       │
│                                                                          │
│   ─────── OR (if customer unavailable) ──────                            │
│                                                                          │
│        │                                          Partner marks ◄────────│
│        │                                          "No Response"          │
│        │                                               │                 │
│   status: noResponse ◄─────────────────────────────────┘                 │
│   remainingDeliveries--                                                  │
│   (NO concession given)                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

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

## Subscription Management

### Subscription Calendar Screen

The `SubscriptionCalendarScreen` provides full control over deliveries:

**Calendar Tab Features:**
- Month view with delivery status indicators
- Filter by product
- Multi-select mode for bulk actions
- Today's delivery card
- Status legend

**Details Tab Features:**
- Subscription ID and status
- Delivery slot and period
- Delivery address
- Assigned partner (with call button)
- Products list with remaining deliveries

### Subscription Actions

| Action | Description | API |
|--------|-------------|-----|
| Pause | Temporarily stop deliveries | `PATCH /subscriptions/:id/pause` |
| Resume | Restart paused subscription | `PATCH /subscriptions/:id/resume` |
| Reschedule | Change specific day's delivery | `PATCH /subscriptions/delivery/:id` |
| Skip | Skip a specific day | `PATCH /subscriptions/delivery/:id/skip` |
| Add Product | Add more products | Navigate to selection |
| Cancel | End subscription early | `DELETE /subscriptions/:id` |

### Delivery Status Colors (Calendar)

| Color | Status | Meaning |
|-------|--------|---------|
| 🟢 Green | `delivered` | Successfully delivered |
| 🟡 Yellow | `scheduled` | Upcoming delivery |
| 🔵 Blue | `reaching` | Partner on the way |
| 🟠 Orange | `awaitingCustomer` | Waiting for confirmation |
| 🔴 Red | `noResponse` | Customer unavailable |
| ⚫ Gray | `paused` | Delivery paused |

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

| Action | Screen | API |
|--------|--------|-----|
| Add Address | `AddAddressScreen` with map | `POST /addresses` |
| Edit Address | Same screen in edit mode | `PUT /addresses/:id` |
| Delete Address | Swipe or delete button | `DELETE /addresses/:id` |
| Set Default | Mark as primary | `PATCH /addresses/:id/default` |

---

## Socket Events

### Events Customer Listens To

| Event | Room | When | Action |
|-------|------|------|--------|
| `orderStatusUpdated` | `order-{orderId}` | Any status change | Update order UI |
| `orderPickedUp` | `order-{orderId}` | Partner picked up | Show tracking |
| `awaitingCustomerConfirmation` | `customer-{userId}` | Partner delivered | Show confirm button |
| `partnerLocationUpdate` | `order-{orderId}` | Partner moving | Update map marker |
| `deliveryStarted` | `customer-{userId}` | Subscription delivery starts | Show notification |
| `subscriptionUpdated` | `subscription-{subId}` | Any subscription change | Refresh data |

### Rooms Customer Joins

| Room | Purpose | When to Join |
|------|---------|--------------|
| `customer-{userId}` | Personal notifications | On app start |
| `order-{orderId}` | Specific order updates | When tracking order |
| `subscription-{subId}` | Subscription updates | When viewing subscription |

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

### Subscriptions

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/subscriptions` | Create subscription |
| `GET` | `/subscriptions/my-subscriptions` | Get customer's subscriptions |
| `GET` | `/subscriptions/:id` | Get subscription details |
| `GET` | `/subscriptions/:id/calendar` | Get delivery calendar |
| `PATCH` | `/subscriptions/:id/pause` | Pause subscription |
| `PATCH` | `/subscriptions/:id/resume` | Resume subscription |
| `POST` | `/subscriptions/deliveries/:id/confirm` | Confirm delivery |

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
| `in-progress` | On The Way | Partner has picked up |
| `awaitconfirmation` | Confirm Receipt | Partner at location |
| `delivered` | Delivered | Customer confirmed |
| `cancelled` | Cancelled | Order was cancelled |

### Subscription Delivery Statuses

| Status | Customer Sees | Description |
|--------|---------------|-------------|
| `scheduled` | Scheduled | Upcoming delivery |
| `reaching` | On The Way | Partner is out |
| `awaitingCustomer` | Confirm Receipt | Partner waiting |
| `delivered` | Delivered | Successfully delivered |
| `noResponse` | Missed | Customer was unavailable |
| `paused` | Paused | Delivery on hold |
| `canceled` | Cancelled | Delivery cancelled |

---

## Screen Details

### 1. Home Screen

**Purpose**: Central hub for product discovery and quick actions

**Components**:
- `HomeHeader`: Location, search, notifications
- `ActiveSubscriptionBanner`: Today's delivery status
- `SubscriptionCalendarBanner`: Quick subscription actions
- `ProductCard`: Product grid items
- `ProductDetailsModal`: Product details with add/subscribe
- `SubscriptionModal`: Subscription configuration

### 2. Orders Screen

**Purpose**: View and manage all orders

**Sections**:
- Active Orders (trackable)
- Past Orders (completed/cancelled)
- Order cards with status badges
- Tap to track or view details

### 3. Subscription Calendar Screen

**Purpose**: Full subscription management

**Tabs**:
- Calendar: Monthly view with deliveries
- Details: Subscription info and products

**Features**:
- Multi-select for bulk reschedule
- Product filter dropdown
- Today's delivery card
- Status legend

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
│   │   ├── SubscriptionModal.tsx    # Subscription config
│   │   ├── ActiveSubscriptionBanner.tsx
│   │   ├── SubscriptionCalendarBanner.tsx
│   │   └── AddressSelectionModal.tsx
│   │
│   ├── subscription/
│   │   ├── CalendarTabContent.tsx   # Calendar view
│   │   ├── DetailsTabContent.tsx    # Details view
│   │   └── DeliveryDetailModal.tsx  # Day details
│   │
│   └── shared/
│       ├── MonoText.tsx             # Custom text
│       └── BlurBottomSheet.tsx      # Modal component
│
├── screens/customer/
│   ├── Home/HomeScreen.tsx
│   ├── Orders/OrdersScreen.tsx
│   ├── Orders/OrderTrackingScreen.tsx
│   ├── Subscription/SubscriptionCalendarScreen.tsx
│   ├── Profile/ProfileScreen.tsx
│   └── Checkout/
│       ├── CartScreen.tsx
│       ├── CheckoutScreen.tsx
│       └── AddAddressScreen.tsx
│
├── services/customer/
│   ├── product.service.ts
│   ├── order.service.ts
│   ├── subscription.service.ts
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

### Subscription Flow
- [ ] Subscribe to a product
- [ ] Configure frequency and slot
- [ ] Complete subscription checkout
- [ ] Verify subscription in calendar
- [ ] Check today's delivery banner
- [ ] Confirm subscription delivery
- [ ] Test pause/resume
- [ ] Test reschedule delivery
- [ ] Add product to existing subscription

### Profile & Settings
- [ ] Edit profile name/email
- [ ] Add new address with map
- [ ] Set default address
- [ ] Delete an address
- [ ] Logout and re-login

---


