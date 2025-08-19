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
import hmac
import time
from .schemas import PhoneUpdateRequest
import uuid
from datetime import datetime
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

router = APIRouter()

# Load bot token once globally
BOT_TOKEN = os.getenv("Telegram_API", "").strip()
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
            
            # Execute query and get cursor
            cursor, rowcount = db.execute(
                """
                INSERT INTO orders (
                    user_id, 
                    items, 
                    encrypted_phone,
                    obfuscated_phone,
                    order_date,
                    status,
                    total_price
                ) VALUES (%s, %s, %s, %s, %s, 'pending', %s)
                RETURNING order_id
                """,
                (
                    chat_id,
                    json.dumps(order.items),
                    encrypted_phone,
                    obfuscated_phone,
                    order_date,
                    total_price
                )
            )
            
            # Check if insertion succeeded
            if rowcount == 0:
                logger.error(f"❌ Order insertion failed for user {chat_id}")
                raise HTTPException(500, "Order creation failed")
            
            # Get the returned order_id
            result_row = cursor.fetchone()
            if not result_row:
                logger.error(f"❌ Failed to get order ID for user {chat_id}")
                raise HTTPException(500, "Order creation failed")
            
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
        
        # Log for debugging
        logger.info(f"🛒 Order items: {order.items}")
        logger.info(f"💰 Calculated total price: {total_price}")
        
        # Encrypt phone
        encrypted_phone = encryptor.encrypt(order.phone)
        obfuscated_phone = encryptor.obfuscate(order.phone)
        
        # Database operation using DatabaseManager
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
                    total_price
                ) VALUES (%s, %s, %s, %s, %s, 'pending', %s)
                RETURNING order_id
                """,
                (
                    chat_id,
                    json.dumps(order.items),
                    encrypted_phone,
                    obfuscated_phone,
                    order_date,
                    total_price
                )
            )
            
            if not result_row:
                logger.error(f"❌ Order insertion failed for user {chat_id}")
                raise HTTPException(500, "Order creation failed")
            
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


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "telegram_verified": bool(BOT_TOKEN),  # Set during startup
        "timestamp": int(time.time())
    }

