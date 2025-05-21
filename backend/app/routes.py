from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import APIKeyHeader
from .schemas import UserCreate, OrderCreate, UserContactUpdate
from .crud import create_user, update_user_contact
import hmac
import hashlib
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Telegram auth security
async def verify_init_data(init_data: str):
    # Implement Telegram WebApp initData validation
    # https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
    pass

@router.post("/save_user")
async def save_user(
    user_data: UserCreate,
    init_data: str = Depends(verify_init_data)
):
    user = create_user(user_data)
    return {"message": "User saved successfully", "user": user}




@router.post("/update-contact")
def update_contact(contact_data: UserContactUpdate):  
    try:
        success = update_user_contact(  
            chat_id=contact_data.chat_id,
            phone=contact_data.phone,
            address=contact_data.address
        )
        return {"status": "success", "updated": success}
    except Exception as e:
        logger.error(f"Update failed: {e}")
        raise HTTPException(400, detail=str(e))