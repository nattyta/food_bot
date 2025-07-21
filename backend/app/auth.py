from fastapi import Request, HTTPException, Depends
import logging
from fastapi.security import HTTPBearer
from .sessions import session_manager
import os
import hmac
import hashlib
from urllib.parse import parse_qs,unquote
import json
import logging
from typing import Optional
from urllib.parse import parse_qsl
import os
from dotenv import load_dotenv

load_dotenv()

bot_token = os.getenv("Telegram_API")
print("✅ Telegram_API:", repr(os.getenv("Telegram_API")))

logger = logging.getLogger("uvicorn.error")

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
        # Ensure init_data is properly unquoted
        init_data = unquote(init_data)
        
        # Parse the init data
        parsed = dict(parse_qsl(init_data))
        received_hash = parsed.pop("hash", "")
        
        # Debug logging - remove in production
        logger.debug(f"Parsed init data: {parsed}")
        logger.debug(f"Received hash: {received_hash}")
        
        # Create data check string
        data_check_string = "\n".join(
            f"{key}={value}"
            for key, value in sorted(parsed.items())
        )
        
        logger.debug(f"Data check string: {data_check_string}")
        
        # Compute secret key
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        # Compute HMAC
        computed_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        logger.debug(f"Computed hash: {computed_hash}")
        
        # Compare hashes
        return hmac.compare_digest(computed_hash, received_hash)
    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        return False