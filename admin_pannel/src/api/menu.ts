import { createApiClient } from './client';
import { MenuItem, ApiResponse } from './types';

export const menuApi = {
  getAll: async (token: string, category?: string): Promise<MenuItem[]> => {
    const client = createApiClient(token);
    const endpoint = category && category !== 'All' ? `/menu?category=${encodeURIComponent(category)}` : '/menu';
    const response = await client.get<ApiResponse<MenuItem[]>>(endpoint);
    return response.data;
  },

  create: async (token: string, menuItem: Omit<MenuItem, 'id'>): Promise<MenuItem> => {
    const client = createApiClient(token);
    const response = await client.post<ApiResponse<MenuItem>>('/menu', menuItem);
    return response.data;
  },

  update: async (token: string, itemId: string, menuItem: Partial<MenuItem>): Promise<MenuItem> => {
    const client = createApiClient(token);
    const response = await client.put<ApiResponse<MenuItem>>(`/menu/${itemId}`, menuItem);
    return response.data;
  },

  delete: async (token: string, itemId: string): Promise<void> => {
    const client = createApiClient(token);
    await client.delete<ApiResponse<void>>(`/menu/${itemId}`);
  },

  toggleAvailability: async (token: string, itemId: string, available: boolean): Promise<MenuItem> => {
    const client = createApiClient(token);
    const response = await client.put<ApiResponse<MenuItem>>(`/menu/${itemId}`, { available });
    return response.data;
  }
};