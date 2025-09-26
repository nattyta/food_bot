// src/api/settings.ts
import { createApiClient } from './client';
import { 
  RestaurantSettings, 
  BusinessHours, 
  NotificationSettings, 
  PaymentSettings, 
  AccountSettings, 
  WorkStatus,
} from './types';

export const settingsApi = {
  // Restaurant Settings
  getRestaurantSettings: async (token: string): Promise<RestaurantSettings> => {
    const client = createApiClient(token);
    return client.get<RestaurantSettings>('/settings/restaurant');
  },

  updateRestaurantSettings: async (token: string, settings: RestaurantSettings): Promise<RestaurantSettings> => {
    const client = createApiClient(token);
    return client.put<RestaurantSettings>('/settings/restaurant', settings);
  },

  // Business Hours
  getBusinessHours: async (token: string): Promise<BusinessHours> => {
    const client = createApiClient(token);
    return client.get<BusinessHours>('/settings/business-hours');
  },

  updateBusinessHours: async (token: string, hours: BusinessHours): Promise<BusinessHours> => {
    const client = createApiClient(token);
    return client.put<BusinessHours>('/settings/business-hours', hours);
  },

  // Notification Settings
  getNotificationSettings: async (token: string): Promise<NotificationSettings> => {
    const client = createApiClient(token);
    return client.get<NotificationSettings>('/settings/notifications');
  },

  updateNotificationSettings: async (token: string, settings: NotificationSettings): Promise<NotificationSettings> => {
    const client = createApiClient(token);
    return client.put<NotificationSettings>('/settings/notifications', settings);
  },

  // Payment Settings
  getPaymentSettings: async (token: string): Promise<PaymentSettings> => {
    const client = createApiClient(token);
    return client.get<PaymentSettings>('/settings/payments');
  },

  // --- THIS IS THE FULLY CORRECTED FUNCTION ---
  updatePaymentSettings: async (token: string, settings: PaymentSettings): Promise<PaymentSettings> => {
    const client = createApiClient(token);
    return client.put<PaymentSettings>('/settings/payments', settings);
  },

  // Account Settings
  getAccountSettings: async (token: string): Promise<AccountSettings> => {
    const client = createApiClient(token);
    return client.get<AccountSettings>('/settings/account');
  },

  updateAccountSettings: async (token: string, settings: AccountSettings): Promise<AccountSettings> => {
    const client = createApiClient(token);
    return client.put<AccountSettings>('/settings/account', settings);
  },

  // Work Status (for delivery staff)
  getWorkStatus: async (token: string): Promise<WorkStatus> => {
    const client = createApiClient(token);
    // --- THIS IS THE FIX: Use the correct URL ---
    return client.get<WorkStatus>('/settings/work-status');
  },
  
  updateWorkStatus: async (token: string, newStatus: WorkStatus): Promise<WorkStatus> => {
    const client = createApiClient(token);
    // --- THIS IS THE FIX: Use the correct URL ---
    return client.put<WorkStatus>('/settings/work-status', newStatus);
  },

  updateStaffProfile: async (token: string, settings: { name: string; phone: string; }): Promise<AccountSettings> => {
    const client = createApiClient(token);
    return client.put<AccountSettings>('/settings/profile', settings);
  },

  updatePassword: async (token: string, data: { oldPassword: string; newPassword: string }): Promise<void> => {
    const client = createApiClient(token);
    await client.put('/settings/password', data);
  },
};