from .database import get_db_connection,DatabaseManager
from .schemas import UserCreate, OrderCreate
import json
from typing import Dict, Any,Optional,List
from .models import AdminInDB
from .schemas import StaffCreate, StaffBase, StaffPublic, StaffUpdate



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



def get_admin_by_username(db: DatabaseManager, username: str) -> Optional[AdminInDB]:
    """Fetches an admin user from the DB by username (email)."""
    query = "SELECT id, username, password_hash, role, created_at, last_login FROM admins WHERE username = %s"
    
    result = db.fetchone(query, (username,))
    
    if result:
        # Map the tuple result to our AdminInDB Pydantic model
        return AdminInDB(
            id=result[0],
            username=result[1],
            password_hash=result[2],
            role=result[3],
            created_at=result[4],
            last_login=result[5]
        )
    return None




def create_staff(db: DatabaseManager, staff: StaffCreate) -> Dict[str, Any]:
    """Inserts a new staff member into the 'admins' table with a hashed password."""
    hashed_password = get_password_hash(staff.password)
    
    # Note: 'username' column in DB is used for email. We'll use the name for now.
    # The frontend form doesn't have an email field, so we use the name as a placeholder.
    # A better long-term solution would be to add an email field to the form.
    username = f"{staff.name.lower().replace(' ', '')}@foodbot.local"
    
    query = """
        INSERT INTO admins (username, password_hash, name, role, phone, telegram_id, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id, username, name, role, phone, telegram_id, status, created_at, last_login, orders_handled, rating, average_time, total_earnings;
    """
    params = (
        username, hashed_password, staff.name, staff.role, 
        staff.phone, staff.telegramId, staff.status
    )
    
    new_staff_row = db.execute_returning(query, params)
    return row_to_dict(new_staff_row)


def get_all_staff(db: DatabaseManager) -> List[Dict[str, Any]]:
    """Retrieves all users from the 'admins' table."""
    query = "SELECT id, username, name, role, phone, telegram_id, status, created_at, last_login, orders_handled, rating, average_time, total_earnings FROM admins"
    rows = db.fetchall(query)
    return [row_to_dict(row) for row in rows]

def update_staff(db: DatabaseManager, staff_id: int, staff_data: StaffUpdate) -> Optional[Dict[str, Any]]:
    """Updates a staff member's details in the 'admins' table."""
    # Build the query dynamically based on the fields provided
    fields = staff_data.dict(exclude_unset=True)
    if not fields:
        return get_staff_by_id(db, staff_id) # Return current data if no fields to update

    set_clause = ", ".join([f"{key} = %s" for key in fields.keys()])
    query = f"UPDATE admins SET {set_clause} WHERE id = %s RETURNING id, username, name, role, phone, telegram_id, status, created_at, last_login, orders_handled, rating, average_time, total_earnings;"
    
    params = list(fields.values()) + [staff_id]
    
    updated_staff_row = db.execute_returning(query, tuple(params))
    return row_to_dict(updated_staff_row) if updated_staff_row else None

def delete_staff(db: DatabaseManager, staff_id: int) -> bool:
    """Deletes a staff member from the 'admins' table."""
    query = "DELETE FROM admins WHERE id = %s"
    cursor, rowcount = db.execute(query, (staff_id,))
    cursor.close()
    return rowcount > 0

def get_staff_by_id(db: DatabaseManager, staff_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves a single staff member by their ID."""
    query = "SELECT id, username, name, role, phone, telegram_id, status, created_at, last_login, orders_handled, rating, average_time, total_earnings FROM admins WHERE id = %s"
    row = db.fetchone(query, (staff_id,))
    return row_to_dict(row) if row else None


# Helper function to convert DB rows to dictionaries for easier JSON conversion
def row_to_dict(row: tuple) -> Dict[str, Any]:
    if not row:
        return None
    return {
        "id": row[0], "username": row[1], "name": row[2], "role": row[3],
        "phone": row[4], "telegramId": row[5], "status": row[6],
        "created_at": row[7], "lastActive": row[8], "ordersHandled": row[9],
        "rating": float(row[10]), "averageTime": row[11], "totalEarnings": float(row[12]) if row[12] else None
    }