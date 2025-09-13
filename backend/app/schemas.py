
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict,Any, Literal
from datetime import datetime

class OrderItem(BaseModel):
    id: str
    name: str
    price: float
    quantity: int
    addOns: List[Dict] = []
    extras: List[Dict] = []
    modifications: List[Dict] = []
    specialInstruction: str = ""


    

class UserCreate(BaseModel):
    chat_id: int
    session_token: str
    phone: Optional[str] = None
    address: Optional[str] = None


class Location(BaseModel):
    lat: float
    lng: float

class UserContactUpdate(BaseModel):
    chat_id: Optional[int] = None


class PaymentRequest(BaseModel):
    order_id: str
    amount: float
    phone: str
    payment_method: str
    currency: str


class ProfileUpdate(BaseModel):
    chat_id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_data: Optional[Dict] = None



class PhoneUpdateRequest(BaseModel):
    phone: str
    source: str  # 'telegram' or 'manual'

class OrderCreate(BaseModel):
    phone: str
    address: Optional[str] = None  
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_label: Optional[str] = None
    notes: Optional[str] = None
    items: List[Dict]  
    total_price: float
    is_guest_order: bool = False
    order_type: str = "pickup"

class AdminLoginRequest(BaseModel):
    username: EmailStr  # We use 'username' to match the db, but treat it as an email
    password: str
    role: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None



StaffRole = Literal['kitchen', 'delivery', 'manager']
StaffStatus = Literal['active', 'inactive']

class StaffBase(BaseModel):
    name: str
    role: StaffRole
    phone: str
    telegramId: Optional[str] = None
    status: StaffStatus

class StaffCreate(StaffBase):
    # When creating a new staff, a password is required for them to log in.
    password: str

class StaffUpdate(BaseModel):
    # All fields are optional when updating
    name: Optional[str] = None
    role: Optional[StaffRole] = None
    phone: Optional[str] = None
    telegramId: Optional[str] = None
    status: Optional[StaffStatus] = None

class StaffPublic(StaffBase):
    id: int
    ordersHandled: int
    rating: float
    lastActive: datetime
    averageTime: Optional[int] = None
    totalEarnings: Optional[float] = None

    class Config:
        from_mode = True # Helps map SQLAlchemy objects, but good practice anyway

class AdminInDB(BaseModel):
    id: int
    username: str
    password_hash: str
    role: str
    created_at: datetime
    last_login: Optional[datetime]

    

class DashboardStats(BaseModel):
    """
    Matches the DashboardStats type in the frontend's `types.ts`.
    """
    activeOrders: int
    activeOrdersChange: str
    avgPrepTime: str
    avgPrepTimeChange: str
    completedToday: int
    completedTodayChange: str
    revenueToday: str
    revenueTodayChange: str

class OrderItemDetail(BaseModel):
    """Matches the frontend `OrderItem` type exactly."""
    menuItemName: str
    quantity: int
    price: float

class Order(BaseModel):
    """Matches the frontend `Order` type exactly."""
    id: str
    customerName: str
    customerPhone: Optional[str]
    items: List[OrderItemDetail]
    status: Literal['pending', 'accepted', 'preparing', 'ready', 'on_the_way', 'delivered', 'cancelled']
    total: float
    paymentStatus: Literal['paid', 'unpaid', 'pending']
    createdAt: datetime
    updatedAt: datetime
    type: Optional[str] # Matches the 'type' field from crud.py
    estimatedDeliveryTime: Optional[datetime] = None
class StatusUpdate(BaseModel):
    """
    The model for the request body when updating an order's status.
    e.g., PUT /orders/{orderId}/status
    """
    status: str



class MenuExtra(BaseModel):
    name: str
    price: float

# Base schema for a menu item, containing all common fields
class MenuItemBase(BaseModel):
    name: str
    description: str
    price: float = Field(..., gt=0) # Price must be greater than 0
    category: str
    prepTime: int = Field(alias="prepTime", default=5)
    image: Optional[str] = None
    available: bool = Field(default=True)
    allergens: List[str] = []
    extras: List[MenuExtra] = []
    modifications: List[str] = []

# Schema used when creating a new menu item (inherits from base)
class MenuItemCreate(MenuItemBase):
    pass

# Schema used when updating a menu item (all fields are optional)
class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    prepTime: Optional[int] = Field(alias="prepTime", default=None)
    image: Optional[str] = None
    available: Optional[bool] = None
    allergens: Optional[List[str]] = None
    extras: Optional[List[MenuExtra]] = None
    modifications: Optional[List[str]] = None

# Schema for the menu item returned from the API (includes the ID)
class MenuItem(MenuItemBase):
    id: int

    class Config:
        orm_mode = True # Helps Pydantic work with ORM objects
        allow_population_by_field_name = True # Allows using "prepTime" from frontend


class MenuItemResponse(BaseModel):
    data: MenuItem

class MenuItemListResponse(BaseModel):
    data: List[MenuItem]


class AnalyticsStatCard(BaseModel):
    """Data for the key metric cards at the top."""
    totalRevenue: float
    totalOrders: int
    averageOrderValue: float
    newCustomers: int # Number of customers in the period
    # Note: We'll keep rating and prep time static for now as they require more complex data sources.

class DailyTrendItem(BaseModel):
    """Data for the weekly revenue/orders bar chart."""
    name: str  # e.g., 'Mon', 'Tue'
    revenue: float
    orders: int

class PopularItem(BaseModel):
    """Data for the popular items pie chart."""
    name: str
    value: int  # Represents the number of times ordered

class HourlyTrendItem(BaseModel):
    """Data for the order volume by hour line chart."""
    time: str # e.g., '09:00'
    orders: int

class AnalyticsData(BaseModel):
    """The main payload for the entire analytics page."""
    stats: AnalyticsStatCard
    salesData: List[DailyTrendItem]
    popularItems: List[PopularItem]
    orderTrends: List[HourlyTrendItem]