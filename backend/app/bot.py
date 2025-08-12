import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
import os
from dotenv import load_dotenv
import uuid
import logging
from datetime import datetime
import psycopg
from telebot import TeleBot
import re
    # ======================
    # INITIALIZATION
    # ======================
load_dotenv(dotenv_path="/home/natty/food-bot/food_bot/.env")


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


def save_user_to_db(chat_id: int, name: str):
    """Save or update user in database"""
    query = """
    INSERT INTO users (chat_id, name)
    VALUES (%s, %s)
    ON CONFLICT (chat_id)
    DO UPDATE SET
        name = EXCLUDED.name,
        last_active = NOW()
    RETURNING chat_id;
    """
    
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (chat_id, name))
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
            
            
            # Save to database
            saved_id = save_user_to_db(
                chat_id=chat_id,
                name=user.first_name
                
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



@bot.message_handler(content_types=['contact'])
def handle_contact(message):
    try:
        contact = message.contact
        user_id = message.from_user.id
        phone = contact.phone_number
        
        # Normalize phone number
        phone = phone.replace('+', '').replace(' ', '')
        if phone.startswith('0'):
            phone = '251' + phone[1:]
        elif not phone.startswith('251'):
            phone = '251' + phone
        
        # Validate Ethiopian format
        if not re.match(r'^251[79]\d{8}$', phone):
            bot.reply_to(message, "❌ Invalid Ethiopian number format. Please use +251 followed by 7 or 9 and 8 digits.")
            return
        
        # Save to database
        with psycopg.connect(os.getenv("DATABASE_URL")) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO users (chat_id, phone, phone_source)
                    VALUES (%s, %s, 'telegram')
                    ON CONFLICT (chat_id)
                    DO UPDATE SET
                        phone = EXCLUDED.phone,
                        phone_source = EXCLUDED.phone_source
                    """,
                    (user_id, '+' + phone)
                )
                conn.commit()
        
        # ✅ Send success message & signal WebApp to close
        bot.send_message(
            user_id,
            "✅ Phone number saved successfully!",
            reply_markup=None
        )
        
       
        
    except Exception as e:
        logger.error(f"Contact handling error: {str(e)}")
        bot.reply_to(message, "⚠️ Failed to save phone. Please try again or contact support.")




@bot.message_handler(func=lambda message: message.text == '__CLOSE_WEBAPP__')
def handle_close_command(message):
    try:
        user_id = message.from_user.id
        bot.send_message(
            user_id,
            "✅ Phone number saved successfully! Closing window...",
            reply_markup=types.ReplyKeyboardRemove()
        )
        
        # This will trigger the webapp to close
        bot.delete_message(message.chat.id, message.message_id)
        
    except Exception as e:
        logger.error(f"Error handling close command: {str(e)}")


@bot.message_handler(content_types=['text'])
def handle_close_command(message):
    try:
        # 1. Check if it's our close command
        if message.text == '__SAVE_AND_CLOSE__':
            # 2. Get contact info from message (if available)
            contact = message.contact
            user_id = message.from_user.id
            
            # 3. Process phone if available
            if contact and contact.phone_number:
                phone = contact.phone_number
                # Normalize and validate
                phone = phone.replace('+', '').replace(' ', '')
                if phone.startswith('0'):
                    phone = '251' + phone[1:]
                elif not phone.startswith('251'):
                    phone = '251' + phone
                
                if re.match(r'^251[79]\d{8}$', phone):
                    # 4. Save to database
                    with psycopg.connect(os.getenv("DATABASE_URL")) as conn:
                        with conn.cursor() as cur:
                            cur.execute(
                                """
                                INSERT INTO users (chat_id, phone, phone_source)
                                VALUES (%s, %s, 'telegram')
                                ON CONFLICT (chat_id)
                                DO UPDATE SET
                                    phone = EXCLUDED.phone,
                                    phone_source = EXCLUDED.phone_source
                                """,
                                (user_id, '+' + phone)
                            )
                            conn.commit()
            
            # 5. Send confirmation and close command
            bot.send_message(
                user_id,
                "✅ Phone number saved successfully!",
                reply_markup=types.ReplyKeyboardRemove()
            )
            
            # 6. Delete the command message
            bot.delete_message(message.chat.id, message.message_id)
            
    except Exception as e:
        logger.error(f"Error handling close command: {str(e)}")

@bot.message_handler(content_types=['contact'])
def handle_contact(message):
    try:
        # Existing contact handling logic
        contact = message.contact
        user_id = message.from_user.id
        phone = contact.phone_number
        
        # ... [your existing normalization and save logic] ...
        
        # 7. After saving, send close command
        bot.send_message(
            user_id,
            "✅ Number saved! Closing window...",
            reply_markup=types.ReplyKeyboardRemove()
        )
        
        # 8. Send special command to close WebApp
        bot.send_message(user_id, "__CLOSE_WEBAPP_NOW__")
        
    except Exception as e:
        logger.error(f"Contact handling error: {str(e)}")
        bot.reply_to(message, "⚠️ Failed to save phone. Please try again.")

        
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