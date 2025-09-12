from .database import get_db_connection,DatabaseManager
from .schemas import UserCreate, OrderCreate
import json
from typing import Dict, Any,Optional,List
from .models import AdminInDB
from .schemas import StaffCreate, StaffBase, StaffPublic, StaffUpdate
from .security import get_password_hash
import logging
from . import schemas


logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

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



def get_dashboard_stats(db: DatabaseManager) -> Dict[str, Any]:
    """
    Calculates and returns key statistics for the admin dashboard.
    This version is robust and handles empty tables or NULL results using COALESCE.
    """
    logger.info("Fetching robust dashboard stats from database...")
    
    # This single query is more efficient and safer than running four separate ones.
    stats_query = """
        SELECT
            (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE payment_status = 'paid'),
            (SELECT COUNT(*) FROM orders),
            (SELECT COUNT(*) FROM users),
            (SELECT COUNT(*) FROM orders WHERE status = 'pending' AND payment_status = 'paid')
    """
    
    # fetchone() will return a single tuple, e.g., (Decimal('0.00'), 0, 0, 0)
    result = db.fetchone(stats_query)
    
    if not result:
        # This is a fallback in case the query itself fails for some reason
        return {"totalRevenue": 0.0, "totalOrders": 0, "totalCustomers": 0, "pendingOrders": 0}

    total_revenue, total_orders, total_customers, pending_orders = result

    # This structure now perfectly matches what your StatsCards.tsx component expects
    return {
        "activeOrders": pending_orders,
        "activeOrdersChange": "+0%", # Placeholder value
        "avgPrepTime": "N/A",      # Placeholder value
        "avgPrepTimeChange": "0%",   # Placeholder value
        "completedToday": 0,       # Placeholder value
        "completedTodayChange": "+0%", # Placeholder value
        "revenueToday": f"${float(total_revenue):.2f}",
        "revenueTodayChange": "+0%"  # Placeholder value
    }

