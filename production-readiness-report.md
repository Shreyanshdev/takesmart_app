Final Pre-Production Checklist
Complete route-by-route audit with type checking and component verification

📦 Phase 1: Type Safety Audit
1.1 Product Model → Frontend Types
Backend: 
models/product.js

Field	Type	Used in Frontend	Verified
name	String	✓ ProductCard, OrderItem	[ ]
price	Number	✓ All price displays	[ ]
discountPrice	Number	✓ Discount badge	[ ]
quantity.value	Number	✓ Display	[ ]
quantity.unit	String (ml/l/g/kg)	✓ Display	[ ]
animalType	String (cow/buffalo/goat/mixed)	⚠️ Subscription	[ ]
breed	String	⚠️ Subscription	[ ]
images[]	String[]	✓ ProductCard	[ ]
shortDescription	String	✓ ProductCard	[ ]
Tasks:

 Create/update types/product.ts with all fields
 Replace any types in product components
 Add animalType and breed to Product interface
1.2 Order Model → Frontend Types
Backend: 
models/order.js

Field	Type	Used in Frontend	Verified
orderId	String	✓ Order display	[ ]
items[].id	ObjectId → Product	⚠️ Need populate	[ ]
items[].item	String (name)	✓ Display	[ ]
items[].count	Number	✓ Quantity	[ ]
totalPrice	Number	✓ Display	[ ]
deliveryFee	Number	✓ Display	[ ]
status	String enum	✓ Status badges	[ ]
paymentStatus	String enum	✓ Payment display	[ ]
paymentDetails	Object	⚠️ Razorpay IDs	[ ]
Tasks:

 Update types/order.ts with full item details
 Ensure items populated with product price, discountPrice
 Fix partner order tracking to show full details
1.3 Subscription Model → Frontend Types
Backend: 
models/subscription.js

Field	Type	Used in Frontend	Verified
subscriptionId	String	✓ Display	[ ]
products[].productName	String	✓ Calendar	[ ]
products[].quantityValue	Number	⚠️ Calendar	[ ]
products[].quantityUnit	String	⚠️ Calendar	[ ]
products[].animalType	String	⚠️ NOT DISPLAYED	[ ]
deliveries[].date	Date	✓ Calendar	[ ]
deliveries[].status	String enum	✓ Calendar	[ ]
deliveries[].products[]	Array	⚠️ Multi-product	[ ]
Tasks:

 Add animalType display in SubscriptionCalendarScreen
 Update subscription types with full product details
 Show quantity (500ml, 1L etc.) in calendar
🛤️ Phase 2: Route-by-Route Verification
2.1 Order Routes (
routes/order.js
)
Customer Routes
Route	Controller	Frontend Component	Type Check
POST /	createOrder	CheckoutScreen	[ ]
GET /active	getActiveOrderForUser	HomeScreen	[ ]
GET /my-history	getMyOrderHistory	OrderHistoryScreen	[ ]
PATCH /:orderId/confirm-receipt	confirmDeliveryReceipt	OrderTrackingScreen	[ ]
Tasks:

 Verify 
createOrder
 request body types
 Verify getMyOrderHistory response populates items
 Fix OrderHistoryScreen item: any → OrderItem interface
Partner Routes
Route	Controller	Frontend Component	Type Check
GET /available/:branchId	getAvailableOrders	PartnerHomeScreen	[ ]
GET /current/:deliveryPartnerId	getCurrentOrders	ActiveOrdersScreen	[ ]
POST /:orderId/accept	acceptOrder	OrderDetailModal	[ ]
POST /:orderId/pickup	pickupOrder	PartnerOrderTrackingScreen	[ ]
POST /:orderId/delivered	markOrderAsDelivered	PartnerOrderTrackingScreen	[ ]
Tasks:

 Verify PartnerOrder type matches response
 Add full item details to partner order display
 Show price, discountPrice, quantity per item
2.2 Subscription Routes (
routes/subscription.js
)
Customer Routes
Route	Controller	Frontend Component	Type Check
POST /	createEnhancedSubscription	SubscriptionCheckoutScreen	[ ]
GET /my	getSubscriptionsByCurrentCustomer	SubscriptionScreen	[ ]
PUT /:id	updateSubscription	RescheduleModal	[ ]
POST /:id/add-product	addProductToExistingSubscription	AddProductScreen	[ ]
Tasks:

 Verify subscription creation sends animalType
 Verify calendar shows animalType, breed
 Fix any types in subscription components
