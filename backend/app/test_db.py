from dotenv import load_dotenv
load_dotenv()
import os
print("🚨 Bot token:", os.getenv("Telegram_API"))
