# TakeSmart Screen Architecture & API Reference

Welcome to the **TakeSmart** technical documentation. This document provides a comprehensive map of the application's screens, their associated API endpoints, and design philosophy.

---

## 🎨 Design Philosophy
The application follows a **Premium Neoglass Design System**:
*   **Aesthetics**: Glassmorphism (BlurView), linear gradients, and subtle micro-animations.
*   **Typography**: `NotoSansMono` and system mono fonts for a "smart/technical" feel.
*   **Colors**: Vibrant Orange (`#FF4700`) as primary, balanced with soft backgrounds (`#FAFAFA`) and glass overlays.

---

## 🔐 Authentication & Onboarding

### 1. Onboarding Screen
*   **Functionality**: Introduction to the platform for new users.
*   **API Endpoints**: None (Static).
*   **Design Idea**: Full-screen image background with linear gradient overlays and smooth slide transitions.
*   **Modals**: None.

### 2. Customer Login Screen
*   **Functionality**: Phone number input for OTP-based authentication.
*   **API Endpoints**:
    | Endpoint | Method | Purpose |
    | :--- | :--- | :--- |
    | `/auth/customer/login` | `POST` | Validates phone number and sends OTP via SMS. |
*   **Design Idea**: Minimalist center-aligned input with "Floating Label" aesthetics and a glass-card container.
*   **Modals**: None.

### 3. OTP Verification Screen
*   **Functionality**: Verifies the OTP sent to the user's mobile.
*   **API Endpoints**:
    | Endpoint | Method | Purpose |
    | :--- | :--- | :--- |
    | `/auth/customer/verify-otp` | `POST` | Verifies OTP and returns JWT token + user status. |
*   **Design Idea**: Auto-focusing OTP digits with haptic feedback and a "Pulsing" timer for resend.
*   **Modals**: None.

### 4. Partner Login Screen
*   **Functionality**: Secure login for delivery partners using credentials.
*   **API Endpoints**:
    | Endpoint | Method | Purpose |
    | :--- | :--- | :--- |
    | `/auth/delivery-partner/login` | `POST` | Authenticates partners and initiates their session. |
*   **Design Idea**: Dark-themed variant of the login screen to distinguish the "Pro" partner app experience.
*   **Modals**: None.

---

## 🛒 Customer Core Experience

### 5. Home Screen
*   **Functionality**: The central hub for discovery, featuring categories, banners, and personalized feeds.
*   **API Endpoints**:
    | Endpoint | Method | Purpose |
    | :--- | :--- | :--- |
    | `/home-layout/feed` | `GET` | Fetches dynamic sections (Banners, Categories, Product Strips). |
    | `/products/feed` | `GET` | Fetches the main product listing with pagination. |
*   **Design Idea**: Dynamic scrolling sections with "Glass" headers that blur content as it passes behind.
*   **Modals**: 
    *   **ProductDetailsModal**: Detailed view of a product with variant selection and "Add to Cart" logic.

### 6. Search Screen
*   **Functionality**: Real-time product discovery with suggestions.
*   **API Endpoints**:
    | Endpoint | Method | Purpose |
    | :--- | :--- | :--- |
    | `/products/search` | `GET` | Returns filtered products based on query string. |
*   **Design Idea**: Integrated search bar with "Trending Deals" banners and "Suggestion" list.
*   **Modals**: 
    *   **ProductDetailsModal**: Quick access to product info from search results.

### 7. Categories & Subcategories Screen
*   **Functionality**: Hierarchical browsing of products.
*   **API Endpoints**:
    | Endpoint | Method | Purpose |
    | :--- | :--- | :--- |
    | `/products/categories` | `GET` | Fetches top-level categories. |
    | `/products/subcategories` | `GET` | Fetches subcategories for a specific category. |
*   **Design Idea**: Split-view layout (Category sidebar + Subcategory grid) for rapid navigation.
*   **Modals**: None.

---

## 💳 Checkout & Ordering

### 8. Address Selection Screen
*   **Functionality**: Manage and select delivery locations.
*   **API Endpoints**:
    | Endpoint | Method | Purpose |
    | :--- | :--- | :--- |
    | `/address` | `GET` | Retrieves all saved addresses for the user. |
    | `/address` | `DELETE` | Removes a saved address. |
*   **Design Idea**: "Address Cards" with distinct icons for Home/Work and "Active" selection borders.
*   **Modals**: None (Uses navigation to `AddAddressScreen`).

