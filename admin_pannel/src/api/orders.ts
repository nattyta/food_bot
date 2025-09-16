import { createApiClient } from './client';
import { Order, OrderStatus } from './types';

export const ordersApi = {
  /**
   * For Admins: fetches all orders, can be filtered by any status.
   */
  getAll: async (token: string, status?: OrderStatus | 'all'): Promise<Order[]> => {
    const client = createApiClient(token);
    
    // Construct the endpoint with an optional status parameter
    const endpoint = status && status !== 'all' 
      ? `/all-orders?status=${status}` 
      : '/all-orders';
      
    const responseData = await client.get<Order[]>(endpoint);
    
    // Ensure all date fields are converted to Date objects
    return responseData.map(order => ({
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
    }));
  },

  /**
   * For Kitchen Staff: fetches only active orders ('pending', 'accepted', 'preparing').
   */
  getKitchenOrders: async (token: string): Promise<Order[]> => {
    const client = createApiClient(token);
    const responseData = await client.get<Order[]>('/kitchen/orders');

    return responseData.map(order => ({
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
    }));
  },

  /**
   * For Delivery Staff: fetches orders assigned to them or ready for delivery.
   */
  getDeliveryOrders: async (token: string): Promise<Order[]> => {
    const client = createApiClient(token);
    const responseData = await client.get<Order[]>('/delivery/orders');

    return responseData.map(order => ({
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
    }));
  },
  
  /**
   * Universal function to update the status of any order.
   */
  updateStatus: async (token: string, orderId: string, status: OrderStatus): Promise<Order> => {
    const client = createApiClient(token);
    const responseData = await client.put<Order>(`/orders/${orderId}/status`, { status });

    return {
      ...responseData,
      createdAt: new Date(responseData.createdAt),
      updatedAt: new Date(responseData.updatedAt),
    };
  },
};