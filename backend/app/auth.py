from fastapi import Request, HTTPException, Depends, logger
from fastapi.security import HTTPBearer
from .sessions import session_manager
import os
import hmac
import hashlib
from urllib.parse import parse_qs
import json
import logging
from typing import Optional

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

def validate_init_data(init_data: str, bot_token: str) -> bool:
    """
    Validates Telegram WebApp initData using the HMAC algorithm.
    Follows official Telegram spec:
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
    """
    try:
        # Parse and clean query string
        parsed = dict(pair.split('=', 1) for pair in init_data.split('&') if '=' in pair)
        received_hash = parsed.pop('hash', '')

        # Sort and rebuild data string
        data_check_string = '\n'.join(
            f"{k}={v}" for k, v in sorted(parsed.items())
        )

        # Generate secret key from bot token
        secret_key = hmac.new(
            key=bot_token.encode(),        # ✅ Correct order: bot token is the key
            msg=b'WebAppData',
            digestmod=hashlib.sha256
        ).digest()

        # Compute HMAC hash
        computed_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()

        # Compare computed hash with received one
        return hmac.compare_digest(computed_hash, received_hash)
    except Exception as e:
        print("❌ validate_init_data error:", str(e))
        return False

def parse_telegram_user(init_data: str) -> dict:
    """Parse Telegram WebApp initData to get user info"""
    try:
        parsed = parse_qs(init_data)
        user_json = parsed.get('user', ['{}'])[0]
        return json.loads(user_json)
    except Exception as e:
        raise ValueError(f"Invalid initData: {str(e)}")

async def telegram_auth(request: Request) -> Optional[int]:
    """Handle Telegram WebApp authentication"""
    try:
        init_data = request.headers.get('x-telegram-init-data')
        if not init_data:
            return None
            
        if not validate_init_data(init_data, os.getenv("Telegram_API")):
            raise ValueError("Invalid Telegram auth")

        user_data = parse_telegram_user(init_data)
        request.state.telegram_user = user_data
        return user_data.get('id')
    except Exception as e:
        logger.error(f"Telegram auth error: {str(e)}")
        return None