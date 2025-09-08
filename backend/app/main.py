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
        "https://web.telegram.org",
        "http://192.168.0.113:8080/",
        "http://localhost:8080/",
        "https://customer-z13e.onrender.com"
        ],
        
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

