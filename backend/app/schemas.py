from pydantic import BaseModel
from typing import List, Optional, Dict,Any


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

# Add this new class
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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_label: Optional[str] = None
    notes: Optional[str] = None
    items: List[Dict]  # Changed to List[Dict] to match frontend
    total_price: float
    is_guest_order: bool = False

    class OrderContactInfo(BaseModel):
    phone: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_label: Optional[str] = None

@router.post("/order-contact-info")
async def save_order_contact_info(
    contact_info: OrderContactInfo,
    request: Request,
    chat_id: int = Depends(telegram_auth_dependency)
):
    # Validate phone format
    if not re.fullmatch(r'^\+251[79]\d{8}$', contact_info.phone):
        raise HTTPException(status_code=400, detail="Invalid Ethiopian phone format")
    
    # This info will be stored with the order later
    return {
        "status": "success",
        "message": "Contact info saved for order",
        "contact_info": contact_info.dict()
    }