import telebot
from telebot.types import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
import os
from dotenv import load_dotenv


load_dotenv()



TOKEN = os.getenv("Telegram_API")  # Replace with your actual bot token
WEB_APP_URL = "https://e5e0-196-188-252-230.ngrok-free.app"  # Replace with your hosted web app URL

bot = telebot.TeleBot(TOKEN)
@bot.message_handler(commands=["start"])
def start(message):
    markup = ReplyKeyboardMarkup(resize_keyboard=True)
    web_app_button = KeyboardButton("🍔 Open WebApp", web_app=WebAppInfo(url=WEB_APP_URL))
    markup.add(web_app_button)
    bot.send_message(message.chat.id, "Click below to open the food delivery app!", reply_markup=markup)
    
bot.polling()
