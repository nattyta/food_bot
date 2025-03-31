from .database import get_db_connection

def get_user_by_chat_id(chat_id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE chat_id = %s", (chat_id,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    return user

def create_user(user_data):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO users (chat_id, name, phone, address, created_at)
        VALUES (%s, %s, %s, %s, NOW())
        ON CONFLICT (chat_id) DO UPDATE 
        SET name = EXCLUDED.name, phone = EXCLUDED.phone, address = EXCLUDED.address
        RETURNING *;
    """, (user_data["chat_id"], user_data["name"], user_data["phone"], user_data["address"]))

    user = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return user
