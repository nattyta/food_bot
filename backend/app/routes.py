import json
from fastapi import APIRouter, Depends, HTTPException, Header,Request
from fastapi.security import APIKeyHeader
from .schemas import UserCreate, OrderCreate, UserContactUpdate
from .crud import create_user, update_user_contact
import hmac
import hashlib
import logging
from fastapi.responses import Response,JSONResponse
from fastapi import Depends

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


# Add to your routes.py
def get_telegram_user(init_data: str):
    """Parse Telegram WebApp initData to get user info"""
    from urllib.parse import parse_qs
    try:
        parsed = parse_qs(init_data)
        return json.loads(parsed.get('user', ['{}'])[0])
    except Exception as e:
        raise ValueError(f"Invalid initData: {str(e)}")

@router.post("/update-contact")
def update_contact(
    contact_data: UserContactUpdate,
    x_telegram_init_data: str = Header(None)
):
    if not x_telegram_init_data:
        raise HTTPException(400, "Telegram auth required")
    
    try:
        # Verify the request comes from Telegram
        tg_user = get_telegram_user(x_telegram_init_data)
        
        # Double-check chat_id matches
        if str(tg_user.get('id')) != str(contact_data.chat_id):
            raise HTTPException(403, "User ID mismatch")
            
        # Process update...
        success = update_user_contact(
            chat_id=contact_data.chat_id,
            phone=contact_data.phone,
            address=contact_data.address
        )
        
        return {"status": "success", "user_id": tg_user.get('id')}
    except Exception as e:
        raise HTTPException(400, detail=str(e))

@router.post("/update-contact")
def update_contact(contact_data: UserContactUpdate):
    try:
        # Debug logging
        print(f"Attempting to update contact for chat_id: {contact_data.chat_id}")
        
        # Validate required fields
        if not contact_data.chat_id:
            raise HTTPException(status_code=400, detail="Missing chat_id")
        
        # Synchronous database update
        success = update_user_contact(
            chat_id=contact_data.chat_id,
            phone=contact_data.phone,
            address=contact_data.address
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Database update failed")
            
        return JSONResponse({
            "status": "success", 
            "updated": True,
            "chat_id": contact_data.chat_id
        })
        
    except Exception as e:
        print(f"Error updating contact: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))