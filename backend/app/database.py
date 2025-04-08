# app/database.py

import psycopg2
import os
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

class UserData(BaseModel):
    chat_id: int
    name: str
    username: str | None = None

def register_user(user: UserData):
    print("📥 Incoming user data:", user)

    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            """
            INSERT INTO users (chat_id, name, username) 
            VALUES (%s, %s, %s) 
            ON CONFLICT (chat_id) DO NOTHING
            """,
            (user.chat_id, user.name, user.username),
        )
        conn.commit()
        print("✅ User saved to DB")
        return {"message": "User registered (or already exists)"}
    
    except Exception as e:
        conn.rollback()
        print("❌ DB Error:", e)
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        cur.close()
        conn.close()
