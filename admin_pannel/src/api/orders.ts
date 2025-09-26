import { createApiClient } from './client';
import { Order, OrderStatus, DeliveryStats  } from './types';

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


  getMyDeliveries: async (token: string): Promise<Order[]> => {
    const client = createApiClient(token);
    const responseData = await client.get<any[]>('/delivery/my-orders'); // Fetch as any[] to be safe

    return responseData.map(order => ({
      ...order, // Spread all properties first
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      // Manually cast numeric types to be certain
      latitude: order.latitude ? parseFloat(order.latitude) : undefined,
      longitude: order.longitude ? parseFloat(order.longitude) : undefined,
    }));
  },
  /**
   * Accept a delivery order - assigns it to the current driver.
   */


  getAvailableDeliveries: async (token: string): Promise<Order[]> => {
    const client = createApiClient(token);
    const responseData = await client.get<any[]>('/delivery/available'); // Fetch as any[]

    return responseData.map(order => ({
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      latitude: order.latitude ? parseFloat(order.latitude) : undefined,
      longitude: order.longitude ? parseFloat(order.longitude) : undefined,
    }));
  },


  acceptDelivery: async (token: string, orderId: string): Promise<Order> => {
    const client = createApiClient(token);

    // --- THIS IS THE FIX ---
    // The backend expects the numeric part of the ID, not the "ORD-" prefix.
    // We extract the number from the string before sending it.
    const numericId = orderId.split('-')[1];

    // Now we call the endpoint with the correct numeric ID.
    const responseData = await client.post<Order>(`/delivery/accept/${numericId}`);

    return {
      ...responseData,
      createdAt: new Date(responseData.createdAt),
      updatedAt: new Date(responseData.updatedAt),
    };
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


  completeDelivery: async (token: string, orderId: string): Promise<Order> => {
    const client = createApiClient(token);
    
    const numericId = orderId.split('-')[1];

    // --- THIS IS THE FIX ---
    // The path should be relative to the baseURL, which already includes /admin
    const responseData = await client.post<Order>(`/delivery/complete/${numericId}`);

    return {
      ...responseData,
      createdAt: new Date(responseData.createdAt),
      updatedAt: new Date(responseData.updatedAt),
    };
  },

  getCompletedDeliveries: async (token: string): Promise<Order[]> => {
    const client = createApiClient(token);
    const responseData = await client.get<any[]>('/delivery/completed'); // Fetch as any[]

    return responseData.map(order => ({
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      latitude: order.latitude ? parseFloat(order.latitude) : undefined,
      longitude: order.longitude ? parseFloat(order.longitude) : undefined,
    }));
  },

  getDeliveryStats: async (token: string): Promise<DeliveryStats> => {
    const client = createApiClient(token);
    // We just tell the client WHICH endpoint to GET
    const responseData = await client.get<DeliveryStats>(`/delivery/stats`); 
    return responseData;
  },
};