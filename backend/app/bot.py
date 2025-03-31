import requests
import logging
from aiogram import Bot, Dispatcher, types
from aiogram.utils import executor

API_TOKEN = 'YOUR_BOT_API_TOKEN'
BACKEND_URL = "http://localhost:8000/save_user"

logging.basicConfig(level=logging.INFO)

bot = Bot(token=API_TOKEN)
dp = Dispatcher(bot)

def send_user_data_to_backend(user_data):
    response = requests.post(BACKEND_URL, json=user_data)
    return response.json()

@dp.message_handler(commands=['start'])
async def start(message: types.Message):
    user_info = {
        "chat_id": message.from_user.id,
        "name": message.from_user.full_name,
        "phone": None,  # Needs to be fetched separately
        "address": None
    }
    
    response = send_user_data_to_backend(user_info)
    await message.reply(f"Hello {message.from_user.full_name}, your info has been saved.")

if __name__ == "__main__":
    executor.start_polling(dp, skip_updates=True)
