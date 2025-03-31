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
    console.log("Button clicked:", method);;
    
    
    
  
    try {
      setLoading(true); // Show loading state
  
      const apiUrl = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
      const endpoint = `${apiUrl}/create-payment`;
  
      console.log("Sending request to:", endpoint); // Debugging
  
      const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              amount: totalPrice,
              currency: "ETB",
              payment_method: method,
              phone: "0912345678",
              order_id: `order-${Date.now()}`,
          }),
      });
  
      const rawResponse = await response.text();
      console.log("Raw response:", rawResponse);
  
      let data;
      try {
          data = JSON.parse(rawResponse);
      } catch (error) {
          console.error("JSON Parsing Error:", error);
          alert("Invalid response from the server.");
          return;
      }
  
      console.log("Server Response:", data);
  
      if (!response.ok) {
          console.error("Payment Failed:", data);
          alert(`Payment Failed: ${data.detail || "Unknown error"}`);
          return;
      }
  
      if (data.status === "success" && data.data && data.data.checkout_url) {
          window.location.href = data.data.checkout_url; // Redirect to Chapa
      } else {
          alert("Payment failed. Please try again.");
      }
  } catch (error) {
      console.error("Error initiating payment:", error);
      alert("An error occurred while processing the payment.");
  } finally {
      setLoading(false);
  }
  
  
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
