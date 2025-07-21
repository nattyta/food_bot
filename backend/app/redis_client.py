import redis
import os

redis_client = redis.Redis.from_url(os.getenv("REDIS_URL"), decode_responses=True)

def store_telegram_session(user_id: int):
    redis_client.setex(f"tg_session:{user_id}", 60, "active")
