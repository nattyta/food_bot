import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaHeart, FaCheckCircle } from "react-icons/fa";
import "./detail.css";

const Detail = ({ cart, setCart }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const product = location.state?.product;
  const [showMessage, setShowMessage] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [selectedModifications, setSelectedModifications] = useState([]);
  const [specialInstruction, setSpecialInstruction] = useState("");

  if (!product) {
    return <div>Product not found!</div>;
  }

  // Handle extra selection
  const handleExtraChange = (extra) => {
    setSelectedExtras((prevExtras) =>
      prevExtras.some((e) => e.name === extra.name)
        ? prevExtras.filter((e) => e.name !== extra.name)
        : [...prevExtras, { ...extra, price: Number(extra.price) || 0 }]
    );
  };

  // Handle add-on selection
  const handleAddOnChange = (addOn) => {
    setSelectedAddOns((prev) =>
      prev.some((a) => a.name === addOn.name)
        ? prev.filter((a) => a.name !== addOn.name)
        : [...prev, { ...addOn, price: Number(addOn.price) || 0 }]
    );
  };

  // Handle modification selection
  const handleModificationChange = (mod) => {
    setSelectedModifications((prev) =>
      prev.some((m) => m.name === mod.name)
        ? prev.filter((m) => m.name !== mod.name)
        : [...prev, mod]
    );
  };

  // Confirm and add to cart
  const confirmAddToCart = () => {
    if (!product) return;

    console.log("Selected Extras Before Adding:", selectedExtras);

    const extraCost = selectedExtras.reduce((sum, extra) => sum + Number(extra.price || 0), 0);
    const addOnCost = selectedAddOns.reduce((sum, addOn) => sum + Number(addOn.price || 0), 0);
    const totalPrice = Number(product.price) + extraCost + addOnCost;

    const newItem = {
      id: `${product.id}-${Date.now()}`, // Ensure unique ID
      name: product.name,
      price: totalPrice,
      quantity: 1,
      addOns: selectedAddOns.map(a => ({ ...a, price: Number(a.price) || 0 })),
      extras: selectedExtras.map(e => ({ ...e, price: Number(e.price) || 0 })),
      modifications: selectedModifications,
      specialInstruction: specialInstruction?.trim() || null,
    };

    console.log("New Item Being Added to Cart:", newItem);

    setCart((prevCart) => [...prevCart, newItem]);
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
          <button className="add-to-cart" onClick={() => setShowPopup(true)}>Add to Cart</button>
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
            <h3>Customize Your Order</h3>
            <h4>{product.name}</h4>
            <p>Base Price: ${product.price.toFixed(2)}</p>

            {/* Add-ons Section */}
            <h4>Add-ons</h4>
            <div className="extras-container">
              {product.addOns?.length > 0 ? (
                product.addOns.map((addOn) => (
                  <div key={addOn.name} className="extra-option">
                    <input
                      type="checkbox"
                      id={addOn.name}
                      checked={selectedAddOns.some(a => a.name === addOn.name)}
                      onChange={() => handleAddOnChange(addOn)}
                    />
                    <label htmlFor={addOn.name}>{addOn.name} (+${addOn.price.toFixed(2)})</label>
                  </div>
                ))
              ) : (
                <p>No add-ons available.</p>
              )}
            </div>

            {/* Extras Section */}
            <h4>Extras</h4>
            <div className="extras-container">
              {product.extras?.length > 0 ? (
                product.extras.map((extra) => (
                  <div key={extra.name} className="extra-option">
                    <input
                      type="checkbox"
                      id={extra.name}
                      checked={selectedExtras.some(e => e.name === extra.name)}
                      onChange={() => handleExtraChange(extra)}
                    />
                    <label htmlFor={extra.name}>{extra.name} (+${extra.price.toFixed(2)})</label>
                  </div>
                ))
              ) : (
                <p>No extras available.</p>
              )}
            </div>

            {/* Modifications Section */}
            <h4>Modifications</h4>
            <div className="extras-container">
              {product.modifications?.length > 0 ? (
                product.modifications.map((mod) => (
                  <div key={mod.name} className="extra-option">
                    <input
                      type="checkbox"
                      id={mod.name}
                      checked={selectedModifications.some(m => m.name === mod.name)}
                      onChange={() => handleModificationChange(mod)}
                    />
                    <label htmlFor={mod.name}>{mod.name}</label>
                  </div>
                ))
              ) : (
                <p>No modifications available.</p>
              )}
            </div>

            {/* Special Instructions Section */}
            <h4>Special Instructions</h4>
            <textarea
              className="special-instruction-input"
              placeholder="Any special requests?"
              value={specialInstruction}
              onChange={(e) => setSpecialInstruction(e.target.value)}
            />

            <div className="popup-buttons">
              <button className="confirm-btn" onClick={confirmAddToCart}>Confirm</button>
              <button className="cancel-btn" onClick={() => setShowPopup(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Detail;
