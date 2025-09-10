import { createApiClient } from './client';
import { Staff, ApiResponse } from './types';


const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:10000';
const BASE_URL = `${API_URL}/api/v1/admin/staff`;

const authFetch = async (url: string, token: string, options: RequestInit = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'API request failed');
  }
  return response.json();
};

export const staffApi = {
  getAll: async (token: string): Promise<Staff[]> => {
    const client = createApiClient(token);
    const response = await client.get<ApiResponse<Staff[]>>('/staff');
    return response.data.map(staff => ({
      ...staff,
      lastActive: new Date(staff.lastActive)
    }));
  },

  create: async (token: string, staffData: Omit<Staff, 'id' | 'ordersHandled' | 'rating' | 'lastActive'> & { password: string }): Promise<Staff> => {
    const client = createApiClient(token);
    const response = await client.post<ApiResponse<Staff>>('/staff', staffData);
    return {
      ...response.data,
      lastActive: new Date(response.data.lastActive)
    };
  },

  update: async (token: string, staffId: string, staffData: Partial<Staff>): Promise<Staff> => {
    const client = createApiClient(token);
    const response = await client.put<ApiResponse<Staff>>(`/staff/${staffId}`, staffData);
    return {
      ...response.data,
      lastActive: new Date(response.data.lastActive)
    };
  },

  delete: async (token: string, staffId: string): Promise<void> => {
    const client = createApiClient(token);
    await client.delete<ApiResponse<void>>(`/staff/${staffId}`);
  }
};