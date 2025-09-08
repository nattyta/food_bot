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



  const bankDisplayNames = {
    'telebirr': 'Telebirr',
    'cbe': 'Commercial Bank of Ethiopia', 
    'awash': 'Awash Bank',
    'cbebirr': 'CBE Birr',
    'abisinia': 'Abisinia Bank',
    'boa': 'Bank of Abyssinia',
    'dashen': 'Dashen Bank'
  };



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
    
    // Ensure we have a valid total price
    if (totalPrice <= 0) {
      console.error("Invalid total price:", totalPrice);
      // Try to get from localStorage as fallback
      const storedTotal = parseFloat(localStorage.getItem("cartTotal")) || 0;
      if (storedTotal > 0) {
        setTotalPrice(storedTotal);
      } else {
        alert("Invalid order total. Please go back and try again.");
        navigate(-1);
      }
    }
  }, [initialTotal, totalPrice, navigate]);

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
      
      // Validate total price
      if (totalPrice <= 0) {
        console.error("Invalid total price:", totalPrice);
        alert("Invalid order total. Please go back and try again.");
        return;
      }
    
      setLoading(true);
      setPaymentMethod(method);
      
      try {
        console.log("Initiating payment for order:", orderId);
        console.log("Payment method:", method);
        console.log("Amount:", totalPrice);
        
        const API_BASE_URL = process.env.REACT_APP_API_BASE || "http://localhost:10000";
        const endpoint = `${API_BASE_URL}/api/v1/create-payment`;
        
        console.log("API endpoint:", endpoint);
        
        const paymentData = {
          order_id: orderId.toString(),  // Convert to string
          amount: totalPrice,
          phone: phone,
          payment_method: method,
          currency: "ETB"
        };
    
        console.log("Payment payload:", JSON.stringify(paymentData, null, 2));
        
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
            "x-telegram-init-data": window.Telegram.WebApp.initData,
          },
          body: JSON.stringify(paymentData),
        });
    
        console.log("Payment response status:", response.status);
        console.log("Payment response headers:", Object.fromEntries([...response.headers]));
    
    // Get the response text first to handle both JSON and non-JSON responses
    const responseText = await response.text();
    console.log("Payment response text:", responseText);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
        console.error("Payment failed - server response:", errorData);
        
        // Extract the actual error message with better handling
        let errorMessage = "Unknown error occurred";
        
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(e => e.msg || JSON.stringify(e)).join(', ');
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else {
          errorMessage = JSON.stringify(errorData);
        }
        
        console.error("Extracted error message:", errorMessage);
        
        // Show detailed error in Telegram
        if (window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert(`Payment failed: ${errorMessage}`);
        } else {
          alert(`Payment failed: ${errorMessage}`);
        }
        navigate('/');
      } catch (parseError) {
        console.error("Failed to parse error response:", parseError);
        const errorMsg = `Payment failed with status ${response.status}: ${responseText.substring(0, 100)}...`;
        if (window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert(errorMsg);
        } else {
          alert(errorMsg);
        }
      }
      return;
    }

    // Parse the successful response
    let data;
    try {
      data = JSON.parse(responseText);
      console.log("Payment response data:", data);
    } catch (parseError) {
      console.error("Failed to parse success response:", parseError);
      throw new Error("Invalid response from server");
    }
    
    // USSD Flow
    if (data.data && data.data.ussd_code) {
      const ussdMessage = `Dial ${data.data.ussd_code} on your phone to complete payment`;
      setUssdCode(data.data.ussd_code);
      if (window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert(ussdMessage);
      } else {
          alert(ussdMessage);
      }
      // After showing the USSD, we can redirect to the homepage
      setTimeout(() => navigate('/'), 3000);
    } 


    // Redirect flow (if needed)
    else if (data.data && data.data.checkout_url) {
    const checkoutUrl = data.data.checkout_url;
    console.log("Redirecting to checkout:", checkoutUrl);
    if (window.Telegram?.WebApp?.openLink) {
        // This is the best method for Telegram Web Apps
        window.Telegram.WebApp.openLink(checkoutUrl);
    } else {
        // Fallback for browsers
        window.location.href = checkoutUrl;
    }
} else {
    // This will now only run if the response is truly unexpected
    console.error("Unexpected response format:", data);
    throw new Error("Unexpected response from payment service");
}
    
    console.log("Payment request sent successfully");
    
  } catch (error) {
    console.error("Payment error:", error);
    
    // Handle CORS error specifically
    if (error.message.includes("Failed to fetch") || error.message.includes("CORS")) {
      const errorMsg = "Connection to payment server failed. Please check your internet connection.";
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(errorMsg);
      } else {
        alert(errorMsg);
      }
    } else {
      const errorMsg = `Payment failed: ${error.message || "Unknown error"}`;
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(errorMsg);
      } else {
        alert(errorMsg);
      }
    }
  } finally {
    setLoading(false);
  }
};




    
    return (
      <div className="payment-container">
        <button className="back-button" onClick={() => navigate(-1)}>Back</button>
        
        <h2 className="title">Payment</h2>
        
        
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
            disabled={loading}
          > 
            <img src={telebirrLogo} alt="Telebirr" className="pay-logo"/> 
            <span>Telebirr</span>
          </button>
          
          <button 
            className={`pay-btn ${paymentMethod === 'cbe' ? 'active' : ''}`}
            onClick={() => handlePayment("cbe")}
            disabled={loading}
          > 
            <img src={cbeLogo} alt="CBE" className="pay-logo"/> 
            <span>CBE</span>
          </button>
          
          <button 
            className={`pay-btn ${paymentMethod === 'awash' ? 'active' : ''}`}
            onClick={() => handlePayment("awash")}
            disabled={loading}
          > 
            <img src={abisiniaLogo} alt="Awash Bank" className="pay-logo"/> 
            <span>Awash Bank</span>
          </button>
          
          <button 
            className={`pay-btn ${paymentMethod === 'cbebirr' ? 'active' : ''}`}
            onClick={() => handlePayment("cbebirr")}
            disabled={loading}
          > 
            <img src={cbebirrLogo} alt="CBE Birr" className="pay-logo"/> 
            <span>CBE Birr</span>
          </button>
        </div>
  
        {loading && (
          <div className="payment-loading">
            <p>Processing payment via {bankDisplayNames[paymentMethod] || paymentMethod}...</p>
            <div className="spinner"></div>
            <p className="hint">Check your phone for payment prompt</p>
          </div>
        )}
  
        {ussdCode && (
          <div className="ussd-instruction">
            <h3>Payment Instruction</h3>
            <p>Dial this USSD code on your phone:</p>
            <div className="ussd-code">{ussdCode}</div>
            <p>You will be redirected to confirmation shortly...</p>
          </div>
        )}
      </div>
    );
  };
  
  export default Payment;