from pydantic import BaseModel, EmailStr
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
        orm_mode = True # Helps map SQLAlchemy objects, but good practice anyway