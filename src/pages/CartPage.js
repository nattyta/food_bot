import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import "./cart.css";

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const CartPage = ({ cart, setCart, telegramInitData }) => {
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({});
  const [showOrderPopup, setShowOrderPopup] = useState(false);
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [orderType, setOrderType] = useState("pickup");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mapCenter, setMapCenter] = useState([9.005401, 38.763611]); // Default to Addis Ababa
  const [markerPosition, setMarkerPosition] = useState(null);
  const mapRef = useRef(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [userData, setUserData] = useState(null);


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

  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('cart', JSON.stringify(cart));
      console.debug("Saved cart to localStorage:", cart);
    } else {
      localStorage.removeItem('cart');
      console.debug("Cleared cart from localStorage");
    }
  }, [cart]);

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

  const totalPrice = useMemo(() => {
    return cart.reduce((acc, item) => {
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
          const newPosition = [location.latitude, location.longitude];
          setMapCenter(newPosition);
          setMarkerPosition(newPosition);
          setShowMapPopup(true);
        }
      }, (error) => tg.showAlert(`Error: ${error}`));
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newPosition = [
              position.coords.latitude,
              position.coords.longitude
            ];
            setMapCenter(newPosition);
            setMarkerPosition(newPosition);
            setShowMapPopup(true);
          },
          (error) => alert(`Error getting location: ${error.message}`)
        );
      } else {
        alert("Geolocation is not supported by your browser");
      }
    }
  };

  const handleMapClick = (e) => {
    setMarkerPosition([e.latlng.lat, e.latlng.lng]);
  };

  const saveMapLocation = () => {
    if (markerPosition) {
      setOrderDetails(prev => ({
        ...prev,
        delivery: {
          ...prev.delivery,
          location: {
            lat: markerPosition[0],
            lng: markerPosition[1]
          }
        }
      }));
      setShowMapPopup(false);
      if (isTelegramWebApp()) {
        window.Telegram.WebApp.showAlert("Location saved!");
      } else {
        alert("Location saved!");
      }
    }
  };


  useEffect(() => {
    const fetchUserData = async () => {
      const response = await fetch('/me');
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        setOrderDetails(prev => ({
          ...prev,
          phone: data.phone
        }));
      }
    };
    fetchUserData();
  }, []);

  const handleConfirmOrder = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      console.log("Starting order confirmation...");
      
      const inTelegram = isTelegramWebApp();
      console.log("In Telegram WebApp:", inTelegram);
      
      if (inTelegram) {
        console.log("Telegram WebApp version:", window.Telegram.WebApp.version);
        console.log("Telegram initData available:", !!window.Telegram.WebApp.initData);
        console.log("Telegram initDataUnsafe:", window.Telegram.WebApp.initDataUnsafe);
      }
      
      // Phone validation
      if (!/^(\+251|0)[79]\d{8}$/.test(orderDetails.phone)) {
        throw new Error("Please enter a valid Ethiopian phone number");
      }
      
      // Delivery validation
      if (orderType === "delivery") {
        if (!orderDetails.delivery.address.trim()) {
            throw new Error("Please enter a delivery address");
        }
        if (!orderDetails.delivery.location) {
            throw new Error("Please share your location by clicking the '📍 Share Location' button");
        }
    }
  
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
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
  
      // Prepare order data for /orders endpoint
      const orderData = {
        phone: orderDetails.phone,
        latitude: orderDetails.delivery.location?.lat || null,
        longitude: orderDetails.delivery.location?.lng || null,
        location_label: locationLabel, // From new state variable
        notes: "", // Optional notes field
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
  
      console.log("Order data:", JSON.stringify(orderData, null, 2));
  
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      };
  
      if (telegramInitData) {
        headers['x-telegram-init-data'] = telegramInitData;
        console.log("✅ Added preserved Telegram initData header");
      } else {
        console.warn("⚠️ No preserved Telegram initData available");
      }
  
      const apiUrl = `${process.env.REACT_APP_API_BASE || ''}/orders`;
      console.log("API URL:", apiUrl);
      console.log("Headers:", JSON.stringify(headers, null, 2));
  
      const startTime = performance.now();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(orderData)
      });
      const duration = performance.now() - startTime;
      
      console.log(`Response status: ${response.status} (${duration.toFixed(1)}ms)`);
      
      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}`;
        let responseBody = null;
        
        try {
          responseBody = await response.text();
          console.log("Raw response:", responseBody);
          
          if (response.status === 422) {
            try {
              const errorData = JSON.parse(responseBody);
              const validationErrors = errorData.detail.map(err => 
                `${err.loc.join('.')}: ${err.msg}`
              ).join('; ');
              errorDetail = `Validation error: ${validationErrors}`;
            } catch {}
          } else {
            try {
              const errorData = JSON.parse(responseBody);
              errorDetail = errorData.detail || errorDetail;
            } catch {}
          }
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
        
        throw new Error(`Order creation failed: ${errorDetail}`);
      }
  
      const result = await response.json();
      console.log("API response:", result);
      
      if (result.status === "success") {
        console.log("Order created successfully, navigating to payment");
        navigate('/payment', { 
          state: { 
            orderId: result.order_id,
            totalAmount: totalPrice
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
                    if (phone.startsWith('251')) {
                      phone = `+${phone}`;
                    } else if (phone.startsWith('0')) {
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

      {/* Map Popup */}
      {showMapPopup && (
         <div className="map-popup">
         <div className="map-popup-content">
           <h3>Select Delivery Location</h3>
           <p>Click on the map to place your marker</p>
           
           <div className="map-container">
             <MapContainer
               center={mapCenter}
               zoom={15}
               style={{ height: "400px", width: "100%" }}
               whenCreated={mapInstance => mapRef.current = mapInstance}
               onClick={handleMapClick}
             >
               <TileLayer
                 url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
               />
               {markerPosition && (
                 <Marker position={markerPosition}>
                   <Popup>
                     Your delivery location
                     {locationLabel && <div>Details: {locationLabel}</div>}
                   </Popup>
                 </Marker>
               )}
             </MapContainer>
           </div>
     
           {/* Location details input */}
           <div className="location-details-section">
             <input
               type="text"
               placeholder="Add location details (floor, gate, landmark, etc)"
               value={locationLabel}
               onChange={(e) => setLocationLabel(e.target.value)}
               className="location-label-input"
             />
             <p className="location-hint">
               Add specific details to help our delivery driver find you
             </p>
           </div>
           
           <div className="map-buttons">
             <button 
               className="cancel-button" 
               onClick={() => {
                 setShowMapPopup(false);
                 setLocationLabel(''); // Reset location label
               }}
             >
               Cancel
             </button>
             <button 
               className="confirm-button" 
               onClick={saveMapLocation}
               disabled={!markerPosition}
             >
               Save Location
             </button>
           </div>
         </div>
       </div>
      )}
    </div>
  );
};

export default CartPage;