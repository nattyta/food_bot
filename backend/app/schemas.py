from pydantic import BaseModel
from typing import List, Optional, Dict,Any


class OrderItem(BaseModel):
    id: str
    name: str
    price: float
    quantity: int
    extras: List[Dict] = []
    specialInstruction: str = ""

class OrderCreate(BaseModel):
    chat_id: int  # Changed to match your frontend
    phone: str
    address: Optional[str] = None
    order_type: str
    items: List[OrderItem]  # Properly typed items list
    total_price: float
    

class UserCreate(BaseModel):
    chat_id: int
    session_token: str
    phone: Optional[str] = None
    address: Optional[str] = None


class Location(BaseModel):
    lat: float
    lng: float

# Add this new class
class UserContactUpdate(BaseModel):
    chat_id: int
    phone: str
    address: Optional[str] = None
    location: Optional[Dict[str, Any]] = None

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