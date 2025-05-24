import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./cart.css";

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

 // 1. First, update the Telegram WebApp detection function
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

// 2. Then update your handleConfirmOrder function
const handleConfirmOrder = async () => {
  // Safely get chat_id with fallback for testing
  const chat_id = isTelegramWebApp() 
    ? window.Telegram.WebApp.initDataUnsafe.user.id
    : 123456789; // Test value for development

  // Validate phone number
  const phoneRegex = /^(\+251|0)[79]\d{8}$/;
  if (!phoneRegex.test(orderDetails.phone)) {
    const message = "Please enter a valid Ethiopian phone number (e.g. +251912345678)";
    isTelegramWebApp() ? window.Telegram.WebApp.showAlert(message) : alert(message);
    return;
  }

  // Validate address if delivery
  if (orderType === 'delivery' && !orderDetails.delivery.address.trim()) {
    const message = "Please enter a delivery address";
    isTelegramWebApp() ? window.Telegram.WebApp.showAlert(message) : alert(message);
    return;
  }

  // Prepare address with location if available
  let fullAddress = orderDetails.delivery.address;
  if (orderDetails.delivery.location) {
    const { lat, lng } = orderDetails.delivery.location;
    fullAddress = `${orderDetails.delivery.address} (Location: ${lat},${lng})`;
  }

  try {
    // 1. First save contact information
    const contactResponse = await fetch('/update-contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(isTelegramWebApp() && { 
          'x-telegram-init-data': window.Telegram.WebApp.initData 
        })
      },
      body: JSON.stringify({
        chat_id: chat_id,
        phone: orderDetails.phone,
        address: orderType === 'delivery' ? fullAddress : 'Pickup'
      })
    });

    if (!contactResponse.ok) {
      const error = await contactResponse.json();
      throw new Error(error.detail || 'Failed to save contact information');
    }

    // 2. Then create the order
    const orderResponse = await fetch('/update-contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(isTelegramWebApp() && { 
          'x-telegram-init-data': window.Telegram.WebApp.initData,
          'Access-Control-Allow-Origin': '*'
        })
      },
      body: JSON.stringify({
        chat_id: chat_id,
        phone: orderDetails.phone,
        address: orderType === 'delivery' ? fullAddress : 'Pickup',
        order_type: orderType,
        items: cart,
        total_price: totalPrice
      })
    });

    const orderData = await orderResponse.json();
    
    if (!orderResponse.ok) {
      throw new Error(orderData.detail || 'Failed to create order');
    }

    // 3. Redirect to payment page with order ID
    navigate(`/payment/${orderData.order_id}`, {
      state: {
        orderId: orderData.order_id,
        totalAmount: totalPrice,
        phone: orderDetails.phone
      }
    });

  } catch (error) {
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