import { createApiClient } from './client';
import { RestaurantSettings, ApiResponse } from './types';

export const settingsApi = {
  get: async (token: string): Promise<RestaurantSettings> => {
    const client = createApiClient(token);
    const response = await client.get<ApiResponse<RestaurantSettings>>('/settings/restaurant');
    return response.data;
  },

  update: async (token: string, settingsData: RestaurantSettings): Promise<RestaurantSettings> => {
    const client = createApiClient(token);
    const response = await client.put<ApiResponse<RestaurantSettings>>('/settings/restaurant', settingsData);
    return response.data;
  },
};