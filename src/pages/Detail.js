import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHeart, FaCheckCircle } from 'react-icons/fa';
import './detail.css';

const Detail = ({ cart, setCart }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const product = location.state?.product;
  const [showMessage, setShowMessage] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState([]);

  if (!product) {
    return <div>Product not found!</div>;
  }

  const handleExtraChange = (extra) => {
    setSelectedExtras((prevExtras) => {
      const exists = prevExtras.find((e) => e.name === extra.name);
      if (exists) {
        return prevExtras.filter((e) => e.name !== extra.name);
      } else {
        return [...prevExtras, extra];
      }
    });
  };

  const handleAddToCart = () => {
    setShowPopup(true);
  };

  const confirmAddToCart = () => {
    const extraCost = selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
    const totalPrice = product.price + extraCost;

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, selectedExtras }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1, selectedExtras, price: totalPrice }];
    });

    setShowPopup(false);
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 2000);
  };

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <button className="favorite-button">
          <FaHeart />
        </button>
      </div>

      <div className="detail-image">
        <img src={product.image} alt={product.name} />
      </div>

      <div className="detail-content">
        <h1>{product.name}</h1>
        <p className="origin">From {product.category}</p>
        <div className="rating">
          <span className="star-icon">⭐</span> 4.5 (6,879)
        </div>
        <p className="description">{product.description}</p>

        <div className="description">
          <h4>Ingredients:</h4>
          <p>Tomatoes, Cheese, Fresh Basil, Olive Oil, Garlic, and Fresh Oregano.</p>
        </div>

        <p className="restaurant">From Restaurant XYZ</p>

        <div className="detail-footer">
          <span className="price">${product.price.toFixed(2)}</span>
          <button className="add-to-cart" onClick={handleAddToCart}>Add to Cart</button>
        </div>

        {showMessage && (
          <div className="cart-message">
            <FaCheckCircle className="check-icon" /> Item added to cart!
          </div>
        )}
      </div>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content popup-centered">
            <h3>Choose Extras:</h3>
            <div className="extras-container">
              {product.extras && product.extras.length > 0 ? (
                product.extras.map((extra) => (
                  <div key={extra.name} className="extra-option">
                    <input
                      type="checkbox"
                      id={extra.name}
                      onChange={() => handleExtraChange(extra)}
                      checked={selectedExtras.some((e) => e.name === extra.name)}
                    />
                    <label htmlFor={extra.name}>{extra.name} (+${extra.price.toFixed(2)})</label>
                  </div>
                ))
              ) : (
                <p>No extras available for this item.</p>
              )}
            </div>
            <div className="popup-buttons">
              <button onClick={confirmAddToCart}>Confirm</button>
              <button onClick={() => setShowPopup(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Detail;
