from fastapi import Request, HTTPException, Depends
import logging
from fastapi.security import HTTPBearer
import os
import hmac
import hashlib
from urllib.parse import parse_qsl,unquote
import json
import logging
from typing import Optional

import time
from dotenv import load_dotenv



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
        # Parse WITHOUT unquoting to keep original encoding
        parsed = dict(parse_qsl(init_data, keep_blank_values=True))
        logger.debug(f"🌐 Raw parsed initData: {parsed}")

        # Remove non-standard parameters
        parsed.pop("signature", None)
        
        received_hash = parsed.pop("hash", None)
        if not received_hash:
            raise HTTPException(status_code=400, detail="Missing hash in initData")

        # Keep the 'user' parameter AS-IS (don't parse/flatten for hashing)
        # We'll parse it later after validation
        logger.warning("📦 Data for hashing (with original encoding):")
        for k, v in sorted(parsed.items()):
            logger.warning(f"{k}={v}")

        # Build data-check-string with ORIGINAL values
        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(parsed.items())
        )

        # Compute HMAC key
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        computed_hash = hmac.new(
            secret_key, 
            data_check_string.encode(), 
            hashlib.sha256
        ).hexdigest()

        logger.info(f"🔑 Hash from Telegram: {received_hash}")
        logger.info(f"🧮 Computed hash: {computed_hash}")

        if not hmac.compare_digest(computed_hash, received_hash):
            raise HTTPException(status_code=401, detail="Invalid initData hash")

        # NOW parse the user object
        user_json = parsed.get("user")
        if not user_json:
            raise HTTPException(status_code=400, detail="Missing user data in initData")

        try:
            user_data = json.loads(user_json)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid user JSON in initData")

        # Check expiration
        auth_date = int(parsed.get("auth_date", "0"))
        if time.time() - auth_date > 86400:
            raise HTTPException(status_code=403, detail="initData expired")

        return user_data

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("💥 [validate_init_data] Unexpected error:")
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