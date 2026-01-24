import { api } from '../core/api';

export interface TaxSettings {
    sgst: number;
    cgst: number;
}

export const taxService = {
    getTaxRates: async (): Promise<TaxSettings> => {
        try {
            console.log('Fetching tax rates from:', api.defaults.baseURL + 'tax');
            const response = await api.get('tax');
            console.log('Tax response:', response.data);
            if (response.data.success) {
                return {
                    sgst: response.data.tax.sgst || 0,
                    cgst: response.data.tax.cgst || 0
                };
            }
            return { sgst: 0, cgst: 0 };
        } catch (error: any) {
            console.error('Error fetching tax rates:');
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
                console.error('Config URL:', error.config.url);
                console.error('Config BaseURL:', error.config.baseURL);
            } else {
                console.error('Message:', error.message);
            }
            return { sgst: 0, cgst: 0 };
        }
    }
};
