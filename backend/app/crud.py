from .database import get_db_connection
from .schemas import UserCreate

def create_user(user_data: UserCreate):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO users (chat_id, session_token, phone, address)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (chat_id) DO UPDATE 
        SET phone = EXCLUDED.phone, 
            address = EXCLUDED.address,
            last_active = NOW()
        RETURNING chat_id, phone, address, created_at;
    """, (
        user_data.chat_id,
        user_data.session_token,  # New field
        user_data.phone,
        user_data.address
    ))

    row = cur.fetchone()
    user = {
        "chat_id": row[0],
        "phone": row[1],
        "address": row[2],
        "created_at": row[3].isoformat() if row[3] else None
    }

    conn.commit()
    cur.close()
    conn.close()
    return user