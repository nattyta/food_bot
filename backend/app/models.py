from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AdminInDB(BaseModel):
    id: int
    username: str
    password_hash: str
    role: str
    created_at: datetime
    last_login: Optional[datetime]