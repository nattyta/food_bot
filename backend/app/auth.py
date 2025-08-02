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

def validate_init_data_debug(init_data: str, bot_token: str) -> dict:
    """Debugging function to analyze initData validation issues"""
    debug_info = {}
    
    try:
        # Step 1: Parse parameters
        parsed = {}
        for pair in init_data.split('&'):
            if '=' in pair:
                key, value = pair.split('=', 1)
                parsed[key] = value
        debug_info["parsed_params"] = parsed
        
        # Step 2: Hash extraction
        received_hash = parsed.pop("hash", None)
        if not received_hash:
            raise ValueError("Missing hash parameter")
        debug_info["received_hash"] = received_hash
        
        # Step 3: Filter valid parameters
        valid_params = {"auth_date", "query_id", "user", "receiver", "chat", "start_param"}
        filtered_params = {k: v for k, v in parsed.items() if k in valid_params}
        debug_info["filtered_params"] = filtered_params
        
        # Step 4: Build data check strings
        sorted_string = "\n".join(f"{k}={v}" for k, v in sorted(filtered_params.items()))
        original_order_string = "\n".join(f"{k}={v}" for k, v in filtered_params.items())
        debug_info["sorted_data_string"] = sorted_string
        debug_info["original_order_string"] = original_order_string
        
        # Step 5: Compute secret key
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        debug_info["secret_key_hex"] = secret_key.hex()
        
        # Step 6: Compute hashes
        sorted_hash = hmac.new(secret_key, sorted_string.encode(), hashlib.sha256).hexdigest()
        original_hash = hmac.new(secret_key, original_order_string.encode(), hashlib.sha256).hexdigest()
        debug_info["sorted_hash"] = sorted_hash
        debug_info["original_hash"] = original_hash
        
        # Step 7: Compare hashes
        debug_info["sorted_match"] = hmac.compare_digest(sorted_hash, received_hash)
        debug_info["original_match"] = hmac.compare_digest(original_hash, received_hash)
        
        return debug_info
        
    except Exception as e:
        logger.error(f"Debug failed: {str(e)}")
        return {"error": str(e)}

def validate_init_data(init_data: str, bot_token: str) -> dict:
    try:
        # First run debug to get insights
        debug_info = validate_init_data_debug(init_data, bot_token)
        
        # Use the correct data string based on debug results
        if debug_info.get("original_match"):
            data_check_string = debug_info["original_order_string"]
        elif debug_info.get("sorted_match"):
            data_check_string = debug_info["sorted_data_string"]
        else:
            # If neither matches, use the one that's closest
            data_check_string = debug_info["original_order_string"]
        
        # Recompute hash with selected string
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
        
        # Validate
        if hmac.compare_digest(computed_hash, debug_info["received_hash"]):
            # Parse user data
            user_data = debug_info["filtered_params"].get("user", "")
            unquoted = unquote(user_data)
            try:
                user_json = json.loads(unquoted)
            except json.JSONDecodeError:
                user_json = unquoted
            
            return {
                "auth_date": debug_info["filtered_params"].get("auth_date", ""),
                "query_id": debug_info["filtered_params"].get("query_id", ""),
                "user": user_json
            }
        else:
            logger.error(f"Final validation failed. Computed: {computed_hash}, Received: {debug_info['received_hash']}")
            raise HTTPException(status_code=401, detail="Invalid initData hash")
            
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
        data_check_string = "\n".join(data_parts)  # Keep original order
        
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
            user_part = next((p for p in data_parts if p.startswith("user=")), "")
            if user_part:
                user_data = unquote(user_part.replace("user=", ""))
                try:
                    user_json = json.loads(user_data)
                except json.JSONDecodeError:
                    user_json = user_data
            else:
                user_json = {}
            
            # Get other parameters
            auth_date = next((p.replace("auth_date=", "") for p in data_parts if p.startswith("auth_date=")), "")
            query_id = next((p.replace("query_id=", "") for p in data_parts if p.startswith("query_id=")), "")
            
            return {
                "user": user_json,
                "auth_date": auth_date,
                "query_id": query_id
            }
        else:
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