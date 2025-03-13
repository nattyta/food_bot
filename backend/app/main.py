from fastapi import FastAPI
from routes import router  # Import the 'router' object directly
from database import engine
import models

# ✅ Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Food Delivery Bot API")

# ✅ Include the router
app.include_router(router)

@app.get("/")
def root():
    return {"message": "Food Delivery Bot API is running!"}