### 9. Checkout Screen
*   **Functionality**: Final cart review, address confirmation, and payment.
*   **API Endpoints**:
    | Endpoint | Method | Purpose |
    | :--- | :--- | :--- |
    | `/inventory/validate-cart` | `POST` | Validates stock and calculates final pricing/taxes. |
    | `/payment/orders` | `POST` | Initiates payment gateway (Razorpay) order. |
    | `/orders` | `POST` | Creates the final order in the database. |
*   **Design Idea**: Step-by-step progress flow with a "Glass" summary card pinned to the bottom.
*   **Modals**: 
    *   **OrderSuccessModal**: Celebration animation (Lottie) after successful payment.

---

### 10. Order Tracking Screen (Customer)
*   **Functionality**: Real-time map view of the delivery partner's location.
*   **API Endpoints**:
    | Endpoint | Method | Purpose |
    | :--- | :--- | :--- |
    | `/orders/:id` | `GET` | Fetches latest order status and items. |
    | `Socket.io` | `WS` | Receives live `driverLocation` and status updates. |
*   **Design Idea**: Full-screen map (Google Maps) with a slide-up "Status Panel" containing live steps.
*   **Modals**: None.

---

## 🚛 Delivery Partner Flow

### 11. Partner Home (Available Orders)
*   **Functionality**: A real-time queue of new orders available for pickup.
*   **API Endpoints**:
    | Endpoint | Method | Purpose |
    | :--- | :--- | :--- |
    | `/orders/available` | `GET` | Lists orders near the partner's assigned branch. |
    | `/orders/accept` | `POST` | Claims an order for delivery. |
*   **Design Idea**: High-contrast cards with countdown timers for "Hot" orders.
*   **Modals**: 
    *   **OrderDetailModal**: Deep dive into order items before acceptance.

### 12. Partner Order Tracking (Active Delivery)
*   **Functionality**: Navigation and delivery management.
*   **API Endpoints**:
    | Endpoint | Method | Purpose |
    | :--- | :--- | :--- |
    | `/orders/status` | `PATCH` | Updates status (Picked Up -> Delivered). |
    | `/partner/location` | `PATCH` | Reports live GPS coordinates to the server. |
*   **Design Idea**: Map-centric UI with "Big Button" actions (Swipe to Pickup/Delivered) for easy use while driving.
*   **Modals**: None.

---

## 👤 Profile & Support

### 13. Profile Screen
*   **Functionality**: Personal details, order history link, and settings.
*   **API Endpoints**:
    | Endpoint | Method | Purpose |
    | :--- | :--- | :--- |
    | `/auth/logout` | `POST` | Invalidates session and clears local store. |
*   **Design Idea**: Grid-based navigation menu with "Glass" card headers for the user profile.

### 14. Wishlist Screen
*   **Functionality**: Personal collection of products for future purchase.
*   **API Endpoints**:
    | Endpoint | Method | Purpose |
    | :--- | :--- | :--- |
    | `/wishlist` | `GET` | Fetches the user's wishlist items with variant details. |
    | `/wishlist` | `POST` | Adds/Removes an item from the wishlist. |
*   **Design Idea**: Multi-column grid with "Floating Cart" indicators and quick "Add to Cart" actions.

### 15. Order History Screen
*   **Functionality**: Historical record of all past and active orders.
*   **API Endpoints**:
    | Endpoint | Method | Purpose |
    | :--- | :--- | :--- |
    | `/orders/my-history` | `GET` | Retrieves paginated history of orders with status labels. |
*   **Design Idea**: "Glass" order cards with pulsing status orbs for active deliveries and receipt download links for past ones.

### 16. Feedback Screen
*   **Functionality**: Submitting app or product feedback.
*   **API Endpoints**:
    | Endpoint | Method | Purpose |
    | :--- | :--- | :--- |
    | `/feedback` | `POST` | Submits user comments/topic to admin. |
*   **Design Idea**: Clean form with "Topic Chips" and a premium text area.

---

## 🏗️ Reusable Modals (Global)

| Modal Name | Triggered By | Purpose |
| :--- | :--- | :--- |
| **ProductDetailsModal** | Home/Search/Category | Shows pricing, variants, description, and "Add to Cart" controls. |
| **LocationPermissionModal** | App Launch/Checkout | Requests GPS access with a professional explanation. |
| **OrderSuccessModal** | Post-Checkout | Visual confirmation of order placement with a "Track Order" shortcut. |
| **LogoutModal** | Profile Screen | Confirmation prompt before clearing user session data. |

---

> [!TIP]
> This architecture ensures a separation of concerns between the Customer (B2C) and Partner (Logistic) flows while sharing a unified design language and API gateway.
