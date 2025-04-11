# app/middleware.py
from fastapi import Request, HTTPException
import os
import hmac
import hashlib

async def validate_telegram_request(request: Request):
    """Middleware to validate Telegram WebApp data"""
    if request.url.path.startswith('/api/'):
        try:
            data = await request.json()
            init_data = data.get('init_data', '')
            
            # Skip validation for debug routes
            if '/debug/' in request.url.path:
                return data
                
            if not validate_init_data(init_data, os.getenv("Telegram_API")):
                raise HTTPException(403, "Invalid Telegram auth")
            return data
        except Exception as e:
            raise HTTPException(401, f"Auth failed: {str(e)}")

def validate_init_data(init_data: str, bot_token: str) -> bool:
    """Actual validation logic"""
    try:
        data_pairs = init_data.split('&')
        data = {}
        for pair in data_pairs:
            key, value = pair.split('=', 1)
            data[key] = value
        
        hash_str = data.pop('hash', '')
        data_str = '\n'.join(f"{k}={v}" for k,v in sorted(data.items()))
        
        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        computed_hash = hmac.new(secret_key, data_str.encode(), hashlib.sha256).hexdigest()
        
        return computed_hash == hash_str
    except Exception:
        return False