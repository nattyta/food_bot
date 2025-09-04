from pydantic import BaseModel
from datetime import datetime
from typing import optional

class AdminInDB(BaseModel):
    id: int
    username: str
    password_hash: str
    role: str
    created_at: datetime
    last_login: Optional[datetime]