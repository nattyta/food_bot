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
from .sessions import session_manager

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/auth/telegram")
def authenticate_user(
    request: Request,
    x_telegram_init_data: str = Header(None)
):
    if not x_telegram_init_data:
        raise HTTPException(400, "Telegram auth required")

    is_valid = validate_init_data(x_telegram_init_data, os.getenv("Telegram_API"))

    if not is_valid:
        raise HTTPException(403, "Invalid Telegram auth")

    tg_user = parse_telegram_user(x_telegram_init_data)

    token = session_manager.create_session(tg_user['id'])

    return {
        "token": token,
        "expires_in": 86400,
        "chat_id": tg_user['id'],
        "user": tg_user  # optional: helpful for frontend to display name, pic, etc.
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