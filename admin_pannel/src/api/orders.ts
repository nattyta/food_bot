// src/api/orders.ts
import { createApiClient } from './client';
import { Order, OrderStatus } from './types';

export const ordersApi = {
  getAll: async (token: string, status?: OrderStatus | 'all'): Promise<Order[]> => {
    console.log(`[ordersApi.getAll] Fetching orders with status: ${status}`);
    
    // We will bypass the client for a moment to get the raw response
    const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:10000";
    const params = new URLSearchParams();
    if (status && status !== 'all') {
      params.append('status', status);
    }
    const endpoint = `${API_URL}/api/v1/admin/all-orders${params.toString() ? `?${params.toString()}` : ''}`;

    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const responseText = await response.text();
      console.log("[ordersApi.getAll] Raw response text from server:", responseText);

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}: ${responseText}`);
      }

      const responseData = JSON.parse(responseText) as Order[];
      console.log("[ordersApi.getAll] Parsed JSON data:", responseData);

      const mappedData = responseData.map(order => ({
        ...order,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt),
      }));
      console.log("[ordersApi.getAll] Data after mapping dates:", mappedData);
      
      return mappedData;

    } catch (error) {
      console.error("[ordersApi.getAll] FATAL ERROR:", error);
      // Re-throw the error so react-query can catch it
      throw error;
    }

  },

  updateStatus: async (token: string, orderId: string, status: OrderStatus): Promise<Order> => {
    const client = createApiClient(token);
    // Corrected the URL from '/alll-orders/' to '/orders/'
    const responseData = await client.put<Order>(`/orders/${orderId}/status`, { status });

    return {
      ...responseData,
      createdAt: new Date(responseData.createdAt),
      updatedAt: new Date(responseData.updatedAt),
    };
  },

  // Role-specific endpoints (now also corrected)
  getKitchenOrders: async (token: string): Promise<Order[]> => {
    const client = createApiClient(token);
    const responseData = await client.get<Order[]>('/kitchen/orders');
    return responseData.map(order => ({
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
    }));
  },

  getDeliveryOrders: async (token: string): Promise<Order[]> => {
    const client = createApiClient(token);
    const responseData = await client.get<Order[]>('/delivery/orders');
    return responseData.map(order => ({
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
    }));
  }
};