import json
import re
import os
import logging
from fastapi import APIRouter, HTTPException, Request, Header, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from urllib.parse import parse_qsl
from .database import DatabaseManager
from .schemas import UserCreate, UserContactUpdate, ProfileUpdate,OrderCreate
from .crud import create_user, update_user_contact
from .auth import validate_init_data
from .security import PhoneEncryptor
import hashlib
import requests 
import hmac
import time
from .schemas import PhoneUpdateRequest,PaymentRequest
import uuid
from datetime import datetime
from cryptography.fernet import Fernet
from math import sin, cos, sqrt, atan2, radians


logger = logging.getLogger(__name__)

router = APIRouter(  prefix="/api/v1",
    tags=["Customer App"])

# Load bot token once globally
BOT_TOKEN = os.getenv("Telegram_API", "").strip()
CHAPA_SECRET_KEY = os.getenv("Chapa_API", "").strip()
encryptor = PhoneEncryptor.get_instance()

if not BOT_TOKEN:
    logger.error("Telegram_API env var is not set!")


# Pydantic model for the auth request body
class InitDataPayload(BaseModel):
    initData: str

async def telegram_auth_dependency(request: Request):
    # Log all headers for debugging
    all_headers = dict(request.headers)
    logger.info("📩 Received request with headers:")
    for header, value in all_headers.items():
        logger.info(f"  {header}: {value[:100]}{'...' if len(value) > 100 else ''}")
    
    init_data = request.headers.get('x-telegram-init-data')
    
    if not init_data:
        logger.error("❌ Missing Telegram initData header")
        # Check for common alternative headers
        alt_headers = {
            'x-telegram-initdata': request.headers.get('x-telegram-initdata'),
            'telegram-init-data': request.headers.get('telegram-init-data'),
            'init-data': request.headers.get('init-data'),
            'x-init-data': request.headers.get('x-init-data')
        }
        logger.info("🔍 Checking alternative headers:")
        for name, value in alt_headers.items():
            if value:
                logger.info(f"  Found alternative header: {name}")
                init_data = value
                break
        
        if not init_data:
            logger.error("🚫 No Telegram initData found in any header")
            raise HTTPException(status_code=401, detail="Missing Telegram initData header")
        else:
            logger.warning("⚠️ Using alternative header for initData")

    try:
        logger.debug(f"🔐 Validating initData: {init_data[:50]}...")
        user_data = validate_init_data(init_data, BOT_TOKEN)  # Renamed variable for clarity
        
        # Extract user information properly
        user = user_data.get('user', {})
        chat_id = user.get('id')
        
        if not chat_id:
            logger.error("❌ Chat ID not found in user data")
            raise HTTPException(status_code=401, detail="User ID not found in initData")
            
        logger.info(f"✅ Validation successful for user: {chat_id}")
        request.state.telegram_user = user_data
        
        return chat_id  # Return the numeric chat_id
    
    except HTTPException as he:
        logger.error(f"❌ Validation failed: {he.detail}")
        raise
    except Exception as e:
        logger.error(f"🔥 Telegram auth validation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=401, detail="Invalid Telegram initData")

@router.post("/auth/telegram")
async def auth_endpoint(request: Request):
    init_data = request.headers.get("x-telegram-init-data")
    
    if not init_data:
        raise HTTPException(status_code=400, detail="Missing initData")
    
    # Get bot token with safety checks
    BOT_TOKEN = os.getenv("Telegram_API", "").strip()
    if not BOT_TOKEN:
        logger.critical("❌ BOT TOKEN NOT CONFIGURED IN ENVIRONMENT!")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "detail": "Server configuration error - missing Telegram API token"
            }
        )

    logger.debug("🔍 [AUTH DIAGNOSTICS]")
    logger.debug(f"  Header length: {len(init_data)}")
    logger.debug(f"  First 50 chars: {init_data[:50]}")
    logger.debug(f"  Last 50 chars: {init_data[-50:]}")
    logger.debug(f"  Contains hash: {'hash=' in init_data}")
    logger.debug(f"  Bot token: {BOT_TOKEN[:3]}...{BOT_TOKEN[-3:]}")
    
    try:
        # Use the raw header directly for validation
        user = validate_init_data(init_data, BOT_TOKEN)
        logger.info(f"✅ Authentication successful for user: {user.get('user', {}).get('id')}")
        
        # Generate session token
        session_token = str(uuid.uuid4())
        chat_id = user.get('user', {}).get('id')
        
        # Store session in database
       
        
        return {
            "status": "success",
            "user": user,
            "session_token": session_token  # MAKE SURE THIS IS INCLUDED
        }
    
    except HTTPException as he:
        logger.error(f"❌ Authentication failed: {he.detail}")
        return JSONResponse(
            status_code=he.status_code,
            content={
                "status": "error",
                "detail": he.detail,
                "diagnostic": {
                    "bot_token_length": len(BOT_TOKEN),
                    "header_sample": f"{init_data[:50]}...{init_data[-50:]}",
                    "validation_step": "hash_comparison"
                }
            }
        )
    
    except Exception as e:
        logger.exception("💥 CRITICAL: Unhandled authentication error")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "detail": "Internal server error",
                "error_info": str(e),
                "diagnostic": {
                    "bot_token": BOT_TOKEN[:3] + "..." + BOT_TOKEN[-3:],
                    "header_length": len(init_data),
                    "exception_type": type(e).__name__
                }
            }
        )

