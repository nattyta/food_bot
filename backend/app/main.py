from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel
from fastapi.responses import JSONResponse
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
from app.routes import router as main_router
from fastapi.middleware.cors import CORSMiddleware
import time
from app.security import PhoneEncryptor
from app.admin_router import router as admin_router

# Load environment variables
load_dotenv()
encryptor = PhoneEncryptor.get_instance()
CHAPA_SECRET_KEY = os.getenv("Chapa_API")
CHAPA_BASE_URL = "https://api.chapa.co/v1/transaction/initialize"

app = FastAPI()


if os.getenv("ENVIRONMENT") == "production":
    session_manager.init_redis()


app.include_router(main_router)
app.include_router(admin_router) 

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://food-bot-vulm.onrender.com","t.me/RE_foodBot/fbot",
         "https://telegram.me",
        "https://web.telegram.org"],
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

@app.options("/create-payment", include_in_schema=False)
async def options_create_payment():
    return JSONResponse(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "https://food-bot-vulm.onrender.com",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400",
        }
    )

@app.post("/create-payment")
async def create_payment(payment: PaymentRequest, request: Request):
    """Initiates direct USSD payment with comprehensive logging"""
    client_ip = request.client.host if request.client else "unknown"
    
    logger.info(f"💰 Payment request received: {payment.dict()}")
    logger.info(f"🌐 Client IP: {client_ip}, Order: {payment.order_id}")

    try:
        # Validate payment method
        valid_methods = ["telebirr", "cbe", "awash", "cbebirr", "dashen", "boa"]
        if payment.payment_method not in valid_methods:
            logger.warning(f"🚫 Invalid payment method: {payment.payment_method}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid payment method. Valid options: {', '.join(valid_methods)}"
            )

        # Retrieve the order from database to get the encrypted phone
        with DatabaseManager() as db:
            order_row = db.fetchone(
                "SELECT encrypted_phone FROM orders WHERE order_id = %s",
                (payment.order_id,)
            )
            
            if not order_row:
                logger.error(f"❌ Order not found: {payment.order_id}")
                raise HTTPException(404, "Order not found")
                
            encrypted_phone = order_row[0]
            
            # Handle different data types returned from database
            if isinstance(encrypted_phone, bytes):
                # Convert bytes to string
                encrypted_phone = encrypted_phone.decode('utf-8')
                logger.info(f"🔧 Converted encrypted phone from bytes to string: {encrypted_phone}")
            elif isinstance(encrypted_phone, int):
                # Convert integer to string
                encrypted_phone = str(encrypted_phone)
                logger.info(f"🔧 Converted encrypted phone from int to string: {encrypted_phone}")
            elif isinstance(encrypted_phone, str):
                # Already a string, no conversion needed
                logger.info(f"🔧 Encrypted phone is already a string: {encrypted_phone}")
            else:
                logger.error(f"❌ Unexpected encrypted phone type: {type(encrypted_phone)}")
                raise HTTPException(500, "Unexpected data format for encrypted phone")
            
        # Decrypt the phone number
        try:
            original_phone = encryptor.decrypt(encrypted_phone)
            logger.info(f"📱 Decrypted phone for order {payment.order_id}: {encryptor.obfuscate(original_phone)}")
        except Exception as e:
            logger.error(f"🔓 Failed to decrypt phone for order {payment.order_id}: {str(e)}")
            raise HTTPException(500, "Failed to retrieve phone information")

        # Log the exact values being sent to Chapa
        logger.info(f"📋 Payment details - Amount: {payment.amount}, Currency: {payment.currency}, "
                   f"Phone: {encryptor.obfuscate(original_phone)}, Method: {payment.payment_method}")

        # Prepare Chapa payload with the decrypted phone
        payload = {
            "amount": str(payment.amount),
            "currency": "ETB",
            "tx_ref": payment.order_id,
            "payment_method": payment.payment_method,
            "phone_number": original_phone,  # Use the decrypted phone
            "callback_url": "https://food-bot-vulm.onrender.com/payment-webhook",
            "return_url": "https://food-bot-vulm.onrender.com/payment-success",
            "customization": {
                "title": "FoodBot Payment",
                "description": f"Order {payment.order_id}"  # Removed the '#' symbol
            }
        }

        headers = {
            "Authorization": f"Bearer {CHAPA_SECRET_KEY}",
            "Content-Type": "application/json"
        }
        
        logger.debug(f"📦 Chapa payload: {json.dumps(payload, indent=2)}")
        
        # Initiate payment
        logger.info(f"⚡ Initiating {payment.payment_method} payment for order {payment.order_id}")
        chapa_url = "https://api.chapa.co/v1/transaction/initialize"
        
        # Log the exact request being sent to Chapa
        logger.info(f"🌐 Sending request to Chapa: {chapa_url}")
        logger.info(f"🔑 Using API key: {CHAPA_SECRET_KEY[:10]}...")  # Log only first 10 chars for security
        
        response = requests.post(
            chapa_url,
            json=payload,
            headers=headers,
            timeout=10
        )
        
        logger.debug(f"🔍 Chapa response: {response.status_code} - {response.text[:200]}...")
        
        if response.status_code != 200:
            logger.error(f"❌ Chapa API error: {response.status_code} - {response.text}")
            # Return more detailed error information
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Payment gateway error: {response.text[:100]}..."  # Include part of the response
            )
            
        response_data = response.json()
        logger.info(f"✅ Chapa payment initiated: {response_data.get('message')}")

        # Handle USSD response
        if "ussd_code" in response_data.get("data", {}):
            ussd_code = response_data["data"]["ussd_code"]
            logger.info(f"📱 USSD code generated: {ussd_code} for {payment.payment_method}")
            
            return JSONResponse(
                content={
                    "status": "ussd_prompt",
                    "ussd_code": ussd_code,
                    "message": "Dial the USSD code to complete payment"
                },
                headers={
                    "Access-Control-Allow-Origin": "https://food-bot-vulm.onrender.com",
                    "Access-Control-Allow-Credentials": "true"
                }
            )
        
        # Handle checkout URL response
        if "checkout_url" in response_data.get("data", {}):
            checkout_url = response_data["data"]["checkout_url"]
            logger.info(f"🔗 Checkout URL: {checkout_url}")
            
            return JSONResponse(
                content={
                    "status": "checkout_redirect",
                    "checkout_url": checkout_url
                },
                headers={
                    "Access-Control-Allow-Origin": "https://food-bot-vulm.onrender.com",
                    "Access-Control-Allow-Credentials": "true"
                }
            )
        
        # Fallback for unexpected response
        logger.warning("⚠️ Unexpected Chapa response format")
        return JSONResponse(
            content={
                "status": "unknown",
                "raw_response": response_data
            },
            headers={
                "Access-Control-Allow-Origin": "https://food-bot-vulm.onrender.com",
                "Access-Control-Allow-Credentials": "true"
            }
        )
        
    except requests.exceptions.Timeout:
        logger.error("⌛ Chapa API timeout - service unavailable")
        raise HTTPException(504, "Payment gateway timeout")
    except requests.exceptions.ConnectionError:
        logger.error("🔌 Network error connecting to Chapa")
        raise HTTPException(503, "Payment service unavailable")
    except Exception as e:
        logger.exception(f"💥 Critical payment error: {str(e)}")
        raise HTTPException(500, f"Payment processing failed: {str(e)}")


