from fastapi import Request, HTTPException, Depends
import logging
from fastapi.security import HTTPBearer
import os
import hmac
import hashlib
from urllib.parse import parse_qsl,unquote
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

def validate_init_data(init_data_raw: str, bot_token: str) -> dict | None:
    try:
        parsed = parse_qs(init_data_raw, strict_parsing=True)
        init_data = {k: v[0] for k, v in parsed.items()}
        logger.debug(f"🌐 Raw parsed initData: {init_data}")

        received_hash = init_data.pop("hash", None)
        if not received_hash:
            logger.warning("❌ Missing hash in initData.")
            return None

        # Flatten user JSON if present
        if "user" in init_data:
            user_data = json.loads(init_data["user"])
            for k, v in user_data.items():
                init_data[f"user.{k}"] = str(v)
            del init_data["user"]

        # ✅ Remove `signature` and sort keys
        data_check_string = "\n".join(
            f"{k}={init_data[k]}" for k in sorted(init_data)
        )

        logger.warning("📦 Flattened and sorted data before hashing:")
        for line in data_check_string.splitlines():
            logger.warning(line)

        # 🔐 Hashing using HMAC SHA256
        secret_key = hashlib.sha256(bot_token.encode()).digest()
        computed_hash = hmac.new(
            secret_key, data_check_string.encode(), hashlib.sha256
        ).hexdigest()

        logger.info(f"🔑 Hash from Telegram: {received_hash}")
        logger.info(f"🧮 Computed hash: {computed_hash}")

        if computed_hash != received_hash:
            logger.error("❌ Hash mismatch! Invalid initData.")
            return None

        return init_data  # or the user dict if you want to extract that directly

    except Exception as e:
        logger.exception(f"🔥 Exception during initData validation: {e}")
        return None




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
