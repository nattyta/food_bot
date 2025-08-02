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

import hmac
import hashlib
import json
import logging
import time
from urllib.parse import unquote, parse_qsl
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Cache for secret keys
SECRET_KEY_CACHE = {}

def validate_init_data(init_data: str, bot_token: str) -> dict:
    """
    Validates Telegram WebApp initData per official security requirements
    
    Args:
        init_data: Raw initData string from Telegram WebApp
        bot_token: Your bot's secret token from @BotFather
        
    Returns:
        Verified and parsed user data
        
    Raises:
        HTTPException: For any validation failure
    """
    try:
        # ===== [1] PARSE WHILE PRESERVING ORDER =====
        # Parse as ordered list of key-value pairs
        params = parse_qsl(init_data, keep_blank_values=True)
        
        # Extract parameters
        parsed = {}
        received_hash = None
        for key, value in params:
            if key == "hash":
                received_hash = value
            else:
                parsed[key] = value
        
        if not received_hash:
            logger.error("❌ Missing hash parameter in initData")
            raise HTTPException(400, "Missing hash parameter")
        
        # ===== [2] FILTER VALID PARAMETERS =====
        valid_params = {"auth_date", "query_id", "user", "receiver", "chat"}
        filtered = {k: v for k, v in parsed.items() if k in valid_params}
        
        # ===== [3] BUILD DATA CHECK STRING =====
        # Create sorted list of key-value pairs
        sorted_items = sorted(filtered.items(), key=lambda x: x[0])
        
        # Format as "key=value" with newline separator
        data_check_string = "\n".join(
            f"{key}={value}" for key, value in sorted_items
        )
        
        logger.debug(f"🔐 Data check string: {data_check_string}")
        
        # ===== [4] COMPUTE SECRET KEY =====
        # Use cached version if available
        if bot_token not in SECRET_KEY_CACHE:
            SECRET_KEY_CACHE[bot_token] = hmac.new(
                key=b"WebAppData",
                msg=bot_token.encode(),
                digestmod=hashlib.sha256
            ).digest()
        
        secret_key = SECRET_KEY_CACHE[bot_token]
        
        # ===== [5] COMPUTE AND VALIDATE HASH =====
        computed_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        logger.debug(f"🔑 Received hash: {received_hash}")
        logger.debug(f"🔑 Computed hash: {computed_hash}")
        
        # Critical security: Use constant-time comparison
        if not hmac.compare_digest(computed_hash, received_hash):
            logger.error(f"❌ HASH MISMATCH! Received: {received_hash}, Computed: {computed_hash}")
            logger.debug(f"  Secret key: {secret_key.hex()}")
            logger.debug(f"  Data bytes: {data_check_string.encode()}")
            
            # Final fallback: Try without any filtering
            all_items = sorted(parsed.items(), key=lambda x: x[0])
            fallback_string = "\n".join(f"{k}={v}" for k, v in all_items)
            fallback_hash = hmac.new(
                secret_key,
                fallback_string.encode(),
                hashlib.sha256
            ).hexdigest()
            
            logger.debug(f"🛟 Fallback hash: {fallback_hash}")
            
            if hmac.compare_digest(fallback_hash, received_hash):
                logger.warning("⚠️ Validation passed only when including ALL parameters")
                # Proceed with fallback validation
            else:
                raise HTTPException(401, "Invalid initData hash")
        
        # ===== [6] PARSE VERIFIED DATA =====
        result = {}
        for key, value in filtered.items():
            unquoted = unquote(value)
            if key == "user":
                try:
                    result[key] = json.loads(unquoted)
                except json.JSONDecodeError:
                    logger.warning(f"⚠️ Failed to parse user JSON: {unquoted}")
                    result[key] = unquoted
            else:
                result[key] = unquoted
        
        # ===== [7] VALIDATE TIMESTAMP =====
        try:
            auth_timestamp = int(result.get("auth_date", 0))
            current_time = int(time.time())
            age = current_time - auth_timestamp
            
            # Reject data older than 24 hours
            if age > 86400:  # 24*60*60
                logger.warning(f"⚠️ Expired auth data: {age} seconds old")
                raise HTTPException(401, "Expired authentication data")
        except (TypeError, ValueError):
            logger.error("⚠️ Invalid auth_date format")
            raise HTTPException(400, "Invalid auth_date")
        
        # ===== [8] VALIDATE USER STRUCTURE =====
        user = result.get("user")
        if not user or not isinstance(user, dict):
            logger.error("❌ Missing or invalid user data")
            raise HTTPException(400, "Invalid user structure")
            
        if not user.get("id"):
            logger.error("❌ Missing user ID")
            raise HTTPException(400, "Missing user ID")
        
        # ===== [9] RETURN TRUSTED DATA =====
        logger.info(f"✅ Validated initData for user {user.get('id')}")
        return {
            "auth_date": auth_timestamp,
            "query_id": result.get("query_id"),
            "user": user
        }
        
    except HTTPException:
        # Re-raise known exceptions
        raise
    except Exception as e:
        logger.exception(f"💥 CRITICAL: Unhandled validation error: {str(e)}")
        raise HTTPException(500, "Internal validation error")
        

        
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