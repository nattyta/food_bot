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
        # 🔥 DEBUG 1: Log raw input
        logger.debug(f"🔥 [DEBUG 1] RAW initData input: {repr(init_data)}")
        
        # 🔥 DEBUG 2: Log bot token info
        logger.debug(f"🔥 [DEBUG 2] Bot token: {bot_token[:3]}...{bot_token[-3:]} ({len(bot_token)} chars)")
        
        # Step 1: URL-decode the entire init_data string
        decoded_data = unquote(init_data)
        logger.debug(f"🔥 [DEBUG 3] DECODED initData: {decoded_data}")
        
        # Step 2: Parse parameters without modifying values
        parsed = {}
        for pair in decoded_data.split('&'):
            key, _, value = pair.partition('=')
            if key and value:
                parsed[key] = value
                logger.debug(f"🔥 [DEBUG 4] Parsed: {key}={value[:20]}{'...' if len(value) > 20 else ''}")

        # 🔥 DEBUG 5: Show all parsed keys
        logger.debug(f"🔥 [DEBUG 5] Parsed keys: {list(parsed.keys())}")
        
        # Step 3: Remove verification parameters
        signature = parsed.pop('signature', None)
        received_hash = parsed.pop("hash", None)
        
        if not received_hash:
            raise HTTPException(status_code=400, detail="Missing hash in initData")

        # 🔥 DEBUG 6: Show parameters before building data-check-string
        logger.debug("🔥 [DEBUG 6] Parameters for data-check-string:")
        for k, v in parsed.items():
            logger.debug(f"  {k}: {repr(v)}")

        # Step 4: Build data-check-string with EXACT original values
        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(parsed.items())
        )
        
        # 🔥 DEBUG 7: Show exact data-check-string
        logger.debug(f"🔥 [DEBUG 7] Data-check-string: {repr(data_check_string)}")
        logger.debug(f"🔥 [DEBUG 8] Data-check-string length: {len(data_check_string)}")
        logger.debug(f"🔥 [DEBUG 9] Data-check-string SHA256: {hashlib.sha256(data_check_string.encode()).hexdigest()}")

        # Step 5: Compute HMAC key
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        logger.debug(f"🔥 [DEBUG 10] Secret key: {secret_key.hex()}")
        
        # Step 6: Compute hash
        computed_hash = hmac.new(
            secret_key, 
            data_check_string.encode(), 
            hashlib.sha256
        ).hexdigest()

        logger.info(f"🔑 Hash from Telegram: {received_hash}")
        logger.info(f"🧮 Computed hash: {computed_hash}")

        # 🔥 DEBUG 11: Show comparison
        logger.debug(f"🔥 [DEBUG 11] Compare: {computed_hash == received_hash}")
        logger.debug(f"🔥 [DEBUG 12] Compare (length): {len(computed_hash)} vs {len(received_hash)}")
        
        # Step 7: Constant-time comparison
        if hmac.compare_digest(computed_hash, received_hash):
            logger.info("✅ HASH MATCH SUCCESSFUL!")
            # Now parse user JSON
            if 'user' in parsed:
                try:
                    parsed['user'] = json.loads(parsed['user'])
                    logger.debug(f"🔥 [DEBUG 13] Parsed user: {parsed['user']}")
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse user JSON: {str(e)}")
            return parsed
        else:
            logger.error("❌ HASH MISMATCH!")
            # 🔥 DEBUG 14: Show difference
            diff = [f"{i}: Telegram:'{received_hash[i]}' vs Computed:'{computed_hash[i]}'" 
                   for i in range(min(len(received_hash), len(computed_hash))) 
                   if received_hash[i] != computed_hash[i]]
            logger.debug(f"🔥 [DEBUG 14] First difference at position {diff[0] if diff else 'none'}")
            raise HTTPException(status_code=401, detail="Invalid initData hash")
            
    except Exception as e:
        logger.exception("🔥 Validation failed")
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")


        
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