import { api } from '../core/api';

export interface Address {
    _id: string;
    userId: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    isDefault: boolean;
    latitude?: number;
    longitude?: number;
    label?: 'Home' | 'Office' | 'Friends and Family' | 'Other';
    labelCustom?: string;
    receiverName?: string;
    receiverPhone?: string;
    directions?: string;
}

export const addressService = {
    // Get all addresses for the logged-in user
    getAddresses: async (): Promise<Address[]> => {
        const response = await api.get('addresses');
        return response.data?.addresses || [];
    },

    // Add a new address
    addAddress: async (address: Omit<Address, '_id' | 'userId'>): Promise<Address> => {
        const response = await api.post('addresses', address);
        return response.data;
    },

    // Update an existing address
    updateAddress: async (id: string, address: Partial<Address>): Promise<Address> => {
        const response = await api.put(`addresses/${id}`, address);
        return response.data;
    },

    // Delete an address
    deleteAddress: async (id: string): Promise<void> => {
        await api.delete(`addresses/${id}`);
    },

    // Get a single address by ID
    getAddressById: async (id: string): Promise<Address> => {
        const response = await api.get(`addresses/${id}`);
        return response.data;
    }
};
