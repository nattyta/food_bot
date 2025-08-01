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
        
        # Remove ALL non-standard parameters (Telegram is adding extra fields)
        # Only keep parameters specified in Telegram's documentation
        valid_params = {"auth_date", "query_id", "user", "receiver", "chat", "start_param"}
        filtered_params = {k: v for k, v in parsed.items() if k in valid_params}
        
        # Get and remove hash parameter
        received_hash = parsed.get("hash")
        if not received_hash:
            raise HTTPException(status_code=400, detail="Missing hash in initData")
        
        # Build data-check-string only with valid parameters
        data_check_string = "\n".join(
            f"{key}={value}" 
            for key, value in sorted(filtered_params.items())
        )
        
        # Log critical information for debugging
        logger.debug("🔥 [VALID PARAMS] " + json.dumps(filtered_params, indent=2))
        logger.debug(f"🔥 [DATA CHECK STRING] {data_check_string}")
        
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
            for k, v in filtered_params.items():
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
            logger.error(f"❌ HASH MISMATCH! Received: {received_hash}, Computed: {computed_hash}")
            logger.debug(f"  Secret key hex: {secret_key.hex()}")
            logger.debug(f"  Data bytes: {data_check_string.encode()}")
            
            # Try alternative validation method as fallback
            return validate_init_data_fallback(init_data, bot_token)
            
    except Exception as e:
        logger.exception("💥 CRITICAL VALIDATION ERROR")
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")

def validate_init_data(init_data: str, bot_token: str) -> dict:
    try:
        # Parse parameters without any decoding
        parsed = {}
        for pair in init_data.split('&'):
            if '=' in pair:
                key, value = pair.split('=', 1)
                parsed[key] = value
        
        # Get and remove hash parameter
        received_hash = parsed.pop("hash", None)
        if not received_hash:
            raise HTTPException(status_code=400, detail="Missing hash in initData")
        
        # Remove non-standard parameters (Telegram is adding extra fields)
        valid_params = {"auth_date", "query_id", "user", "receiver", "chat", "start_param"}
        filtered_params = {k: v for k, v in parsed.items() if k in valid_params}
        
        # Build data-check-string in EXACT format Telegram expects
        data_check_string = "\n".join(
            f"{key}={value}" 
            for key, value in sorted(filtered_params.items())
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
            for k, v in filtered_params.items():
                # Handle backslash escape sequences properly
                unquoted = unquote(v)
                if k == "user":
                    try:
                        decoded[k] = json.loads(unquoted)
                    except json.JSONDecodeError:
                        decoded[k] = unquoted
                else:
                    decoded[k] = unquoted
            return decoded
        else:
            # Try alternative validation method as fallback
            return validate_init_data_fallback(init_data, bot_token)
            
    except Exception as e:
        logger.exception("Validation error")
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")

def validate_init_data_fallback(init_data: str, bot_token: str) -> dict:
    """Alternative validation method for compatibility"""
    try:
        # Use the raw init_data string without splitting
        if "hash=" not in init_data:
            raise ValueError("Missing hash parameter")
        
        # Extract the hash value
        hash_part = init_data.split("hash=")[1]
        received_hash = hash_part.split("&")[0] if "&" in hash_part else hash_part
        
        # Rebuild the data string without the hash parameter
        data_parts = [part for part in init_data.split("&") if not part.startswith("hash=")]
        data_check_string = "\n".join(sorted(data_parts))
        
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

        if hmac.compare_digest(computed_hash, received_hash):
            # Parse user data
            user_part = next((p for p in data_parts if p.startswith("user=")), "").replace("user=", "")
            user_data = json.loads(unquote(user_part)) if user_part else {}
            
            return {
                "user": user_data,
                "auth_date": next((p.replace("auth_date=", "") for p in data_parts if p.startswith("auth_date=")), 
                "query_id": next((p.replace("query_id=", "") for p in data_parts if p.startswith("query_id="))
            }
        else:
            # Try with original order
            original_order_string = "\n".join(data_parts)
            original_hash = hmac.new(
                secret_key,
                original_order_string.encode(),
                hashlib.sha256
            ).hexdigest()
            
            if hmac.compare_digest(original_hash, received_hash):
                user_part = next((p for p in data_parts if p.startswith("user=")), "").replace("user=", "")
                user_data = json.loads(unquote(user_part)) if user_part else {}
                
                return {
                    "user": user_data,
                    "auth_date": next((p.replace("auth_date=", "") for p in data_parts if p.startswith("auth_date=")), 
                    "query_id": next((p.replace("query_id=", "") for p in data_parts if p.startswith("query_id="))
                }
            
            raise ValueError("Fallback validation failed")
        
    except Exception as e:
        logger.error(f"❌ FALLBACK VALIDATION FAILED: {str(e)}")
        raise HTTPException(status_code=401, detail="Could not validate initData")



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