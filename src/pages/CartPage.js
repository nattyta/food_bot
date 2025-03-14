import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./cart.css";

const CartPage = ({ cart, setCart }) => {
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({});
  const [showOrderPopup, setShowOrderPopup] = useState(false);
  const [showPopup, setShowPopup] = useState(false); // State for the pop-up
  const [orderType, setOrderType] = useState("pickup"); // Default to pickup
  const [deliveryDetails, setDeliveryDetails] = useState({
    address: "",
    phone: "",
    location: null,
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

  const handleOrder = () => {
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    setShowOrderPopup(true); // Show popup when Order button is clicked
  };

  const handleOrderClick = () => {
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    setShowOrderPopup(true); // Fix: This now correctly controls the popup visibility
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


  
  


  const handleConfirmOrder = () => {
    if (orderType === "delivery" && (!deliveryDetails.address || !deliveryDetails.phone)) {
      alert("Please fill in the delivery details.");
      return;
    }

    setShowOrderPopup(false); // Close popup
    navigate("/payment", { state: { totalPrice, orderType, deliveryDetails } });
  };

  return (
    <div className="cart-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6"> payment </path>
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
                <h3>
                  {item.name} (x{item.quantity})
                </h3>
                <p>Original Price: ${parseFloat(item.price).toFixed(2)}</p>

                <button className="toggle-btn" onClick={() => toggleItem(item.id)}>
                  {expandedItems[item.id] ? "Minimize Customizations" : "Show Customizations"}
                </button>

                {expandedItems[item.id] && (
                  <>
                    {item.addOns && item.addOns.length > 0 && (
                      <div className="addons-list">
                        <p>Add-ons:</p>
                        <ul>
                          {item.addOns.map((addon, index) => (
                            <li key={index}>
                              {item.quantity}x {addon.name} (+${((parseFloat(addon.price) || 0) * item.quantity).toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.extras && item.extras.length > 0 && (
                      <div className="extras-list">
                        <p>Extras:</p>
                        <ul>
                          {item.extras.map((extra, index) => {
                            const price = parseFloat(extra.price) || 0;
                            const quantity = (parseFloat(extra.quantity) || 1) * item.quantity;
                            return (
                              <li key={index}>
                                {item.quantity}x {extra.name} (x{quantity}) (+${(price * quantity).toFixed(2)})
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {item.modifications && item.modifications.length > 0 && (
                      <div className="modifications-list">
                        <p>Modifications:</p>
                        <ul>
                          {item.modifications.map((mod, index) => (
                            <li key={index}>{mod.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.specialInstruction && (
                      <div className="Cspecial-instruction">
                        <p>
                          <strong>Special Instruction:</strong> {item.specialInstruction}
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="quantity-controls">
                  <button onClick={() => handleDecrease(item.id)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => handleIncrease(item.id)}>+</button>
                </div>

                <p>
                  Total for this item: $
                  {(
                    ((parseFloat(item.price) || 0) +
                      (item.extras
                        ? item.extras.reduce(
                            (sum, extra) =>
                              sum + (parseFloat(extra.price) || 0) * (parseFloat(extra.quantity) || 1),
                            0
                          )
                        : 0)) *
                    (parseFloat(item.quantity) || 1)
                  ).toFixed(2)}
                </p>

                <button onClick={() => handleRemove(item.id)} className="remove-button">
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="cart-total">
            <h2>Total Price: ${totalPrice.toFixed(2)}</h2>
            <button className="order-button" onClick={handleOrderClick}>
              Order
            </button>
          </div>
        </div>
      )}

      {/* Order Type Selection Popup */}
      {showOrderPopup && (
        <div className="order-popup">
          <div className="popup-content">
            <h2>Select Order Type</h2>
            <label>
              <input type="radio" value="pickup" checked={orderType === "pickup"} onChange={() => setOrderType("pickup")} />
              Pickup
            </label>
            <label>
              <input type="radio" value="delivery" checked={orderType === "delivery"} onChange={() => setOrderType("delivery")} />
              Delivery
            </label>

            {orderType === "delivery" && (
              <div className="delivery-form">
                <label>
                  Address:
                  <input className="formbox" type="text" value={deliveryDetails.address} onChange={(e) => setDeliveryDetails({ ...deliveryDetails, address: e.target.value })} />
                </label>
                <label>
                  Phone Number:
                  <input className="formbox" type="text" value={deliveryDetails.phone} onChange={(e) => setDeliveryDetails({ ...deliveryDetails, phone: e.target.value })} />
                </label>
                <button className="map-button" onClick={() => alert("Send map location feature coming soon!")}>
                  Send Location
                </button>
              </div>
            )}

            <div className="popup-buttons">
              <button className="cancel-button" onClick={() => setShowOrderPopup(false)}>
                Cancel
              </button>
              <button className="confirm-button" onClick={handleConfirmOrder}>
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
