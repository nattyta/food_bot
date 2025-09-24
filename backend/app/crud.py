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
from fastapi import HTTPException

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
    """Inserts a new staff member into the 'admins' table with a hashed password."""
    
    # 1. Securely hash the password from the form
    hashed_password = get_password_hash(staff.password)
    
    # 2. Create a placeholder username
    username = f"{staff.name.lower().replace(' ', '')}@{staff.role}.local"
    
    # 3. Prepare the SQL query
    query = """
        INSERT INTO admins (name, username, password_hash, role, phone, telegram_id, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id, name, role, phone, telegram_id, status, last_login, orders_handled, rating, average_time, total_earnings;
    """
    params = (
        staff.name, 
        username, 
        hashed_password, # <-- Save the HASHED password
        staff.role, 
        staff.phone, 
        staff.telegramId, 
        staff.status
    )
    
    # 4. Execute and return the new staff member's data
    new_staff_row = db.execute_returning(query, params)
    return staff_row_to_dict(new_staff_row) # (Assuming your staff_row_to_dict helper is correct)

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



def update_order_status(db: DatabaseManager, order_id: int, new_status: str) -> Optional[Dict[str, Any]]:
    logger.info(f"Updating order {order_id} to status {new_status}")
    query = "UPDATE orders SET status = %s WHERE order_id = %s RETURNING order_id;"
    result = db.execute_returning(query, (new_status, order_id))
    if result:
        # This now calls our new, powerful function
        return get_order_by_id(db, order_id) 
    return None

# Helper function needed for update_order_status
def get_order_by_id(db: DatabaseManager, order_id: int) -> Optional[Dict[str, Any]]:
    """
    Retrieves the full details for a single order by its ID.
    This is a complete function that returns data matching the Order schema.
    """
    logger.info(f"Fetching full details for order_id: {order_id}")
    
    query = """
        SELECT o.order_id, u.name as customer_name, o.obfuscated_phone, o.total_price, 
               o.status, o.order_date, o.items, o.order_type, o.payment_status, o.notes
        FROM orders o 
        LEFT JOIN users u ON o.user_id = u.chat_id
        WHERE o.order_id = %s;
    """
    row = db.fetchone(query, (order_id,))
    
    if not row:
        return None

    try:
        items_from_db = json.loads(row[6]) if isinstance(row[6], str) else (row[6] or [])
    except (json.JSONDecodeError, TypeError):
        items_from_db = []

    for item in items_from_db:
        if 'name' in item:
            item['menuItemName'] = item.pop('name')

    # This structure must match your Pydantic `schemas.Order` model
    # and your frontend `types.ts` `Order` interface
    return {
        "id": f"ORD-{row[0]}",
        "customerName": row[1] if row[1] else "Unknown",
        "customerPhone": row[2],
        "items": items_from_db,
        "status": row[4],
        "total": float(row[3]),
        "paymentStatus": row[8],
        "createdAt": row[5],
        "updatedAt": row[5], # For now, updated and created are the same
        "type": row[7],
        "specialInstructions": row[9],
        "estimatedDeliveryTime": None # Placeholder
    }

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


# crud.py
# (Make sure json, logging, typing, etc. are imported at the top)

