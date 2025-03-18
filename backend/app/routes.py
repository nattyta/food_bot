from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db  # ✅ Importing only the function
from app.schemas import OrderCreate

router = APIRouter()

@router.get("/")
def read_root(db: Session = Depends(get_db)):
    return {"message": "Hello, FastAPI!"}
