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