# THIS IS THE ONLY FUNCTION YOU NEED FOR THE ORDERS PAGE (besides the dashboard one)
def get_all_orders_for_display(db: DatabaseManager, user_role: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    A unified function to get orders for the main display page.
    It changes its behavior based on the user's role.
    
    - For Admins: Fetches all orders, filterable by status, sorted newest first.
    - For Kitchen: Fetches ONLY TODAY'S active/ready orders, sorted oldest first.
    """
    logger.info(f"Fetching orders for user role: '{user_role}' with status filter: '{status}'")
    
    # Start with the base query
    base_query = """
        SELECT o.order_id, u.name as customer_name, o.obfuscated_phone, o.total_price, 
               o.status, o.order_date, o.items, o.order_type, o.payment_status, o.notes
        FROM orders o LEFT JOIN users u ON o.user_id = u.chat_id
    """
    
    where_conditions = []
    params = []
    
    # --- ROLE-AWARE LOGIC ---
    if user_role == 'kitchen':
        # Rule 1 for Kitchen: Only show active/ready statuses.
        where_conditions.append("o.status IN ('pending', 'preparing', 'ready')")
        # Rule 2 for Kitchen: Only show orders from today.
        where_conditions.append("o.order_date >= DATE_TRUNC('day', NOW())")
        
        # Rule 3 for Kitchen: Sort oldest first (FIFO).
        order_by_clause = "ORDER BY o.order_date ASC" 
    
    else: # For 'admin' and any other roles
        # Rule 1 for Admin: Filter by the status tab if one is selected.
        if status:
            where_conditions.append("o.status = %s")
            params.append(status)
            
        # Rule 2 for Admin: Sort newest first.
        order_by_clause = "ORDER BY o.order_date DESC"

    # Assemble the final query
    if where_conditions:
        base_query += " WHERE " + " AND ".join(where_conditions)
    
    query = base_query + " " + order_by_clause + ";"
    
    # Execute the query
    rows = db.fetchall(query, tuple(params))
    
    # The data mapping logic is the same for both roles
    all_orders = []
    for row in rows:
        try:
            items_from_db = json.loads(row[6]) if isinstance(row[6], str) else (row[6] or [])
        except (json.JSONDecodeError, TypeError):
            items_from_db = []

        # Your frontend expects 'menuItemName'
        for item in items_from_db:
            if 'name' in item:
                item['menuItemName'] = item.pop('name')

        all_orders.append({
            "id": f"ORD-{row[0]}",
            "customerName": row[1] if row[1] else "Unknown",
            "customerPhone": row[2],
            "items": items_from_db,
            "status": row[4],
            "total": float(row[3]),
            "paymentStatus": row[8],
            "createdAt": row[5],
            "updatedAt": row[5],
            "type": row[7],
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


def get_restaurant_settings_field(db: DatabaseManager, field: str, restaurant_id: int = 1) -> Any:
    """A generic helper to get a single JSONB field from the restaurants table."""
    query = f"SELECT {field} FROM restaurants WHERE id = %s;"
    result = db.fetchone(query, (restaurant_id,))
    if not result or result[0] is None:
        raise HTTPException(status_code=404, detail=f"Settings for field '{field}' not found.")
    return result[0]

def update_restaurant_settings_field(db: DatabaseManager, field: str, data: Any, restaurant_id: int = 1):
    """A generic helper to update a single JSONB field."""
    query = f"UPDATE restaurants SET {field} = %s, updated_at = NOW() WHERE id = %s;"
    db.execute(query, (json.dumps(data.model_dump()), restaurant_id))

# --- Business Hours ---
def get_business_hours(db: DatabaseManager) -> Dict[str, Any]:
    return get_restaurant_settings_field(db, 'business_hours')

def update_business_hours(db: DatabaseManager, hours: schemas.BusinessHours):
    update_restaurant_settings_field(db, 'business_hours', hours)

# --- Notification Settings ---
def get_notification_settings(db: DatabaseManager) -> Dict[str, Any]:
    return get_restaurant_settings_field(db, 'notification_settings')

def update_notification_settings(db: DatabaseManager, settings: schemas.NotificationSettings):
    update_restaurant_settings_field(db, 'notification_settings', settings)

# --- Payment Settings ---
def get_payment_settings(db: DatabaseManager) -> Dict[str, Any]:
    return get_restaurant_settings_field(db, 'payment_settings')

def update_payment_settings(db: DatabaseManager, settings: schemas.PaymentSettings):
    update_restaurant_settings_field(db, 'payment_settings', settings)

# --- Main Restaurant Info (Non-JSON fields) ---
def get_main_restaurant_settings(db: DatabaseManager, restaurant_id: int = 1) -> Optional[Dict[str, Any]]:
    query = "SELECT name, address, phone, email, tax_rate, delivery_radius_km, minimum_order_value FROM restaurants WHERE id = %s;"
    row = db.fetchone(query, (restaurant_id,))
    if not row: return None
    return {
        "name": row[0], "address": row[1], "phone": row[2], "email": row[3],
        "taxRate": float(row[4]), "deliveryRadius": float(row[5]), "minimumOrder": float(row[6])
    }

def update_main_restaurant_settings(db: DatabaseManager, settings: schemas.RestaurantSettings, restaurant_id: int = 1):
    query = """
        UPDATE restaurants SET name = %s, address = %s, phone = %s, email = %s,
            tax_rate = %s, delivery_radius_km = %s, minimum_order_value = %s, updated_at = NOW()
        WHERE id = %s;
    """
    params = (
        settings.name, settings.address, settings.phone, settings.email,
        settings.taxRate, settings.deliveryRadius, settings.minimumOrder, restaurant_id
    )
    db.execute(query, params)

# --- Account and Work Status (These relate to the 'admins' table) ---
def get_account_settings(db: DatabaseManager, user_id: int) -> Optional[Dict[str, Any]]:
    # We fetch the username column but will return it under the key 'email'
    # to match the frontend's state object.
    query = "SELECT name, phone, username FROM admins WHERE id = %s;"
    row = db.fetchone(query, (user_id,))
    if not row: return None
    return {"name": row[0], "phone": row[1], "email": row[2]}

def update_staff_profile(db: DatabaseManager, user_id: int, profile_data: schemas.StaffProfileUpdate):
    """Updates only the name and phone for a staff member."""
    query = "UPDATE admins SET name = %s, phone = %s WHERE id = %s;"
    params = (profile_data.name, profile_data.phone, user_id)
    db.execute(query, params)


def update_user_password(db: DatabaseManager, user_id: int, new_password: str):
    """Hashes a new password and updates it in the database for a given user."""
    new_password_hash = get_password_hash(new_password)
    query = "UPDATE admins SET password_hash = %s WHERE id = %s;"
    db.execute(query, (new_password_hash, user_id))

    
def get_work_status(db: DatabaseManager, user_id: int) -> Optional[Dict[str, Any]]:
    query = "SELECT status, last_login FROM admins WHERE id = %s;"
    row = db.fetchone(query, (user_id,))
    if not row: return None
    return {"available": row[0] == 'active', "lastStatusChange": row[1].isoformat() if row[1] else datetime.now().isoformat()}

def update_work_status(db: DatabaseManager, user_id: int, status: schemas.WorkStatus):
    new_status = 'active' if status.available else 'inactive'
    query = "UPDATE admins SET status = %s WHERE id = %s;"
    db.execute(query, (new_status, user_id))





def get_orders_for_kitchen(db: DatabaseManager) -> List[Dict[str, Any]]:
    """
    Retrieves all active orders for the kitchen dashboard, sorted oldest first.
    """
    logger.info("Fetching active orders for kitchen display...")
    
    query = """
        SELECT o.order_id, u.name as customer_name, o.total_price, o.status, 
               o.order_date, o.items, o.order_type, o.notes
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.chat_id
        -- --- THIS IS THE FIX ---
        -- Add 'ready' to the list of statuses the kitchen can see.
        WHERE o.status IN ('pending', 'accepted', 'preparing', 'ready')
        ORDER BY o.order_date ASC;
    """
    rows = db.fetchall(query)
    
    kitchen_orders = []
    for row in rows:
        try:
            items_from_db = json.loads(row[5]) if isinstance(row[5], str) else (row[5] or [])
        except (json.JSONDecodeError, TypeError):
            items_from_db = []

        formatted_items = []
        for item in items_from_db:
            extras = [extra['name'] for extra in item.get('extras', []) if 'name' in extra]
            modifications = item.get('modifications', [])
            
            formatted_items.append({
                "name": item.get("name", "Unknown Item"),
                "quantity": item.get("quantity", 1),
                "extras": extras,
                "modifications": ", ".join(modifications),
                "specialInstructions": item.get("specialInstruction", "")
            })

        kitchen_orders.append({
            "id": f"ORD-{row[0]}",
            "customerName": row[1] or "Walk-in Customer",
            "total": float(row[2]),
            "status": row[3],
            "orderTime": row[4].strftime("%H:%M"),
            "estimatedTime": "15 min", # Placeholder
            "items": formatted_items,
            "type": row[6],
            "specialNotes": row[7]
        })
        
    return kitchen_orders




def get_delivery_dashboard_data(db: DatabaseManager, delivery_boy_id: int) -> Dict[str, Any]:
    """
    Fetches all data for a delivery person's dashboard.
    """
    logger.info(f"Fetching dashboard data for delivery_boy_id: {delivery_boy_id}")
    
    # 1. Fetch Orders
    orders_query = """
        SELECT o.order_id, u.name as customer_name, o.obfuscated_phone, o.total_price, 
               o.status, o.order_date, o.items, o.order_type, o.payment_status, o.notes, o.address,
               o.assigned_delivery_boy_id
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.chat_id
        WHERE o.order_type = 'delivery' AND (
            (o.status = 'ready' AND o.assigned_delivery_boy_id IS NULL) 
            OR 
            (o.assigned_delivery_boy_id = %s)
        )
        ORDER BY o.order_date ASC;
    """
    order_rows = db.fetchall(orders_query, (delivery_boy_id,))
    
    orders = []
    # ... (Your existing, correct loop to format the orders)
    for row in order_rows:
        items_from_db = json.loads(row[6]) if isinstance(row[6], str) else (row[6] or [])
        for item in items_from_db:
            if 'name' in item:
                item['menuItemName'] = item.pop('name')
        
        orders.append({
            "id": f"ORD-{row[0]}",
            "customerName": row[1], "customerPhone": row[2], "total": float(row[3]),
            "status": row[4], "createdAt": row[5], "updatedAt": row[5],
            "items": items_from_db, "type": row[7], "paymentStatus": row[8],
            "specialInstructions": row[9], "deliveryAddress": row[10], "deliveryStaffId": row[11]
        })

    # 2. Fetch Stats
    stats_query = """
        SELECT
            COUNT(CASE WHEN status = 'delivered' THEN 1 END),
            COUNT(CASE WHEN status = 'delivered' AND order_date >= DATE_TRUNC('day', NOW()) THEN 1 END)
        FROM orders
        WHERE assigned_delivery_boy_id = %s;
    """
    stats_row = db.fetchone(stats_query, (delivery_boy_id,))
    
    # --- THIS IS THE CORRECTED BLOCK ---
    # It replaces the placeholder with actual Python code
    stats = {
        "totalDeliveries": stats_row[0] if stats_row else 0,
        "todayDeliveries": stats_row[1] if stats_row else 0,
        "averageTime": 22.0,   # Placeholder for MVP
        "averageRating": 4.7,    # Placeholder for MVP
        "earnings": 0.0        # Placeholder for MVP
    }

    return {"stats": stats, "orders": orders}


def get_available_delivery_orders(db: DatabaseManager) -> List[Dict[str, Any]]:
    """
    Fetches all orders of type 'delivery' that are 'ready' and NOT assigned to anyone.
    Sorted oldest first.
    """
    logger.info("Fetching available, unassigned delivery orders...")
    query = """
        SELECT o.order_id, u.name as customer_name, o.obfuscated_phone, o.total_price, 
               o.status, o.order_date, o.items, o.order_type, o.payment_status, o.notes, o.address,
               o.assigned_delivery_boy_id
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.chat_id
        WHERE o.order_type = 'delivery' 
          AND o.status = 'ready' 
          AND o.assigned_delivery_boy_id IS NULL
        ORDER BY o.order_date ASC;
    """
    rows = db.fetchall(query)
    
    # --- THIS IS THE MISSING LOGIC ---
    mapped_orders = []
    for row in rows:
        items_from_db = json.loads(row[6]) if isinstance(row[6], str) else (row[6] or [])
        for item in items_from_db:
            if 'name' in item:
                item['menuItemName'] = item.pop('name')
        
        mapped_orders.append({
            "id": f"ORD-{row[0]}",
            "customerName": row[1],
            "customerPhone": row[2],
            "total": float(row[3]),
            "status": row[4],
            "createdAt": row[5],
            "updatedAt": row[5],
            "items": items_from_db,
            "type": row[7],
            "paymentStatus": row[8],
            "specialInstructions": row[9],
            "deliveryAddress": row[10],
            "deliveryStaffId": row[11]
        })
    return mapped_orders # <-- Now this variable exists

def get_my_delivery_orders(db: DatabaseManager, delivery_boy_id: int) -> List[Dict[str, Any]]:
    """
    Fetches all active orders assigned to a specific delivery person.
    """
    logger.info(f"Fetching active orders for delivery boy ID: {delivery_boy_id}")
    query = """
        SELECT o.order_id, u.name as customer_name, o.obfuscated_phone, o.total_price, 
               o.status, o.order_date, o.items, o.order_type, o.payment_status, o.notes, o.address,
               o.assigned_delivery_boy_id
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.chat_id
        WHERE o.assigned_delivery_boy_id = %s AND o.status = 'on_the_way'
        ORDER BY o.order_date ASC;
    """
    rows = db.fetchall(query, (delivery_boy_id,))
    
    # --- THIS IS THE MISSING LOGIC ---
    mapped_orders = []
    for row in rows:
        items_from_db = json.loads(row[6]) if isinstance(row[6], str) else (row[6] or [])
        for item in items_from_db:
            if 'name' in item:
                item['menuItemName'] = item.pop('name')
        
        mapped_orders.append({
            "id": f"ORD-{row[0]}",
            "customerName": row[1],
            "customerPhone": row[2],
            "total": float(row[3]),
            "status": row[4],
            "createdAt": row[5],
            "updatedAt": row[5],
            "items": items_from_db,
            "type": row[7],
            "paymentStatus": row[8],
            "specialInstructions": row[9],
            "deliveryAddress": row[10],
            "deliveryStaffId": row[11]
        })
    return mapped_orders # <-- Now this variable exists

def accept_delivery_order(db: DatabaseManager, order_id: int, delivery_boy_id: int) -> bool:
    """
    Atomically assigns a 'ready' order to a delivery person.
    Returns True if successful, False if the order was already taken.
    """
    query = """
        UPDATE orders
        SET assigned_delivery_boy_id = %s, status = 'on_the_way'
        WHERE order_id = %s AND status = 'ready' AND assigned_delivery_boy_id IS NULL;
    """
    cursor, rowcount = db.execute(query, (delivery_boy_id, order_id))
    cursor.close()
    return rowcount > 0 # Will be 1 if the update worked, 0 if it failed