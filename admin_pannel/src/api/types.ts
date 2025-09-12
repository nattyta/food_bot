export type StaffRole = 'kitchen' | 'delivery' | 'manager';
export type StaffStatus = 'active' | 'inactive';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'on_the_way' | 'delivered' | 'cancelled';
export type OrderType = 'dine-in' | 'takeout' | 'delivery';
export type PaymentStatus = 'paid' | 'unpaid' | 'pending';
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
  extras: MenuExtra[];
  modifications: string[];
}

export interface MenuExtra {
  name: string;
  price: number;
}


export interface Order {
  // This structure matches what the backend crud.py functions create
  id: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  status: OrderStatus;
  total: number;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  type: OrderType;
  specialInstructions?: string; // Note: plural, for the whole order
  // Optional display fields
  deliveryAddress?: string;
  deliveryStaffId?: string;
  orderTime?: string;
  estimatedTime?: string;
}

export interface OrderItem {
  id: string;
  menuItemName: string;
  quantity: number;
  price: number;
  addOns?: { name: string; price: number }[];
  extras?: { name: string; price: number }[];
  modifications?: { name: string }[];
  specialInstruction?: string; // Note: singular
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
}scrollY