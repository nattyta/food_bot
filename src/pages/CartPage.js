import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './cart.css';

const CartPage = ({ cart, setCart }) => {
  const navigate = useNavigate();
  

  // Calculate total price including extras
  const totalPrice = useMemo(
    () => cart.reduce((acc, item) => {
      const extrasTotal = item.extras ? item.extras.reduce((sum, extra) => sum + extra.price * extra.quantity, 0) : 0;
      return acc + (item.price + extrasTotal) * item.quantity;
    }, 0),
    [cart]
  );

  const handleIncrease = (id) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const handleDecrease = (id) => {
    setCart((prevCart) =>
      prevCart
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(item.quantity - 1, 1) } : item
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
                <p>Original Price: ${item.price.toFixed(2)}</p>

                {/* Add-ons Section */}
                {item.addOns && item.addOns.length > 0 && (
                  <div className="addons-list">
                    <p>Add-ons:</p>
                    <ul>
                      {item.addOns.map((addon, index) => (
                        <li key={index}>{addon.name} (+${addon.price.toFixed(2)})</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Extras Section */}
                {item.extras && item.extras.length > 0 && (
                  <div className="extras-list">
                    <p>Extras:</p>
                    <ul>
                      {item.extras.map((extra, index) => (
                        <li key={index}>{extra.name} (x{extra.quantity}) (+${(extra.price * extra.quantity).toFixed(2)})</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Modifications Section */}
                {item.modifications && item.modifications.length > 0 && (
                  <div className="modifications-list">
                    <p>Modifications:</p>
                    <ul>
                      {item.modifications
                        .filter((mod) => mod.options && mod.options.length > 0)
                        .map((mod, index) => (
                          <li key={index}>{mod.title}: {mod.options.join(", ")}</li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* Special Instructions Section */}
                {item.specialInstruction && (
                  <div className="special-instruction">
                    <p><strong>Special Instruction:</strong> {item.specialInstruction}</p>
                  </div>
                )}

                {/* Quantity Controls */}
                <div className="quantity-controls">
                  <button onClick={() => handleDecrease(item.id)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => handleIncrease(item.id)}>+</button>
                </div>

                <p>Total for this item: ${((item.price + (item.extras ? item.extras.reduce((sum, extra) => sum + extra.price * extra.quantity, 0) : 0)) * item.quantity).toFixed(2)}</p>

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
