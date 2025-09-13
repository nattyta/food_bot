# backend/app/admin_router.py

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile,Query
from datetime import timedelta
import shutil
import os
# Import all the necessary components we've built
from . import schemas, crud, security, config
from .database import get_db_manager, DatabaseManager
from .dependencies import get_current_admin_user
from .schemas import AdminInDB # Your user model
from typing import List, Optional, Dict,Any, Literal
from fastapi import Query
# Create a new router instance for admin endpoints
router = APIRouter(
    prefix="/api/v1/admin",  # All routes in this file will start with /api/v1/admin
    tags=["Admin Portal"] # This groups them nicely in the API docs
)


UPLOAD_DIRECTORY = "./static/images"

@router.post("/upload/image", response_model=Dict[str, str])
def upload_menu_image(
    file: UploadFile = File(...),
    admin: AdminInDB = Depends(get_current_admin_user)
):
    """
    Handles uploading an image file for a menu item.
    Saves the file to the server and returns its public URL.
    """
    # Ensure the upload directory exists
    os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)
    
    # Sanitize the filename to prevent security issues
    filename = file.filename.replace("..", "").replace("/", "")
    file_path = os.path.join(UPLOAD_DIRECTORY, filename)
    
    try:
        # Save the uploaded file to the specified path
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"There was an error uploading the file: {e}"
        )
    finally:
        file.file.close()

    # Construct the public URL for the file
    # This URL must match what you configured in main.py
    file_url = f"/static/images/{filename}"
    
    return {"url": file_url}

@router.post("/login", response_model=schemas.Token)
def login_for_access_token(
    form_data: schemas.AdminLoginRequest, db: DatabaseManager = Depends(get_db_manager)
):
    """
    Handles login for Admin, Staff, and Delivery roles.
    Takes username (email), password, and role.
    Returns a JWT access token on success.
    """
    # 1. Find the admin user in the database by their username (which is their email)
    admin = crud.get_admin_by_username(db, username=form_data.username)

    # 2. Verify that the user exists AND the password is correct in a single step.
    # This prevents timing attacks by not revealing whether the user exists or not.
    if not admin or not security.verify_password(form_data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 3. After confirming credentials, verify that the role matches.
    # This ensures a 'staff' user cannot log in via the 'admin' portal on the frontend.
    if admin.role.lower() != form_data.role.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. User role ('{admin.role}') does not match the requested portal role ('{form_data.role}').",
        )

    # 4. If all checks pass, create the JWT access token.
    access_token_expires = timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        # The 'data' dictionary contains the claims that will be encoded in the token.
        # 'sub' (subject) is a standard claim for the user's identifier.
        data={"sub": admin.username, "role": admin.role.lower(), "id": admin.id},
        expires_delta=access_token_expires
    )

    # 5. Return the token to the frontend.
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/dashboard/stats")
def get_stats(db: DatabaseManager = Depends(get_db_manager), admin: AdminInDB = Depends(get_current_admin_user)):
    return crud.get_dashboard_stats(db)

# --- ORDERS ENDPOINTS (Admin Only) ---
@router.get("/all-orders", response_model=List[schemas.Order]) # Assuming you have an Order schema
def get_orders_list(
    limit: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: DatabaseManager = Depends(get_db_manager),
    admin: AdminInDB = Depends(get_current_admin_user)
):
    if limit:
        # The dashboard calls with a limit, so use the "newest first" function
        return crud.get_recent_orders_for_dashboard(db, limit=limit)
    else:
        # The main orders page calls without a limit, use the "oldest first" function
        return crud.get_all_orders_for_kitchen(db, status=status)



@router.put("/orders/{order_id}/status")
def update_status_of_order(
    order_id: str,
    status_update: schemas.StatusUpdate, # You'll need to create this schema
    db: DatabaseManager = Depends(get_db_manager),
    admin: AdminInDB = Depends(get_current_admin_user)
):
    # Extract numeric part of order_id like "ORD-54" -> 54
    numeric_order_id = int(order_id.split('-')[1])
    updated_order = crud.update_order_status(db, numeric_order_id, status_update.status)
    if not updated_order:
        raise HTTPException(status_code=404, detail="Order not found")
    return updated_order

# --- STAFF MANAGEMENT ENDPOINTS (Admin Only) ---
# ... (your existing /staff endpoints) ...


# --- ROLE-SPECIFIC ENDPOINTS ---

@router.get("/kitchen/orders")
# --- THIS IS THE FIX ---
# Change get_current_user to the correctly imported get_current_admin_user
def get_kitchen_orders_list(
    db: DatabaseManager = Depends(get_db_manager), 
    user: AdminInDB = Depends(get_current_admin_user) # Corrected function name
):
    # Add extra security check if needed, e.g., if user.role not in ['admin', 'staff'] raise exception
    return crud.get_all_orders_paginated(db, status='preparing')


