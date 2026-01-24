export interface User {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
    image?: string;
    role: 'Customer' | 'DeliveryPartner' | 'Admin';
    isActivated: boolean;
    hasActiveSubscription?: boolean;
}

export interface Customer extends User {
    role: 'Customer';
}

export interface DeliveryPartner extends User {
    role: 'DeliveryPartner';
    branch?: string; // Branch ID assigned to this delivery partner
    email?: string;
}

export interface LoginResponse {
    message: string;
    accessToken: string;
    refreshToken: string;
    customer?: Customer;
    deliveryPartner?: DeliveryPartner;
    user?: User; // Generic fallback
}

export interface CustomerLoginRequest {
    phone: string;
}

export interface PartnerLoginRequest {
    email: string;
    password: string;
}
