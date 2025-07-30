from fastapi import Request, HTTPException, Depends
import logging
from fastapi.security import HTTPBearer
import os
import hmac
import hashlib
from urllib.parse import parse_qs,unquote
import json
import logging
from typing import Optional
from urllib.parse import parse_qsl
import time
from dotenv import load_dotenv
from urllib.parse import parse_qsl


load_dotenv()

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

if not logger.hasHandlers():
    logging.basicConfig(level=logging.DEBUG)


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

def validate_init_data(init_data: str, bot_token: str) -> dict:
    try:
        init_data = unquote(init_data)
        parsed = dict(parse_qsl(init_data))
        logger.debug(f"Bot token from env: {repr(os.getenv('Telegram_API'))}")

        received_hash = parsed.pop("hash", None)
        if not received_hash:
            raise HTTPException(status_code=400, detail="Missing hash in initData")

        # Remove 'signature' if present (sometimes Telegram adds it)
        parsed.pop("signature", None)

        # Flatten user object
        user_data = parsed.pop("user", None)
        if user_data:
            try:
                user_dict = json.loads(user_data)
                # Add user fields with prefix user.*
                for k, v in user_dict.items():
                    key = f"user.{k}"
                    parsed[key] = str(v).lower() if isinstance(v, bool) else str(v)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid user JSON in initData")
        else:
            raise HTTPException(status_code=400, detail="Missing user data in initData")

        
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))

        secret_key = hashlib.sha256(bot_token.encode()).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        if not hmac.compare_digest(calculated_hash, received_hash):
            raise HTTPException(status_code=401, detail="Invalid initData hash")

        # Check auth_date freshness (max 24h)
        auth_date = int(parsed.get("auth_date", 0))
        if time.time() - auth_date > 86400:
            raise HTTPException(status_code=403, detail="initData expired")

        return user_dict

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"initData validation error: {str(e)}")






async def telegram_auth(request: Request) -> Optional[int]:
    """Handle Telegram WebApp authentication"""
    try:
        init_data = request.headers.get('x-telegram-init-data')
        if not init_data:
            return None
        logger.debug(f"Bot token from env: {repr(os.getenv('Telegram_API'))}")

        user_data = validate_init_data(init_data, os.getenv("Telegram_API"))
        request.state.telegram_user = user_data
        return user_data.get("id")
        
    except Exception as e:
        logger.error(f"Telegram auth error: {str(e)}")
        return None
