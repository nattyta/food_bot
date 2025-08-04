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

# Dependency that validates Telegram initData on protected routes
async def telegram_auth_dependency(request: Request):
    init_data = request.headers.get('x-telegram-init-data')
    if not init_data:
        raise HTTPException(status_code=401, detail="Missing Telegram initData header")

    try:
        user = validate_init_data(init_data, BOT_TOKEN)
        logger.warning(f"⚠️  Using token for validation: {repr(BOT_TOKEN)}")
        logger.debug(f"Bot token from env: {repr(os.getenv('Telegram_API'))}")
        request.state.telegram_user = user
        return user.get("id")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Telegram auth validation failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Telegram initData")

@router.post("/auth/telegram")
async def auth_endpoint(request: Request):
    init_data = request.headers.get("x-telegram-init-data")
    bot_token = os.getenv("Telegram_API")
    
    if not init_data:
        raise HTTPException(400, "Missing initData")
    
    try:
        user_data = validate_init_data(init_data, bot_token)
        return {"status": "success", "user": user_data}
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"detail": e.detail}
        )
    
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

    # Request forensics for debugging
    logger.debug("🔍 [AUTH DIAGNOSTICS]")
    logger.debug(f"  Header length: {len(raw_header)}")
    logger.debug(f"  First 50 chars: {raw_header[:50]}")
    logger.debug(f"  Last 50 chars: {raw_header[-50:]}")
    logger.debug(f"  Contains hash: {'hash=' in raw_header}")
    logger.debug(f"  Bot token: {BOT_TOKEN[:3]}...{BOT_TOKEN[-3:]}")
    
    try:
        # Use the raw header directly for validation
        user = validate_init_data(raw_header, BOT_TOKEN)
        logger.info(f"✅ Authentication successful for user: {user.get('user', {}).get('id')}")
        
        # Generate session token
        session_token = str(uuid.uuid4())
        chat_id = user.get('user', {}).get('id')
        
        # Store session in database
        if chat_id:
            with DatabaseManager() as db:
                db.execute(
                    "INSERT INTO sessions (chat_id, session_token) VALUES (%s, %s) "
                    "ON CONFLICT (chat_id) DO UPDATE SET session_token = EXCLUDED.session_token",
                    (chat_id, session_token)
                )
        
        return {
            "status": "success",
            "user": user,
            "session_token": session_token
        }
    
    except HTTPException as he:
        # Handle known validation errors
        logger.error(f"❌ Authentication failed: {he.detail}")
        return JSONResponse(
            status_code=he.status_code,
            content={
                "status": "error",
                "detail": he.detail,
                "diagnostic": {
                    "bot_token_length": len(BOT_TOKEN),
                    "header_sample": f"{raw_header[:50]}...{raw_header[-50:]}",
                    "validation_step": "hash_comparison"
                }
            }
        )
    
    except Exception as e:
        # Handle unexpected errors
        logger.exception("💥 CRITICAL: Unhandled authentication error")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "detail": "Internal server error",
                "error_info": str(e),
                "diagnostic": {
                    "bot_token": BOT_TOKEN[:3] + "..." + BOT_TOKEN[-3:],
                    "header_length": len(raw_header),
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

@router.post("/update-contact")
async def update_contact(
    contact_data: UserContactUpdate,
    chat_id: int = Depends(telegram_auth_dependency)
):
    # Log incoming request
    logger.info(f"Update contact request for chat_id: {chat_id}")
    logger.debug(f"Request data: {contact_data.dict()}")

    # Validate chat_id matches
    if chat_id != contact_data.chat_id:
        error_msg = f"User ID mismatch: {chat_id} vs {contact_data.chat_id}"
        logger.warning(error_msg)
        raise HTTPException(status_code=403, detail=error_msg)
    
    # Validate Ethiopian phone format
    if contact_data.phone and not re.fullmatch(r'^\+251[79]\d{8}$', contact_data.phone):
        error_msg = "Invalid Ethiopian phone format. Must be +251 followed by 7 or 9 and 8 digits"
        logger.warning(error_msg)
        raise HTTPException(status_code=400, detail=error_msg)
    
    try:
        # Prepare location data for database
        location_json = None
        if contact_data.location:
            # Access location as object attributes, not dictionary keys
            location_json = json.dumps({
                "lat": contact_data.location.lat,
                "lng": contact_data.location.lng
            })
        
        with DatabaseManager() as db:
            # Update user contact information
            db.execute(
                """
                UPDATE users 
                SET phone = %s, 
                    address = %s, 
                    location = %s,
                    last_updated = NOW()
                WHERE chat_id = %s
                """,
                (
                    contact_data.phone,
                    contact_data.address,
                    location_json,
                    chat_id
                )
            )
            
            if db.rowcount == 0:
                # If no user exists, create a new one
                logger.info(f"Creating new user for chat_id: {chat_id}")
                db.execute(
                    """
                    INSERT INTO users (chat_id, phone, address, location)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (
                        chat_id,
                        contact_data.phone,
                        contact_data.address,
                        location_json
                    )
                )
        
        logger.info(f"Contact updated successfully for chat_id: {chat_id}")
        return {"status": "success", "updated": True}
        
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        logger.error(f"Contact update failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )

@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "telegram_verified": bool(BOT_TOKEN),  # Set during startup
        "timestamp": int(time.time())
    }




@router.post("/orders")
async def create_order(order: OrderCreate, request: Request):
    init_data = request.headers.get("x-telegram-init-data")
    if not init_data:
        raise HTTPException(status_code=401, detail="Missing Telegram initData")

    user_data = validate_init_data(init_data, BOT_TOKEN)
    user_id = user_data["user"]["id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Save to `orders` table
        cursor.execute("""
            INSERT INTO orders (user_id, items, total_price, order_status, delivery_info, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING order_id;
        """, (
            user_id,
            json.dumps([item.dict() for item in order.items]),  # Store raw item info
            order.total_price,
            'pending',  # default status
            json.dumps({"address": order.address, "phone": order.phone, "type": order.order_type}),
            datetime.utcnow()
        ))
        order_id = cursor.fetchone()[0]

        # Save to `order_items` table (normalized view)
        for item in order.items:
            cursor.execute("""
                INSERT INTO order_items (order_id, product_id, quantity, unit_price)
                VALUES (%s, %s, %s, %s);
            """, (
                order_id,
                item.id,
                item.quantity,
                item.price
            ))

        conn.commit()
        return {"status": "success", "order_id": order_id}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

