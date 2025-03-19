from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
CHAPA_SECRET_KEY = os.getenv("Chapa_API")
CHAPA_BASE_URL = "https://api.chapa.co/v1/transaction"

app = FastAPI()

# ✅ Define a request model for correct data validation
class PaymentRequest(BaseModel):
    order_id: str
    amount: float
    phone: str
    payment_method: str

@app.post("/create-payment")
def create_payment(payment: PaymentRequest):
    """Initiates payment through Chapa."""
    try:
        payload = {
            "amount": payment.amount,
            "currency": "ETB",
            "tx_ref": payment.order_id,
            "payment_method": payment.payment_method,
            "phone_number": payment.phone,
            "return_url": "https://yourapp.com/success",
            "cancel_url": "https://yourapp.com/cancel",
            "callback_url": "https://yourbackend.com/payment-webhook"
        }

        headers = {"Authorization": f"Bearer {CHAPA_SECRET_KEY}"}
        response = requests.post(f"{CHAPA_BASE_URL}/initialize", json=payload, headers=headers)

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

# Mock function to update order status in DB
def update_order_status(order_id: str):
    print(f"Updating order {order_id} to 'Paid'")  # Replace with actual DB update logic
