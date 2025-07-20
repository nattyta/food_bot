import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional
import redis
import os
import json
import jwt

# Load secret key from environment or fallback
JWT_SECRET = os.getenv("JWT_SECRET", "your-default-secret")
JWT_ALGORITHM = "HS256"

class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, dict] = {}
        self.redis_client = None

        # Auto-init Redis on creation if REDIS_HOST is set
        if os.getenv("REDIS_HOST"):
            self.init_redis()

    def init_redis(self):
        """Initialize Redis connection for production"""
        self.redis_client = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            db=int(os.getenv("REDIS_DB", 0))
        )

    def create_session(self, chat_id: int) -> str:
        """Create a session token and store it"""
        token = secrets.token_urlsafe(32)
        session_data = {
            'chat_id': chat_id,
            'created_at': datetime.now().isoformat(),
            'expires_at': (datetime.now() + timedelta(hours=24)).isoformat()
        }

        if self.redis_client:
            self.redis_client.setex(
                f"session:{token}",
                timedelta(hours=24),
                json.dumps(session_data)
            )
        else:
            self.sessions[token] = session_data

        return token

    def validate_session(self, token: str) -> Optional[int]:
        """Validate a session token and return the chat_id if valid"""
        session_data = None
        
        if self.redis_client:
            data = self.redis_client.get(f"session:{token}")
            if data:
                session_data = json.loads(data)
        else:
            session_data = self.sessions.get(token)

        if not session_data:
            return None

        # Check expiration
        if datetime.fromisoformat(session_data['expires_at']) < datetime.now():
            self.revoke_session(token)
            return None

        return session_data['chat_id']

    def revoke_session(self, token: str) -> None:
        """Remove a session token"""
        if self.redis_client:
            self.redis_client.delete(f"session:{token}")
        else:
            self.sessions.pop(token, None)

    def generate_token(self, user_id: int) -> str:
        """Generate a JWT token for the user"""
        payload = {
            "sub": user_id,
            "exp": datetime.utcnow() + timedelta(days=1)
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    def verify_token(self, token: str) -> Optional[int]:
        """(Optional) Decode and verify a JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload.get("sub")
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

# ✅ Singleton instance
session_manager = SessionManager()

# Aliases
create_session = session_manager.create_session
validate_session = session_manager.validate_session
revoke_session = session_manager.revoke_session
generate_token = session_manager.generate_token
