import { createApiClient } from './client';
import { Staff } from './types'; // We don't need ApiResponse here anymore

// The API_URL and BASE_URL constants are not used if createApiClient handles the base URL,
// but we can leave them here for clarity or future use.
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:10000';
const BASE_URL = `${API_URL}/api/v1/admin/staff`;

export const staffApi = {
  /**
   * Fetches all staff members.
   * The client.get method already returns the unwrapped data array from the { "data": [...] } response.
   */
  getAll: async (token: string): Promise<Staff[]> => {
    const client = createApiClient(token);
    
    // --- THIS IS THE FIX ---
    // client.get('/staff') will return the array of staff directly.
    // We assign it to `staffList`, which is now correctly typed as Staff[].
    const staffList = await client.get<Staff[]>('/staff');
    
    // Now we can safely map over the staffList array.
    return staffList.map(staff => ({
      ...staff,
      // Add a safety check: if lastActive is null or undefined, use the current time as a fallback.
      lastActive: new Date(staff.lastActive || Date.now())
    }));
  },

  /**
   * Creates a new staff member.
   */
  create: async (token: string, staffData: Omit<Staff, 'id' | 'ordersHandled' | 'rating' | 'lastActive'> & { password: string }): Promise<Staff> => {
    const client = createApiClient(token);

    // --- THIS IS THE FIX ---
    // client.post() will return the newly created staff object directly.
    const newStaff = await client.post<Staff>('/staff', staffData);
    
    return {
      ...newStaff,
      lastActive: new Date(newStaff.lastActive || Date.now())
    };
  },

  /**
   * Updates an existing staff member.
   */
  update: async (token: string, staffId: string, staffData: Partial<Staff>): Promise<Staff> => {
    const client = createApiClient(token);

    // --- THIS IS THE FIX ---
    // client.put() will return the updated staff object directly.
    const updatedStaff = await client.put<Staff>(`/staff/${staffId}`, staffData);
    
    return {
      ...updatedStaff,
      lastActive: new Date(updatedStaff.lastActive || Date.now())
    };
  },

  /**
   * Deletes a staff member.
   */
  delete: async (token: string, staffId: string): Promise<void> => {
    const client = createApiClient(token);
    // Delete requests don't return a body, so this call is fine as is.
    await client.delete<void>(`/staff/${staffId}`);
  }
};