import { createApiClient } from './client';
import { Order } from './types'; // We can reuse the main Order type

export const kitchenApi = {
  // Fetches orders from our new dedicated endpoint
  getActiveOrders: async (token: string): Promise<Order[]> => {
    const client = createApiClient(token);
    const responseData = await client.get<Order[]>('/kitchen/orders');
    
    // The backend already returns dates as strings, but it's good practice
    // to ensure they are Date objects for the frontend.
    return responseData.map(order => ({
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
    }));
  },
};