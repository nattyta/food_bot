import jwt
from datetime import datetime, timedelta
import os

JWT_SECRET = os.getenv("JWT_SECRET", "changeme")  # replace in production
JWT_ALGORITHM = "HS256"

def create_jwt(payload: dict, days: int = 7) -> str:
    return jwt.encode(
        {
            **payload,
            "exp": datetime.utcnow() + timedelta(days=days)
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )

def decode_jwt(token: str):
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
