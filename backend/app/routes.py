import json
import re
import os
import logging
from fastapi import APIRouter, HTTPException, Request, Header, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from urllib.parse import parse_qsl
from .database import DatabaseManager
from .schemas import UserCreate, UserContactUpdate, ProfileUpdate
from .crud import create_user, update_user_contact
from .auth import validate_init_data
import hashlib
import hmac

logger = logging.getLogger(__name__)

router = APIRouter()

# Load bot token once globally
BOT_TOKEN = os.getenv("Telegram_API", "").strip()

if not BOT_TOKEN:
    logger.error("Telegram_API env var is not set!")

# Pydantic model for the auth request body
class InitDataPayload(BaseModel):
    initData: str

# Dependency that validates Telegram initData on protected routes
async def telegram_auth_dependency(request: Request):
    init_data = request.headers.get('x-telegram-init-data')
    if not init_data:
        raise HTTPException(status_code=401, detail="Missing Telegram initData header")

    try:
        user = validate_init_data(init_data, BOT_TOKEN)
        logger.warning(f"⚠️  Using token for validation: {repr(bot_token)}")
        logger.debug(f"Bot token from env: {repr(os.getenv('Telegram_API'))}")
        request.state.telegram_user = user
        return user.get("id")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Telegram auth validation failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Telegram initData")

@router.post("/auth/telegram")
async def authenticate_via_telegram(request: Request, x_telegram_init_data: str = Header(None)):
    
    # Token validation
    if not BOT_TOKEN:
        logger.critical("❌ BOT TOKEN NOT CONFIGURED!")
        raise HTTPException(status_code=500, detail="Bot token not configured")
    
    # Log token info (partial for security)
    logger.debug(f"🔑 Using Bot Token: {BOT_TOKEN[:3]}...{BOT_TOKEN[-3]}")
    logger.debug(f"🔑 Token Length: {len(BOT_TOKEN)}")

    if not x_telegram_init_data:
        logger.warning("⚠️ Missing Telegram initData header")
        raise HTTPException(status_code=401, detail="Missing Telegram initData")

    try:
        logger.info(f"📥 [Backend] Received initData header (truncated): {x_telegram_init_data[:50]}...")
        
        # Validate and get user data
        user = validate_init_data(x_telegram_init_data, BOT_TOKEN)
        logger.info(f"✅ [Auth] Authenticated user: {user.get('user', {}).get('id')}")
        
        return {"status": "success", "user": user}

    except HTTPException as he:
        logger.error(f"🔒 Auth failed: {he.detail}")
        raise
    except Exception as e:
        logger.exception(f"💥 Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
# Save user info route — requires Telegram auth header validation
@router.post("/save_user")
def save_user(
    user_data: UserCreate,
    x_telegram_init_data: str = Header(None)
):
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Telegram auth required")

    if not validate_init_data(x_telegram_init_data, BOT_TOKEN):
        raise HTTPException(status_code=403, detail="Invalid Telegram auth")

    tg_user = parse_telegram_user(x_telegram_init_data)
    if str(tg_user.get('id')) != str(user_data.chat_id):
        raise HTTPException(status_code=403, detail="User ID mismatch")

    user = create_user(user_data)
    return JSONResponse({
        "status": "success",
        "user": user,
        "message": "User saved successfully"
    })

# Protected route to update contact info
@router.post("/update-contact")
def update_contact(
    contact_data: UserContactUpdate,
    chat_id: int = Depends(telegram_auth_dependency)  # Use Telegram initData auth
):
    if str(chat_id) != str(contact_data.chat_id):
        raise HTTPException(status_code=403, detail="User ID mismatch")

    # Validate Ethiopian phone format (if provided)
    if contact_data.phone and not re.fullmatch(r'^\+251[79]\d{8}$', contact_data.phone):
        raise HTTPException(status_code=400, detail="Invalid Ethiopian phone format")

    try:
        with DatabaseManager() as db:
            success = update_user_contact(
                chat_id=chat_id,
                phone=contact_data.phone,
                address=contact_data.address
            )
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update contact")
    except Exception as e:
        logger.error(f"Contact update failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

    return {"status": "success", "updated": True}

# Protected route example: update profile
@router.post("/api/update-profile")
def update_profile(
    profile_data: ProfileUpdate,
    chat_id: int = Depends(telegram_auth_dependency)  # Use Telegram initData auth
):
    try:
        with DatabaseManager() as db:
            db.execute(
                "UPDATE users SET profile_data = %s WHERE chat_id = %s",
                (json.dumps(profile_data.dict()), chat_id)
            )
    except Exception as e:
        logger.error(f"Profile update failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Profile update failed")

    return {"status": "success"}




    # Add to routes.py
@router.get("/debug/token")
async def debug_token():
    token = os.getenv("Telegram_API", "").strip()
    return {
        "token_exists": bool(token),
        "token_length": len(token),
        "token_prefix": token[:5] + "..." + token[-5:] if token else None,
        "token_match": token == "YOUR_ACTUAL_TOKEN"  # Replace with your actual token
    }