def get_recent_orders(db: DatabaseManager, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Retrieves the most recent orders, correctly formatted for the frontend API client.
    """
    logger.info(f"Fetching {limit} recent orders from database...")
    query = """
        SELECT o.order_id, u.name as customer_name, o.obfuscated_phone, o.total_price, 
               o.status, o.order_date, o.items, o.order_type, o.payment_status, o.notes
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.chat_id
        ORDER BY o.order_date DESC
        LIMIT %s;
    """
    rows = db.fetchall(query, (limit,))
    
    recent_orders = []
    for row in rows:
        try:
            # Parse the items JSON
            items_from_db = json.loads(row[6]) if isinstance(row[6], str) else (row[6] or [])
        except (json.JSONDecodeError, TypeError):
            items_from_db = []
            
        # Convert the items to the format expected by the frontend
        formatted_items = []
        for item in items_from_db:
            formatted_item = {
                "id": item.get("id", ""),
                "name": item.get("name", "Unknown Item"),
                "price": float(item.get("price", 0)),
                "quantity": int(item.get("quantity", 1)),
                "addOns": item.get("addOns", []),
                "extras": item.get("extras", []),
                "modifications": item.get("modifications", []),
                "specialInstruction": item.get("specialInstruction", "")
            }
            formatted_items.append(formatted_item)
        
        recent_orders.append({
            "id": f"ORD-{row[0]}",
            "customerName": row[1] if row[1] else "Unknown User",
            "customerPhone": row[2],
            "total": float(row[3]),
            "status": row[4],
            "createdAt": row[5],
            "updatedAt": row[5],
            "items": formatted_items,
            "type": row[7],
            "paymentStatus": row[8],
            "specialInstructions": row[9],
            "estimatedDeliveryTime": None
        })
    
    return recent_orders

# --- ADD these new functions for the Orders page ---

def get_all_orders_paginated(db: DatabaseManager, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Retrieves all orders, with an optional filter for status.
    """
    logger.info(f"Fetching all orders with status: {status}")
    
    query = """
        SELECT o.order_id, u.name as customer_name, o.obfuscated_phone, o.total_price, 
               o.status, o.order_date, o.items, o.order_type, o.payment_status, o.notes
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.chat_id
    """
    params = []
    if status:
        query += " WHERE o.status = %s"
        params.append(status)
    
    query += " ORDER BY o.order_date DESC;"
    
    rows = db.fetchall(query, tuple(params))
    
    all_orders = []
    for row in rows:
        try:
            # Parse the items JSON
            items_from_db = json.loads(row[6]) if isinstance(row[6], str) else (row[6] or [])
        except (json.JSONDecodeError, TypeError):
            items_from_db = []
            
        # Convert the items to the format expected by the frontend
        formatted_items = []
        for item in items_from_db:
            formatted_item = {
                "id": item.get("id", ""),
                "name": item.get("name", "Unknown Item"),
                "price": float(item.get("price", 0)),
                "quantity": int(item.get("quantity", 1)),
                "addOns": item.get("addOns", []),
                "extras": item.get("extras", []),
                "modifications": item.get("modifications", []),
                "specialInstruction": item.get("specialInstruction", "")
            }
            formatted_items.append(formatted_item)
        
        all_orders.append({
            "id": f"ORD-{row[0]}",
            "customerName": row[1] if row[1] else "Unknown User",
            "customerPhone": row[2],
            "total": float(row[3]),
            "status": row[4],
            "createdAt": row[5],
            "updatedAt": row[5],
            "items": formatted_items,
            "type": row[7],
            "paymentStatus": row[8],
            "specialInstructions": row[9],
            "estimatedDeliveryTime": None
        })
    return all_orders

def update_order_status(db: DatabaseManager, order_id: int, new_status: str) -> Optional[Dict[str, Any]]:
    """Updates the status of a specific order."""
    logger.info(f"Updating order {order_id} to status {new_status}")
    # You might want to add logic here to prevent invalid status transitions
    query = "UPDATE orders SET status = %s WHERE order_id = %s RETURNING order_id;"
    result = db.execute_returning(query, (new_status, order_id))
    if result:
        # After updating, fetch the full order details to return to the frontend
        return get_order_by_id(db, order_id) # We'll need to create get_order_by_id
    return None

# Helper function needed for update_order_status
def get_order_by_id(db: DatabaseManager, order_id: int) -> Optional[Dict[str, Any]]:
    # This is a simplified version; you would build this out like get_recent_orders
    query = "SELECT order_id, status FROM orders WHERE order_id = %s;"
    row = db.fetchone(query, (order_id,))
    if not row: return None
    # In a real app, you'd return the full order object here
    return {"id": f"ORD-{row[0]}", "status": row[1]} 


def get_recent_orders_for_dashboard(db: DatabaseManager, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Retrieves the NEWEST orders, ensuring all item customizations are preserved.
    """
    logger.info(f"Fetching {limit} newest orders for dashboard...")
    query = """
        SELECT o.order_id, u.name as customer_name, o.obfuscated_phone, o.total_price, 
               o.status, o.order_date, o.items, o.order_type, o.payment_status, o.notes
        FROM orders o LEFT JOIN users u ON o.user_id = u.chat_id
        ORDER BY o.order_date DESC
        LIMIT %s;
    """
    rows = db.fetchall(query, (limit,))
    
    recent_orders = []
    for row in rows:
        try:
            items_from_db = json.loads(row[6]) if isinstance(row[6], str) else (row[6] or [])
        except (json.JSONDecodeError, TypeError):
            items_from_db = []
            
        # --- THE DEFINITIVE FIX ---
        # This loop modifies the original dictionaries in the list.
        # It takes the value from 'name', puts it in 'menuItemName', and deletes the old key.
        # This preserves all other keys like 'addOns', 'extras', etc.
        for item in items_from_db:
            if 'name' in item:
                item['menuItemName'] = item.pop('name')

        recent_orders.append({
            "id": f"ORD-{row[0]}",
            "customerName": row[1] if row[1] else "Unknown",
            "customerPhone": row[2],
            "items": items_from_db, # Use the modified list which contains all original data
            "status": row[4],
            "total": float(row[3]),
            "paymentStatus": row[8],
            "createdAt": row[5],
            "updatedAt": row[5],
            "type": row[7],
            "specialInstructions": row[9]
        })
    return recent_orders


def get_all_orders_for_kitchen(db: DatabaseManager, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Retrieves all orders, sorted FIFO, ensuring all item customizations are preserved.
    """
    logger.info(f"Fetching all kitchen orders with status filter: '{status}'")
    query = """
        SELECT o.order_id, u.name as customer_name, o.obfuscated_phone, o.total_price, 
               o.status, o.order_date, o.items, o.order_type, o.payment_status, o.notes
        FROM orders o LEFT JOIN users u ON o.user_id = u.chat_id
    """
    params = []
    if status and status != 'all':
        query += " WHERE o.status = %s"
        params.append(status)
    
    query += " ORDER BY o.order_date ASC;"
    
    rows = db.fetchall(query, tuple(params))
    
    all_orders = []
    for row in rows:
        try:
            items_from_db = json.loads(row[6]) if isinstance(row[6], str) else (row[6] or [])
        except (json.JSONDecodeError, TypeError):
            items_from_db = []

        # --- THE DEFINITIVE FIX ---
        for item in items_from_db:
            if 'name' in item:
                item['menuItemName'] = item.pop('name')

        all_orders.append({
            "id": f"ORD-{row[0]}",
            "customerName": row[1] if row[1] else "Unknown",
            "customerPhone": row[2],
            "items": items_from_db, # Use the modified list
            "status": row[4],
            "total": float(row[3]),
            "paymentStatus": row[8],
            "createdAt": row[5],
            "updatedAt": row[5],
            "type": row[7],
            "orderTime": row[5].strftime("%H:%M"),
            "estimatedTime": "15 min",
            "specialInstructions": row[9]
        })
    return all_orders




# Helper to convert a database row (tuple) to a MenuItem dictionary
def menu_item_row_to_dict(row: tuple) -> Dict[str, Any]:
    """
    Safely converts a database row for a menu item into a dictionary.
    Handles potential None values to prevent serialization errors.
    """
    if not row:
        return None
    return {
        "id": row[0],
        "name": row[1] or "Unnamed Item", # Default if name is NULL
        "description": row[2] or "", # Default if description is NULL
        "price": float(row[3] or 0.0), # CRITICAL: Default to 0.0 if price is NULL
        "category": row[4] or "Uncategorized", # Default if category is NULL
        "prepTime": row[5] or 5, # Default prep time
        "image": row[6], # Image can be None, so this is fine
        "available": row[7] if row[7] is not None else True, # Default to True if NULL
        "allergens": row[8] or [], # This was already correct, but good to confirm
        "extras": row[9] or [], # This was already correct
        "modifications": row[10] or [] # This was already correct
    }


def create_menu_item(db: DatabaseManager, item: schemas.MenuItemCreate) -> Dict[str, Any]:
    """Creates a new menu item in the database."""
    query = """
        INSERT INTO menu_items (name, description, price, category, prep_time_minutes, image_url, is_available, allergens, extras, modifications)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, name, description, price, category, prep_time_minutes, image_url, is_available, allergens, extras, modifications;
    """
    params = (
        item.name, item.description, item.price, item.category, item.prepTime, item.image,
        item.available, json.dumps(item.allergens), json.dumps([e.dict() for e in item.extras]), json.dumps(item.modifications)
    )
    new_item_row = db.execute_returning(query, params)
    return menu_item_row_to_dict(new_item_row)

def get_all_menu_items(db: DatabaseManager, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves all menu items, with an optional category filter."""
    query = "SELECT id, name, description, price, category, prep_time_minutes, image_url, is_available, allergens, extras, modifications FROM menu_items"
    params = []
    if category:
        query += " WHERE category = %s"
        params.append(category)
    
    query += " ORDER BY category, name;"
    
    rows = db.fetchall(query, tuple(params))
    return [menu_item_row_to_dict(row) for row in rows]

def update_menu_item(db: DatabaseManager, item_id: int, item_data: schemas.MenuItemUpdate) -> Optional[Dict[str, Any]]:
    """Updates a menu item in the database."""
    fields = item_data.dict(exclude_unset=True, by_alias=True)
    if not fields:
        # If no data is sent, we can't update anything
        query = "SELECT id, name, description, price, category, prep_time_minutes, image_url, is_available, allergens, extras, modifications FROM menu_items WHERE id = %s"
        current_item_row = db.fetchone(query, (item_id,))
        return menu_item_row_to_dict(current_item_row)

    # Map frontend field names to DB column names
    field_to_column_map = {
        'prepTime': 'prep_time_minutes',
        'image': 'image_url',
        'available': 'is_available'
    }
    
    set_clauses = []
    params = []
    for key, value in fields.items():
        column_name = field_to_column_map.get(key, key)
        set_clauses.append(f"{column_name} = %s")
        # For JSON fields, we need to serialize them
        if key in ['allergens', 'extras', 'modifications']:
            params.append(json.dumps(value))
        else:
            params.append(value)
            
    set_clause_str = ", ".join(set_clauses)
    query = f"UPDATE menu_items SET {set_clause_str} WHERE id = %s RETURNING id, name, description, price, category, prep_time_minutes, image_url, is_available, allergens, extras, modifications;"
    params.append(item_id)
    
    updated_item_row = db.execute_returning(query, tuple(params))
    return menu_item_row_to_dict(updated_item_row)

def delete_menu_item(db: DatabaseManager, item_id: int) -> bool:
    """Deletes a menu item from the database."""
    query = "DELETE FROM menu_items WHERE id = %s"
    cursor, rowcount = db.execute(query, (item_id,))
    cursor.close()
    return rowcount > 0