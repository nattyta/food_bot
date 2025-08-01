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

def validate_init_data(init_data: str, bot_token: str) -> dict:
    try:
        # Parse parameters without any decoding
        parsed = {}
        for pair in init_data.split('&'):
            if '=' in pair:
                key, value = pair.split('=', 1)
                parsed[key] = value
        
        # Remove verification parameters
        received_hash = parsed.pop("hash", None)
        if not received_hash:
            raise HTTPException(status_code=400, detail="Missing hash in initData")
        
        # Build data-check-string in EXACT format Telegram expects
        data_check_string = "\n".join(
            f"{key}={value}" 
            for key, value in sorted(parsed.items())
        )
        
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
        if hmac.compare_digest(computed_hash, received_hash):
            # Now decode and parse user data
            decoded = {}
            for k, v in parsed.items():
                # Handle backslash escape sequences properly
                unquoted = unquote(v.replace('%5C', '%255C').replace('\\', '%5C'))
                if k == "user":
                    try:
                        decoded[k] = json.loads(unquoted)
                    except json.JSONDecodeError:
                        decoded[k] = unquoted
                else:
                    decoded[k] = unquoted
            return decoded
        else:
            # Add detailed mismatch info to logs
            logger.error(f"Hash mismatch! Received: {received_hash}, Computed: {computed_hash}")
            logger.debug(f"Data check string: {data_check_string}")
            raise HTTPException(status_code=401, detail="Invalid initData hash")
            
    except Exception as e:
        logger.exception("Validation error")
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")

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