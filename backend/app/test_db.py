import psycopg
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path="/home/natty/food_bot/.env")
conn = psycopg.connect(os.getenv("DATABASE_URL"))
print("✅ Connected to:", os.getenv("DATABASE_URL"))

