import psycopg2
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI()

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

class UserData(BaseModel):
    chat_id: int
    name: str
    username: str | None = None

@app.post("/register")
def register_user(user: UserData):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Insert new user if chat_id is unique, otherwise do nothing
        cur.execute(
            """
            INSERT INTO users (chat_id, name, username) 
            VALUES (%s, %s, %s) 
            ON CONFLICT (chat_id) DO NOTHING
            """,
            (user.chat_id, user.name, user.username),
        )

        conn.commit()
        return {"message": "User registered (or already exists)"}
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        cur.close()
        conn.close()
