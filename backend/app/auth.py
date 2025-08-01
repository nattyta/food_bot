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
        # Log raw input before any processing
        logger.debug(f"🔥 [RAW INPUT] init_data: {init_data}")
        
        # Parse parameters without any decoding
        parsed = {}
        for pair in init_data.split('&'):
            if '=' in pair:
                key, value = pair.split('=', 1)
                parsed[key] = value
                logger.debug(f"🔥 [PARSED] {key} = {value}")
        
        # Log all parsed parameters before modification
        logger.debug(f"🔥 [ALL PARAMS] {json.dumps(parsed, indent=2)}")
        
        # Remove verification parameters
        received_hash = parsed.pop("hash", None)
        if not received_hash:
            logger.error("❌ Missing hash parameter")
            raise HTTPException(status_code=400, detail="Missing hash in initData")
        
        # Create a copy for verification
        verification_params = parsed.copy()
        
        # Build data-check-string in EXACT format Telegram expects
        sorted_keys = sorted(verification_params.keys())
        data_check_parts = []
        for key in sorted_keys:
            value = verification_params[key]
            data_check_parts.append(f"{key}={value}")
        
        data_check_string = "\n".join(data_check_parts)
        
        # Log the data check string construction
        logger.debug("🔥 [DATA CHECK STRING CONSTRUCTION]")
        logger.debug(f"  Sorted keys: {sorted_keys}")
        for i, part in enumerate(data_check_parts):
            logger.debug(f"  Part {i+1}: {part}")
        logger.debug(f"  Final string: {data_check_string}")
        logger.debug(f"  String length: {len(data_check_string)}")
        logger.debug(f"  String bytes: {data_check_string.encode('utf-8')}")
        
        # Compute HMAC key
        logger.debug("🔥 [SECRET KEY GENERATION]")
        logger.debug(f"  Bot token: {bot_token}")
        logger.debug(f"  Bot token bytes: {bot_token.encode('utf-8')}")
        
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        logger.debug(f"  Secret key hex: {secret_key.hex()}")
        
        # Compute hash
        logger.debug("🔥 [HASH COMPUTATION]")
        logger.debug(f"  Data to hash: {data_check_string.encode('utf-8')}")
        
        computed_hash = hmac.new(
            secret_key,
            data_check_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        logger.debug(f"  Computed hash: {computed_hash}")
        logger.debug(f"  Received hash: {received_hash}")
        
        # Validate
        if hmac.compare_digest(computed_hash, received_hash):
            logger.info("✅ Hash validation successful")
            # Now decode and parse user data
            decoded = {}
            for k, v in parsed.items():
                # Handle backslash escape sequences properly
                unquoted = unquote(v.replace('%5C', '%255C').replace('\\', '%5C'))
                if k == "user":
                    try:
                        decoded[k] = json.loads(unquoted)
                        logger.debug(f"✅ Parsed user data: {json.dumps(decoded[k], indent=2)}")
                    except json.JSONDecodeError as je:
                        logger.error(f"❌ JSON decode error: {str(je)}")
                        logger.debug(f"  Problematic value: {unquoted}")
                        decoded[k] = unquoted
                else:
                    decoded[k] = unquoted
            return decoded
        else:
            # Add detailed mismatch info to logs
            logger.error(f"❌ HASH MISMATCH! Received: {received_hash}, Computed: {computed_hash}")
            logger.debug(f"  Data check string: {data_check_string}")
            logger.debug(f"  Secret key hex: {secret_key.hex()}")
            
            # Compare character by character for the first difference
            min_len = min(len(received_hash), len(computed_hash))
            for i in range(min_len):
                if received_hash[i] != computed_hash[i]:
                    logger.debug(f"  First difference at position {i}: "
                                 f"Received '{received_hash[i]}' vs Computed '{computed_hash[i]}'")
                    logger.debug(f"  Context: ...{received_hash[i-10:i+10]}... vs ...{computed_hash[i-10:i+10]}...")
                    break
            
            # Try alternative sorting order (reverse) as test
            reverse_check_string = "\n".join(
                f"{key}={value}" 
                for key, value in sorted(parsed.items(), reverse=True)
            )
            if reverse_check_string != data_check_string:
                reverse_hash = hmac.new(
                    secret_key,
                    reverse_check_string.encode(),
                    hashlib.sha256
                ).hexdigest()
                logger.debug(f"  Reverse order hash: {reverse_hash}")
            
            # Try without newlines
            no_newline_string = "&".join([f"{key}={value}" for key, value in sorted(parsed.items())])
            no_newline_hash = hmac.new(
                secret_key,
                no_newline_string.encode(),
                hashlib.sha256
            ).hexdigest()
            logger.debug(f"  No newline hash: {no_newline_hash}")
            
            raise HTTPException(status_code=401, detail="Invalid initData hash")
            
    except Exception as e:
        logger.exception("💥 CRITICAL VALIDATION ERROR")
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