@router.post("/save_user")
def save_user(
    user_data: UserCreate,
    x_telegram_init_data: str = Header(None)
):
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Telegram auth required")

    if not validate_init_data(x_telegram_init_data, BOT_TOKEN):
        raise HTTPException(status_code=403, detail="Invalid Telegram auth")

    tg_user = parse_telegram_user(x_telegram_init_data)
    if str(tg_user.get('id')) != str(user_data.chat_id):
        raise HTTPException(status_code=403, detail="User ID mismatch")

    user = create_user(user_data)
    return JSONResponse({
        "status": "success",
        "user": user,
        "message": "User saved successfully"
    })



@router.get("/me")
async def get_current_user(
    chat_id: int = Depends(telegram_auth_dependency)  # Fixed: added closing parenthesis
):
    try:
        with DatabaseManager() as db:
            # Use fetchone instead of execute_query
            user = db.fetchone(
                "SELECT phone, phone_source FROM users WHERE chat_id = %s",
                (chat_id,)
            )
        
        if not user:
            return {"phone": None, "phone_source": None}
        
        return {
            "phone": user[0],
            "phone_source": user[1]
        }
    
    except Exception as e:
        logger.error(f"Database error in /me: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")





@router.post("/orders", response_model=dict)
async def create_order(
    order: OrderCreate,
    chat_id: int = Depends(telegram_auth_dependency)
):
    try:
        # Validate phone format
        if not re.fullmatch(r'^\+251(7|9)\d{8}$', order.phone):
            obfuscated = encryptor.obfuscate(order.phone)
            logger.warning(f"🚫 Invalid phone format for user {chat_id}: {obfuscated}")
            raise HTTPException(
                status_code=400, 
                detail="Phone must be in +251 format: +2517xxxxxxxx or +2519xxxxxxxx"
            )
        
        # Validate items
        if not order.items or len(order.items) == 0:
            logger.warning(f"🛒 Empty order attempt by user {chat_id}")
            raise HTTPException(
                status_code=400,
                detail="Order must contain at least one item"
            )
        
        # Calculate total price
        total_price = sum(item['price'] * item['quantity'] for item in order.items)
        
        # Encrypt phone
        encrypted_phone = encryptor.encrypt(order.phone)
        obfuscated_phone = encryptor.obfuscate(order.phone)
        
        # Database operation
        with DatabaseManager() as db:
            order_date = datetime.utcnow()
            
            # Use execute_returning for INSERT ... RETURNING
            result_row = db.execute_returning(
                """
                INSERT INTO orders (
                    user_id, 
                    items, 
                    encrypted_phone,
                    obfuscated_phone,
                    order_date,
                    status,
                    total_price,
                    latitude,
                    longitude,
                    address,
                    notes,
                    location_label,
                    order_type  -- NEW COLUMN
                ) VALUES (%s, %s, %s, %s, %s, 'pending', %s, %s, %s, %s, %s, %s, %s)
                RETURNING order_id
                """,
                (
                    chat_id,
                    json.dumps(order.items),
                    encrypted_phone,
                    obfuscated_phone,
                    order_date,
                    total_price,
                    order.latitude,
                    order.longitude,
                    order.address,
                    order.notes,
                    order.location_label,
                    order.order_type  # NEW VALUE
                )
            )
            
            # Check if insertion succeeded
            if not result_row:
                logger.error(f"❌ Order insertion failed for user {chat_id}")
                raise HTTPException(500, "Order creation failed")
            
            # Get the returned order_id
            order_id = result_row[0]
            
        logger.info(f"✅ Order created successfully: ID {order_id} for user {chat_id}")
        return {
            "status": "success",
            "order_id": order_id,
            "total_price": total_price,
            "message": "Order received! We're preparing your food."
        }
        
    except HTTPException as he:
        raise he
        
    except KeyError as e:
        logger.error(f"🔑 Missing key in order item: {str(e)}")
        raise HTTPException(400, f"Invalid item structure: missing {str(e)}")
        
    except TypeError as e:
        logger.error(f"🔠 JSON encoding error: {str(e)}")
        raise HTTPException(500, "Invalid order data format")
        
    except Exception as e:
        logger.exception(f"🔥 Critical order error for user {chat_id}: {str(e)}")
        raise HTTPException(500, "Internal server error")



