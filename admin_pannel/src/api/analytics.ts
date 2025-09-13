import { createApiClient } from './client';
import { AnalyticsData } from './types';

export const analyticsApi = {
  /**
   * Fetches the complete analytics data payload from the backend for a given period.
   * @param token The auth token.
   * @param period A string representing the time period (e.g., '7d', '30d').
   */
  getData: async (token: string, period: string): Promise<AnalyticsData> => {
    const client = createApiClient(token);
    // Pass the period as a URL query parameter
    const response = await client.get<AnalyticsData>(`/analytics?period=${period}`);
    return response;
  },
};