import jwt
from datetime import datetime, timedelta
import os

JWT_SECRET = os.getenv("JWT_SECRET", "changeme")  # replace in production
JWT_ALGORITHM = "HS256"

def create_jwt(payload: dict) -> str:
    """Create JWT token with 1 day expiration"""
    return jwt.encode(
        {
            **payload,
            "exp": datetime.utcnow() + timedelta(days=1)
        },
        os.getenv("JWT_SECRET"),
        algorithm="HS256"
    )