export type StaffRole = 'kitchen' | 'delivery' | 'manager' ;
export type UserRole = 'admin' | 'manager' | 'kitchen' | 'delivery';
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
  deliveryStaffId?: number;
  orderTime?: string;
  estimatedTime?: string;
  latitude?: number;
  longitude?: number;
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


export interface AnalyticsStatCard {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  newCustomers: number;
}

export interface DailyTrendItem {
  name: string;
  revenue: number;
  orders: number;
}

export interface PopularItem {
  name: string;
  value: number;
  color?: string; // Color is a UI concern, we'll add it on the frontend
}

export interface HourlyTrendItem {
  time: string;
  orders: number;
}

export interface TopCustomer {
  name: string | null;
  value: number;
}

export interface CustomerSegment {
  name: string; // "New Customers" or "Returning Customers"
  value: number;
}


export interface AnalyticsData {
  stats: AnalyticsStatCard;
  salesData: DailyTrendItem[];
  popularItems: PopularItem[];
  orderTrends: HourlyTrendItem[];
  availableCategories: string[];
  // --- ADD THESE NEW FIELDS ---
  topSpenders: TopCustomer[];
  mostFrequentCustomers: TopCustomer[];
  customerSegments: CustomerSegment[];
}



export interface RestaurantSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  taxRate: string;
  deliveryRadius: string;
  minimumOrder: string;
}

export interface BusinessHours {
  [key: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

export interface NotificationSettings {
  newOrders: boolean;
  orderUpdates: boolean;
  deliveryAlerts: boolean;
  lowStock: boolean;
  dailyReports: boolean;
  weeklyReports: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export interface PaymentSettings {
  cashEnabled: boolean;
  cardEnabled: boolean;
  digitalWalletEnabled: boolean;
  chapaConnected: boolean;
}

export interface AccountSettings {
  name: string;
  phone: string;
  email: string;
}

export interface WorkStatus {
  available: boolean;
  lastStatusChange: string;
}


export interface DeliveryStats {
  totalDeliveries: number;
  todayDeliveries: number;
  averageTime: number;
  averageRating: number;
  earnings: number;
}

// We can re-use the existing `Order` type for DeliveryOrder

export interface DeliveryDashboardData {
  stats: DeliveryStats;
  orders: Order[]; // Use the existing Order type
}