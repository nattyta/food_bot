from .database import get_db_connection,DatabaseManager
from .schemas import UserCreate, OrderCreate
import json
from typing import Dict, Any,Optional,List
from .models import AdminInDB
from .schemas import StaffCreate, StaffBase, StaffPublic, StaffUpdate
from .security import get_password_hash
import logging
from . import schemas
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

def create_user(user_data: schemas.UserCreate):
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
        user_data.session_token,
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

def get_internal_id_from_chat_id(db: DatabaseManager, chat_id: int) -> Optional[int]:
    """
    Looks up a user by their chat_id and returns their internal primary key (id).
    """
    user_row = db.fetchone("SELECT id FROM users WHERE chat_id = %s", (chat_id,))
    if user_row:
        return user_row[0]
    return None


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
    query = "SELECT id, username, password_hash, role, created_at, last_login FROM admins WHERE username = %s"
    result = db.fetchone(query, (username,))
    if result:
        return AdminInDB(
            id=result[0], username=result[1], password_hash=result[2], role=result[3],
            created_at=result[4], last_login=result[5]
        )
    return None

def get_dashboard_stats(db: DatabaseManager) -> Dict[str, Any]:
    # ... (Keeping your existing dashboard stats logic)
    stats_query = """
        SELECT
            (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE payment_status = 'paid'),
            (SELECT COUNT(*) FROM orders),
            (SELECT COUNT(*) FROM users),
            (SELECT COUNT(*) FROM orders WHERE status = 'pending' AND payment_status = 'paid')
    """
    result = db.fetchone(stats_query)
    if not result:
        return {"totalRevenue": 0.0, "totalOrders": 0, "totalCustomers": 0, "pendingOrders": 0}
    total_revenue, total_orders, total_customers, pending_orders = result
    return {
        "activeOrders": pending_orders, "activeOrdersChange": "+0%", "avgPrepTime": "N/A",
        "avgPrepTimeChange": "0%", "completedToday": 0, "completedTodayChange": "+0%",
        "revenueToday": f"${float(total_revenue):.2f}", "revenueTodayChange": "+0%"
    }




def staff_row_to_dict(row: tuple) -> Optional[Dict[str, Any]]:
    """Helper to convert a staff database row into a dictionary for the frontend."""
    if not row:
        return None
    
    # Create the dictionary
    result = {
        "id": row[0],
        "name": row[1],
        "role": row[2],
        "phone": row[3],
        "telegramId": row[4],
        "status": row[5],
        "lastActive": row[6],
        "ordersHandled": row[7],
        "rating": float(row[8] or 0.0),
        "averageTime": row[9],
        "totalEarnings": float(row[10]) if row[10] is not None else 0.0
    }
    
    # --- ADD THIS LOG ---
    # Log the dictionary we are about to return
    logger.info(f"--- Mapped staff dictionary: {result}")
    
    return result

def create_staff(db: DatabaseManager, staff: schemas.StaffCreate) -> Dict[str, Any]:
    """Inserts a new staff member into the 'admins' table."""
    hashed_password = get_password_hash(staff.password)
    username = f"{staff.name.lower().replace(' ', '')}@{staff.role}.local"
    
    query = """
        INSERT INTO admins (name, username, password_hash, role, phone, telegram_id, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id, name, role, phone, telegram_id, status, last_login, orders_handled, rating, average_time, total_earnings;
    """
    params = (
        staff.name, username, hashed_password, staff.role, 
        staff.phone, staff.telegramId, staff.status
    )
    
    new_staff_row = db.execute_returning(query, params)
    return staff_row_to_dict(new_staff_row)

def get_all_staff(db: DatabaseManager) -> List[Dict[str, Any]]:
    """Retrieves all staff members from the 'admins' table."""
    # Use a simpler, direct query. The helper will handle defaults.
    query = """
        SELECT id, name, role, phone, telegram_id, status, last_login, 
               orders_handled, rating, average_time, total_earnings 
        FROM admins 
        ORDER BY role, name;
    """
    rows = db.fetchall(query)
    logger.info(f"--- Raw staff rows from DB: {rows}")
    
    return [staff_row_to_dict(row) for row in rows]

