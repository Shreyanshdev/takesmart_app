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
        addressLine1?: string;
        addressLine2?: string;
        receiverName?: string;
        receiverPhone?: string;
        directions?: string;
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
    items?: Array<{
        id: string | { _id: string; name: string; price: number; image?: string };
        item: string;
        productName?: string;
        productImage?: string;
        packSize?: string;
        handling?: {
            fragile: boolean;
            cold: boolean;
            heavy: boolean;
        };
        deliveryInstructions?: string[];
        count: number;
        quantity?: number;
    }>;
    itemCount?: number;
    paymentStatus?: 'pending' | 'verified' | 'failed' | 'refunded' | 'completed';
    paymentDetails?: {
        paymentMethod: 'online' | 'cod';
        method?: string;
        amount?: number;
        verifiedAt?: string;
    };
    status: 'pending' | 'accepted' | 'in-progress' | 'awaitconfirmation' | 'delivered' | 'cancelled';
    deliveryStatus: 'Assigning Partner' | 'Partner Assigned' | 'On The Way' | 'Delivered' | 'Cancelled';
    totalPrice?: number;
    deliveryFee: number;
    sgst?: number;
    cgst?: number;
    createdAt: string;
    updatedAt: string;
    routeData?: {
        coordinates?: Array<{ latitude: number; longitude: number }>;
        distance?: { text: string; value: number };
        duration?: { text: string; value: number };
    };
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
