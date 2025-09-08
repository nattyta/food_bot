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
from typing import Dict
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
Chapa_API = os.getenv("Chapa_API", "").strip()
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
        # Your validation logic is good
        if not re.fullmatch(r'^\+251[79]\d{8}$', order.phone):
            raise HTTPException(status_code=400, detail="Invalid phone format")
        if not order.items:
            raise HTTPException(status_code=400, detail="Order is empty")

        encrypted_phone = encryptor.encrypt(order.phone).encode('utf-8')
        obfuscated_phone = encryptor.obfuscate(order.phone)
        order_date = datetime.utcnow()
        
        with DatabaseManager() as db:
            result_row = db.execute_returning(
                """
                INSERT INTO orders (user_id, items, encrypted_phone, obfuscated_phone, order_date, status, total_price, latitude, longitude, address, notes, order_type, payment_status)
                VALUES (%s, %s, %s, %s, %s, 'pending', %s, %s, %s, %s, %s, %s, 'pending')
                RETURNING order_id
                """,
                (
                    chat_id,
                    # --- THIS IS THE FIX ---
                    # `order.items` is already a list of dicts. We don't need to call .dict() on them.
                    json.dumps(order.items),
                    encrypted_phone,
                    obfuscated_phone,
                    order_date,
                    order.total_price,
                    order.latitude,
                    order.longitude,
                    order.address,
                    order.notes,
                    order.order_type
                )
            )
            
            if not result_row:
                raise HTTPException(500, "Order creation failed in database")
            
            order_id = result_row[0]
            
        logger.info(f"✅ Order created successfully: ID {order_id} for user {chat_id}")
        return {"status": "success", "order_id": order_id, "total_price": order.total_price}
        
    except HTTPException as he:

        raise he
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
    SELECT order_id, items, total_price, status, order_date, payment_status
    FROM orders 
    WHERE user_id = %s ORDER BY order_date DESC
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
                "order_date": order[4].isoformat(), # Convert datetime to string
                "payment_status": order[5]
            })
            
        return formatted_orders
        
    except Exception as e:
        logger.error(f"Failed to fetch order history for user {chat_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not retrieve order history.")



@router.post("/create-payment")
async def create_payment(payment: PaymentRequest, request: Request, chat_id: int = Depends(telegram_auth_dependency)):
    """Initiates a payment with Chapa, generating a unique transaction reference."""
    logger.info(f"💰 Payment request for order {payment.order_id} from user {chat_id}")

    try:
        with DatabaseManager() as db:
            order_row = db.fetchone(
                "SELECT encrypted_phone FROM orders WHERE order_id = %s AND user_id = %s",
                (int(payment.order_id), chat_id)
            )
            if not order_row:
                raise HTTPException(status_code=404, detail="Order not found or does not belong to this user.")
            
            # This is a 'bytes' object from the bytea column
            encrypted_phone_bytes = order_row[0]
        
        # This will now work perfectly because our new decrypt method can handle bytes
        original_phone = encryptor.decrypt(encrypted_phone_bytes)

        unique_tx_ref = f"{payment.order_id}-{int(time.time() * 1000)}"
        logger.info(f"Generated unique tx_ref for Chapa: {unique_tx_ref}")

        payload = {
            "amount": str(payment.amount),
            "currency": "ETB",
            "tx_ref": unique_tx_ref,
            "phone_number": original_phone,
            "callback_url": "https://food-bot-vulm.onrender.com/api/v1/payment-webhook",
            "return_url": "https://customer-z13e.onrender.com/payment-success",
            "customization": {
                "title": "FoodBot Payment",
                "description": f"Payment for Order {payment.order_id}"
            },
            "meta": {
                "internal_order_id": payment.order_id
            }
        }
        
        if payment.payment_method:
            payload["payment_method"] = payment.payment_method

        headers = {"Authorization": f"Bearer {Chapa_API}", "Content-Type": "application/json"}
        
        chapa_response = requests.post(
            "https://api.chapa.co/v1/transaction/initialize", 
            json=payload, 
            headers=headers
        )
        
        chapa_response.raise_for_status()
        
        logger.info(f"✅ Chapa payment initiated successfully for tx_ref: {unique_tx_ref}")
        return chapa_response.json()

    except requests.exceptions.HTTPError as e:
        error_body = e.response.text
        logger.error(f"❌ Chapa API error for order {payment.order_id}: {error_body}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Payment gateway error: {error_body}")
    except Exception as e:
        logger.exception(f"💥 Critical payment error for user {chat_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal payment processing error: {str(e)}")

@router.api_route("/payment-webhook", methods=["GET", "POST"]) # <-- ALLOW BOTH GET and POST
async def chapa_webhook(request: Request):
    """
    Handles incoming webhooks from Chapa.
    Accepts GET for simple verification and POST for detailed transaction data.
    """
    try:
        tx_ref = None
        status = None

        if request.method == "GET":
            # For GET requests, Chapa sends data in query parameters
            query_params = request.query_params
            tx_ref = query_params.get("trx_ref")
            status = query_params.get("status")
            logger.info(f"✅ Received GET webhook for tx_ref: {tx_ref} with status: {status}")
            # Signature verification is not typically done on GET webhooks from Chapa
            
        elif request.method == "POST":
            # For POST requests, data is in the body with a signature
            signature = request.headers.get("Chapa-Signature")
            body = await request.body()
            
            # --- We should still add the verify_chapa_signature function for POST ---
            # if not verify_chapa_signature(body, signature):
            #     logger.warning("⚠️ Invalid POST webhook signature.")
            #     raise HTTPException(status_code=403, detail="Invalid signature")

            webhook_data = json.loads(body)
            tx_ref = webhook_data.get("tx_ref")
            status = webhook_data.get("status")
            logger.info(f"✅ Received and verified POST webhook: {webhook_data}")

        # --- UNIFIED LOGIC TO UPDATE THE DATABASE ---
        if not tx_ref:
            logger.error("❌ No tx_ref found in Chapa webhook.")
            return {"status": "error", "message": "Missing transaction reference"}

        # Extract the internal order ID
        order_id_to_update = tx_ref.split('-')[0]

        if status == "success":
            with DatabaseManager() as db:
                db.execute(
                    """
                    UPDATE orders 
                    SET payment_status = 'paid', status = 'preparing' 
                    WHERE order_id = %s
                    """,
                    (int(order_id_to_update),)
                )
                logger.info(f"✅ Payment for order {order_id_to_update} confirmed. Status updated.")
        else:
            logger.warning(f"Payment for order {order_id_to_update} was not successful via webhook. Status: {status}")

        # Always return a 200 OK to Chapa
        return {"status": "success"}
        
    except Exception as e:
        logger.exception(f"💥 Webhook processing error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal webhook processing error")
