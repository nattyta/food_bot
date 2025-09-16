import { createApiClient } from './client';
import { 
  RestaurantSettings, 
  BusinessHours, 
  NotificationSettings, 
  PaymentSettings, 
  AccountSettings, 
  WorkStatus,
  ApiResponse 
} from './types';

export const settingsApi = {
  // Restaurant Settings
  getRestaurantSettings: async (token: string): Promise<RestaurantSettings> => {
    const client = createApiClient(token);
    const response = await client.get<ApiResponse<RestaurantSettings>>('/settings/restaurant');
    return response.data;
  },

  updateRestaurantSettings: async (token: string, settings: RestaurantSettings): Promise<RestaurantSettings> => {
    const client = createApiClient(token);
    const response = await client.put<ApiResponse<RestaurantSettings>>('/settings/restaurant', settings);
    return response.data;
  },

  // Business Hours
  getBusinessHours: async (token: string): Promise<BusinessHours> => {
    const client = createApiClient(token);
    const response = await client.get<ApiResponse<BusinessHours>>('/settings/business-hours');
    return response.data;
  },

  updateBusinessHours: async (token: string, hours: BusinessHours): Promise<BusinessHours> => {
    const client = createApiClient(token);
    const response = await client.put<ApiResponse<BusinessHours>>('/settings/business-hours', hours);
    return response.data;
  },

  // Notification Settings
  getNotificationSettings: async (token: string): Promise<NotificationSettings> => {
    const client = createApiClient(token);
    const response = await client.get<ApiResponse<NotificationSettings>>('/settings/notifications');
    return response.data;
  },

  updateNotificationSettings: async (token: string, settings: NotificationSettings): Promise<NotificationSettings> => {
    const client = createApiClient(token);
    const response = await client.put<ApiResponse<NotificationSettings>>('/settings/notifications', settings);
    return response.data;
  },

  // Payment Settings
  getPaymentSettings: async (token: string): Promise<PaymentSettings> => {
    const client = createApiClient(token);
    const response = await client.get<ApiResponse<PaymentSettings>>('/settings/payments');
    return response.data;
  },

  updatePaymentSettings: async (token: string, settings: PaymentSettings): Promise<PaymentSettings> => {
    const client = createApiClient(token);
    const response = await client.put<ApiResponse<PaymentSettings>>('/settings/payments', settings);
    return response.data;
  },

  // Account Settings
  getAccountSettings: async (token: string): Promise<AccountSettings> => {
    const client = createApiClient(token);
    const response = await client.get<ApiResponse<AccountSettings>>('/settings/account');
    return response.data;
  },

  updateAccountSettings: async (token: string, settings: AccountSettings): Promise<AccountSettings> => {
    const client = createApiClient(token);
    const response = await client.put<ApiResponse<AccountSettings>>('/settings/account', settings);
    return response.data;
  },

  // Work Status (for delivery staff)
  getWorkStatus: async (token: string): Promise<WorkStatus> => {
    const client = createApiClient(token);
    const response = await client.get<ApiResponse<WorkStatus>>('/settings/work-status');
    return response.data;
  },

  updateWorkStatus: async (token: string, status: WorkStatus): Promise<WorkStatus> => {
    const client = createApiClient(token);
    const response = await client.put<ApiResponse<WorkStatus>>('/settings/work-status', status);
    return response.data;
  }
};