import React, { useMemo, useState,useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./cart.css";
const baseURL = process.env.REACT_APP_API_BASE;

const CartPage = ({ cart, setCart }) => {
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({});
  const [showOrderPopup, setShowOrderPopup] = useState(false);
  const [orderType, setOrderType] = useState("pickup");
  const [orderDetails, setOrderDetails] = useState({
    phone: "", 
    delivery: {
      address: "",
      location: null
    }
  });



  

  const totalPrice = useMemo(
    () =>
      cart.reduce((acc, item) => {
        const extrasTotal = item.extras
          ? item.extras.reduce(
              (sum, extra) =>
                sum + (parseFloat(extra.price) || 0) * (parseFloat(extra.quantity) || 1),
              0
            )
          : 0;
        return acc + ((parseFloat(item.price) || 0) + extrasTotal) * (parseFloat(item.quantity) || 1);
      }, 0),
    [cart]
  );

  const handleOrderClick = () => {
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    setShowOrderPopup(true);
  };

  const handleIncrease = (id) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id ? { ...item, quantity: (parseFloat(item.quantity) || 0) + 1 } : item
      )
    );
  };

  const handleDecrease = (id) => {
    setCart((prevCart) =>
      prevCart
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max((parseFloat(item.quantity) || 1) - 1, 1) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };
    
  const handleRemove = (id) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const toggleItem = (id) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const generateOrderId = () => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomString}`;
  };



  const handleShareLocation = () => {
    if (isTelegramWebApp()) {
      const tg = window.Telegram.WebApp;
      tg.requestLocation((location) => {
        if (location) {
          setOrderDetails(prev => ({
            ...prev,
            delivery: {
              ...prev.delivery,
              location: {
                lat: location.latitude,
                lng: location.longitude
              }
            }
          }));
          tg.showAlert("Location saved!");
        }
      }, (error) => tg.showAlert(`Error: ${error}`));
    } else {
      // Fallback for browser testing
      setOrderDetails(prev => ({
        ...prev,
        delivery: {
          ...prev.delivery,
          location: {
            lat: 9.005401,  // Default Addis Ababa coordinates
            lng: 38.763611
          }
        }
      }));
      alert("Location set to default (Addis Ababa) for testing");
    }
  };



const handleConfirmOrder = async () => {
  try {
    // 1. Get Telegram WebApp data
    const isTelegram = isTelegramWebApp();
    const tgWebApp = window.Telegram?.WebApp;
    
    const chat_id = isTelegram 
   ? tgWebApp?.initDataUnsafe?.user?.id
   : null;

   if (!chat_id) {
   const alertMsg = "❌ Failed to detect Telegram user. Please restart this WebApp via the Telegram bot.";
   isTelegram ? tgWebApp.showAlert(alertMsg) : alert(alertMsg);
   return;
  }

    // 3. Prepare headers
    const headers = {
      'Content-Type': 'application/json'
    };

    // 4. Add auth token if available (from previous auth)
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    // Still include Telegram initData if available
    else if (isTelegram && tgWebApp.initData) {
      headers['x-telegram-init-data'] = tgWebApp.initData;
    }

    // 5. Prepare request data
    const requestData = {
      chat_id: chat_id,
      phone: orderDetails.phone,
      address: orderType === 'delivery' 
        ? `${orderDetails.delivery.address} (Location: ${orderDetails.delivery.location?.lat},${orderDetails.delivery.location?.lng})`
        : 'Pickup'
    };

    // 6. Make the request
    const response = await fetch(`${baseURL}/update-contact`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestData)
    });

    // 7. Handle response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || `Request failed (status ${response.status})`;
      
      // Special handling for auth errors
      if (response.status === 401) {
        if (isTelegram) {
          window.Telegram.WebApp.showAlert("Session expired. Please refresh the page.");
        } else {
          alert("Session expired. Please refresh.");
        }
        return;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    // Continue with order creation after successful contact update
    if (result.status === "success") {
      // Your order creation logic here
      navigate('/payment', { state: { 
        contactInfo: requestData,
        cartTotal: totalPrice 
      }});
    }
    
  } catch (error) {
    console.error('Order confirmation failed:', error);
    const errorMessage = `Error: ${error.message}`;
    if (isTelegramWebApp()) {
      window.Telegram.WebApp.showAlert(errorMessage);
    } else {
      alert(errorMessage);
    }
  }
};

  return (
    <div className="cart-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <h1>Cart</h1>

      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <div className="cart-items">
          {cart.map((item) => (
            <div key={item.id} className="cart-item">
              <img src={item.image} alt={item.name} />
              <div className="item-details">
                <h3>{item.name} (x{item.quantity})</h3>
                <p>Price: ${parseFloat(item.price).toFixed(2)}</p>

                <button className="toggle-btn" onClick={() => toggleItem(item.id)}>
                  {expandedItems[item.id] ? "▲ Hide" : "▼ Show Details"}
                </button>

                {expandedItems[item.id] && (
                  <>
                    {item.extras?.length > 0 && (
                      <div className="extras-list">
                        <p>Extras:</p>
                        <ul>
                          {item.extras.map((extra, index) => (
                            <li key={index}>
                              {extra.name} (+${extra.price})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.specialInstruction && (
                      <p className="Cspecial-instruction">
                        <strong>Note:</strong> {item.specialInstruction}
                      </p>
                    )}
                  </>
                )}

                <div className="quantity-controls">
                  <button onClick={() => handleDecrease(item.id)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => handleIncrease(item.id)}>+</button>
                </div>
                <button onClick={() => handleRemove(item.id)} className="remove-button">
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="cart-total">
            <h2>Total: ${totalPrice.toFixed(2)}</h2>
            <button className="order-button" onClick={handleOrderClick}>
              Order Now
            </button>
          </div>
        </div>
      )}

      {/* Order Type Popup */}
      {showOrderPopup && (
        <div className="order-popup">
          <div className="popup-content">
            <h2>Select Order Type</h2>
            
            <label>
              <input 
                  type="radio" 
                value="pickup" 
                checked={orderType === "pickup"} 
                onChange={() => setOrderType("pickup")} 
              />
              Pickup
            </label>
            
            <label>
              <input 
                type="radio" 
                value="delivery" 
                checked={orderType === "delivery"} 
                onChange={() => setOrderType("delivery")} 
              />
              Delivery
            </label>

            {/* Universal Phone Input */}
            <div className="phone-section">
              <label>
                Contact Phone:
                <input
  type="tel"
  placeholder="+251912345678"
  className="formbox"
  value={orderDetails.phone}
  onChange={(e) => {
    // Remove any non-digit characters first
    let phone = e.target.value.replace(/\D/g, '');
    // Format as Ethiopian number if starting with 251
    if (phone.startsWith('251')) {
      phone = `+${phone}`;
    } else if (phone.startsWith('0')) {
      // Convert local format to international
      phone = `+251${phone.substring(1)}`;
    }
    setOrderDetails({
      ...orderDetails, 
      phone: phone
    });
  }}
  required
  pattern="(\+251|0)[79]\d{8}"
/>
              </label>
              <p className="hint-text">For order updates and payment verification</p>
            </div>

            {/* Delivery-Specific Fields */}
            {orderType === "delivery" && (
              <div className="delivery-form">
                <label>
                  Delivery Address:
                  <input
                    className="formbox"
                    type="text"
                    value={orderDetails.delivery.address}
                    onChange={(e) => setOrderDetails({
                      ...orderDetails,
                      delivery: {
                        ...orderDetails.delivery, 
                        address: e.target.value
                      }
                    })}
                    required
                  />
                </label>
                <button 
                  className="map-button" 
                  onClick={handleShareLocation}
                >
                  📍 Share Location
                </button>
              </div>
            )}

            <div className="popup-buttons">
              <button 
                className="cancel-button" 
                onClick={() => setShowOrderPopup(false)}
              >
                Cancel
              </button>
              <button 
                className="confirm-button" 
                onClick={handleConfirmOrder}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;