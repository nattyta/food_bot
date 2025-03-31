from pydantic import BaseModel
from typing import Optional



class UserCreate(BaseModel):
    chat_id: int
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None

class OrderCreate(BaseModel):
    item: str
    quantity: int
    price: float
