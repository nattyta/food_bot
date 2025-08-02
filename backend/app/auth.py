from fastapi import Request, HTTPException, Depends
import logging
from fastapi.security import HTTPBearer
import os
import hmac
import hashlib
from urllib.parse import parse_qsl,quote,unquote
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

SECRET_KEY_CACHE = {}

def validate_init_data(init_data: str, bot_token: str) -> dict:
    try:
        # Parse parameters while preserving original encoding
        parsed = {}
        for pair in init_data.split('&'):
            if '=' in pair:
                key, value = pair.split('=', 1)
                parsed[key] = value
        
        # Get and remove hash parameter
        received_hash = parsed.pop("hash", None)
        if not received_hash:
            raise HTTPException(400, "Missing hash in initData")
        
        # Remove ALL non-standard parameters
        # Only these are valid per Telegram docs
        valid_params = {"auth_date", "query_id", "user", "receiver", "chat"}
        filtered = {k: v for k, v in parsed.items() if k in valid_params}
        
        # Build data-check-string in Telegram's required format
        # Use original parameter order, NOT sorted
        data_check_string = "\n".join(
            f"{k}={filtered[k]}" for k in filtered.keys()
        )
        
        logger.debug(f"🔐 Data check string: {data_check_string}")
        
        # Compute HMAC key
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

        # Validate
        if not hmac.compare_digest(computed_hash, received_hash):
            logger.error(f"❌ HASH MISMATCH! Received: {received_hash}, Computed: {computed_hash}")
            logger.debug(f"  Secret key: {secret_key.hex()}")
            logger.debug(f"  Data bytes: {data_check_string.encode()}")
            raise HTTPException(401, "Invalid initData hash")
        
        # Parse and return user data
        user_data = {}
        for key in filtered:
            if key == "user":
                try:
                    user_data[key] = json.loads(unquote(filtered[key]))
                except json.JSONDecodeError:
                    user_data[key] = unquote(filtered[key])
            else:
                user_data[key] = unquote(filtered[key])
        
        return user_data
        
    except Exception as e:
        logger.exception("Validation error")
        raise HTTPException(500, f"Validation failed: {str(e)}")



        
async def telegram_auth(request: Request) -> Optional[int]:
    """Handle Telegram WebApp authentication"""
    try:
        init_data = request.headers.get('x-telegram-init-data')
        if not init_data:
            return None
            
        # Log the raw initData for debugging
        logger.debug(f"🔥 RAW INIT DATA: {init_data}")
        
        # Get bot token
        bot_token = os.getenv("Telegram_API")
        if not bot_token:
            logger.error("Telegram_API environment variable not set")
            return None
            
        # Run validation with enhanced debugging
        user_data = validate_init_data(init_data, bot_token)
        
        # Log successful validation
        logger.info(f"✅ Authentication successful for user: {user_data.get('user', {}).get('id')}")
        
        request.state.telegram_user = user_data
        return user_data.get("user", {}).get("id")
        
    except HTTPException as he:
        # Log the specific validation error
        logger.error(f"❌ Validation error: {he.detail}")
        return None
    except Exception as e:
        logger.exception(f"💥 Unexpected Telegram auth error: {str(e)}")
        return None