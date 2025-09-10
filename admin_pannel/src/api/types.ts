export type StaffRole = 'kitchen' | 'delivery' | 'manager';
export type StaffStatus = 'active' | 'inactive';
export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  phone: string;
  telegramId?: string;
  status: StaffStatus;
  ordersHandled: number;
  rating: number;
  lastActive: Date;
  averageTime?: number;
  totalEarnings?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  prepTime: number;
  image?: string;
  available: boolean;
  allergens: string[];
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'on_the_way' | 'delivered' | 'cancelled';
  total: number;
  paymentStatus: 'paid' | 'unpaid';
  createdAt: Date;
  updatedAt: Date;
  specialInstructions?: string;
  deliveryAddress?: string;
  deliveryStaffId?: string;
  estimatedDeliveryTime?: Date;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  price: number;
  modifications?: string[];
  specialInstructions?: string;
}

export interface DashboardStats {
  activeOrders: number;
  avgPrepTime: string;
  completedToday: number;
  revenueToday: string;
  activeOrdersChange: string;
  avgPrepTimeChange: string;
  completedTodayChange: string;
  revenueTodayChange: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  status: number;
  details?: any;
}