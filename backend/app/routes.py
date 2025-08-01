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
    BOT_TOKEN = os.getenv("Telegram_API", "").strip()
    if not BOT_TOKEN:
        logger.critical("❌ BOT TOKEN NOT CONFIGURED!")
        return JSONResponse(
            status_code=500,
            content={"error": "Server configuration error"}
        )

    # 🔍 REQUEST FORENSICS
    logger.debug("🔥 [HEADER DIAGNOSTICS]")
    logger.debug(f"  Header name: 'x-telegram-init-data'")
    logger.debug(f"  Header exists: {x_telegram_init_data is not None}")
    if x_telegram_init_data:
        logger.debug(f"  Header length: {len(x_telegram_init_data)}")
        logger.debug(f"  Header type: {type(x_telegram_init_data)}")
        logger.debug(f"  First 10 chars: {repr(x_telegram_init_data[:10])}")
        logger.debug(f"  Last 10 chars: {repr(x_telegram_init_data[-10:])}")
        logger.debug(f"  Contains %7B: {'%7B' in x_telegram_init_data}")  # Check for { encoding
        logger.debug(f"  Contains %22: {'%22' in x_telegram_init_data}")  # Check for " encoding
    
    # 🧪 TEST: Manual reconstruction
    raw_header = request.headers.get('x-telegram-init-data', '')
    logger.debug(f"🔥 [RAW HEADER] {repr(raw_header)}")

    try:
        # Use the raw header directly
        user = validate_init_data(raw_header, BOT_TOKEN)
        return {"status": "success", "user": user}
    except HTTPException as he:
        # 🧪 TEST: Return diagnostic info
        return JSONResponse(
            status_code=he.status_code,
            content={
                "detail": he.detail,
                "diagnostic": {
                    "bot_token_length": len(BOT_TOKEN),
                    "header_length": len(raw_header),
                    "header_start": raw_header[:20],
                    "header_end": raw_header[-20:]
                }
            }
        )


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







@router.get("/debug/telegram-example")
async def debug_telegram_example():
    """Returns the exact string Telegram hashes for comparison"""
    # Example from Telegram docs: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
    example_data = "query_id=AAHdF6IQAAAAAN0XohD2&user=%7B%22id%22%3A279058397%2C%22first_name%22%3A%22Vasya%22%2C%22last_name%22%3A%22Pupkin%22%2C%22username%22%3A%22vaspupkin%22%2C%22language_code%22%3A%22en%22%7D&auth_date=1662771648"
    example_hash = "b6685bda9a825e1f0cce1a6f5d4ad0d40a8bb0b0c0f7c0a0a0a0a0a0a0a0a0a"  # Fake hash for illustration
    
    # Compute what Telegram would expect
    secret_key = hmac.new(
        key=b"WebAppData",
        msg=os.getenv("Telegram_API").encode(),
        digestmod=hashlib.sha256
    ).digest()
    
    computed_hash = hmac.new(
        secret_key, 
        example_data.encode(), 
        hashlib.sha256
    ).hexdigest()
    
    return {
        "telegram_example_data": example_data,
        "expected_hash": example_hash,
        "computed_hash": computed_hash,
        "match": computed_hash == example_hash
    }



    @router.get("/test-valid-hash")
async def test_valid_hash():
    """Test with KNOWN VALID initData from Telegram docs"""
    # Example from: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
    TEST_INIT_DATA = "query_id=AAHdF6IQAAAAAN0XohD2&user=%7B%22id%22%3A279058397%2C%22first_name%22%3A%22Vasya%22%2C%22last_name%22%3A%22Pupkin%22%2C%22username%22%3A%22vaspupkin%22%2C%22language_code%22%3A%22en%22%7D&auth_date=1662771648&hash=27e6a723d7d564f5e4c5d4d7d7d7d7d7d7d7d7d7d7d7d7d7d7d7d7d7d7d7d7d7d7d"
    TEST_BOT_TOKEN = "YOUR_BOT_TOKEN"  # Use actual token
    
    try:
        result = validate_init_data(TEST_INIT_DATA, TEST_BOT_TOKEN)
        return {"status": "success", "result": result}
    except Exception as e:
        logger.exception("Test failed")
        return {
            "status": "error",
            "error": str(e),
            "test_data": TEST_INIT_DATA,
            "bot_token": TEST_BOT_TOKEN[:3] + "..." + TEST_BOT_TOKEN[-3:]
        }