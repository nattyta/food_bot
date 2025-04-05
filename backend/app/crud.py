from .database import get_db_connection
from .schemas import UserCreate

def create_user(user_data: UserCreate):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO users (chat_id, name, phone, address, created_at)
        VALUES (%s, %s, %s, %s, NOW())
        ON CONFLICT (chat_id) DO UPDATE 
        SET name = EXCLUDED.name, phone = EXCLUDED.phone, address = EXCLUDED.address
        RETURNING id, chat_id, name, phone, address, created_at;
    """, (
        user_data.chat_id,
        user_data.name,
        user_data.phone,
        user_data.address
    ))

    row = cur.fetchone()
    user = {
        "id": row[0],
        "chat_id": row[1],
        "name": row[2],
        "phone": row[3],
        "address": row[4],
        "created_at": row[5].isoformat() if row[5] else None
    }

    conn.commit()
    cur.close()
    conn.close()
    return user