RESTAURANT_LAT = 9.005  # Example: Addis Ababa coordinates
RESTAURANT_LON = 38.763
MAX_DELIVERY_DISTANCE_KM = 10  # Example: 10 km radius

def calculate_distance(lat1, lon1, lat2, lon2):
    # Calculate the great-circle distance between two points in kilometers
    R = 6371  # Earth's radius in km
    lat1_rad = radians(lat1)
    lon1_rad = radians(lon1)
    lat2_rad = radians(lat2)
    lon2_rad = radians(lon2)
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad
    a = sin(dlat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

@router.get("/validate-location")
async def validate_location(lat: float, lng: float):
    distance = calculate_distance(RESTAURANT_LAT, RESTAURANT_LON, lat, lng)
    within_zone = distance <= MAX_DELIVERY_DISTANCE_KM
    return {
        "within_zone": within_zone,
        "distance": distance
    }






@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "telegram_verified": bool(BOT_TOKEN),  # Set during startup
        "timestamp": int(time.time())
    }

    

@router.get("/orders/me", response_model=list)
async def get_my_orders(
    chat_id: int = Depends(telegram_auth_dependency) # This reuses your existing security
):
    """
    Fetches all past orders for the currently authenticated Telegram user.
    """
    try:
        with DatabaseManager() as db:
            # We add "ORDER BY order_date DESC" to show the newest orders first
            orders = db.fetchall(
                """
                SELECT order_id, items, total_price, status, order_date 
                FROM orders 
                WHERE user_id = %s
                ORDER BY order_date DESC
                """,
                (chat_id,)
            )
        
        if not orders:
            return []
            
        # Format the data nicely for the frontend
        formatted_orders = []
        for order in orders:
            formatted_orders.append({
                "order_id": order[0],
                "items": order[1],  # This is already JSON from your DB
                "total_price": float(order[2]),
                "status": order[3],
                "order_date": order[4].isoformat() # Convert datetime to string
            })
            
        return formatted_orders
        
    except Exception as e:
        logger.error(f"Failed to fetch order history for user {chat_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not retrieve order history.")



@router.post("/create-payment")
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


@router.post("/payment-webhook")
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

    


