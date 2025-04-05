from fastapi import APIRouter
from app.schemas import UserCreate
from app.crud import create_user

router = APIRouter()

@router.post("/save_user")
def save_user(user_data: UserCreate):
    user = create_user(user_data)
    return {"message": "User saved successfully", "user": user}
