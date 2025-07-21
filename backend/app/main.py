from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel
import requests
from .database import DatabaseManager
import os
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
from app import routes
from app.database import UserData, register_user
import logging
import hmac
import hashlib
from app.sessions import validate_session
from typing import Optional
import json
from .sessions import session_manager,validate_session
from typing import List, Optional 
from .auth import get_current_user, telegram_auth
from app.routes import router
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

CHAPA_SECRET_KEY = os.getenv("Chapa_API")
CHAPA_BASE_URL = "https://api.chapa.co/v1/transaction"

app = FastAPI()


if os.getenv("ENVIRONMENT") == "production":
    session_manager.init_redis()

app.include_router(routes.router)


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
     allow_origins=[
        "https://food-bot-vulm.onrender.com",
        "https://web.telegram.org",
        "https://telegram.org"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)



# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)



@app.middleware("http")
async def strict_auth_middleware(request: Request, call_next):
    """Strict authentication middleware with proper error handling"""
    try:
        # Skip auth for public endpoints
        if request.url.path in ['/auth/telegram', '/health']:
            return await call_next(request)
            
        # 1. Strict Telegram authentication
        try:
            tg_user = await telegram_auth(request)  # Should return full user object
            if not tg_user:
                raise HTTPException(403, "Telegram authentication required")
            request.state.tg_user = tg_user
        except Exception as auth_error:
            logger.error(f"Telegram auth failed: {str(auth_error)}")
            raise HTTPException(403, "Invalid Telegram authentication")

        # 2. Session validation for all authenticated routes
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            raise HTTPException(401, "Missing auth token")
            
        token = auth_header[7:]
        chat_id = session_manager.validate_session(token)
        
        if not chat_id:
            raise HTTPException(401, "Invalid or expired session token")
            
        # 3. Cross-validate Telegram and session
        if str(tg_user['id']) != str(chat_id):
            logger.error(f"ID mismatch: TG:{tg_user['id']} vs Session:{chat_id}")
            raise HTTPException(403, "Authentication mismatch")
            
        request.state.chat_id = chat_id
        
        # Proceed with request
        return await call_next(request)
        
    except HTTPException as he:
        logger.error(f"Auth blocked: {he.detail}")
        raise
    except Exception as e:
        logger.error(f"Middleware crash: {str(e)}", exc_info=True)
        raise HTTPException(500, "Internal authentication error")

# ✅ Define a request model for correct data validation
class PaymentRequest(BaseModel):
    order_id: str
    amount: float
    phone: str
    payment_method: str
    currency: str

@app.post("/create-payment")
async def create_payment(payment: PaymentRequest):  # ❌ Removed `request: Request`
    """Initiates payment through Chapa."""
    print("Received request:", payment)  # ✅ `payment` already contains JSON data
  
    try:
        payload = {
            "amount": payment.amount,
            "currency": "ETB",
            "tx_ref": payment.order_id,
            "payment_method": payment.payment_method,
            "phone_number": payment.phone,
            "return_url": "https://yourapp.com/success",
            "cancel_url": "https://yourapp.com/cancel",
            "callback_url": "https://yourbackend.com/payment-webhook"
        }

        headers = {"Authorization": f"Bearer {CHAPA_SECRET_KEY}"}
        response = requests.post(f"{CHAPA_BASE_URL}/initialize", json=payload, headers=headers)

        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail=response.json())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# Webhook to confirm payment
@app.post("/payment-webhook")
def payment_webhook(data: dict, background_tasks: BackgroundTasks):
    """Handles payment confirmation from Chapa."""
    if data.get("status") == "success":
        order_id = data.get("tx_ref")
        background_tasks.add_task(update_order_status, order_id)
        return {"message": "Payment confirmed."}
    else:
        raise HTTPException(status_code=400, detail="Payment failed.")

# Mock function to update order status in DB
def update_order_status(order_id: str):
    print(f"Updating order {order_id} to 'Paid'")  # Replace with actual DB update logic


app.mount("/", StaticFiles(directory="app/build", html=True), name="static")

