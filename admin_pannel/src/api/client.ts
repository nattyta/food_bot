// src/api/client.ts

// Use the VITE_API_BASE_URL for consistency with the rest of your app
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:10000';

/**
 * Creates a client for interacting with the backend API.
 * This version is built with the native Fetch API and can intelligently handle
 * both JSON and FormData payloads.
 * 
 * @param token The JWT token for authentication.
 * @returns An object with get, post, put, and delete methods.
 */
export const createApiClient = (token?: string) => {
  // --- This is the new, more flexible approach ---
  const performRequest = async <T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any
  ): Promise<T> => {

    const baseHeaders: Record<string, string> = {};
    if (token) {
      baseHeaders.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers: baseHeaders,
    };

    // --- Intelligent Payload Handling ---
    if (data) {
      if (data instanceof FormData) {
        // If the body is FormData, DO NOT set the 'Content-Type' header.
        // The browser will automatically set it to 'multipart/form-data'
        // with the correct boundary, which is required for file uploads.
        config.body = data;
      } else {
        // If it's any other kind of data, assume it's JSON.
        baseHeaders['Content-Type'] = 'application/json';
        config.body = JSON.stringify(data);
      }
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/admin${endpoint}`, config);

    if (!response.ok) {
      // Try to parse error details from the response body
      const errorData = await response.json().catch(() => ({})); // Gracefully handle non-JSON error responses
      const detail = errorData.detail || `API Error: ${response.status} ${response.statusText}`;
      throw new Error(detail);
    }
    
    // Handle responses that might not have a body (like a 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  };

  return {
    get: <T>(endpoint: string): Promise<T> => performRequest<T>(endpoint, 'GET'),
    post: <T>(endpoint: string, data?: any): Promise<T> => performRequest<T>(endpoint, 'POST', data),
    put: <T>(endpoint: string, data?: any): Promise<T> => performRequest<T>(endpoint, 'PUT', data),
    delete: <T>(endpoint: string): Promise<T> => performRequest<T>(endpoint, 'DELETE'),
  };
};