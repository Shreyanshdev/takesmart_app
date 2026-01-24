import { api } from '../core/api';

export interface Branch {
    _id: string;
    name: string;
    address?: string;
    location: {
        latitude: number;
        longitude: number;
    };
    distance?: number;
    deliveryRadiusKm?: number;
    isWithinRadius?: boolean;
}

export const branchService = {
    /**
     * Get the nearest branch based on user coordinates
     */
    getNearestBranch: async (lat: number, lng: number): Promise<Branch> => {
        const response = await api.get('branches/nearest', {
            params: { latitude: lat, longitude: lng }
        });
        const data = response.data;
        return {
            ...data.branch,
            distance: data.distance,
            deliveryRadiusKm: data.deliveryRadiusKm,
            isWithinRadius: data.isWithinRadius
        };
    },

    /**
     * Get branch by pincode (for manual address entry)
     */
    getBranchByPincode: async (pincode: string): Promise<Branch> => {
        const response = await api.get(`branches/pincode/${pincode}`);
        const data = response.data;
        return {
            ...data.branch,
            distance: data.distance
        };
    },

    /**
     * Get default branch (fallback when location unavailable)
     */
    getDefaultBranch: async (): Promise<Branch> => {
        const response = await api.get('branches/default');
        return response.data.branch;
    },

    /**
     * Get all branches
     */
    getAllBranches: async (): Promise<Branch[]> => {
        const response = await api.get('branches');
        return response.data;
    }
};
