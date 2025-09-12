// src/api/dashboard.ts
import { createApiClient } from './client';
import { DashboardStats, Order } from './types';

export const dashboardApi = {
  getStats: async (token: string): Promise<DashboardStats> => {
    const client = createApiClient(token);
    return await client.get<DashboardStats>('/dashboard/stats');
  },

  getRecentOrders: async (token: string, limit: number = 5): Promise<Order[]> => {
    const client = createApiClient(token);
    
    const responseData = await client.get<Order[]>(`/all-orders?limit=${limit}`);
    
    return responseData.map(order => ({
      ...order,
      items: order.items,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
    }));
  }
};