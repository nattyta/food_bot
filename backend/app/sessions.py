import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional
import redis  # Only for production
import os
import json

class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, dict] = {}
        self.redis_client = None

    def init_redis(self):
        """Initialize Redis connection for production"""
        self.redis_client = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            db=int(os.getenv("REDIS_DB", 0))
        )

    def create_session(self, chat_id: int) -> str:
        """Create a new session and return the token"""
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

# Create a single instance of SessionManager
session_manager = SessionManager()

# Create aliases for the commonly used functions
create_session = session_manager.create_session
validate_session = session_manager.validate_session
revoke_session = session_manager.revoke_session