# app/database.py
import psycopg2
import os
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi import HTTPException
from typing import Optional, Dict, Any
import warnings
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

class UserData(BaseModel):
    chat_id: int
    session_token: str  # Add this field
    phone: Optional[str] = None
    address: Optional[str] = None

class DatabaseManager:
    def __init__(self):
        self.conn = None
        
    def __enter__(self):
        try:
            self.conn = psycopg2.connect(
                os.getenv("DATABASE_URL"),
                connect_timeout=5
            )
            logger.info("Database connection established")
            return self
        except Exception as e:
            logger.error(f"Database connection failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Database connection error"
            )
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            self.conn.close()

    def register_user(self, user: UserData) -> Dict[str, Any]:
        """Handles user registration with conflict checking"""
        try:
            with self.conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO users (chat_id, name, username)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (chat_id) DO NOTHING
                    RETURNING chat_id
                    """,
                    (user.chat_id, user.name, user.username)
                )
                result = cur.fetchone()
                self.conn.commit()
                return {
                    "status": "success" if result else "exists",
                    "message": f"User {user.chat_id} {'registered' if result else 'already exists'}",
                    "chat_id": user.chat_id
                }
        except Exception as e:
            self.conn.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Database operation failed: {str(e)}"
            )

# Update register_user method
def register_user(self, user: UserData) -> Dict[str, Any]:
    """Handles user registration with conflict checking"""
    try:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (chat_id, session_token, phone, address)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (chat_id) 
                DO UPDATE SET 
                    last_active = NOW(),
                    phone = EXCLUDED.phone,
                    address = EXCLUDED.address
                RETURNING chat_id
                """,
                (user.chat_id, user.session_token, user.phone, user.address)
            )
            result = cur.fetchone()
            self.conn.commit()
            return {
                "status": "success" if result else "exists",
                "message": f"User {user.chat_id} {'registered' if result else 'updated'}",
                "chat_id": user.chat_id
            }
    except Exception as e:
        self.conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Database operation failed: {str(e)}"
        )
# Legacy support (not recommended)
def get_db_connection():
    warnings.warn("Use DatabaseManager context manager instead", DeprecationWarning)
    return psycopg2.connect(os.getenv("DATABASE_URL"))


def test_database_connection():
    """Test function to verify database connectivity"""
    try:
        with DatabaseManager() as db:
            with db.conn.cursor() as cur:
                cur.execute("SELECT 1")
                logger.info("Database connection test successful")
        return True
    except Exception as e:
        logger.error(f"Database test failed: {str(e)}")
        return False

# Call this when your application starts
test_database_connection()