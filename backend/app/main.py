from fastapi import FastAPI
from app.routes import router
import requests
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
@app.get("/api/test")
def test():
    return {"message": "Backend is working!"}


# Include routes
app.include_router(router)

@app.get("/api/test")
def test_connection():
    return {"message": "Backend is working!"}


app = FastAPI()
# Allow all origins for development purposes (adjust for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or specify your frontend's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/", StaticFiles(directory="app/build", html=True), name="static")

@app.get("/ping")
async def ping():
    return {"message": "Server is running!"}

CHAPA_SECRET_KEY = os.getenv("Chapa_API")
CHAPA_BASE_URL = "https://api.chapa.co/v1/transaction"  # Chapa's base API endpoint

# Payment request endpoint
@app.post("/create-payment")
def create_payment(order_id: str, amount: float, phone: str, payment_method: str):
    """Initiates payment through Chapa."""
    try:
        payload = {
            "amount": amount,
            "currency": "ETB",
            "tx_ref": order_id,
            "payment_method": payment_method,
            "phone_number": phone,
            "return_url": "https://yourapp.com/success",  # Not used in non-redirect flow
            "cancel_url": "https://yourapp.com/cancel",  # Not used in non-redirect flow
            "callback_url": "https://yourbackend.com/payment-webhook"  # Chapa's webhook callback
        }

        headers = {"Authorization": f"Bearer {CHAPA_SECRET_KEY}"}
        response = requests.post(f"{CHAPA_BASE_URL}/initialize", json=payload, headers=headers)

        # Check for successful response
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail=response.json())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# Webhook to confirm payment
@app.post("/payment-webhook")
def payment_webhook(data: dict, background_tasks: BackgroundTasks):
    """Handles payment confirmation from Chapa."""
    if data.get("status") == "success":
        order_id = data.get("tx_ref")
        background_tasks.add_task(update_order_status, order_id)
        return {"message": "Payment confirmed."}
    else:
        raise HTTPException(status_code=400, detail="Payment failed.")

# Update order status in DB (mock function)
def update_order_status(order_id: str):
    print(f"Updating order {order_id} to 'Paid'")  # Replace with actual DB update logic
