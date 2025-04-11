from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    chat_id: int
    session_token: str  # New field
    phone: Optional[str] = None
    address: Optional[str] = None

class OrderCreate(BaseModel):
    item: str
    quantity: int
    price: float
    user_chat_id: int  # Changed from user_id to chat_id