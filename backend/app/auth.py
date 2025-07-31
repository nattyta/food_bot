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
        # Step 1: Log raw input
        logger.debug(f"🔥 RAW initData input: {repr(init_data)}")
        
        # Step 2: URL-decode the entire init_data string
        decoded_data = unquote(init_data)
        logger.debug(f"🔥 DECODED initData: {decoded_data}")
        
        # Step 3: Parse parameters while preserving original format
        parsed = {}
        for pair in decoded_data.split('&'):
            key_value = pair.split('=', 1)
            if len(key_value) == 2:
                key, value = key_value
                # Special handling for user parameter
                if key == "user":
                    # Decode user JSON only once
                    try:
                        user_json = unquote(value)
                        parsed["user"] = json.loads(user_json)
                    except Exception as e:
                        logger.error(f"Failed to parse user JSON: {str(e)}")
                        parsed[key] = value
                else:
                    parsed[key] = value

        # Step 4: Remove verification parameters
        signature = parsed.pop('signature', None)
        received_hash = parsed.pop("hash", None)
        
        if not received_hash:
            raise HTTPException(status_code=400, detail="Missing hash in initData")

        # Step 5: Build data-check-string with sorted parameters
        data_check_string = "\n".join(
            f"{k}={v if k != 'user' else json.dumps(parsed['user'])}" 
            for k, v in sorted(parsed.items())
        )
        
        logger.debug(f"🔥 Data-check-string: {repr(data_check_string)}")
        logger.debug(f"📏 Data-check-string length: {len(data_check_string)}")
        logger.debug(f"🔢 Data-check-string SHA256: {hashlib.sha256(data_check_string.encode()).hexdigest()}")

        # Step 6: Compute HMAC key
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        logger.debug(f"🔐 Secret key: {secret_key.hex()}")
        
        # Step 7: Compute hash
        computed_hash = hmac.new(
            secret_key, 
            data_check_string.encode(), 
            hashlib.sha256
        ).hexdigest()

        logger.info(f"🔑 Hash from Telegram: {received_hash}")
        logger.info(f"🧮 Computed hash: {computed_hash}")

        # Step 8: Constant-time comparison
        if hmac.compare_digest(computed_hash, received_hash):
            logger.info("✅ HASH MATCH SUCCESSFUL!")
            return parsed
        else:
            logger.error("❌ HASH MISMATCH!")
            raise HTTPException(status_code=401, detail="Invalid initData hash")
            
    except Exception as e:
        logger.exception("🔥 Validation failed")
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