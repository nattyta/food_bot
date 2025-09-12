import { createApiClient } from './client';
import { MenuItem, ApiResponse } from './types';

export const menuApi = {
  /**
   * Fetches all menu items, with an optional filter for category.
   * Expects the API to return a response shaped like { data: MenuItem[] }.
   */
  getAll: async (token: string, category?: string): Promise<MenuItem[]> => {
    const client = createApiClient(token);
    const endpoint = category && category !== 'All' ? `/menu?category=${encodeURIComponent(category)}` : '/menu';
    const response = await client.get<ApiResponse<MenuItem[]>>(endpoint);
    return response.data;
  },

  /**
   * Creates a new menu item.
   * Sends the menu item data and expects a response shaped like { data: MenuItem }.
   */
  create: async (token: string, menuItem: Omit<MenuItem, 'id'>): Promise<MenuItem> => {
    const client = createApiClient(token);
    const response = await client.post<ApiResponse<MenuItem>>('/menu', menuItem);
    return response.data;
  },

  /**
   * Updates an existing menu item by its ID.
   * Sends the partial menu item data and expects a response shaped like { data: MenuItem }.
   */
  update: async (token: string, itemId: number | string, menuItem: Partial<MenuItem>): Promise<MenuItem> => {
    const client = createApiClient(token);
    const response = await client.put<ApiResponse<MenuItem>>(`/menu/${itemId}`, menuItem);
    return response.data;
  },

  /**
   * Deletes a menu item by its ID.
   * Does not return any content on success.
   */
  delete: async (token: string, itemId: number | string): Promise<void> => {
    const client = createApiClient(token);
    await client.delete<ApiResponse<void>>(`/menu/${itemId}`);
  },

  /**
   * Toggles the availability status of a menu item.
   * This is a specific case of an update operation.
   */
  toggleAvailability: async (token: string, itemId: number | string, available: boolean): Promise<MenuItem> => {
    const client = createApiClient(token);
    // This uses the same update endpoint, just with a specific payload.
    const response = await client.put<ApiResponse<MenuItem>>(`/menu/${itemId}`, { available });
    return response.data;
  },

  /**
   * Uploads an image file to the server.
   * Sends FormData and expects a direct JSON response like { url: string }.
   * This endpoint does NOT use the ApiResponse wrapper.
   */
  uploadImage: async (token: string, file: File): Promise<{ url: string }> => {
    const client = createApiClient(token);
    
    const formData = new FormData();
    formData.append('file', file);

    // --- THIS IS THE FIX ---
    // Remove the third argument. The new client handles FormData automatically.
    const response = await client.post<{ url: string }>('/upload/image', formData);
    
    return response;
  },

};