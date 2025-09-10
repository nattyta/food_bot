# app/database.py
import os
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi import HTTPException
from typing import Optional, Dict, Any
import warnings
import logging
import psycopg
import time


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

class UserData(BaseModel):
    chat_id: int
    session_token: str 
    phone: Optional[str] = None
    address: Optional[str] = None

class DatabaseManager:
    def __enter__(self):
        self.conn = psycopg.connect(os.getenv("DATABASE_URL"))
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            self.conn.close()

    def execute(self, query: str, params: tuple = ()):
        try:
            # Create cursor without context manager
            cur = self.conn.cursor()
            cur.execute(query, params)
            self.conn.commit()
            return cur, cur.rowcount  # Return OPEN cursor
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Database query failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Database operation failed: {str(e)}"
            )
    
    def execute_returning(self, query: str, params: tuple = ()):
        """Execute query and return single result row"""
        try:
            cur = self.conn.cursor()
            cur.execute(query, params)
            result = cur.fetchone()
            self.conn.commit()
            cur.close()  # Close cursor manually
            return result
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Database query failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Database operation failed: {str(e)}"
            )

    def fetchone(self, query: str, params: tuple = ()):
        """Execute a query and fetch one result"""
        try:
            cur = self.conn.cursor()
            cur.execute(query, params)
            result = cur.fetchone()
            cur.close()  # Close cursor manually
            return result
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Database query failed: {str(e)}")
            raise
    
    def fetchall(self, query: str, params: tuple = ()):
        """Execute a query and fetch all results"""
        try:
            cur = self.conn.cursor()
            cur.execute(query, params)
            result = cur.fetchall()
            cur.close()  # Close cursor manually
            return result
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Database query failed: {str(e)}")
            raise

    def register_user(self, user: UserData) -> Dict[str, Any]:
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
    return psycopg.connect(os.getenv("DATABASE_URL"))

def test_database_connection():
    try:
        with DatabaseManager() as db:
            with db.conn.cursor() as cur:
                cur.execute("SELECT 1")
                logger.info("Database connection test successful")
        return True
    except Exception as e:
        logger.error(f"Database test failed: {str(e)}")
        return False


def get_db_manager():
    """
    FastAPI dependency to get a DatabaseManager instance.
    Includes a retry mechanism to handle temporary network failures.
    """
    retries = 3
    delay = 0.5  # Start with a 500ms delay
    last_exception = None

    for attempt in range(retries):
        try:
            db = DatabaseManager()
            # This is the line that can fail
            db.conn = psycopg.connect(os.getenv("DATABASE_URL"))
            
            # If connection is successful, yield the manager and exit the loop
            yield db
            return 
        
        except psycopg.OperationalError as e:
            logger.warning(f"DB connection attempt {attempt + 1}/{retries} failed: {e}")
            last_exception = e
            time.sleep(delay)
            delay *= 2  # Double the delay for the next attempt (exponential backoff)
            continue # Go to the next iteration of the loop
        
        finally:
            # This 'finally' block ensures the connection is closed
            # after the request is finished, but only if it was successfully created.
            if 'db' in locals() and hasattr(db, 'conn') and db.conn:
                if not db.conn.closed:
                    db.conn.close()

    # If all retries have failed, raise the final exception
    raise HTTPException(
        status_code=503, # Service Unavailable
        detail=f"Could not connect to the database after {retries} attempts. Last error: {last_exception}"
    )
test_database_connection()