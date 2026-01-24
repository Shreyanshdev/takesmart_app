import { api } from '../core/api';

export const feedbackService = {
    submitFeedback: async (message: string, topic?: string) => {
        try {
            const response = await api.post('feedback', { message, topic });
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to submit feedback');
        }
    }
};
