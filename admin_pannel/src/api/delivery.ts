import { createApiClient } from './client';
import { DeliveryDashboardData } from './types';

export const deliveryApi = {
  getDashboardData: async (token: string): Promise<DeliveryDashboardData> => {
    const client = createApiClient(token);
    const response = await client.get<DeliveryDashboardData>('/delivery/dashboard');
    return response;
  },
};