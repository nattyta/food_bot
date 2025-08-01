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
        # 🔥 CRITICAL FIX: Don't decode the entire string yet
        logger.debug(f"🔥 [DEBUG 1] RAW initData input: {repr(init_data)}")
        logger.debug(f"🔥 [DEBUG 2] Bot token: {bot_token[:3]}...{bot_token[-3]} ({len(bot_token)} chars)")
        
        # Step 1: Split into key-value pairs BEFORE decoding
        parsed = {}
        for pair in init_data.split('&'):
            key, _, value = pair.partition('=')
            if key and value:
                parsed[key] = value
                logger.debug(f"🔥 [DEBUG 3] Raw pair: {key}={value[:20]}{'...' if len(value) > 20 else ''}")

        # Step 2: Remove verification parameters
        signature = parsed.pop('signature', None)
        received_hash = parsed.pop("hash", None)
        
        if not received_hash:
            raise HTTPException(status_code=400, detail="Missing hash in initData")

        # 🔥 CRITICAL FIX: Build data-check-string with ORIGINAL encoded values
        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(parsed.items())
        )
        
        # 🔥 DEBUG: Show EXACT string being hashed
        logger.debug(f"🔥 [DEBUG 4] Data-check-string EXACT: {data_check_string}")
        logger.debug(f"🔥 [DEBUG 5] Data-check-string length: {len(data_check_string)}")
        logger.debug(f"🔥 [DEBUG 6] Data-check-string SHA256: {hashlib.sha256(data_check_string.encode()).hexdigest()}")

        # Step 3: Compute HMAC key
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        logger.debug(f"🔥 [DEBUG 7] Secret key: {secret_key.hex()}")

        # Step 4: Compute hash
        computed_hash = hmac.new(
            secret_key, 
            data_check_string.encode(), 
            hashlib.sha256
        ).hexdigest()

        logger.info(f"🔑 Hash from Telegram: {received_hash}")
        logger.info(f"🧮 Computed hash: {computed_hash}")

        # Step 5: Constant-time comparison
        if hmac.compare_digest(computed_hash, received_hash):
            logger.info("✅ HASH MATCH SUCCESSFUL!")
            # Now decode the values
            decoded_parsed = {}
            for key, value in parsed.items():
                decoded_value = unquote(value)
                if key == 'user':
                    try:
                        decoded_parsed[key] = json.loads(decoded_value)
                    except json.JSONDecodeError:
                        decoded_parsed[key] = decoded_value
                else:
                    decoded_parsed[key] = decoded_value
            return decoded_parsed
        else:
            logger.error("❌ HASH MISMATCH!")
            # Detailed diff
            diff = []
            for i in range(len(received_hash)):
                if i >= len(computed_hash) or received_hash[i] != computed_hash[i]:
                    diff.append(f"Position {i}: Telegram='{received_hash[i]}' vs Computed='{computed_hash[i] if i < len(computed_hash) else ''}'")
                    if len(diff) > 5:  # Limit to 5 differences
                        break
            logger.debug(f"🔥 [DEBUG 8] Hash differences: {diff}")
            raise HTTPException(status_code=401, detail="Invalid initData hash")
            
    except Exception as e:
        logger.exception("🔥 Validation failed")
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")def validate_init_data(init_data: str, bot_token: str) -> dict:
    try:
        # 🔥 CRITICAL FIX: Don't decode the entire string yet
        logger.debug(f"🔥 [DEBUG 1] RAW initData input: {repr(init_data)}")
        logger.debug(f"🔥 [DEBUG 2] Bot token: {bot_token[:3]}...{bot_token[-3]} ({len(bot_token)} chars)")
        
        # Step 1: Split into key-value pairs BEFORE decoding
        parsed = {}
        for pair in init_data.split('&'):
            key, _, value = pair.partition('=')
            if key and value:
                parsed[key] = value
                logger.debug(f"🔥 [DEBUG 3] Raw pair: {key}={value[:20]}{'...' if len(value) > 20 else ''}")

        # Step 2: Remove verification parameters
        signature = parsed.pop('signature', None)
        received_hash = parsed.pop("hash", None)
        
        if not received_hash:
            raise HTTPException(status_code=400, detail="Missing hash in initData")

        # 🔥 CRITICAL FIX: Build data-check-string with ORIGINAL encoded values
        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(parsed.items())
        )
        
        # 🔥 DEBUG: Show EXACT string being hashed
        logger.debug(f"🔥 [DEBUG 4] Data-check-string EXACT: {data_check_string}")
        logger.debug(f"🔥 [DEBUG 5] Data-check-string length: {len(data_check_string)}")
        logger.debug(f"🔥 [DEBUG 6] Data-check-string SHA256: {hashlib.sha256(data_check_string.encode()).hexdigest()}")

        # Step 3: Compute HMAC key
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        logger.debug(f"🔥 [DEBUG 7] Secret key: {secret_key.hex()}")

        # Step 4: Compute hash
        computed_hash = hmac.new(
            secret_key, 
            data_check_string.encode(), 
            hashlib.sha256
        ).hexdigest()

        logger.info(f"🔑 Hash from Telegram: {received_hash}")
        logger.info(f"🧮 Computed hash: {computed_hash}")

        # Step 5: Constant-time comparison
        if hmac.compare_digest(computed_hash, received_hash):
            logger.info("✅ HASH MATCH SUCCESSFUL!")
            # Now decode the values
            decoded_parsed = {}
            for key, value in parsed.items():
                decoded_value = unquote(value)
                if key == 'user':
                    try:
                        decoded_parsed[key] = json.loads(decoded_value)
                    except json.JSONDecodeError:
                        decoded_parsed[key] = decoded_value
                else:
                    decoded_parsed[key] = decoded_value
            return decoded_parsed
        else:
            logger.error("❌ HASH MISMATCH!")
            # Detailed diff
            diff = []
            for i in range(len(received_hash)):
                if i >= len(computed_hash) or received_hash[i] != computed_hash[i]:
                    diff.append(f"Position {i}: Telegram='{received_hash[i]}' vs Computed='{computed_hash[i] if i < len(computed_hash) else ''}'")
                    if len(diff) > 5:  # Limit to 5 differences
                        break
            logger.debug(f"🔥 [DEBUG 8] Hash differences: {diff}")
            raise HTTPException(status_code=401, detail="Invalid initData hash")
            
    except Exception as e:
        logger.exception("🔥 Validation failed")
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")def validate_init_data(init_data: str, bot_token: str) -> dict:
    try:
        # 🔥 CRITICAL FIX: Don't decode the entire string yet
        logger.debug(f"🔥 [DEBUG 1] RAW initData input: {repr(init_data)}")
        logger.debug(f"🔥 [DEBUG 2] Bot token: {bot_token[:3]}...{bot_token[-3]} ({len(bot_token)} chars)")
        
        # Step 1: Split into key-value pairs BEFORE decoding
        parsed = {}
        for pair in init_data.split('&'):
            key, _, value = pair.partition('=')
            if key and value:
                parsed[key] = value
                logger.debug(f"🔥 [DEBUG 3] Raw pair: {key}={value[:20]}{'...' if len(value) > 20 else ''}")

        # Step 2: Remove verification parameters
        signature = parsed.pop('signature', None)
        received_hash = parsed.pop("hash", None)
        
        if not received_hash:
            raise HTTPException(status_code=400, detail="Missing hash in initData")

        # 🔥 CRITICAL FIX: Build data-check-string with ORIGINAL encoded values
        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(parsed.items())
        )
        
        # 🔥 DEBUG: Show EXACT string being hashed
        logger.debug(f"🔥 [DEBUG 4] Data-check-string EXACT: {data_check_string}")
        logger.debug(f"🔥 [DEBUG 5] Data-check-string length: {len(data_check_string)}")
        logger.debug(f"🔥 [DEBUG 6] Data-check-string SHA256: {hashlib.sha256(data_check_string.encode()).hexdigest()}")

        # Step 3: Compute HMAC key
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        logger.debug(f"🔥 [DEBUG 7] Secret key: {secret_key.hex()}")

        # Step 4: Compute hash
        computed_hash = hmac.new(
            secret_key, 
            data_check_string.encode(), 
            hashlib.sha256
        ).hexdigest()

        logger.info(f"🔑 Hash from Telegram: {received_hash}")
        logger.info(f"🧮 Computed hash: {computed_hash}")

        # Step 5: Constant-time comparison
        if hmac.compare_digest(computed_hash, received_hash):
            logger.info("✅ HASH MATCH SUCCESSFUL!")
            # Now decode the values
            decoded_parsed = {}
            for key, value in parsed.items():
                decoded_value = unquote(value)
                if key == 'user':
                    try:
                        decoded_parsed[key] = json.loads(decoded_value)
                    except json.JSONDecodeError:
                        decoded_parsed[key] = decoded_value
                else:
                    decoded_parsed[key] = decoded_value
            return decoded_parsed
        else:
            logger.error("❌ HASH MISMATCH!")
            # Detailed diff
            diff = []
            for i in range(len(received_hash)):
                if i >= len(computed_hash) or received_hash[i] != computed_hash[i]:
                    diff.append(f"Position {i}: Telegram='{received_hash[i]}' vs Computed='{computed_hash[i] if i < len(computed_hash) else ''}'")
                    if len(diff) > 5:  # Limit to 5 differences
                        break
            logger.debug(f"🔥 [DEBUG 8] Hash differences: {diff}")
            raise HTTPException(status_code=401, detail="Invalid initData hash")
            
    except Exception as e:
        logger.exception("🔥 Validation failed")
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")def validate_init_data(init_data: str, bot_token: str) -> dict:
    try:
        # 🔥 CRITICAL FIX: Don't decode the entire string yet
        logger.debug(f"🔥 [DEBUG 1] RAW initData input: {repr(init_data)}")
        logger.debug(f"🔥 [DEBUG 2] Bot token: {bot_token[:3]}...{bot_token[-3]} ({len(bot_token)} chars)")
        
        # Step 1: Split into key-value pairs BEFORE decoding
        parsed = {}
        for pair in init_data.split('&'):
            key, _, value = pair.partition('=')
            if key and value:
                parsed[key] = value
                logger.debug(f"🔥 [DEBUG 3] Raw pair: {key}={value[:20]}{'...' if len(value) > 20 else ''}")

        # Step 2: Remove verification parameters
        signature = parsed.pop('signature', None)
        received_hash = parsed.pop("hash", None)
        
        if not received_hash:
            raise HTTPException(status_code=400, detail="Missing hash in initData")

        # 🔥 CRITICAL FIX: Build data-check-string with ORIGINAL encoded values
        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(parsed.items())
        )
        
        # 🔥 DEBUG: Show EXACT string being hashed
        logger.debug(f"🔥 [DEBUG 4] Data-check-string EXACT: {data_check_string}")
        logger.debug(f"🔥 [DEBUG 5] Data-check-string length: {len(data_check_string)}")
        logger.debug(f"🔥 [DEBUG 6] Data-check-string SHA256: {hashlib.sha256(data_check_string.encode()).hexdigest()}")

        # Step 3: Compute HMAC key
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        logger.debug(f"🔥 [DEBUG 7] Secret key: {secret_key.hex()}")

        # Step 4: Compute hash
        computed_hash = hmac.new(
            secret_key, 
            data_check_string.encode(), 
            hashlib.sha256
        ).hexdigest()

        logger.info(f"🔑 Hash from Telegram: {received_hash}")
        logger.info(f"🧮 Computed hash: {computed_hash}")

        # Step 5: Constant-time comparison
        if hmac.compare_digest(computed_hash, received_hash):
            logger.info("✅ HASH MATCH SUCCESSFUL!")
            # Now decode the values
            decoded_parsed = {}
            for key, value in parsed.items():
                decoded_value = unquote(value)
                if key == 'user':
                    try:
                        decoded_parsed[key] = json.loads(decoded_value)
                    except json.JSONDecodeError:
                        decoded_parsed[key] = decoded_value
                else:
                    decoded_parsed[key] = decoded_value
            return decoded_parsed
        else:
            logger.error("❌ HASH MISMATCH!")
            # Detailed diff
            diff = []
            for i in range(len(received_hash)):
                if i >= len(computed_hash) or received_hash[i] != computed_hash[i]:
                    diff.append(f"Position {i}: Telegram='{received_hash[i]}' vs Computed='{computed_hash[i] if i < len(computed_hash) else ''}'")
                    if len(diff) > 5:  # Limit to 5 differences
                        break
            logger.debug(f"🔥 [DEBUG 8] Hash differences: {diff}")
            raise HTTPException(status_code=401, detail="Invalid initData hash")
            
    except Exception as e:
        logger.exception("🔥 Validation failed")
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")def validate_init_data(init_data: str, bot_token: str) -> dict:
    try:
        # 🔥 CRITICAL FIX: Don't decode the entire string yet
        logger.debug(f"🔥 [DEBUG 1] RAW initData input: {repr(init_data)}")
        logger.debug(f"🔥 [DEBUG 2] Bot token: {bot_token[:3]}...{bot_token[-3]} ({len(bot_token)} chars)")
        
        # Step 1: Split into key-value pairs BEFORE decoding
        parsed = {}
        for pair in init_data.split('&'):
            key, _, value = pair.partition('=')
            if key and value:
                parsed[key] = value
                logger.debug(f"🔥 [DEBUG 3] Raw pair: {key}={value[:20]}{'...' if len(value) > 20 else ''}")

        # Step 2: Remove verification parameters
        signature = parsed.pop('signature', None)
        received_hash = parsed.pop("hash", None)
        
        if not received_hash:
            raise HTTPException(status_code=400, detail="Missing hash in initData")

        # 🔥 CRITICAL FIX: Build data-check-string with ORIGINAL encoded values
        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(parsed.items())
        )
        
        # 🔥 DEBUG: Show EXACT string being hashed
        logger.debug(f"🔥 [DEBUG 4] Data-check-string EXACT: {data_check_string}")
        logger.debug(f"🔥 [DEBUG 5] Data-check-string length: {len(data_check_string)}")
        logger.debug(f"🔥 [DEBUG 6] Data-check-string SHA256: {hashlib.sha256(data_check_string.encode()).hexdigest()}")

        # Step 3: Compute HMAC key
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        logger.debug(f"🔥 [DEBUG 7] Secret key: {secret_key.hex()}")

        # Step 4: Compute hash
        computed_hash = hmac.new(
            secret_key, 
            data_check_string.encode(), 
            hashlib.sha256
        ).hexdigest()

        logger.info(f"🔑 Hash from Telegram: {received_hash}")
        logger.info(f"🧮 Computed hash: {computed_hash}")

        # Step 5: Constant-time comparison
        if hmac.compare_digest(computed_hash, received_hash):
            logger.info("✅ HASH MATCH SUCCESSFUL!")
            # Now decode the values
            decoded_parsed = {}
            for key, value in parsed.items():
                decoded_value = unquote(value)
                if key == 'user':
                    try:
                        decoded_parsed[key] = json.loads(decoded_value)
                    except json.JSONDecodeError:
                        decoded_parsed[key] = decoded_value
                else:
                    decoded_parsed[key] = decoded_value
            return decoded_parsed
        else:
            logger.error("❌ HASH MISMATCH!")
            # Detailed diff
            diff = []
            for i in range(len(received_hash)):
                if i >= len(computed_hash) or received_hash[i] != computed_hash[i]:
                    diff.append(f"Position {i}: Telegram='{received_hash[i]}' vs Computed='{computed_hash[i] if i < len(computed_hash) else ''}'")
                    if len(diff) > 5:  # Limit to 5 differences
                        break
            logger.debug(f"🔥 [DEBUG 8] Hash differences: {diff}")
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