Partner Routes
Route	Controller	Frontend Component	Type Check
GET /partners/:partnerId/deliveries/daily	getDailySubscriptionDeliveriesForPartner	PartnerDeliveriesScreen	[ ]
POST /deliveries/start	startDelivery	DeliveryActions	[ ]
POST /deliveries/delivered	markDeliveryDelivered	DeliveryActions	[ ]
Tasks:

 Verify delivery response includes product animalType
 Update delivery card to show animal type
2.3 Product Routes (
routes/products.js
)
Route	Controller	Frontend Component	Type Check
GET /	getAllProducts	HomeScreen, SearchScreen	[ ]
GET /:productId	getProductById	ProductDetailScreen	[ ]
GET /subscription-available	getSubscriptionAvailableProducts	SubscriptionProductScreen	[ ]
GET /category/:categoryId	getProductByCategoryId	CategoryScreen	[ ]
Tasks:

 Verify product response includes animalType, breed
 Update ProductCard to display animalType when available
 Fix any types in product screens
🎨 Phase 3: Order Details UI Enhancement
3.1 Partner Order Tracking (
PartnerOrderTrackingScreen.tsx
)
Current: Shows item name + count only

Required per item:

 Product Name
 Original Price (₹)
 Discount Price (if any, strikethrough original)
 Quantity with unit (e.g., "500ml", "1L")
 Count (x2, x3)
 Item Subtotal
Code change needed:

// Current
{order.items?.map((item) => (
  <View>
    <MonoText>{item.item}</MonoText>
    <MonoText>Qty: {item.count}</MonoText>
  </View>
))}
// Required
{order.items?.map((item) => (
  <View>
    <MonoText>{item.id?.name || item.item}</MonoText>
    <MonoText>{item.id?.quantity?.value}{item.id?.quantity?.unit}</MonoText>
    {item.id?.discountPrice ? (
      <View>
        <MonoText strikethrough>₹{item.id?.price}</MonoText>
        <MonoText>₹{item.id?.discountPrice}</MonoText>
      </View>
    ) : (
      <MonoText>₹{item.id?.price}</MonoText>
    )}
    <MonoText>x{item.count} = ₹{(item.id?.discountPrice || item.id?.price) * item.count}</MonoText>
  </View>
))}
3.2 Customer Order Tracking (
OrderTrackingScreen.tsx
)
Same enhancements as partner screen:

 Full product details per item
 Price breakdown with discount
 Quantity display
 Item subtotal
📅 Phase 4: Subscription Details Enhancement
4.1 Calendar Screen (
SubscriptionCalendarScreen.tsx
)
Required display per product:

 Animal Type badge (🐄 Cow / 🐃 Buffalo / 🐐 Goat)
 Breed name (if available)
 Product name
 Quantity (500ml, 1L etc.)
Code pattern:

<View style={styles.productBadge}>
  <MonoText>{getAnimalEmoji(product.animalType)} {product.animalType}</MonoText>
  {product.breed && <MonoText size="xs">{product.breed}</MonoText>}
</View>
✅ Phase 5: Remove any Types
Files to fix:
 
screens/customer/Orders/OrderHistoryScreen.tsx
 - item: any
 
screens/customer/Orders/OrderTrackingScreen.tsx
 - item: any
 
screens/partner/PartnerOrderTrackingScreen.tsx
 - order: any casts
 
screens/customer/Subscription/SubscriptionCalendarScreen.tsx
 - delivery: any
 
screens/customer/Checkout/CheckoutScreen.tsx
 - cartItem: any
Type interfaces needed:
 types/product.ts - Product, Quantity, Nutrition
 types/order.ts - Order, OrderItem, OrderStatus
 types/subscription.ts - Subscription, SubscriptionProduct, Delivery
 types/partner.ts - PartnerOrder (update with full item details)
🔧 Phase 6: Backend API Fixes
6.1 Order Population
 Ensure GET /orders/:id populates items.id with full product
 Include: name, price, discountPrice, quantity, animalType
6.2 Subscription Population
 Ensure subscription APIs return animalType in products
 Add breed to product data if available
📋 Implementation Order
Types first - Update all interfaces
Backend - Fix population queries
Partner order tracking - Full item details
Customer order tracking - Full item details
Subscription calendar - Animal type display
Remove any types - Final cleanup


