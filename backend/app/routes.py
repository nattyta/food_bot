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
import hashlib
import hmac
import time
from .schemas import PhoneUpdateRequest
import uuid
from datetime import datetime


logger = logging.getLogger(__name__)

router = APIRouter()

# Load bot token once globally
BOT_TOKEN = os.getenv("Telegram_API", "").strip()

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





@router.post("/create-order")
async def create_order_with_contact(
    order_data: OrderContactInfo,
    request: Request,
    chat_id: int = Depends(telegram_auth_dependency)
):
    debug_info = {
        "timestamp": datetime.utcnow().isoformat(),
        "client": request.client.host if request.client else None,
        "headers": dict(request.headers),
        "chat_id_from_auth": chat_id,
        "order_data": order_data.dict()
    }
    
    logger.info(f"📬 Create order request for chat_id: {chat_id}")
    logger.debug(f"🔍 Request debug info: {json.dumps(debug_info, indent=2)}")
    
    # Validate Ethiopian phone format
    if not re.fullmatch(r'^\+251[79]\d{8}$', order_data.phone):
        error_msg = "Invalid Ethiopian phone format. Must be +251 followed by 7 or 9 and 8 digits"
        logger.warning(f"📱 {error_msg}")
        logger.debug(f"Received phone: {order_data.phone}")
        raise HTTPException(status_code=400, detail=error_msg)
    
    try:
        # Prepare location data
        location_json = None
        if order_data.location:
            logger.debug(f"📍 Location data received: {order_data.location}")
            location_json = json.dumps(order_data.location)
        
        # Get cart from request (you'll need to pass cart from frontend)
        # This is just a placeholder - you'll need actual cart data
        cart_items = []  
        total_price = 0.0
        
        # Database operation to create order
        with DatabaseManager() as db:
            logger.debug("💾 Creating new order...")
            
            # Insert into orders table
            order_result = db.execute(
                """
                INSERT INTO orders (
                    user_id, 
                    phone, 
                    address, 
                    location,
                    items,
                    total_price,
                    order_status,
                    created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING order_id;
                """,
                (
                    chat_id,
                    order_data.phone,
                    order_data.address,
                    location_json,
                    json.dumps(cart_items),  # Actual cart data goes here
                    total_price,             # Actual total price
                    'pending',
                    datetime.utcnow()
                )
            )
            
            order_id = order_result.fetchone()[0]
            logger.info(f"✅ Order created successfully. Order ID: {order_id}")
        
        return {
            "status": "success", 
            "order_id": order_id,
            "total_amount": total_price
        }
        
    except HTTPException as he:
        logger.error(f"⛔ HTTPException: {he.detail}")
        raise he
    except Exception as e:
        logger.error(f"🔥 Order creation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )




@router.post("/update-phone")
async def update_phone(
    request_data: PhoneUpdateRequest,
    request: Request,
    chat_id: int = Depends(telegram_auth_dependency)
):
    # Detailed logging
    logger.info(f"📱 UPDATE PHONE REQUEST FOR USER: {chat_id}")
    logger.info(f"📱 Source: {request_data.source}, Phone: {request_data.phone}")
    
    # Validate phone format
    if not re.fullmatch(r'^\+251[79]\d{8}$', request_data.phone):
        logger.error(f"❌ INVALID PHONE FORMAT: {request_data.phone}")
        raise HTTPException(status_code=400, detail="Invalid Ethiopian phone format")
    
    # Validate source
    if request_data.source not in ['telegram', 'manual']:
        logger.error(f"❌ INVALID SOURCE: {request_data.source}")
        raise HTTPException(status_code=400, detail="Invalid phone source")
    
    try:
        with DatabaseManager() as db:
            # Log before operation
            logger.info(f"🔄 UPDATING USER {chat_id} PHONE: {request_data.phone}")
            
            # Execute update
            cursor, rowcount = db.execute(
                "UPDATE users SET phone = %s, phone_source = %s WHERE chat_id = %s",
                (request_data.phone, request_data.source, chat_id)
            )
            
            logger.info(f"📝 UPDATE ROWS AFFECTED: {rowcount}")
            
            if rowcount == 0:
                logger.info(f"ℹ️ NO USER FOUND, INSERTING NEW: {chat_id}")
                db.execute(
                    "INSERT INTO users (chat_id, phone, phone_source) VALUES (%s, %s, %s)",
                    (chat_id, request_data.phone, request_data.source)
                )
            else:
                logger.info(f"✅ SUCCESSFULLY UPDATED USER: {chat_id}")
        
        return {"status": "success"}
    
    except HTTPException as he:
        logger.error(f"🚨 HTTP ERROR: {he.detail}")
        raise he
    except Exception as e:
        logger.exception(f"🔥 DATABASE ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/orders")
async def create_order(order: OrderCreate, request: Request):
    init_data = request.headers.get("x-telegram-init-data")
    if not init_data:
        raise HTTPException(status_code=401, detail="Missing Telegram initData")

    # Validate phone format
    if not re.fullmatch(r'^\+251[79]\d{8}$', order.phone):
        raise HTTPException(status_code=400, detail="Invalid Ethiopian phone format")
    
    # Validate user authentication
    user_data = validate_init_data(init_data, BOT_TOKEN)
    user_id = user_data["user"]["id"]
    
    # Create order
    with DatabaseManager() as db:
        db.execute("""
            INSERT INTO orders (
                user_id, items, total_price, order_status,
                phone, address, latitude, longitude, location_label,
                notes, is_guest_order, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING order_id;
        """, (
            user_id,
            json.dumps(order.items),
            order.total_price,
            'pending',
            order.phone,
            order.address,
            order.latitude,
            order.longitude,
            order.location_label,
            order.notes,
            order.is_guest_order,
            datetime.utcnow()
        ))
        
        order_id = db.fetchone()[0]
    
    return {"status": "success", "order_id": order_id}

@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "telegram_verified": bool(BOT_TOKEN),  # Set during startup
        "timestamp": int(time.time())
    }

