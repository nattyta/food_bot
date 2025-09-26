# backend/app/admin_router.py

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile,Query
from datetime import timedelta
import shutil
import os
from fastapi import Request
import json
# Import all the necessary components we've built
from . import schemas, crud, security, config
from .database import get_db_manager, DatabaseManager
from .dependencies import get_current_admin_user, get_current_active_user, get_current_kitchen_staff,get_current_delivery_staff
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
async def login_for_access_token( # <--- Add the 'async' keyword
    request: Request, # <--- Add the Request object as a parameter
    db: DatabaseManager = Depends(get_db_manager)
):
    # --- THIS IS THE CRITICAL LOGGING STEP ---
    try:
        # We will try to read the raw JSON body of the request
        payload = await request.json()
        print("--- RAW LOGIN PAYLOAD RECEIVED ---")
        print(json.dumps(payload, indent=2))
        print("---------------------------------")
    except Exception as e:
        print(f"--- FAILED TO PARSE LOGIN PAYLOAD ---")
        print(f"Error: {e}")
        print("-------------------------------------")
        raise HTTPException(status_code=400, detail="Invalid JSON body.")

    # Now, we manually create the Pydantic model from the payload
    try:
        form_data = schemas.AdminLoginRequest(**payload)
    except Exception as e:
        print("--- PYDANTIC VALIDATION FAILED ---")
        print(f"Payload was: {payload}")
        print(f"Validation Error: {e}")
        print("---------------------------------")
        raise HTTPException(status_code=422, detail=f"Validation error: {e}")

    # The rest of your existing, working logic
    admin = crud.get_admin_by_username(db, username=form_data.username)

    if not admin or not security.verify_password(form_data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if admin.role.lower() != form_data.role.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. User role ('{admin.role}') does not match the requested portal role ('{form_data.role}').",
        )

    access_token_expires = timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": admin.username, "role": admin.role.lower(), "id": admin.id},
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/dashboard/stats")
def get_stats(
    db: DatabaseManager = Depends(get_db_manager),
    # --- THIS IS THE FIX ---
    # Use the new, more flexible dependency
    admin: AdminInDB = Depends(get_current_active_user)
):
    return crud.get_dashboard_stats(db)

@router.get("/all-orders", response_model=List[schemas.Order])
def get_orders_list(
    limit: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: DatabaseManager = Depends(get_db_manager),
    current_user: AdminInDB = Depends(get_current_active_user)
):
    if limit:
        return crud.get_recent_orders_for_dashboard(db, limit=limit)
    
    # This now correctly calls your unified function
    user_role = current_user.role.lower()
    return crud.get_all_orders_for_display(db, user_role=user_role, status=status)


