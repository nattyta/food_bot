import json
import re
import hmac
import hashlib
import os
import logging
from urllib.parse import parse_qs
from fastapi import APIRouter, HTTPException, Request, Header, Depends
from fastapi.responses import JSONResponse
from .database import DatabaseManager
from .schemas import UserCreate, OrderCreate, UserContactUpdate, ProfileUpdate
from .crud import create_user, update_user_contact
from .auth import get_current_user, telegram_auth, validate_init_data, parse_telegram_user
from .sessions import session_manager, generate_token,create_session
from pydantic import BaseModel
from .jwt import create_jwt
import datetime
router = APIRouter()
logger = logging.getLogger(__name__)



class TelegramAuthData(BaseModel):
    initData: str


router = APIRouter()

@router.post("/auth/telegram")
async def authenticate_user(
    request: Request,
    x_telegram_init_data: str = Header(None, alias="X-Telegram-Init-Data")
):
    """
    Authenticate Telegram user with WebApp initData
    Returns JWT token with user data
    """
    # 1. Validate presence of init data
    if not x_telegram_init_data:
        raise HTTPException(
            status_code=400,
            detail="Telegram auth required. Please provide X-Telegram-Init-Data header."
        )

    # 2. Get bot token from environment
    bot_token = os.getenv("Telegram_API")
    if not bot_token:
        raise HTTPException(
            status_code=500,
            detail="Server configuration error"
        )

    # 3. Validate initData signature
    if not validate_init_data(x_telegram_init_data, bot_token):
        raise HTTPException(
            status_code=403,
            detail="Invalid Telegram authentication data"
        )

    # 4. Parse user data
    try:
        tg_user = parse_telegram_user(x_telegram_init_data)
        if not tg_user.get("id"):
            raise ValueError("Missing user ID in Telegram data")
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid user data: {str(e)}"
        )

    # 5. Create JWT token
    try:
        token = create_jwt({
            "user_id": tg_user["id"],
            "username": tg_user.get("username"),
            "auth_time": datetime.utcnow().timestamp()
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Token creation failed: {str(e)}"
        )

    # 6. Return response
    return {
        "status": "authenticated",
        "token": token,
        "expires_in": 86400,  # 1 day in seconds
        "user": {
            "chat_id": tg_user["id"],
            "username": tg_user.get("username"),
            "first_name": tg_user.get("first_name"),
            "photo_url": tg_user.get("photo_url")
        }
    }




@router.post("/save_user")
def save_user(
    user_data: UserCreate,
    x_telegram_init_data: str = Header(None)
):
    """Save user data with Telegram validation"""
    try:
        if not x_telegram_init_data:
            raise HTTPException(400, "Telegram auth required")
            
        if not validate_init_data(x_telegram_init_data, os.getenv("Telegram_API")):
            raise HTTPException(403, "Invalid Telegram auth")

        tg_user = parse_telegram_user(x_telegram_init_data)
        if str(tg_user.get('id')) != str(user_data.chat_id):
            raise HTTPException(403, "User ID mismatch")

        user = create_user(user_data)
        return JSONResponse({
            "status": "success",
            "user": user,
            "message": "User saved successfully"
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save user: {str(e)}")
        raise HTTPException(500, "Failed to save user")

@router.post("/update-contact")
def update_contact(
    contact_data: UserContactUpdate,
    request: Request,
    chat_id: int = Depends(get_current_user)  # Requires valid session token
):
    """Update contact information (protected route)"""
    try:
        # Validate chat_id matches the authenticated user
        if str(chat_id) != str(contact_data.chat_id):
            raise HTTPException(403, "User ID mismatch")

        # Validate phone format
        if contact_data.phone and not re.fullmatch(r'^\+251[79]\d{8}$', contact_data.phone):
            raise HTTPException(400, "Invalid Ethiopian phone format")

        # Update contact info
        with DatabaseManager() as db:
            success = update_user_contact(
                chat_id=chat_id,
                phone=contact_data.phone,
                address=contact_data.address
            )
        
        if not success:
            raise HTTPException(500, "Failed to update contact")
            
        return {"status": "success", "updated": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Contact update failed: {str(e)}")
        raise HTTPException(500, "Internal server error")

@router.post("/api/update-profile")
def update_profile(
    profile_data: ProfileUpdate,
    chat_id: int = Depends(get_current_user)  # Protected route
):
    """Example protected endpoint"""
    try:
        with DatabaseManager() as db:
            db.execute(
                "UPDATE users SET profile_data = %s WHERE chat_id = %s",
                (json.dumps(profile_data.dict()), chat_id)
            )
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Profile update failed: {str(e)}")
        raise HTTPException(500, "Profile update failed")


@router.post("/api/start-session")
async def start_session(request: Request):
    """Initialize a new session with Telegram validation"""
    init_data = request.headers.get("x-telegram-init-data")
    if not init_data:
        raise HTTPException(status_code=400, detail="Telegram auth required")
    
    if not validate_init_data(init_data, os.getenv("Telegram_API")):
        raise HTTPException(status_code=403, detail="Invalid Telegram auth")
    
    user_data = parse_telegram_user(init_data)
    token = create_session(user_data["id"])
    
    return {
        "status": "authenticated",
        "token": token,
        "user": user_data
    }