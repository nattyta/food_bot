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
BOT_TOKEN = os.getenv("Telegram_API")
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
    BOT_TOKEN = os.getenv("Telegram_API")
    if not BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Bot token not configured")

    try:
        logging.info(f"📥 [Backend] Received initData: {x_telegram_init_data}")

        parsed_data = dict(parse_qsl(x_telegram_init_data, keep_blank_values=True))
        hash_from_telegram = parsed_data.pop("hash", None)
        logging.info(f"🔍 Parsed data (without hash): {parsed_data}")
        logging.info(f"🔑 Hash from Telegram: {hash_from_telegram}")

        sorted_data = sorted(f"{k}={v}" for k, v in parsed_data.items())
        data_check_string = "\n".join(sorted_data)

        secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()
        computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        logging.info(f"🧮 Computed hash: {computed_hash}")

        if computed_hash != hash_from_telegram:
            logging.error("❌ [Auth] Hash mismatch! Invalid initData.")
            raise HTTPException(status_code=401, detail="Invalid initData hash")

        # Simulate user object for now
        user = {
            "id": parsed_data.get("user", {}).get("id"),
            "first_name": parsed_data.get("user", {}).get("first_name"),
            "last_name": parsed_data.get("user", {}).get("last_name"),
            "username": parsed_data.get("user", {}).get("username"),
        }

        logging.info(f"✅ [Auth] Authenticated user: {user}")
        return {"user": user}

    except Exception as e:
        logging.exception(f"💥 [Auth] Exception occurred: {str(e)}")
        raise HTTPException(status_code=400, detail="Failed to validate Telegram initData")

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
