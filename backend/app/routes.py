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
async def auth_endpoint(request: Request):
    init_data = request.headers.get("x-telegram-init-data")
    bot_token = os.getenv("Telegram_API")
    
    if not init_data:
        raise HTTPException(400, "Missing initData")
    
    try:
        user_data = validate_init_data(init_data, bot_token)
        return {"status": "success", "user": user_data}
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"detail": e.detail}
        )
    
    # Get bot token with safety checks
    BOT_TOKEN = os.getenv("Telegram_API", "").strip()
    if not BOT_TOKEN:
        logger.critical("❌ BOT TOKEN NOT CONFIGURED IN ENVIRONMENT!")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "detail": "Server configuration error - missing Telegram API token"
            }
        )

    # Request forensics for debugging
    logger.debug("🔍 [AUTH DIAGNOSTICS]")
    logger.debug(f"  Header length: {len(raw_header)}")
    logger.debug(f"  First 50 chars: {raw_header[:50]}")
    logger.debug(f"  Last 50 chars: {raw_header[-50:]}")
    logger.debug(f"  Contains hash: {'hash=' in raw_header}")
    logger.debug(f"  Bot token: {BOT_TOKEN[:3]}...{BOT_TOKEN[-3:]}")
    
    try:
        # Use the raw header directly for validation
        user = validate_init_data(raw_header, BOT_TOKEN)
        logger.info(f"✅ Authentication successful for user: {user.get('user', {}).get('id')}")
        
        # Generate session token
        session_token = str(uuid.uuid4())
        chat_id = user.get('user', {}).get('id')
        
        # Store session in database
        if chat_id:
            with DatabaseManager() as db:
                db.execute(
                    "INSERT INTO sessions (chat_id, session_token) VALUES (%s, %s) "
                    "ON CONFLICT (chat_id) DO UPDATE SET session_token = EXCLUDED.session_token",
                    (chat_id, session_token)
                )
        
        return {
            "status": "success",
            "user": user,
            "session_token": session_token
        }
    
    except HTTPException as he:
        # Handle known validation errors
        logger.error(f"❌ Authentication failed: {he.detail}")
        return JSONResponse(
            status_code=he.status_code,
            content={
                "status": "error",
                "detail": he.detail,
                "diagnostic": {
                    "bot_token_length": len(BOT_TOKEN),
                    "header_sample": f"{raw_header[:50]}...{raw_header[-50:]}",
                    "validation_step": "hash_comparison"
                }
            }
        )
    
    except Exception as e:
        # Handle unexpected errors
        logger.exception("💥 CRITICAL: Unhandled authentication error")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "detail": "Internal server error",
                "error_info": str(e),
                "diagnostic": {
                    "bot_token": BOT_TOKEN[:3] + "..." + BOT_TOKEN[-3:],
                    "header_length": len(raw_header),
                    "exception_type": type(e).__name__
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


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "telegram_verified": has_valid_token,  # Set during startup
        "timestamp": int(time.time())
    }




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



@router.get("/test-real-data")
async def test_real_data(request: Request):
    """Test with real initData from your production environment"""
    # Get a real initData string from your logs
    REAL_INIT_DATA = "query_id=AAHazKI2AAAAANrMojYa1a9c&user=%7B%22id%22%3A916638938%2C%22first_name%22%3A%22natnael%22%2C%22last_name%22%3A%22%22%2C%22username%22%3A%22meh9061%22%2C%22language_code%22%3A%22en%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2FKaGQ_KQd52BoxblXpxbwbV8NjBRHvT8P_U4kXdlysCs.svg%22%7D&auth_date=1754083434&signature=BU0ygn_fENOTnVzIXkl6YYALuZTM5pibH7fYv5Zi67KcVMqeYDAHNe6YH3Kze2uL3h21NZFvLpaALZOf_78oBQ&hash=078d785fe3c62c3c8aae4a1e05e27fd3ed2ad91ba0090830f2ba2262a8fef5d5"
    REAL_BOT_TOKEN = os.getenv("Telegram_API", "").strip()
    
    try:
        result = validate_init_data(REAL_INIT_DATA, REAL_BOT_TOKEN)
        return {
            "status": "success", 
            "result": result,
            "message": "Successfully validated real production data"
        }
    except Exception as e:
        # Add detailed diagnostics
        from .auth import validate_init_data_debug
        debug_info = validate_init_data_debug(REAL_INIT_DATA, REAL_BOT_TOKEN)
        
        return {
            "status": "error",
            "error": str(e),
            "debug": debug_info,
            "init_data": REAL_INIT_DATA,
            "bot_axtoken": REAL_BOT_TOKEN,
            "recommendation": "Compare debug info with working minimal test"
        }



@router.get("/test-minimal")
async def test_minimal():
    """Test minimal validation example"""
    # Minimal example data from your logs
    auth_date = "1754078747"
    query_id = "AAHazKI2AAAAANrMojY7cHL_"
    user_data = "%7B%22id%22%3A916638938%2C%22first_name%22%3A%22natnael%22%2C%22last_name%22%3A%22%22%2C%22username%22%3A%22meh9061%22%2C%22language_code%22%3A%22en%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2FKaGQ_KQd52BoxblXpxbwbV8NjBRHvT8P_U4kXdlysCs.svg%22%7D"
    
    # Build initData string without hash
    init_data = f"auth_date={auth_date}&query_id={query_id}&user={user_data}"
    
    # Get bot token
    bot_token = os.getenv("Telegram_API", "").strip()
    if not bot_token:
        return {"status": "error", "detail": "Bot token not set"}
    
    # Build data check string (sorted by key)
    data_check_string = "\n".join([
        f"auth_date={auth_date}",
        f"query_id={query_id}",
        f"user={user_data}"
    ])
    
    # Compute secret key
    secret_key = hmac.new(
        key=b"WebAppData",
        msg=bot_token.encode(),
        digestmod=hashlib.sha256
    ).digest()
    
    # Compute hash
    computed_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # Now validate
    try:
        # Create full initData with hash
        full_init_data = f"{init_data}&hash={computed_hash}"
        result = validate_init_data(full_init_data, bot_token)
        return {
            "status": "success",
            "computed_hash": computed_hash,
            "full_init_data": full_init_data,
            "result": result
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "computed_hash": computed_hash,
            "data_check_string": data_check_string,
            "secret_key_hex": secret_key.hex()
        }