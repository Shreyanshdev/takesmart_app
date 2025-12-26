// Partner-specific type definitions

export interface PartnerOrder {
    _id: string;
    orderId: string;
    customer: {
        _id: string;
        name: string;
        phone: string;
    } | null;
    branch: {
        _id: string;
        name: string;
        address: string;
    } | null;
    deliveryLocation: {
        latitude: number;
        longitude: number;
        address: string;
    };
    pickupLocation: {
        latitude: number;
        longitude: number;
        address: string;
    };
    deliveryPersonLocation?: {
        latitude: number;
        longitude: number;
        address: string;
        timestamp?: Date;
    };
    items: Array<{
        id: string | { _id: string; name: string; price: number; image?: string };
        item: string;
        count: number;
    }>;
    status: 'pending' | 'accepted' | 'in-progress' | 'awaitconfirmation' | 'delivered' | 'cancelled';
    deliveryStatus: 'Assigning Partner' | 'Partner Assigned' | 'On The Way' | 'Delivered' | 'Cancelled';
    totalPrice: number;
    deliveryFee: number;
    createdAt: string;
    updatedAt: string;
    routeData?: {
        coordinates?: Array<{ latitude: number; longitude: number }>;
        distance?: { text: string; value: number };
        duration?: { text: string; value: number };
    };
}

export interface SubscriptionDelivery {
    _id: string;
    subscriptionId: string;
    date: string;
    slot: 'morning' | 'evening';
    status: 'scheduled' | 'reaching' | 'awaitingCustomer' | 'delivered' | 'paused' | 'canceled' | 'noResponse' | 'concession';
    startedAt?: string;
    deliveredAt?: string;
    confirmedAt?: string;
    cutoffTime?: string;
    products: Array<{
        subscriptionProductId: string;
        productId: string;
        productName: string;
        quantityValue: number;
        quantityUnit: string;
        unitPrice: number;
        animalType: string;
        deliveryStatus?: 'pending' | 'delivered' | 'failed';
    }>;
    customer: {
        _id: string;
        name: string;
        phone: string;
    };
    address: {
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        latitude?: number;
        longitude?: number;
    };
    liveLocation?: {
        latitude: number;
        longitude: number;
        address?: string;
        lastUpdated?: string;
    };
}

export interface PartnerSubscription {
    _id: string;
    subscriptionId: string;
    customer: {
        name: string;
        phone: string;
        address: string;
    };
    products: Array<{
        productName: string;
        quantityValue?: number;
        quantityUnit?: string;
        animalType: string;
        unitPrice: number;
        monthlyPrice: number;
        deliveryFrequency: string;
        totalDeliveries: number;
        deliveredCount: number;
        remainingDeliveries: number;
    }>;
    slot: 'morning' | 'evening';
    startDate: string;
    endDate: string;
    status: 'active' | 'pending' | 'paused' | 'cancelled' | 'expired' | 'completed' | 'expiring';
    todayDeliveryStatus: string;
    totalDeliveries: number;
    deliveredCount: number;
    remainingDeliveries: number;
}

export interface DeliveryLocation {
    latitude: number;
    longitude: number;
    address?: string;
    accuracy?: number;
    speed?: number;
    heading?: number;
    timestamp?: Date;
}
