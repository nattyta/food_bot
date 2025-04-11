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

# Load environment variables
load_dotenv()

CHAPA_SECRET_KEY = os.getenv("Chapa_API")
CHAPA_BASE_URL = "https://api.chapa.co/v1/transaction"

app = FastAPI()

app.include_router(routes.router)

from fastapi.middleware.cors import CORSMiddleware

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add this middleware before your routes
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    try:
        if 'x-telegram-init-data' in request.headers:
            logger.info("Telegram WebApp request detected")
    except Exception as e:
        logger.error(f"Header check error: {e}")
    
    response = await call_next(request)
    return response


def validate_init_data(init_data: str, bot_token: str) -> bool:
    """Validate Telegram WebApp initData"""
    try:
        # Parse key-value pairs
        data = dict(pair.split('=') for pair in init_data.split('&'))
        hash_str = data.pop('hash')
        
        # Sort and format data
        data_str = '\n'.join(f"{k}={v}" for k,v in sorted(data.items()))
        
        # Compute secret key
        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        computed_hash = hmac.new(secret_key, data_str.encode(), hashlib.sha256).hexdigest()
        
        return computed_hash == hash_str
    except Exception:
        return False

@app.post("/api/start-session")
async def start_session(request: Request):
    data = await request.json()
    
    # 1. Validate initData
    if not validate_init_data(data['init_data'], os.getenv("Telegram_API")):
        raise HTTPException(403, "Invalid Telegram auth")
    
    # 2. Verify token matches database
    async with DatabaseManager() as db:
        user = await db.execute(
            "SELECT session_token FROM users WHERE chat_id = %s",
            (data['chat_id'],)
        )
        
        if not user or user['session_token'] != data['token']:
            raise HTTPException(401, "Invalid session token")
    
    return {"status": "authenticated"}


# app/middleware.py
async def validate_telegram_request(request: Request):
    try:
        data = await request.json()
        init_data = data.get('init_data', '')
        
        # Parse user data from initData
        from urllib.parse import parse_qs
        parsed_data = parse_qs(init_data)
        user_data = parsed_data.get('user', ['{}'])[0]
        
        logger.info(
            f"🔍 Auth Attempt | "
            f"IP: {request.client.host} | "
            f"ChatID: {data.get('chat_id')} | "
            f"UserAgent: {request.headers.get('user-agent')}"
        )
        
        if not validate_init_data(init_data, os.getenv("Telegram_API")):
            logger.warning(f"🚨 Invalid auth from {data.get('chat_id')}")
            raise HTTPException(403, "Invalid Telegram auth")
            
        logger.info(f"✅ Auth Success | User: {user_data}")
        return data
        
    except Exception as e:
        logger.error(f"🔥 Auth Error: {str(e)}")
        raise HTTPException(401, "Authentication failed")


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