@router.put("/orders/{order_id}/status", response_model=schemas.Order)
def update_status_of_order(
    order_id: str,
    status_update: schemas.StatusUpdate,
    db: DatabaseManager = Depends(get_db_manager),
    # --- FIX #2: Use the dependency that allows kitchen staff access ---
    current_user: AdminInDB = Depends(get_current_active_user)
):
    # The frontend sends the full ID like "ORD-5", so we extract the number
    try:
        numeric_order_id = int(order_id.split('-')[1])
    except (IndexError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid Order ID format.")

    updated_order = crud.update_order_status(db, numeric_order_id, status_update.status)
    if not updated_order:
        raise HTTPException(status_code=404, detail="Order not found or status update failed.")
    return updated_order

# --- STAFF MANAGEMENT ENDPOINTS (Admin Only) ---
# ... (your existing /staff endpoints) ...


# --- ROLE-SPECIFIC ENDPOINTS ---



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





@router.get("/settings/restaurant", response_model=schemas.RestaurantSettingsResponse)
def get_restaurant_settings_main(db: DatabaseManager = Depends(get_db_manager), current_admin: AdminInDB = Depends(get_current_admin_user)):
    settings = crud.get_main_restaurant_settings(db)
    if not settings: raise HTTPException(404, "Restaurant settings not found.")
    return {"data": settings}

@router.put("/settings/restaurant", response_model=schemas.RestaurantSettingsResponse)
def update_restaurant_settings_main(settings_data: schemas.RestaurantSettings, db: DatabaseManager = Depends(get_db_manager), current_admin: AdminInDB = Depends(get_current_admin_user)):
    crud.update_main_restaurant_settings(db, settings_data)
    updated = crud.get_main_restaurant_settings(db)
    return {"data": updated}

# --- Business Hours ---
@router.get("/settings/business-hours", response_model=schemas.BusinessHours)
def get_business_hours(db: DatabaseManager = Depends(get_db_manager), current_admin: AdminInDB = Depends(get_current_admin_user)):
    return crud.get_business_hours(db)

@router.put("/settings/business-hours", response_model=schemas.BusinessHours)
def update_business_hours(hours: schemas.BusinessHours, db: DatabaseManager = Depends(get_db_manager), current_admin: AdminInDB = Depends(get_current_admin_user)):
    crud.update_business_hours(db, hours)
    return crud.get_business_hours(db)

# --- Notification Settings ---
@router.get("/settings/notifications", response_model=schemas.NotificationSettings)
def get_notification_settings(db: DatabaseManager = Depends(get_db_manager), current_admin: AdminInDB = Depends(get_current_admin_user)):
    return crud.get_notification_settings(db)

@router.put("/settings/notifications", response_model=schemas.NotificationSettings)
def update_notification_settings(settings: schemas.NotificationSettings, db: DatabaseManager = Depends(get_db_manager), current_admin: AdminInDB = Depends(get_current_admin_user)):
    crud.update_notification_settings(db, settings)
    return crud.get_notification_settings(db)

# --- Payment Settings ---
@router.get("/settings/payments", response_model=schemas.PaymentSettings)
def get_payment_settings(db: DatabaseManager = Depends(get_db_manager), current_admin: AdminInDB = Depends(get_current_admin_user)):
    return crud.get_payment_settings(db)

@router.put("/settings/payments", response_model=schemas.PaymentSettings)
def update_payment_settings(settings: schemas.PaymentSettings, db: DatabaseManager = Depends(get_db_manager), current_admin: AdminInDB = Depends(get_current_admin_user)):
    crud.update_payment_settings(db, settings)
    return crud.get_payment_settings(db)

# --- Account Settings ---
@router.get("/settings/account", response_model=schemas.AccountSettingsPublicResponse)
def get_account_settings(
    db: DatabaseManager = Depends(get_db_manager),
    current_user: AdminInDB = Depends(get_current_active_user)
):
    settings = crud.get_account_settings(db, current_user.id)
    if not settings: raise HTTPException(404, "Account settings not found.")
    return {"data": settings}

@router.put("/settings/account", response_model=schemas.AccountSettingsPublicResponse)
def update_account_settings(
    settings: schemas.AccountSettings,
    db: DatabaseManager = Depends(get_db_manager),
    current_user: AdminInDB = Depends(get_current_active_user)
):
    # This now correctly calls the function we just added to crud.py
    crud.update_account_settings(db, current_user.id, settings) 
    updated = crud.get_account_settings(db, current_user.id)
    return {"data": updated}

    
# --- Work Status ---
@router.get("/settings/work-status", response_model=schemas.WorkStatusResponse)
def get_work_status(
    db: DatabaseManager = Depends(get_db_manager), 
    # --- THIS IS THE FIX ---
    # Allow any active user (including delivery) to get their own status
    current_user: AdminInDB = Depends(get_current_active_user)
):
    status = crud.get_work_status(db, current_user.id)
    if not status: 
        raise HTTPException(404, "Work status not found.")
    return {"data": status}

@router.put("/settings/work-status", response_model=schemas.WorkStatusResponse)
def update_work_status(
    status: schemas.WorkStatus, 
    db: DatabaseManager = Depends(get_db_manager), 
    # --- THIS IS THE FIX ---
    # Allow any active user (including delivery) to update their own status
    current_user: AdminInDB = Depends(get_current_active_user)
):
    crud.update_work_status(db, current_user.id, status)
    updated = crud.get_work_status(db, current_user.id)
    return {"data": updated}


@router.put("/settings/profile", response_model=schemas.AccountSettingsPublicResponse)
def update_staff_profile(
    settings: schemas.StaffProfileUpdate, # <-- Use the new, simpler schema
    db: DatabaseManager = Depends(get_db_manager),
    current_user: AdminInDB = Depends(get_current_active_user)
):
    crud.update_staff_profile(db, current_user.id, settings)
    updated = crud.get_account_settings(db, current_user.id)
    return {"data": updated}


@router.put("/settings/password", status_code=status.HTTP_204_NO_CONTENT)
def change_user_password(
    password_data: schemas.PasswordUpdate,
    db: DatabaseManager = Depends(get_db_manager),
    # Use the general dependency to allow any logged-in user to change their own password
    current_user: AdminInDB = Depends(get_current_active_user)
):
    """Allows a logged-in user to change their own password."""
    
    # 1. Verify the user's old password is correct
    if not security.verify_password(password_data.oldPassword, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password.",
        )
        
    # 2. If it's correct, update to the new password
    crud.update_user_password(db, user_id=current_user.id, new_password=password_data.newPassword)
    
    # Return a 204 No Content response on success
    return



@router.get("/kitchen/orders", response_model=List[schemas.Order])
def get_kitchen_orders_list(
    db: DatabaseManager = Depends(get_db_manager),
    current_user: AdminInDB = Depends(get_current_kitchen_staff)
):
    # --- FIX #1: Ensure this function name matches the one in crud.py ---
    # Your log said you have `get_orders_for_kitchen`, so we use that.
    return crud.get_orders_for_kitchen(db)


@router.get("/delivery/dashboard", response_model=schemas.DeliveryDashboardData)
def get_delivery_dashboard(
    db: DatabaseManager = Depends(get_db_manager),
    current_user: AdminInDB = Depends(get_current_delivery_staff)
):
    """Fetches all data for the logged-in delivery person's dashboard."""
    return crud.get_delivery_dashboard_data(db, delivery_boy_id=current_user.id)



@router.get("/delivery/available", response_model=List[schemas.Order])
def get_available_deliveries(db: DatabaseManager = Depends(get_db_manager), current_user: AdminInDB = Depends(get_current_delivery_staff)):
    """Gets all unassigned orders that are ready for delivery."""
    return crud.get_available_delivery_orders(db)

@router.get("/delivery/my-orders", response_model=List[schemas.Order])
def get_my_deliveries(db: DatabaseManager = Depends(get_db_manager), current_user: AdminInDB = Depends(get_current_delivery_staff)):
    """Gets all orders currently assigned to the logged-in driver."""
    return crud.get_my_delivery_orders(db, delivery_boy_id=current_user.id)

@router.post("/delivery/accept/{order_id}", response_model=schemas.Order)
def accept_delivery(order_id: int, db: DatabaseManager = Depends(get_db_manager), current_user: AdminInDB = Depends(get_current_delivery_staff)):
    """Allows a driver to accept/claim an available delivery."""
    success = crud.accept_delivery_order(db, order_id=order_id, delivery_boy_id=current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, # 409 Conflict is the perfect code for a race condition
            detail="This order has already been accepted by another driver."
        )
    
    # Return the fully updated order object on success
    updated_order = crud.get_order_by_id(db, order_id)
    return updated_order



@router.post("/delivery/complete/{order_id}", response_model=schemas.Order, tags=["Delivery"])
def complete_delivery_by_qr(
    order_id: int,
    db: DatabaseManager = Depends(get_db_manager),
    # This dependency ensures only a logged-in delivery person can call this
    current_user: AdminInDB = Depends(get_current_delivery_staff)
):
    """
    Mark a delivery as completed after QR code verification.
    The order_id comes from the scanned QR code.
    """
    # The dependency already confirms the user is a delivery person.
    # Now we delegate all the complex logic to our new CRUD function.
    # It will handle all validation and potential errors.
    updated_order = crud.complete_delivery_order(
        db=db, 
        order_id=order_id, 
        delivery_staff_id=current_user.id # Pass the driver's ID for the security check
    )
    
    return updated_order



@router.get("/delivery/completed", response_model=List[schemas.Order], tags=["Delivery"])
def get_completed_deliveries(
    db: DatabaseManager = Depends(get_db_manager), 
    current_user: AdminInDB = Depends(get_current_delivery_staff)
):
    """Gets all orders completed by the logged-in driver."""
    return crud.get_completed_delivery_orders(db, delivery_boy_id=current_user.id) 



@router.get("/delivery/stats", response_model=schemas.DeliveryStats, tags=["Delivery"])
def get_my_delivery_stats(
    db: DatabaseManager = Depends(get_db_manager),
    current_user: AdminInDB = Depends(get_current_delivery_staff)
):
    """Gets performance statistics for the currently logged-in delivery person."""
    return crud.get_delivery_staff_stats(db, delivery_staff_id=current_user.id)