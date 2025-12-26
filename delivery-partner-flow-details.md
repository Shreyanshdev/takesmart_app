# Delivery Partner Flow Details

This document provides a comprehensive overview of the Delivery Partner application flow, including order management, subscription deliveries, and real-time synchronization with customer tracking.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Navigation](#authentication--navigation)
3. [Order Flow](#order-flow)
4. [Subscription Delivery Flow](#subscription-delivery-flow)
5. [Socket Events](#socket-events)
6. [API Endpoints](#api-endpoints)
7. [Status Reference](#status-reference)
8. [Screen Details](#screen-details)

---

## Overview

The Delivery Partner app enables delivery personnel to:
- View and accept available orders in real-time
- Manage active deliveries with status transitions
- Handle subscription-based recurring deliveries
- Track delivery history and earnings

### Key Principles
- **Real-time updates**: All order changes sync instantly via Socket.io
- **Fair assignment**: First partner to accept gets the order
- **Status accuracy**: Matches backend expectations exactly

---

## Authentication & Navigation

### Login Flow
1. Partner logs in via `PartnerLoginScreen` with email/password
2. Backend returns `deliveryPartner` object with `role: 'DeliveryPartner'`
3. `RootNavigator` detects role and renders `PartnerTabNavigator`

### Navigation Structure
```
PartnerTabNavigator
├── Home (PartnerHomeScreen)      → Available Orders
├── Active (ActiveOrdersScreen)   → Current Deliveries
├── Subscriptions (SubscriptionDeliveriesScreen) → Recurring Deliveries
└── History (HistoryScreen)       → Completed Orders
```

---

## Order Flow

### Complete Order Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ORDER LIFECYCLE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   CUSTOMER                    PARTNER                    BACKEND         │
│   --------                    -------                    -------         │
│                                                                          │
│   Places Order ──────────────────────────────────────► Creates Order     │
│                                                         status: pending  │
│                                                              │           │
│                              ◄──── Socket: newOrderAvailable ┘           │
│                              │                                           │
│                         Sees order in                                    │
│                         Available list                                   │
│                              │                                           │
│                         Taps "Accept"                                    │
│                              │                                           │
│                              ├──────────────────────────► status: accepted│
│                              │                                 │         │
│   Sees "Partner             ◄── Socket: orderStatusUpdated ───┘         │
│   Assigned"                  │                                           │
│                              │                                           │
│   Other partners            ◄── Socket: orderAcceptedByOther            │
│   lose the order             │  (order removed from their list)         │
│                              │                                           │
│                         Goes to branch                                   │
│                         Taps "Pick Up"                                   │
│                              │                                           │
│                              ├─────────────────────────► status: in-progress│
│                              │                                 │         │
│   Sees "On The Way"         ◄── Socket: orderPickedUp ────────┘         │
│   + Live tracking            │                                           │
│                              │                                           │
│                         Arrives at customer                              │
│                         Taps "Mark Delivered"                            │
│                              │                                           │
│                              ├──────────────────────► status: awaitconfirmation│
│                              │                                 │         │
│   Sees "Awaiting            ◄── Socket: awaitingCustomerConfirmation ──┘│
│   Confirmation"              │                                           │
│                              │                                           │
│   Taps "Order Received"     ─┼──────────────────────────► status: delivered│
│                              │                                 │         │
│                         Order moves to    ◄── Socket: deliveryConfirmed ┘│
│                         History screen                                   │
│                                                                          │
│   Sees final status          Socket connections closed                   │
│   + delivery time                                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Order Status Transitions (Partner Actions)

| Current Status | Partner Action | New Status | Customer Sees |
|----------------|----------------|------------|---------------|
| `pending` | Accept Order | `accepted` | "Partner Assigned" |
| `accepted` | Pick Up Order | `in-progress` | "On The Way" + live tracking |
| `in-progress` | Mark Delivered | `awaitconfirmation` | "Confirm Delivery" button |
| `awaitconfirmation` | *Wait* | `delivered` (by customer) | "Delivered" + summary |

---

## Subscription Delivery Flow

### Subscription Delivery Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SUBSCRIPTION DELIVERY LIFECYCLE                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   SYSTEM                      PARTNER                    CUSTOMER        │
│   ------                      -------                    --------        │
│                                                                          │
│   Generates daily            Sees delivery in                            │
│   deliveries at cutoff       "Today" tab                                 │
│   status: scheduled          │                                           │
│                              │                                           │
│                         Taps "Start Delivery"                            │
│                              │                                           │
│                              ├─────► status: reaching                    │
│                              │             │                             │
│                              │            ◄── Customer gets notification │
│                              │                + live tracking            │
│                              │                                           │
│                         Arrives at customer                              │
│                              │                                           │
│                         ┌────┴────┐                                      │
│                         │         │                                      │
│                    Customer    Customer                                  │
│                    Available   Not Available                             │
│                         │         │                                      │
│                    "Mark        "No                                      │
│                    Delivered"   Response"                                │
│                         │         │                                      │
│                         ▼         ▼                                      │
│                 status:        status:                                   │
│                 awaitingCustomer noResponse                              │
│                         │         │                                      │
│                         │    No concession                               │
│                         │    Delivery complete                           │
│                         │                                                │
│                         ▼                                                │
│                    Customer taps                                         │
│                    "Confirm Receipt"                                     │
│                         │                                                │
│                         ▼                                                │
│                 status: delivered                                        │
│                 deliveredCount++                                         │
│                 remainingDeliveries--                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Subscription Delivery Status Transitions

| Current Status | Partner Action | New Status | Notes |
|----------------|----------------|------------|-------|
| `scheduled` | Start Delivery | `reaching` | Partner is out for delivery |
| `reaching` | Mark Delivered | `awaitingCustomer` | At customer location |
| `reaching` | No Response | `noResponse` | Customer not available, no concession |
| `awaitingCustomer` | *Wait* | `delivered` (by customer) | Customer confirms |

### Dual Completion Buttons

When the partner arrives at the customer location (status: `reaching`), they see two options:

1. **"Mark Delivered"** (Green button)
   - Sets status to `awaitingCustomer`
   - Customer receives notification to confirm
   - Delivery counts toward subscription

2. **"No Response"** (Red button)
   - Sets status to `noResponse`
   - Customer was unavailable/unresponsive
   - **No concession given** (delivery deducted from subscription)
   - Protects against fraud

---

## Socket Events

### Events Partner Listens To

| Event | Room | When | Action |
|-------|------|------|--------|
| `newOrderAvailable` | `branch-{branchId}` | New order created | Add to available list |
| `orderAcceptedByOther` | `branch-{branchId}` | Order taken | Remove from available list |
| `orderStatusUpdated` | `order-{orderId}` | Any status change | Update order in UI |
| `deliveryConfirmed` | `deliveryPartner-{id}` | Customer confirms | Move to history |
| `orderCompleted` | `order-{orderId}` | Order finalized | Move to history, cleanup |
| `orderCancelled` | `deliveryPartner-{id}` | Order cancelled | Remove/update UI |

### Rooms Partner Joins

| Room | Purpose | When to Join |
|------|---------|--------------|
| `branch-{branchId}` | Available orders for branch | On app start |
| `deliveryPartner-{partnerId}` | Personal notifications | On app start |
| `order-{orderId}` | Specific order updates | When viewing/tracking order |

---

## API Endpoints

### Order Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/orders/available/:branchId` | Get available orders for branch |
| `POST` | `/orders/:orderId/accept` | Accept a pending order |
| `POST` | `/orders/:orderId/pickup` | Mark order as picked up |
| `POST` | `/orders/:orderId/delivered` | Mark order as delivered |
| `GET` | `/orders/current/:partnerId` | Get active orders |
| `GET` | `/orders/history/:partnerId` | Get completed orders |
| `PATCH` | `/orders/:orderId/location` | Update partner location |

### Subscription Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/subscriptions/partners/:id/active` | Get assigned subscriptions |
| `GET` | `/subscriptions/partners/:id/deliveries/daily` | Get today's + upcoming deliveries |
| `POST` | `/subscriptions/deliveries/journey/start` | Start delivery (→ reaching) |
| `POST` | `/subscriptions/deliveries/delivered` | Mark delivered (→ awaitingCustomer) |
| `POST` | `/subscriptions/deliveries/no-response` | Mark no response |
| `POST` | `/subscriptions/deliveries/location/realtime` | Update live location |

---

## Status Reference

### Order Statuses

| Status | Description | Who Sets It |
|--------|-------------|-------------|
| `pending` | Order created, awaiting partner | System |
| `accepted` | Partner accepted order | Partner |
| `in-progress` | Partner picked up, on the way | Partner |
| `awaitconfirmation` | Partner delivered, awaiting confirmation | Partner |
| `delivered` | Customer confirmed receipt | Customer |
| `cancelled` | Order cancelled | Customer/Admin |

### Subscription Delivery Statuses

| Status | Description | Who Sets It |
|--------|-------------|-------------|
| `scheduled` | Delivery scheduled for the day | System |
| `reaching` | Partner is out for delivery | Partner |
| `awaitingCustomer` | Partner at location, waiting | Partner |
| `delivered` | Customer confirmed receipt | Customer |
| `noResponse` | Customer unavailable | Partner |
| `paused` | Subscription paused | Customer/Admin |
| `canceled` | Delivery cancelled | Customer/Admin |

---

## Screen Details

### 1. Partner Home Screen (Available Orders)

**Purpose**: Display all pending orders for the partner's assigned branch

**Features**:
- Real-time order list via socket subscription
- Order cards showing: ID, customer, items, address, price
- Pull-to-refresh
- Order count badge
- Tap to open detail modal

**Order Detail Modal**:
- Full delivery address with distance
- Pickup location (branch)
- Complete items list
- Customer phone (tap to call)
- "Accept Order" button

### 2. Active Orders Screen

**Purpose**: Manage currently assigned orders

**Features**:
- Orders sorted by priority (in-progress → accepted → awaiting)
- Status-based action buttons
- Info banner explaining flow
- Socket listeners for real-time updates

**Status Actions**:
- Accepted: "Pick Up Order" button (yellow)
- In-Progress: "Mark Delivered" button (green)
- Awaiting Confirmation: "Waiting..." indicator

### 3. Subscription Deliveries Screen

**Purpose**: Handle recurring subscription deliveries

**Features**:
- Today / Upcoming tab selector
- Delivery cards with product details
- Slot time display (Morning/Evening)
- Status-based actions

**Actions by Status**:
- Scheduled: "Start Delivery" button
- Reaching: "Mark Delivered" + "No Response" buttons
- Awaiting Customer: Waiting indicator

### 4. History Screen

**Purpose**: View completed and cancelled orders

**Features**:
- Stats cards: Delivered count, Total Value, Cancelled count
- Filter tabs: All / Delivered / Cancelled
- Order cards with timestamps
- Status badges

---

## File Structure

```
src/
├── components/partner/
│   ├── AvailableOrderCard.tsx    # Card for pending orders
│   ├── OrderDetailModal.tsx      # Bottom sheet for order details
│   ├── ActiveOrderCard.tsx       # Card for active orders
│   ├── TodaysDeliveryCard.tsx    # Card for subscription deliveries
│   ├── HistoryOrderCard.tsx      # Card for completed orders
│   └── index.ts                  # Exports
│
├── screens/partner/
│   ├── PartnerHomeScreen.tsx     # Available orders
│   ├── ActiveOrdersScreen.tsx    # Active order management
│   ├── SubscriptionDeliveriesScreen.tsx  # Subscription deliveries
│   ├── HistoryScreen.tsx         # Order history
│   └── index.ts                  # Exports
│
├── services/
│   ├── core/socket.service.ts    # Socket.io client
│   └── partner/partner.service.ts # Partner API calls
│
├── store/partnerStore.ts         # Zustand state management
│
├── types/partner.ts              # TypeScript interfaces
│
└── navigation/
    ├── PartnerTabNavigator.tsx   # Bottom tabs
    └── RootNavigator.tsx         # Role-based routing
```

---

## Testing Checklist

- [ ] Login as delivery partner
- [ ] Verify partner tabs appear (not customer tabs)
- [ ] Check available orders load for assigned branch
- [ ] Accept an order → verify it moves to Active
- [ ] Pick up order → verify status change
- [ ] Mark as delivered → verify awaiting confirmation
- [ ] Confirm on customer app → verify order in History
- [ ] Test subscription delivery flow
- [ ] Test "No Response" button
- [ ] Verify socket events work in real-time
- [ ] Test pull-to-refresh on all screens
