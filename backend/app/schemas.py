from pydantic import BaseModel
from typing import Optional

class OrderCreate(BaseModel):
    item: str
    quantity: int
    price: float
