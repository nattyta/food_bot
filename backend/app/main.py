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
from .schemas import PaymentRequest
import hashlib
from typing import Optional
import json
from typing import List, Optional 
from .auth import get_current_user, telegram_auth
from app.routes import router
from fastapi.middleware.cors import CORSMiddleware
import time

# Load environment variables
load_dotenv()

CHAPA_SECRET_KEY = os.getenv("Chapa_API")
CHAPA_BASE_URL = "https://api.chapa.co/v1/transaction"

app = FastAPI()


if os.getenv("ENVIRONMENT") == "production":
    session_manager.init_redis()


app.include_router(router)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://food-bot-vulm.onrender.com","t.me/RE_foodBot/fbot"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("payment_processor.log")
    ]
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def verify_telegram_connection():
    """Verify Telegram API connection and token validity on startup"""
    try:
        logger.info("🚀 Starting Telegram API verification...")
        
        # 1. Check token exists
        token = os.getenv("Telegram_API")
        if not token:
            logger.critical("❌ CRITICAL: Telegram_API environment variable not set!")
            return
            
        # 2. Validate token format
        if ":" not in token or not token.split(":")[0].isdigit():
            logger.critical("❌ INVALID TOKEN FORMAT! Should be '123456789:ABCdefGHIJKlmnoPQRSTuvwxyz'")
            return
            
        # 3. Test API connection
        start_time = time.time()
        response = requests.get(
            f"https://api.telegram.org/bot{token}/getMe",
            timeout=5
        )
        response_time = int((time.time() - start_time) * 1000)
        
        if response.status_code != 200:
            logger.error(f"❌ Telegram API unreachable (HTTP {response.status_code})")
            return
            
        data = response.json()
        if not data.get("ok"):
            logger.critical(f"❌ INVALID BOT TOKEN! Telegram response: {data.get('description')}")
            return
            
        # 4. Log success
        bot_info = data["result"]
        logger.info(f"✅ Verified Telegram connection in {response_time}ms")
        logger.info(f"🤖 Bot: @{bot_info['username']} ({bot_info['first_name']})")
        logger.info(f"🆔 Bot ID: {bot_info['id']}")
        
    except requests.exceptions.Timeout:
        logger.critical("❌ Telegram API timeout - check your network connection")
    except requests.exceptions.ConnectionError:
        logger.critical("❌ Network error - cannot connect to Telegram API")
    except Exception as e:
        logger.exception(f"💥 Startup verification failed: {str(e)}")


CHAPA_SECRET_KEY = os.getenv("Chapa_API", "").strip()
if not CHAPA_SECRET_KEY:
    logger.critical("❌ Chapa_API environment variable not set!")
    
@app.post("/create-payment")
async def create_payment(payment: PaymentRequest, request: Request):
    """Initiates direct USSD payment with comprehensive logging"""
    # Get client IP for logging
    client_ip = request.client.host if request.client else "unknown"
    
    logger.info(f"💰 Payment request received: {payment.dict()}")
    logger.info(f"🌐 Client IP: {client_ip}, Order: {payment.order_id}")

    try:
        # Validate payment method
        valid_methods = ["telebirr", "cbe", "abisinia", "cbe_birr"]
        if payment.payment_method not in valid_methods:
            logger.warning(f"🚫 Invalid payment method: {payment.payment_method}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid payment method. Valid options: {', '.join(valid_methods)}"
            )

        # Prepare Chapa payload
        payload = {
            "amount": str(payment.amount),
            "currency": "ETB",
            "tx_ref": payment.order_id,
            "payment_method": payment.payment_method,
            "phone_number": payment.phone,
            "callback_url": "https://food-bot-vulm.onrender.com/payment-webhook",
            "return_url": "https://food-bot-vulm.onrender.com/payment-success",
            "customization": {
                "title": "FoodBot Payment",
                "description": f"Order #{payment.order_id}"
            }
        }

        headers = {
            "Authorization": f"Bearer {CHAPA_SECRET_KEY}",
            "Content-Type": "application/json"
        }
        
        logger.debug(f"📦 Chapa payload: {json.dumps(payload, indent=2)}")
        
        # Initiate payment
        logger.info(f"⚡ Initiating {payment.payment_method} payment for order {payment.order_id}")
        chapa_url = "https://api.chapa.co/v1/transaction/mobile/initiate"
        response = requests.post(
            chapa_url,
            json=payload,
            headers=headers,
            timeout=10
        )
        
        logger.debug(f"🔍 Chapa response: {response.status_code} - {response.text[:200]}...")
        
        if response.status_code != 200:
            logger.error(f"❌ Chapa API error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail="Payment gateway error"
            )
            
        response_data = response.json()
        logger.info(f"✅ Chapa payment initiated: {response_data.get('message')}")

        # Handle USSD response
        if "ussd_code" in response_data.get("data", {}):
            ussd_code = response_data["data"]["ussd_code"]
            logger.info(f"📱 USSD code generated: {ussd_code} for {payment.payment_method}")
            
            return {
                "status": "ussd_prompt",
                "ussd_code": ussd_code,
                "message": "Dial the USSD code to complete payment"
            }
        
        # Handle checkout URL response
        if "checkout_url" in response_data.get("data", {}):
            checkout_url = response_data["data"]["checkout_url"]
            logger.info(f"🔗 Checkout URL: {checkout_url}")
            
            return {
                "status": "checkout_redirect",
                "checkout_url": checkout_url
            }
        
        # Fallback for unexpected response
        logger.warning("⚠️ Unexpected Chapa response format")
        return {
            "status": "unknown",
            "raw_response": response_data
        }
        
    except requests.exceptions.Timeout:
        logger.error("⌛ Chapa API timeout - service unavailable")
        raise HTTPException(504, "Payment gateway timeout")
    except requests.exceptions.ConnectionError:
        logger.error("🔌 Network error connecting to Chapa")
        raise HTTPException(503, "Payment service unavailable")
    except Exception as e:
        logger.exception(f"💥 Critical payment error: {str(e)}")
        raise HTTPException(500, "Payment processing failed")




app.mount("/", StaticFiles(directory="app/build", html=True), name="static")

