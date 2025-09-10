// Base API client configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:10000';

export const createApiClient = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return {
    get: async <T>(endpoint: string): Promise<T> => {
      const response = await fetch(`${API_URL}/api/v1/admin${endpoint}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    },

    post: async <T>(endpoint: string, data?: any): Promise<T> => {
      const response = await fetch(`${API_URL}/api/v1/admin${endpoint}`, {
        method: 'POST',
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    },

    put: async <T>(endpoint: string, data?: any): Promise<T> => {
      const response = await fetch(`${API_URL}/api/v1/admin${endpoint}`, {
        method: 'PUT',
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    },

    delete: async <T>(endpoint: string): Promise<T> => {
      const response = await fetch(`${API_URL}/api/v1/admin${endpoint}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    },
  };
};