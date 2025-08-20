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


  const totalPrice = useMemo(() => {
    return cart.reduce((acc, item) => {
      // Item price already includes add-ons and extras
      const itemPrice = parseFloat(item.price) || 0;
      const quantity = parseFloat(item.quantity) || 1;
      
      return acc + (itemPrice * quantity);
    }, 0);
  }, [cart]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('cart', JSON.stringify(cart));
      localStorage.setItem('cartTotal', totalPrice.toString());
      console.debug("Saved cart and total to localStorage:", cart, totalPrice);
    } else {
      localStorage.removeItem('cart');
      localStorage.removeItem('cartTotal');
      console.debug("Cleared cart from localStorage");
    }
  }, [cart, totalPrice]);

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
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setOrderDetails(prev => ({
              ...prev,
              delivery: {
                ...prev.delivery,
                location: {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                }
              }
            }));
            alert("Location saved!");
          },
          (error) => alert(`Error getting location: ${error.message}`)
        );
      } else {
        alert("Geolocation is not supported by your browser");
      }
    }
  };

  const handleConfirmOrder = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // Phone normalization
      let phone = orderDetails.phone.replace(/\D/g, '');
      if (phone.startsWith('251')) {
        phone = `+${phone}`;
      } else if (phone.startsWith('0')) {
        phone = `+251${phone.substring(1)}`;
      } else if (!phone.startsWith('+251')) {
        phone = `+251${phone}`;
      }
      
      // Validate phone (strictly +251 format)
      if (!/^\+251[79]\d{8}$/.test(phone)) {
        throw new Error("Valid Ethiopian phone required: +251 followed by 7 or 9 and then 8 digits");
      }
      
      // Delivery validation
      if (orderType === "delivery" && !orderDetails.delivery.address.trim()) {
        throw new Error("Delivery address required");
      }
  
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) throw new Error("Authentication expired. Refresh page.");
  
      // Prepare order data
      const orderData = {
        phone: phone,  // Full phone for encryption
        address: orderType === 'delivery' ? orderDetails.delivery.address : 'Pickup',
        latitude: orderType === 'delivery' && orderDetails.delivery.location 
                  ? orderDetails.delivery.location.lat : null,
        longitude: orderType === 'delivery' && orderDetails.delivery.location 
                  ? orderDetails.delivery.location.lng : null,
        location_label: "", // Not currently collected
        notes: "", // Not collected in form
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          addOns: item.addOns || [],
          extras: item.extras || [],
          modifications: item.modifications || [],
          specialInstruction: item.specialInstruction || ""
        })),
        total_price: totalPrice,
        is_guest_order: false
      };
  
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      };
  
      if (telegramInitData) {
        headers['x-telegram-init-data'] = telegramInitData;
      }
  
      // Create order directly
      const apiUrl = `${process.env.REACT_APP_API_BASE || ''}/orders`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData)
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        // Scrub any numbers from the error text
        const errorSafe = errorText.replace(/\d{4,}/g, '***');
        throw new Error(`Order failed: ${response.status} - ${errorSafe.slice(0, 50)}`);
      }
  
      const result = await response.json();
      navigate('/payment', { 
        state: { 
          orderId: result.order_id,
          phone: obfuscatePhone(phone),
          totalPrice: totalPrice
        }
      });
      
    } catch (error) {
      console.error('Order failed:', error);
      // Scrub any numbers from the error message
      const safeError = error.message.replace(/\d{4,}/g, '***');
      if (isTelegramWebApp()) {
        window.Telegram.WebApp.showAlert(safeError);
      } else {
        alert(safeError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Helper to show partial phone (first 5 and last 3 digits)
  function obfuscatePhone(phone) {
    if (!phone) return "";
    return `${phone.substring(0, 5)}****${phone.substring(phone.length - 3)}`;
  }


  
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