import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./cart.css";

const CartPage = ({ cart, setCart, telegramInitData }) => {
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({});
  const [showOrderPopup, setShowOrderPopup] = useState(false);
  const [orderType, setOrderType] = useState("pickup");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderDetails, setOrderDetails] = useState({
    phone: "", 
    delivery: {
      address: "",
      location: null
    }
  });


  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
        console.debug("Loaded cart from localStorage:", JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse saved cart", e);
      }
    }
  }, [setCart]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('cart', JSON.stringify(cart));
      console.debug("Saved cart to localStorage:", cart);
    } else {
      localStorage.removeItem('cart');
      console.debug("Cleared cart from localStorage");
    }
  }, [cart]);

  // Define Telegram WebApp detection function at top level
  const isTelegramWebApp = () => {
    try {
      return (
        typeof window !== 'undefined' &&
        window?.Telegram?.WebApp?.initDataUnsafe?.user?.id !== undefined
      );
    } catch (e) {
      return false;
    }
  };

  // FIXED: Correct price calculation (no double counting)
  const totalPrice = useMemo(() => {
    return cart.reduce((acc, item) => {
      // Item price already includes add-ons and extras
      const itemPrice = parseFloat(item.price) || 0;
      const quantity = parseFloat(item.quantity) || 1;
      
      return acc + (itemPrice * quantity);
    }, 0);
  }, [cart]);

  const handleOrderClick = () => {
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    setShowOrderPopup(true);
  };

  // FIXED: Safer quantity updates
  const handleIncrease = (id) => {
    setCart(prevCart => 
      prevCart.map(item => 
        item.id === id 
          ? { ...item, quantity: (parseInt(item.quantity) || 0) + 1 } 
          : item
      )
    );
  };

  const handleDecrease = (id) => {
    setCart(prevCart => 
      prevCart
        .map(item => 
          item.id === id 
            ? { ...item, quantity: Math.max((parseInt(item.quantity) || 1) - 1, 1) } 
            : item
        )
        .filter(item => item.quantity > 0)
    );
  };
    
  const handleRemove = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const toggleItem = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
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
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      console.log("Starting order confirmation...");
      
      // Log Telegram WebApp status - defined at the top level of try block
      const inTelegram = isTelegramWebApp();
      console.log("In Telegram WebApp:", inTelegram);
      
      if (inTelegram) {
        console.log("Telegram WebApp version:", window.Telegram.WebApp.version);
        console.log("Telegram initData available:", !!window.Telegram.WebApp.initData);
        console.log("Telegram initDataUnsafe:", window.Telegram.WebApp.initDataUnsafe);
      }
      
      // Debug: Log all localStorage contents
      console.debug("LocalStorage contents:", { 
        auth_token: localStorage.getItem('auth_token'),
        cart: localStorage.getItem('cart'),
        allKeys: Object.keys(localStorage),
        telegramInitData: inTelegram ? window.Telegram.WebApp.initData : "N/A"
      });
  
      // Validate phone number
      if (!/^(\+251|0)[79]\d{8}$/.test(orderDetails.phone)) {
        throw new Error("Please enter a valid Ethiopian phone number");
      }
      
      // Validate delivery address if needed
      if (orderType === "delivery" && !orderDetails.delivery.address.trim()) {
        throw new Error("Please enter a delivery address");
      }
  
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        // Detailed debug info for missing token
        const debugInfo = {
          timestamp: new Date().toISOString(),
          inTelegram: inTelegram,
          initData: inTelegram ? window.Telegram.WebApp.initData : "Not in Telegram",
          initDataUnsafe: inTelegram ? window.Telegram.WebApp.initDataUnsafe : "Not in Telegram",
          sessionHistory: performance.getEntriesByType("navigation")[0]?.type
        };
        console.error("Authentication token missing! Debug info:", debugInfo);
        
        throw new Error("Authentication token missing. Please refresh the page.");
      }
  
      // Prepare request data
      const requestData = {
        phone: orderDetails.phone,
        address: orderType === 'delivery' ? orderDetails.delivery.address : 'Pickup',
        location: orderType === 'delivery' ? orderDetails.delivery.location : null
      };
  
      console.log("Request data:", JSON.stringify(requestData, null, 2));
  
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      };
  
      // Use the preserved initData from App.js instead of window object
      if (telegramInitData) {
        headers['x-telegram-init-data'] = telegramInitData;
        console.log("✅ Added preserved Telegram initData header");
      } else {
        console.warn("⚠️ No preserved Telegram initData available");
      }
  
      const apiUrl = `${process.env.REACT_APP_API_BASE || ''}/update-contact`;
      console.log("API URL:", apiUrl);
      console.log("Headers:", JSON.stringify(headers, null, 2));
  
      // Make the request
      const startTime = performance.now();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestData)
      });
      const duration = performance.now() - startTime;
      
      console.log(`Response status: ${response.status} (${duration.toFixed(1)}ms)`);
      
      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}`;
        let responseBody = null;
        
        try {
          responseBody = await response.text();
          console.log("Raw response:", responseBody);
          
          // Try to parse as JSON
          try {
            const errorData = JSON.parse(responseBody);
            errorDetail = errorData.detail || errorDetail;
            console.error("Error response body:", errorData);
          } catch (e) {
            errorDetail = responseBody || errorDetail;
          }
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
        
        throw new Error(`Backend error: ${errorDetail}`);
      }
  
      const result = await response.json();
      console.log("API response:", result);
      
      if (result.status === "success") {
        console.log("Contact update successful, navigating to payment");
        navigate('/payment', { 
          state: { 
            contactInfo: requestData,
            cartTotal: totalPrice 
          }
        });
      } else {
        throw new Error("Unexpected response from server: " + JSON.stringify(result));
      }
      
    } catch (error) {
      console.error('Order confirmation failed:', error);
      const errorMessage = `Error: ${error.message}`;
      
      if (isTelegramWebApp()) {
        window.Telegram.WebApp.showAlert(errorMessage);
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
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
              {item.image ? (
                <img src={item.image} alt={item.name} />
              ) : (
                <div className="image-placeholder">No Image</div>
              )}
              <div className="item-details">
                <h3>{item.name} (x{item.quantity})</h3>
                <p>Price: ${(parseFloat(item.price) || 0).toFixed(2)}</p>

                <button className="toggle-btn" onClick={() => toggleItem(item.id)}>
                  {expandedItems[item.id] ? "▲ Hide" : "▼ Show Details"}
                </button>

                {expandedItems[item.id] && (
                  <>
                    {item.addOns?.length > 0 && (
                      <div className="extras-list">
                        <p>Add-ons:</p>
                        <ul>
                          {item.addOns.map((addOn, index) => (
                            <li key={`addon-${index}`}>
                              {addOn.name} (+${addOn.price.toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {item.extras?.length > 0 && (
                      <div className="extras-list">
                        <p>Extras:</p>
                        <ul>
                          {item.extras.map((extra, index) => (
                            <li key={`extra-${index}`}>
                              {extra.name} (+${extra.price.toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {item.modifications?.length > 0 && (
                      <div className="modifications-list">
                        <p>Modifications:</p>
                        <ul>
                          {item.modifications.map((mod, index) => (
                            <li key={`mod-${index}`}>
                              {mod.name}
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
            
            {/* ... order type selection ... */}
            
            <div className="phone-section">
              <label>
                Contact Phone:
                <input
                  type="tel"
                  placeholder="+251912345678"
                  className="formbox"
                  value={orderDetails.phone}
                  onChange={(e) => {
                    let phone = e.target.value.replace(/\D/g, '');
                    // Format as Ethiopian number
                    if (phone.startsWith('251')) {
                      phone = `+${phone}`;
                    } else if (phone.startsWith('0')) {
                      phone = `+251${phone.substring(1)}`;
                    } else if (phone.length > 0 && !phone.startsWith('+')) {
                      phone = `+251${phone}`;
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
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                className="confirm-button" 
                onClick={handleConfirmOrder}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;