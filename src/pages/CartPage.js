import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './cart.css';

const CartPage = ({ cart, setCart }) => {
  const navigate = useNavigate();
  const [editingItem, setEditingItem] = useState(null);
  const [showCustomizations, setShowCustomizations] = useState(true);

  const totalPrice = useMemo(
    () => cart.reduce((acc, item) => {
      const extrasTotal = item.extras 
        ? item.extras.reduce((sum, extra) => sum + (parseFloat(extra.price) || 0) * (parseFloat(extra.quantity) || 1), 0) 
        : 0;
      return acc + ((parseFloat(item.price) || 0) + extrasTotal) * (parseFloat(item.quantity) || 1);
    }, 0),
    [cart]
  );

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

  const handleOrder = () => {
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    navigate("/payment", { state: { totalPrice } });
  };

  return (
    <div className="cart-page">
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
                <p>Original Price: ${parseFloat(item.price).toFixed(2)}</p>
                <button className="toggle-btn" onClick={() => setShowCustomizations(!showCustomizations)}>
                  {showCustomizations ? "Minimize Customizations" : "Show Customizations"}
                </button>
                {showCustomizations && (
                  <>
                    {item.addOns && item.addOns.length > 0 && (
                      <div className="addons-list">
                        <p>Add-ons:</p>
                        <ul>
                          {item.addOns.map((addon, index) => (
                            <li key={index}>{item.quantity}x {addon.name} (+${((parseFloat(addon.price) || 0) * item.quantity).toFixed(2)})</li>
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
                  <div className="cspecial-instruction">
                    <p><strong>Special Instruction:</strong> {item.specialInstruction}</p>
                  </div>
                )}


                  </>
                  
                )}



                
                <div className="quantity-controls">
                  <button onClick={() => handleDecrease(item.id)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => handleIncrease(item.id)}>+</button>
                </div>

                <p>Total for this item: ${(((parseFloat(item.price) || 0) + (item.extras ? item.extras.reduce((sum, extra) => sum + ((parseFloat(extra.price) || 0) * (parseFloat(extra.quantity) || 1)), 0) : 0)) * (parseFloat(item.quantity) || 1)).toFixed(2)}</p>

                <button onClick={() => handleRemove(item.id)} className="remove-button">Remove</button>
              </div>
            </div>
          ))}

          <div className="cart-total">
            <h2>Total Price: ${totalPrice.toFixed(2)}</h2>
            <button className="order-button" onClick={handleOrder}>Order</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
