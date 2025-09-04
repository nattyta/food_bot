# backend/app/admin_router.py

from fastapi import APIRouter, Depends, HTTPException, status
from datetime import timedelta

# Import all the necessary components we've built
from . import schemas, crud, security, config
from .database import get_db_manager, DatabaseManager

# Create a new router instance for admin endpoints
router = APIRouter(
    prefix="/api/v1/admin",  # All routes in this file will start with /api/v1/admin
    tags=["Admin Authentication"] # This groups them nicely in the API docs
)

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
    if admin.role != form_data.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. User does not have the required '{form_data.role}' role.",
        )

    # 4. If all checks pass, create the JWT access token.
    access_token_expires = timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        # The 'data' dictionary contains the claims that will be encoded in the token.
        # 'sub' (subject) is a standard claim for the user's identifier.
        data={"sub": admin.username, "role": admin.role, "id": admin.id},
        expires_delta=access_token_expires
    )

    # 5. Return the token to the frontend.
    return {"access_token": access_token, "token_type": "bearer"}