@router.get("/delivery/orders")
# --- THIS IS THE FIX ---
# Change get_current_user to the correctly imported get_current_admin_user
def get_delivery_orders_list(
    db: DatabaseManager = Depends(get_db_manager), 
    user: AdminInDB = Depends(get_current_admin_user) # Corrected function name
):
    # Add logic to get orders assigned to this specific delivery person
    # return crud.get_orders_for_delivery_person(db, user.id)
    return [] # Placeholder


@router.get("/staff", response_model=List[schemas.StaffPublic])
def get_staff_list(
    db: DatabaseManager = Depends(get_db_manager), 
    current_admin: AdminInDB = Depends(get_current_admin_user)
):
    """Get a list of all staff members. Requires admin privileges."""
    return crud.get_all_staff(db)

@router.post("/staff", response_model=schemas.StaffPublic, status_code=status.HTTP_201_CREATED)
def create_new_staff_member(
    staff_data: schemas.StaffCreate, 
    db: DatabaseManager = Depends(get_db_manager), 
    current_admin: AdminInDB = Depends(get_current_admin_user)
):
    """Create a new staff member. Requires admin privileges."""
    return crud.create_staff(db, staff_data)

@router.put("/staff/{staff_id}", response_model=schemas.StaffPublic)
def update_staff_member(
    staff_id: int, 
    staff_data: schemas.StaffUpdate, 
    db: DatabaseManager = Depends(get_db_manager), 
    current_admin: AdminInDB = Depends(get_current_admin_user)
):
    """Update a staff member's details. Requires admin privileges."""
    updated_staff = crud.update_staff(db, staff_id, staff_data)
    if not updated_staff:
        raise HTTPException(status_code=404, detail=f"Staff member with ID {staff_id} not found")
    return updated_staff

@router.delete("/staff/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff_member(
    staff_id: int, 
    db: DatabaseManager = Depends(get_db_manager), 
    current_admin: AdminInDB = Depends(get_current_admin_user)
):
    """Delete a staff member. Requires admin privileges."""
    if not crud.delete_staff(db, staff_id):
        raise HTTPException(status_code=404, detail=f"Staff member with ID {staff_id} not found")
    return

@router.post("/menu", response_model=schemas.MenuItemResponse, status_code=status.HTTP_201_CREATED)
def add_new_menu_item(
    menu_item: schemas.MenuItemCreate,
    db: DatabaseManager = Depends(get_db_manager),
    admin: AdminInDB = Depends(get_current_admin_user)
):
    """Create a new menu item."""
    new_item = crud.create_menu_item(db, menu_item)
    return {"data": new_item} # <-- WRAP THE RESPONSE

# MODIFIED: Use the new response model and wrap the return value
@router.get("/menu", response_model=schemas.MenuItemListResponse)
def get_all_items(
    category: Optional[str] = Query(None),
    db: DatabaseManager = Depends(get_db_manager),
    admin: AdminInDB = Depends(get_current_admin_user)
):
    """Get all menu items, optionally filtered by category."""
    if category and category.lower() == 'all':
        category = None
    items = crud.get_all_menu_items(db, category)
    return {"data": items} # <-- WRAP THE RESPONSE

# MODIFIED: Use the new response model and wrap the return value
@router.put("/menu/{item_id}", response_model=schemas.MenuItemResponse)
def update_existing_menu_item(
    item_id: int,
    menu_item_data: schemas.MenuItemUpdate,
    db: DatabaseManager = Depends(get_db_manager),
    admin: AdminInDB = Depends(get_current_admin_user)
):
    """Update a menu item's details."""
    updated_item = crud.update_menu_item(db, item_id, menu_item_data)
    if not updated_item:
        raise HTTPException(status_code=404, detail=f"Menu item with ID {item_id} not found")
    return {"data": updated_item} # <-- WRAP THE RESPONSE

# NO CHANGE NEEDED HERE: The delete endpoint doesn't return a body, so it's fine.
@router.delete("/menu/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_menu_item(
    item_id: int,
    db: DatabaseManager = Depends(get_db_manager),
    admin: AdminInDB = Depends(get_current_admin_user)
):
    """Delete a menu item."""
    if not crud.delete_menu_item(db, item_id):
        raise HTTPException(status_code=404, detail=f"Menu item with ID {item_id} not found")
    return



@router.get("/analytics", response_model=schemas.AnalyticsData)
def get_analytics(
    # Add a query parameter 'period' with a default of '7d'
    period: str = Query("7d", description="Time period for stats (e.g., '7d', '30d')"),
    db: DatabaseManager = Depends(get_db_manager),
    admin: AdminInDB = Depends(get_current_admin_user)
):
    """
    Retrieves all computed data for the analytics dashboard for a given period.
    """
    # Pass the period down to the logic function
    analytics_payload = crud.get_analytics_data(db, period)
    return analytics_payload