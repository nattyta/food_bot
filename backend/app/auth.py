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
    try:
        data_dict = dict(pair.split('=') for pair in init_data.split('&'))
        auth_hash = data_dict.pop('hash', '')

        sorted_data = '\n'.join(f"{k}={v}" for k, v in sorted(data_dict.items()))
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()

        calculated_hash = hmac.new(
            key=secret_key,
            msg=sorted_data.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(calculated_hash, auth_hash)
    except Exception as e:
        print("🔴 validate_init_data error:", e)
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