def get_staff_by_id(db: DatabaseManager, staff_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves a single staff member by their ID."""
    query = """
        SELECT id, name, role, phone, telegram_id, status, last_login, orders_handled, rating, average_time, total_earnings 
        FROM admins 
        WHERE id = %s;
    """
    row = db.fetchone(query, (staff_id,))
    return staff_row_to_dict(row)

def update_staff(db: DatabaseManager, staff_id: int, staff_data: schemas.StaffUpdate) -> Optional[Dict[str, Any]]:
    """Updates a staff member's details."""
    fields = staff_data.model_dump(exclude_unset=True) # Use model_dump for Pydantic v2
    if not fields:
        return get_staff_by_id(db, staff_id)

    if 'telegramId' in fields:
        fields['telegram_id'] = fields.pop('telegramId')

    set_clause = ", ".join([f"{key} = %s" for key in fields.keys()])
    query = f"""
        UPDATE admins SET {set_clause} WHERE id = %s 
        RETURNING id, name, role, phone, telegram_id, status, last_login, orders_handled, rating, average_time, total_earnings;
    """
    
    params = list(fields.values()) + [staff_id]
    
    updated_staff_row = db.execute_returning(query, tuple(params))
    return staff_row_to_dict(updated_staff_row)

def delete_staff(db: DatabaseManager, staff_id: int) -> bool:
    """Deletes a staff member. Returns True on success."""
    query = "DELETE FROM admins WHERE id = %s"
    cursor, rowcount = db.execute(query, (staff_id,))
    cursor.close()
    return rowcount > 0



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



from typing import Dict, Any, Optional, List # Ensure these are at the top of your file
from .database import DatabaseManager # Ensure this is imported
import logging # Ensure this is imported

logger = logging.getLogger(__name__)

def get_analytics_data(db: DatabaseManager, period: str, category: str = "all") -> Dict[str, Any]:
    """
    Orchestrator function to get all data for the analytics dashboard.
    Handles flexible periods and category filtering.
    """
    logger.info(f"Fetching analytics data for period: '{period}' and category: '{category}'")

    interval_map = {
        "1d": "1 day",
        "7d": "7 days",
        "30d": "30 days",
    }
    sql_interval = interval_map.get(period)

    # Create a list of WHERE conditions to join later
    where_conditions = []
    if sql_interval:
        where_conditions.append(f"o.order_date >= NOW() - INTERVAL '{sql_interval}'")

    # This logic will be used later for the category filter
    # Note: This JSON query can be slow on very large datasets.
    if category != "all" and category is not None:
        # We add double quotes around the category value to ensure correct JSON matching.
        where_conditions.append(f"o.items @> '[{{\"category\": \"{category}\"}}]'")

    # Build the final WHERE clause, starting with "WHERE" if there are any conditions
    date_filter_clause = ("WHERE " + " AND ".join(where_conditions)) if where_conditions else ""
    
    # --- Get list of all available categories (for the filter dropdown) ---
    categories_query = "SELECT DISTINCT category FROM menu_items ORDER BY category;"
    categories_result = db.fetchall(categories_query)
    available_categories = [row[0] for row in categories_result]

    # 1. Get the main stat cards
    stats_query = f"""
        SELECT
            COALESCE(SUM(total_price), 0.0),
            COALESCE(COUNT(order_id), 0),
            COALESCE(AVG(total_price), 0.0)
        FROM orders o
        {date_filter_clause};
    """
    stats_result = db.fetchone(stats_query)
    
    new_customers_date_filter = ""
    if sql_interval:
        new_customers_date_filter = f"WHERE created_at >= NOW() - INTERVAL '{sql_interval}'"
    new_customers_query = f"SELECT COUNT(id) FROM users {new_customers_date_filter};"
    new_customers_result = db.fetchone(new_customers_query)

    stats = {
        "totalRevenue": float(stats_result[0]),
        "totalOrders": stats_result[1],
        "averageOrderValue": float(stats_result[2]),
        "newCustomers": new_customers_result[0] or 0
    }

    # 2. Get sales data for the weekly chart (this one always shows last 7 days regardless of period filter)
    sales_query = """
        SELECT
            TO_CHAR(order_date, 'Dy') as day_name,
            SUM(total_price) as revenue,
            COUNT(order_id) as orders
        FROM orders
        WHERE order_date >= NOW() - INTERVAL '7 days'
        GROUP BY day_name, EXTRACT(ISODOW FROM order_date)
        ORDER BY EXTRACT(ISODOW FROM order_date);
    """
    sales_result = db.fetchall(sales_query)
    sales_data = [{"name": row[0], "revenue": float(row[1]), "orders": row[2]} for row in sales_result]

    # 3. Get the top 5 most popular items for the selected period and category
    popular_items_query = f"""
        WITH all_items AS (
            SELECT jsonb_array_elements(o.items)->>'name' as item_name
            FROM orders o
            {date_filter_clause}
        )
        SELECT item_name, COUNT(*) as order_count
        FROM all_items
        WHERE item_name IS NOT NULL
        GROUP BY item_name
        ORDER BY order_count DESC
        LIMIT 5;
    """
    popular_items_result = db.fetchall(popular_items_query)
    popular_items = [{"name": row[0], "value": row[1]} for row in popular_items_result]

    # 4. Get order trends by hour (this one always shows today regardless of period filter)
    hourly_trends_query = """
        SELECT
            TO_CHAR(order_date, 'HH24:00') as hour,
            COUNT(order_id) as orders
        FROM orders
        WHERE order_date >= DATE_TRUNC('day', NOW())
        GROUP BY hour
        ORDER BY hour;
    """
    hourly_trends_result = db.fetchall(hourly_trends_query)
    order_trends = [{"time": row[0], "orders": row[1]} for row in hourly_trends_result]

    # 5. Calculate Top 5 Spenders for the period
    top_spenders_query = f"""
        SELECT u.name, SUM(o.total_price) as total_spent
        FROM orders o
        JOIN users u ON o.user_id = u.chat_id
        {date_filter_clause}
        GROUP BY u.name
        ORDER BY total_spent DESC
        LIMIT 5;
    """
    top_spenders_result = db.fetchall(top_spenders_query)
    top_spenders = [{"name": row[0] or "Unknown", "value": float(row[1])} for row in top_spenders_result]

    # 6. Calculate Top 5 Most Frequent Customers for the period
    most_frequent_query = f"""
        SELECT u.name, COUNT(o.order_id) as order_count
        FROM orders o
        JOIN users u ON o.user_id = u.chat_id
        {date_filter_clause}
        GROUP BY u.name
        ORDER BY order_count DESC
        LIMIT 5;
    """
    most_frequent_result = db.fetchall(most_frequent_query)
    most_frequent_customers = [{"name": row[0] or "Unknown", "value": row[1]} for row in most_frequent_result]

    # 7. Calculate New vs. Returning Customers for the period
    customer_segments_result = (0, 0)
    if sql_interval:
        new_vs_returning_query = f"""
            WITH customers_in_period AS (
                SELECT DISTINCT o.user_id
                FROM orders o
                {date_filter_clause}
            )
            SELECT
                COUNT(CASE WHEN u.created_at >= (NOW() - INTERVAL '{sql_interval}') THEN 1 END) as new_customers,
                COUNT(CASE WHEN u.created_at < (NOW() - INTERVAL '{sql_interval}') THEN 1 END) as returning_customers
            FROM customers_in_period cip
            JOIN users u ON cip.user_id = u.chat_id;
        """
        customer_segments_result = db.fetchone(new_vs_returning_query)
    
    customer_segments = [
        {"name": "New", "value": customer_segments_result[0] or 0},
        {"name": "Returning", "value": customer_segments_result[1] or 0}
    ]

    return {
        "stats": stats,
        "salesData": sales_data,
        "popularItems": popular_items,
        "orderTrends": order_trends,
        "availableCategories": available_categories,
        "topSpenders": top_spenders,
        "mostFrequentCustomers": most_frequent_customers,
        "customerSegments": customer_segments
    }



def get_restaurant_settings(db: DatabaseManager, restaurant_id: int = 1) -> Optional[Dict[str, Any]]:
    """Fetches the settings for a given restaurant."""
    query = """
        SELECT name, address, phone, email, tax_rate, delivery_radius_km, 
               minimum_order_value, business_hours, notification_settings, payment_settings
        FROM restaurants
        WHERE id = %s;
    """
    row = db.fetchone(query, (restaurant_id,))
    if not row:
        return None
    
    return {
        "name": row[0],
        "address": row[1],
        "phone": row[2],
        "email": row[3],
        "taxRate": float(row[4]),
        "deliveryRadius": float(row[5]),
        "minimumOrder": float(row[6]),
        "businessHours": row[7],
        "notificationSettings": row[8],
        "paymentSettings": row[9]
    }

def update_restaurant_settings(db: DatabaseManager, settings: schemas.RestaurantSettings, restaurant_id: int = 1) -> Dict[str, Any]:
    """Updates the settings for a given restaurant."""
    query = """
        UPDATE restaurants SET
            name = %s, address = %s, phone = %s, email = %s, tax_rate = %s,
            delivery_radius_km = %s, minimum_order_value = %s, business_hours = %s,
            notification_settings = %s, payment_settings = %s, updated_at = NOW()
        WHERE id = %s;
    """
    params = (
        settings.name, settings.address, settings.phone, settings.email,
        settings.taxRate, settings.deliveryRadius, settings.minimumOrder,
        json.dumps(settings.businessHours.model_dump()),
        json.dumps(settings.notificationSettings.model_dump()),
        json.dumps(settings.paymentSettings.model_dump()),
        restaurant_id
    )
    db.execute(query, params)
    
    return get_restaurant_settings(db, restaurant_id)