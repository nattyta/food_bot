from fastapi import Request, HTTPException, Depends
import logging
from fastapi.security import HTTPBearer
from .sessions import session_manager
import os
import hmac
import hashlib
from urllib.parse import parse_qs,unquote
import json
import logging
from typing import Optional
from urllib.parse import parse_qsl
import os
from dotenv import load_dotenv
import datetime
load_dotenv()

bot_token = os.getenv("Telegram_API")
print("✅ Telegram_API:", repr(os.getenv("Telegram_API")))

logger = logging.getLogger("uvicorn.error")

security_scheme = HTTPBearer()

def get_current_user(request: Request, credentials: HTTPBearer = Depends(security_scheme)):
    """Dependency for protected routes"""
    token = credentials.credentials
    chat_id = session_manager.validate_session(token)
    
    if not chat_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Store in request state for later use
    request.state.chat_id = chat_id
    return chat_id

def validate_init_data(init_data: str, bot_token: str) -> bool:
    try:
        # Unquote first to handle URL-encoded characters
        init_data = unquote(init_data)
        
        # Parse the init data
        parsed = dict(parse_qsl(init_data))
        received_hash = parsed.pop("hash", "")
        
        # Check auth_date freshness (within 1 hour)
        auth_date = int(parsed.get("auth_date", 0))
        if datetime.now().timestamp() - auth_date > 3600:
            return False

        # Prepare data check string
        data_check_string = "\n".join(
            f"{key}={value}"
            for key, value in sorted(parsed.items())
        )

        # Compute secret key
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()

        # Compute HMAC
        computed_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(computed_hash, received_hash)
    except Exception as e:
        print(f"Validation error: {str(e)}")
        return False

def parse_telegram_user(init_data: str) -> dict:
    """Parse Telegram WebApp initData to get user info"""
    try:
        parsed = dict(parse_qsl(unquote(init_data)))
        user_json = parsed.get('user', '{}')
        return json.loads(user_json)
    except Exception as e:
        raise ValueError(f"Invalid initData: {str(e)}")
    

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