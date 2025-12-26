import { api } from '../core/api';

export interface Branch {
    _id: string;
    name: string;
    address?: string;
    location: {
        latitude: number;
        longitude: number;
    };
    distance?: number; // Distance from user in km
}

export const branchService = {
    /**
     * Get the nearest branch based on user coordinates
     * @param lat Latitude
     * @param lng Longitude
     */
    getNearestBranch: async (lat: number, lng: number): Promise<Branch> => {
        const response = await api.get('/branches/nearest', {
            params: { latitude: lat, longitude: lng }
        });
        const data = response.data;
        // Backend returns { branch: {...}, distance: number, ... }
        // We want to return the branch object with distance merged in
        return {
            ...data.branch,
            distance: data.distance
        };
    },

    /**
     * Get all branches
     */
    getAllBranches: async (): Promise<Branch[]> => {
        const response = await api.get('/branches');
        return response.data;
    }
};
