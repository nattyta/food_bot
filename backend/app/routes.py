from fastapi import APIRouter
from .crud import create_user

router = APIRouter()

@router.post("/save_user")
def save_user(user_data: dict):
    user = create_user(user_data)
    return {"message": "User saved successfully", "user": user}