@app.post("/payment-webhook")
async def chapa_webhook(request: Request):
    """Handle Chapa payment confirmation webhooks"""
    try:
        # Get the raw request body
        body = await request.body()
        
        # Verify the signature (important for security!)
        signature = request.headers.get("Chapa-Signature")
        if not verify_chapa_signature(body, signature):
            logger.warning("⚠️ Invalid webhook signature")
            raise HTTPException(403, "Invalid signature")
        
        # Parse the webhook data
        webhook_data = await request.json()
        logger.info(f"📩 Webhook received: {webhook_data}")
        
        # Extract important information
        tx_ref = webhook_data.get("tx_ref")  # This should be your order_id
        status = webhook_data.get("status")
        chapa_transaction_id = webhook_data.get("id")
        
        if not tx_ref:
            logger.error("❌ No tx_ref in webhook data")
            return {"status": "error", "message": "No transaction reference"}
        
        # Update order status in database
        with DatabaseManager() as db:
            if status == "success":
                db.execute(
                    "UPDATE orders SET status = 'completed', chapa_transaction_id = %s WHERE order_id = %s",
                    (chapa_transaction_id, tx_ref)
                )
                logger.info(f"✅ Payment successful for order {tx_ref}")
            elif status == "failed":
                db.execute(
                    "UPDATE orders SET status = 'failed' WHERE order_id = %s",
                    (tx_ref,)
                )
                logger.warning(f"❌ Payment failed for order {tx_ref}")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.exception(f"💥 Webhook processing error: {str(e)}")
        raise HTTPException(500, "Webhook processing failed")

def verify_chapa_signature(payload: bytes, signature: str) -> bool:
    """Verify Chapa webhook signature"""
    # Get your webhook secret from Chapa dashboard
    webhook_secret = os.getenv("CHAPA_WEBHOOK_SECRET")
    
    if not webhook_secret or not signature:
        return False
    
    # Compute expected signature
    expected_signature = hmac.new(
        webhook_secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature)

    

app.mount("/", StaticFiles(directory="app/build", html=True), name="static")

