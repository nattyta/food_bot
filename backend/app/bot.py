import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
import os
from dotenv import load_dotenv
import uuid
import logging
from datetime import datetime
import psycopg
from telebot import TeleBot
    # ======================
    # INITIALIZATION
    # ======================
load_dotenv(dotenv_path="/home/natty/food_bot/.env")

    # Configure logging
logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler("bot.log"),
            logging.StreamHandler()
        ]
    )
logger = logging.getLogger(__name__)


    # Environment variables
TOKEN = os.getenv("Telegram_API")
WEB_APP_URL = os.getenv("WEB_APP_URL")
DATABASE_URL = os.getenv("DATABASE_URL")


print("🔍 DEBUG DATABASE_URL:", os.getenv("DATABASE_URL"))

    # Initialize bot
bot = telebot.TeleBot(TOKEN)

    # ======================
    # DATABASE FUNCTIONS
    # ======================
def get_db_connection():
    """Establish database connection"""
    try:
        conn = psycopg.connect(DATABASE_URL)
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        raise


def save_user_to_db(chat_id: int, name: str, session_token: str):
    """Save or update user in database"""
    query = """
    INSERT INTO users (chat_id, name, session_token)
    VALUES (%s, %s, %s)
    ON CONFLICT (chat_id)
    DO UPDATE SET
        name = EXCLUDED.name,
        session_token = EXCLUDED.session_token,
        last_active = NOW()
    RETURNING chat_id;
    """
    
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (chat_id, name, session_token))
                result = cur.fetchone()
                conn.commit()
                logger.info(f"Saved user {chat_id} to database")
                return result[0] if result else None
    except Exception as e:
        logger.error(f"Failed to save user {chat_id}: {str(e)}")
        raise


    # ======================
    # BOT HANDLERS
    # ======================
@bot.message_handler(commands=["start"])
def handle_start(message):
        """Handle /start command"""
        try:
            user = message.from_user
            chat_id = user.id
            session_token = str(uuid.uuid4())
            
            # Save to database
            saved_id = save_user_to_db(
                chat_id=chat_id,
                name=user.first_name,
                session_token=session_token
            )
            
            logger.info(f"User {saved_id} initialized")
 
            # Create menu
            markup = InlineKeyboardMarkup()
            markup.add(
                 InlineKeyboardButton(
                 text="🍔 Order Food",
                 web_app=WebAppInfo(url="https://food-bot-vulm.onrender.com")
                 )
            )

            bot.send_message(
             chat_id,
             f"Welcome {user.first_name}! Click below to start ordering.",
             reply_markup=markup
            )

        except Exception as e:
            logger.error(f"Start failed for {message.chat.id}: {str(e)}")
            bot.reply_to(message, "⚠️ Registration failed. Please try again or contact support.")

    # ======================
    # WEBAPP INTEGRATION
    # ======================
@bot.message_handler(content_types=['web_app_data'])
def handle_webapp_data(message):
        """Process data from WebApp"""
        try:
            data = message.web_app_data.data
            logger.info(f"Received order: {data}")
            # Process order here
            
            bot.reply_to(message, "✅ Order received! We're preparing your food.")
            
        except Exception as e:
            logger.error(f"Order processing failed: {str(e)}")
            bot.reply_to(message, "⚠️ Failed to process order. Please try again.")

    # ======================
    # MAIN EXECUTION
    # ======================
if __name__ == "__main__":
    logger.info("Starting FoodBot...")
    try:
        # Test database connection
        with get_db_connection() as conn:
            logger.info("Database connection successful")

        # 🧹 Remove webhook before polling
        bot.remove_webhook()
        logger.info("Webhook removed")

        # Start polling
        bot.polling(none_stop=True, interval=1)

    except Exception as e:
        logger.critical(f"Bot crashed: {str(e)}")