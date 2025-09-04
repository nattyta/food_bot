# backend/app/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from typing import Annotated

from . import config, crud
from .database import get_db_manager, DatabaseManager
from .schemas import TokenData

# This tells FastAPI where to look for the token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/admin/login")

async def get_current_admin_user(
    token: Annotated[str, Depends(oauth2_scheme)], 
    db: DatabaseManager = Depends(get_db_manager)
):
    """
    Decodes the JWT token, validates it, and ensures the user has the 'admin' role.
    This function will be used as a dependency to protect routes.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    forbidden_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Permission denied: Requires admin role",
    )

    try:
        payload = jwt.decode(
            token, config.JWT_SECRET_KEY, algorithms=[config.JWT_ALGORITHM]
        )
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=role)
    except JWTError:
        raise credentials_exception

    # Check if the role from the token is 'admin'
    if token_data.role != "admin":
        raise forbidden_exception
    
    # Optional: You can also re-verify the user exists in the DB
    user = crud.get_admin_by_username(db, username=token_data.username)
    if user is None:
        raise credentials_exception
        
    return user