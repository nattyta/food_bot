// src/api/dashboard.ts
import { createApiClient } from './client';
import { DashboardStats, Order, ApiResponse } from './types';

export const dashboardApi = {
  getStats: async (token: string): Promise<DashboardStats> => {
    const client = createApiClient(token);
    // --- THIS IS THE FIX ---
    // The backend sends the stats object directly.
    const response = await client.get<DashboardStats>('/dashboard/stats');
    return response; // Return the whole response object
  },

  getRecentOrders: async (token: string, limit: number = 5): Promise<Order[]> => {
    const client = createApiClient(token);
    // --- THIS IS THE FIX ---
    // The backend sends the array of orders directly.
    const response = await client.get<Order[]>(`/all-orders?limit=${limit}`);
    // The mapping of dates is still correct
    return response.map(order => ({
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      estimatedDeliveryTime: order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime) : undefined
    }));
  }
};