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
        # 🔍 FORENSIC LOGGING START
        logger.debug(f"🔥 [INPUT] init_data type: {type(init_data)}")
        logger.debug(f"🔥 [INPUT] init_data length: {len(init_data)}")
        logger.debug(f"🔥 [INPUT] First 50 chars: {repr(init_data[:50])}")
        logger.debug(f"🔥 [INPUT] Last 50 chars: {repr(init_data[-50:])}")
        logger.debug(f"🔥 [TOKEN] Bot token: {bot_token[:3]}...{bot_token[-3]} ({len(bot_token)} chars)")
        logger.debug(f"🔥 [TOKEN] Hex: {bot_token.encode('utf-8').hex()}")

        # Step 1: Parse without decoding
        parsed = {}
        for pair in init_data.split('&'):
            if '=' in pair:
                key, value = pair.split('=', 1)
                parsed[key] = value
                logger.debug(f"🔥 [PARSE] Raw: {key}={value[:20]}{'...' if len(value) > 20 else ''}")

        # 🔍 Log all keys before removal
        logger.debug(f"🔥 [KEYS PRE] All keys: {list(parsed.keys())}")
        
        # Remove verification params
        received_hash = parsed.pop("hash", None)
        signature = parsed.pop("signature", None)
        
        # 🔍 Log keys after removal
        logger.debug(f"🔥 [KEYS POST] After removal: {list(parsed.keys())}")
        logger.debug(f"🔥 [HASH] Received: {received_hash}")

        # 🔥 BACKSLASH CORRECTION FOR PHOTO_URL
        if 'user' in parsed:
            original_user = parsed['user']
            # Replace encoded backslashes with actual backslashes
            corrected_user = original_user.replace('%5C', '\\')
            if original_user != corrected_user:
                logger.debug("🔥 Applying photo_url backslash correction")
                parsed['user'] = corrected_user
        
        # 🔍 Verify parameter order
        expected_order = sorted(parsed.keys())
        logger.debug(f"🔥 [ORDER] Sorted keys: {expected_order}")
        
        # Build data-check-string with EXACT values
        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(parsed.items())
        )
        
        # 🔍 HEX DUMP for binary comparison
        logger.debug(f"🔥 [CHECK STRING] Length: {len(data_check_string)}")
        logger.debug(f"🔥 [CHECK STRING] Hex: {data_check_string.encode('utf-8').hex()}")
        logger.debug(f"🔥 [CHECK STRING] Full: {repr(data_check_string)}")

        # Compute HMAC key
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode('utf-8'),
            digestmod=hashlib.sha256
        ).digest()
        logger.debug(f"🔥 [SECRET] Key hex: {secret_key.hex()}")

        # Compute hash
        computed_hash = hmac.new(
            secret_key,
            data_check_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        logger.debug(f"🔥 [HASH] Computed: {computed_hash}")

        # 🔍 CHARACTER-BY-CHARACTER COMPARISON
        diff = []
        for i in range(max(len(received_hash), len(computed_hash))):
            char_rec = received_hash[i] if i < len(received_hash) else None
            char_comp = computed_hash[i] if i < len(computed_hash) else None
            if char_rec != char_comp:
                diff.append({
                    "position": i,
                    "received": char_rec,
                    "computed": char_comp
                })
                if len(diff) > 5:  # Limit to first 5 differences
                    break
        
        logger.debug(f"🔥 [HASH DIFF] First differences: {diff}")

        # 🔍 BACKSLASH AUDIT
        backslash_count_rec = data_check_string.count('\\')
        logger.debug(f"🔥 [BACKSLASH] Count in string: {backslash_count_rec}")

        # Validation
        if hmac.compare_digest(computed_hash, received_hash):
            logger.info("✅ HASH MATCH SUCCESSFUL!")
            # Return decoded user data
            decoded = {}
            for k, v in parsed.items():
                if k == "user":
                    try:
                        decoded[k] = json.loads(unquote(v))
                    except json.JSONDecodeError:
                        decoded[k] = unquote(v)
                else:
                    decoded[k] = unquote(v)
            return decoded
        else:
            logger.error("❌ HASH MISMATCH!")
            # 🧪 TEST: Try with double-unquoted user
            if 'user' in parsed:
                test_value = unquote(unquote(parsed['user']))
                logger.debug(f"🔥 [TEST] Double-unquoted user: {test_value[:50]}...")
            
            raise HTTPException(status_code=401, detail="Invalid initData hash")
            
    except Exception as e:
        logger.exception("💥 VALIDATION FAILED")
        # 🧪 TEST: Return computed values for analysis
        test_debug = {
            "error": str(e),
            "received_hash": received_hash,
            "computed_hash": computed_hash,
            "data_check_string": data_check_string,
            "secret_key_hex": secret_key.hex() if 'secret_key' in locals() else None
        }
        logger.debug(f"🔥 [DEBUG DUMP] {json.dumps(test_debug)}")
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