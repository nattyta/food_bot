import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./paymentPage.css";
import telebirrLogo from "/home/natty/food-bot/food_bot/src/assets/images/telebirrLogo.png";
import cbeLogo from "/home/natty/food-bot/food_bot/src/assets/images/cbeLogo.png";
import abisiniaLogo from "/home/natty/food-bot/food_bot/src/assets/images/abisiniaLogo.png";
import cbeBirrLogo from "/home/natty/food-bot/food_bot/src/assets/images/cbebirrLogo.png";

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [totalPrice, setTotalPrice] = useState(() => {
    return location.state?.totalPrice || parseFloat(localStorage.getItem("cartTotal")) || 0;
  });

  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("Telegram User");
  
  
  useEffect(() => {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name) {
      setUserName(window.Telegram.WebApp.initDataUnsafe.user.first_name);
    }

    if (totalPrice === 0) {
      const storedTotal = parseFloat(localStorage.getItem("cartTotal")) || 0;
      setTotalPrice(storedTotal);
    }
  }, [totalPrice]);

  const handlePayment = async (method) => {
    setLoading(true);
    
    
    try {
      const response = await fetch("http://127.0.0.1:8000/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalPrice,
          currency: "ETB",
          payment_method: method,
          phone: "0912345678",
          order_id: "order123",
        }),
      });
      

      const data = await response.json();
      if (data.tx_ref) {
        // Handle the response - maybe show a confirmation or a QR code if successful
        alert("Payment request sent! Please follow the instructions.");
      } else {
        alert("Payment initiation failed. Please try again.");
      }
    } catch (error) {
      console.error("Error initiating payment:", error);
      alert("Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="payment-container">
      <button className="back-button" onClick={() => navigate(-1)}>Back</button>
      
      <h2 className="title">Payment</h2>
      <div className="virtual-card">
        <div className="card-chip"></div>
        <p className="card-number">**** **** **** {Math.floor(1000 + Math.random() * 9000)}</p>
        <p className="card-name">{userName}</p>
        <p className="card-amount">Total: {totalPrice.toFixed(2)} ETB</p>
      </div>
      
      <div className="payment-methods">
        <button className="pay-btn" onClick={() => handlePayment("telebirr")}> 
          <img src={telebirrLogo} alt="Telebirr" className="pay-logo"/> <span>Telebirr</span>
        </button>
        <button className="pay-btn" onClick={() => handlePayment("cbe")}> 
          <img src={cbeLogo} alt="CBE" className="pay-logo"/> <span>CBE</span>
        </button>
        <button className="pay-btn" onClick={() => handlePayment("abisinia")}> 
          <img src={abisiniaLogo} alt="Abisinia" className="pay-logo"/> <span>Abisinia</span>
        </button>
        <button className="pay-btn" onClick={() => handlePayment("cbe_birr")}> 
          <img src={cbeBirrLogo} alt="CBE Birr" className="pay-logo"/> <span>CBE Birr</span>
        </button>
      </div>

      {loading && <p className="loading-text">Processing payment...</p>}
    </div>
  );
};

export default Payment;
