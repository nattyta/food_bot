from .database import get_db_connection,DatabaseManager
from .schemas import UserCreate, OrderCreate
import json
from typing import Dict, Any,Optional

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


def create_order(order_data: OrderCreate) -> Dict[str, Any]:
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # 1. Update user contact info (using your existing pattern)
        cur.execute("""
            UPDATE users 
            SET phone = %s, 
                delivery_address = %s,
                last_active = NOW() 
            WHERE chat_id = %s
            RETURNING id;
        """, (
            order_data.phone,
            order_data.address,
            order_data.chat_id
        ))

        # 2. Create the order
        cur.execute("""
            INSERT INTO orders 
            (user_id, items, total_price, order_status, delivery_info)
            VALUES (
                (SELECT id FROM users WHERE chat_id = %s),
                %s, %s, 'pending',
                %s
            )
            RETURNING order_id;
        """, (
            order_data.chat_id,
            json.dumps([item.dict() for item in order_data.items]),
            order_data.total_price,
            json.dumps({
                'type': order_data.order_type,
                'address': order_data.address
            })
        ))

        order_id = cur.fetchone()[0]
        conn.commit()
        
        return {
            "status": "success",
            "order_id": order_id,
            "chat_id": order_data.chat_id
        }

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()




def update_user_contact(chat_id: int, phone: str, address: str = None):
    with DatabaseManager() as db:
        try:
            db.execute(
                """UPDATE users 
                SET phone = %s, address = %s, last_active = NOW() 
                WHERE chat_id = %s""",
                (phone, address, chat_id)
            )
            return True
        except Exception as e:
            db.conn.rollback()
            raise e