
import { createApiClient } from './client';
import { Order, ApiResponse } from './types';

export const ordersApi = {
  getAll: async (token: string, status?: string, limit?: number): Promise<Order[]> => {
    const client = createApiClient(token);
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (limit) params.append('limit', limit.toString());
    
    const endpoint = `/all-orders${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await client.get<Order[]>(endpoint);
    
    return response.map(order => ({
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      estimatedDeliveryTime: order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime) : undefined
    }));
  },


  updateStatus: async (token: string, orderId: string, status: Order['status']): Promise<Order> => {
    const client = createApiClient(token);
    const response = await client.put<ApiResponse<Order>>(`/all-orders/${orderId}/status`, { status });
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      estimatedDeliveryTime: response.data.estimatedDeliveryTime ? new Date(response.data.estimatedDeliveryTime) : undefined
    };
  },

  assignDelivery: async (token: string, orderId: string, deliveryStaffId: string): Promise<Order> => {
    const client = createApiClient(token);
    const response = await client.post<ApiResponse<Order>>('/orders/assign', { orderId, deliveryStaffId });
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      estimatedDeliveryTime: response.data.estimatedDeliveryTime ? new Date(response.data.estimatedDeliveryTime) : undefined
    };
  },

  // Role-specific endpoints
  getKitchenOrders: async (token: string): Promise<Order[]> => {
    const client = createApiClient(token);
    const response = await client.get<ApiResponse<Order[]>>('/kitchen/orders');
    return response.data.map(order => ({
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      estimatedDeliveryTime: order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime) : undefined
    }));
  },

  getDeliveryOrders: async (token: string): Promise<Order[]> => {
    const client = createApiClient(token);
    const response = await client.get<ApiResponse<Order[]>>('/delivery/orders');
    return response.data.map(order => ({
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      estimatedDeliveryTime: order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime) : undefined
    }));
  }
};
