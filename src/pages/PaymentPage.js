import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import './paymentPage.css';
import { FaRegArrowAltCircleLeft } from "react-icons/fa";
import telebirrLogo from "/home/natty/food-bot/food_bot/src/assets/images/telebirrLogo.png";
import cbeLogo from "/home/natty/food-bot/food_bot/src/assets/images/cbeLogo.png";
import abisiniaLogo from "/home/natty/food-bot/food_bot/src/assets/images/abisiniaLogo.png";
import cbeBirrLogo from "/home/natty/food-bot/food_bot/src/assets/images/cbebirrLogo.png";

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get total price from location state or localStorage
  const [totalPrice, setTotalPrice] = useState(() => {
    return location.state?.totalPrice || parseFloat(localStorage.getItem("cartTotal")) || 0;
  });

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("Telegram User");

  useEffect(() => {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name) {
      setUserName(window.Telegram.WebApp.initDataUnsafe.user.first_name);
    }

    // If the totalPrice is 0, try fetching from localStorage
    if (totalPrice === 0) {
      const storedTotal = parseFloat(localStorage.getItem("cartTotal")) || 0;
      setTotalPrice(storedTotal);
    }
  }, [totalPrice]);

  const handlePayment = async (method) => {
    setLoading(true);
    setSelectedMethod(method);

    try {
      const response = await fetch("https://your-backend.com/api/initiate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, amount: totalPrice }),
      });

      const data = await response.json();
      if (data.success) {
        window.location.href = data.payment_url;
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
      <button className="back-button" onClick={() => navigate(-1)}>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"> payment </path>
  </svg>
</button>


      
      <h2 className="title">Payment</h2>
      <div className="virtual-card">
        <div className="card-chip"></div>
        <p className="card-number">**** **** **** {Math.floor(1000 + Math.random() * 9000)}</p>
        <p className="card-name">{userName}</p>
        <p className="card-amount">Total: ${totalPrice.toFixed(2)}</p>
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
