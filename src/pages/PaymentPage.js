import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./paymentPage.css";
import telebirrLogo from '../assets/images/telebirrLogo.png';
import cbeLogo from '../assets/images/cbeLogo.png';
import abisiniaLogo from '../assets/images/abisiniaLogo.png';
import cbebirrLogo from '../assets/images/cbebirrLogo.png';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get order details from navigation state
  const { orderId, phone, totalPrice: initialTotal } = location.state || {};
  
  const [totalPrice, setTotalPrice] = useState(initialTotal || 0);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("Telegram User");
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [ussdCode, setUssdCode] = useState(null);
  useEffect(() => {
    // Get user info from Telegram WebApp
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
      setUserName(tgUser.first_name || "Telegram User");
    }

    // Fallback to localStorage if no state
    if (!initialTotal) {
      const storedTotal = parseFloat(localStorage.getItem("cartTotal")) || 0;
      setTotalPrice(storedTotal);
    }
  }, [initialTotal]);

  // Obfuscate phone for display (first 5 and last 3 digits)
  const obfuscatedPhone = phone ? 
    `${phone.substring(0, 5)}****${phone.substring(phone.length - 3)}` : 
    '**** **** ****';

    const handlePayment = async (method) => {
      if (!phone || !orderId) {
        console.error("Payment failed: Missing order info");
        alert("Missing order information. Please go back and try again.");
        return;
      }
    
      setLoading(true);
      setPaymentMethod(method);
      
      try {
        console.log("Initiating payment for order:", orderId);
        console.log("Payment method:", method);
        console.log("Amount:", totalPrice);
        
        const apiUrl = process.env.REACT_APP_API_BASE || "https://your-backend-url.com";
        const endpoint = `${apiUrl}/create-payment`;
        
        console.log("API endpoint:", endpoint);
        
        const paymentData = {
          order_id: orderId,
          amount: totalPrice,
          phone: phone,  // Full phone for payment processing
          payment_method: method,
          currency: "ETB"
        };
    
        console.log("Payment payload:", paymentData);
        
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify(paymentData),
        });
    
        console.log("Payment response status:", response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Payment failed:", errorData);
          throw new Error(errorData.detail || "Payment initiation failed");
        }
    
        const data = await response.json();
        console.log("Payment response data:", data);
        
        // USSD Flow
        if (data.ussd_code) {
          const ussdMessage = `Dial ${data.ussd_code} on your phone to complete payment`;
          console.log("USSD instruction:", ussdMessage);
          
          // Show USSD prompt in Telegram or browser
          if (window.Telegram?.WebApp?.showAlert) {
            window.Telegram.WebApp.showAlert(ussdMessage);
          } else {
            alert(ussdMessage);
          }
          
          // Show on-screen instruction
          setUssdCode(data.ussd_code);
        } 
        // Redirect flow (if needed)
        else if (data.checkout_url) {
          console.log("Redirecting to checkout:", data.checkout_url);
          if (window.Telegram?.WebApp?.openLink) {
            window.Telegram.WebApp.openLink(data.checkout_url);
          } else {
            window.open(data.checkout_url, '_blank');
          }
        }
        
        // Track payment initiation
        console.log("Payment request sent successfully");
        
      } catch (error) {
        console.error("Payment error:", error);
        alert(`Payment failed: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
  
  return (
    <div className="payment-container">
      <button className="back-button" onClick={() => navigate(-1)}>Back</button>
      
      <h2 className="title">Payment</h2>
      
      {/* Order Summary */}
      <div className="order-summary">
        <p><strong>Order ID:</strong> {orderId || 'N/A'}</p>
        <p><strong>Total:</strong> {totalPrice.toFixed(2)} ETB</p>
      </div>
      
      {/* Virtual Card with Phone Number */}
      <div className="virtual-card">
        <div className="card-chip"></div>
        <p className="card-number">{obfuscatedPhone}</p>
        <p className="card-name">{userName}</p>
        <p className="card-amount">Amount: {totalPrice.toFixed(2)} ETB</p>
      </div>
      
      <div className="payment-methods">
        <button 
          className={`pay-btn ${paymentMethod === 'telebirr' ? 'active' : ''}`}
          onClick={() => handlePayment("telebirr")}
        > 
          <img src={telebirrLogo} alt="Telebirr" className="pay-logo"/> 
          <span>Telebirr</span>
        </button>
        
        <button 
          className={`pay-btn ${paymentMethod === 'cbe' ? 'active' : ''}`}
          onClick={() => handlePayment("cbe")}
        > 
          <img src={cbeLogo} alt="CBE" className="pay-logo"/> 
          <span>CBE</span>
        </button>
        
        <button 
          className={`pay-btn ${paymentMethod === 'abisinia' ? 'active' : ''}`}
          onClick={() => handlePayment("abisinia")}
        > 
          <img src={abisiniaLogo} alt="Abisinia" className="pay-logo"/> 
          <span>Abisinia</span>
        </button>
        
        <button 
          className={`pay-btn ${paymentMethod === 'cbe_birr' ? 'active' : ''}`}
          onClick={() => handlePayment("cbe_birr")}
        > 
          <img src={cbebirrLogo} alt="CBE Birr" className="pay-logo"/> 
          <span>CBE Birr</span>
        </button>
      </div>

      {loading && (
        <div className="payment-loading">
          <p>Processing payment via {paymentMethod}...</p>
          <div className="spinner"></div>
          <p className="hint">Check your phone for payment prompt</p>
        </div>
      )}
    </div>
  );
};

export default Payment;