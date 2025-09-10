# backend/app/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from typing import Annotated

from . import config, crud
from .database import get_db_manager, DatabaseManager
from .schemas import TokenData
from .models import AdminInDB

# This tells FastAPI where to look for the token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/admin/login")

def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: DatabaseManager = Depends(get_db_manager)):
    """Decodes token and retrieves the user from the database."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = crud.get_admin_by_username(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

def get_current_admin_user(current_user: Annotated[AdminInDB, Depends(get_current_user)]):
    """Ensures the current user has the 'admin' role."""
    # NOTE: The role 'manager' from your frontend form should be saved as 'admin' in the database
    # if you want them to have these permissions.
    if current_user.role.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges for this action."
        )
    return current_user