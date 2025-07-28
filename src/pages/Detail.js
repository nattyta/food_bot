import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaHeart, FaCheckCircle } from "react-icons/fa";
import "./detail.css";

const Detail = ({ cart, setCart }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMessage, setShowMessage] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [selectedModifications, setSelectedModifications] = useState([]);
  const [specialInstruction, setSpecialInstruction] = useState("");
  const [product, setProduct] = useState({
    id: '',
    name: '',
    description: '',
    price: 0,
    image: '',
    category: '',
    addOns: [],
    extras: [],
    modifications: []
  });

  // Initialize product with safe defaults
  useEffect(() => {
    if (location.state?.product) {
      setProduct({
        id: location.state.product.id || '',
        name: location.state.product.name || '',
        description: location.state.product.description || '',
        price: Number(location.state.product.price) || 0,
        image: location.state.product.image || '',
        category: location.state.product.category || '',
        addOns: location.state.product.addOns || [],
        extras: location.state.product.extras || [],
        modifications: location.state.product.modifications || []
      });
    }
  }, [location.state]);

  if (!product.id) {
    return <div className="product-not-found">Product not found!</div>;
  }

  const handleExtraChange = (extra) => {
    setSelectedExtras((prevExtras) =>
      prevExtras.some((e) => e.name === extra.name)
        ? prevExtras.filter((e) => e.name !== extra.name)
        : [...prevExtras, { 
            ...extra, 
            price: Number(extra.price) || 0 
          }]
    );
  };

  const handleAddOnChange = (addOn) => {
    setSelectedAddOns((prev) =>
      prev.some((a) => a.name === addOn.name)
        ? prev.filter((a) => a.name !== addOn.name)
        : [...prev, { 
            ...addOn, 
            price: Number(addOn.price) || 0 
          }]
    );
  };

  const handleModificationChange = (mod) => {
    setSelectedModifications((prev) =>
      prev.some((m) => m.name === mod.name)
        ? prev.filter((m) => m.name !== mod.name)
        : [...prev, mod]
    );
  };

  const confirmAddToCart = () => {
    const extraCost = selectedExtras.reduce(
      (sum, extra) => sum + Number(extra.price || 0), 0);
    const addOnCost = selectedAddOns.reduce(
      (sum, addOn) => sum + Number(addOn.price || 0), 0);
    const totalPrice = Number(product.price) + extraCost + addOnCost;

    const newItem = {
      id: `${product.id}-${Date.now()}`,
      name: product.name,
      price: totalPrice,
      quantity: 1,
      addOns: selectedAddOns.map(a => ({ 
        ...a, 
        price: Number(a.price) || 0 
      })),
      extras: selectedExtras.map(e => ({ 
        ...e, 
        price: Number(e.price) || 0 
      })),
      modifications: selectedModifications,
      specialInstruction: specialInstruction?.trim() || null,
    };

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
        <img 
          src={product.image} 
          alt={product.name} 
          onError={(e) => {
            e.target.src = '/placeholder-food.jpg';
          }}
        />
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
          <button 
            className="add-to-cart" 
            onClick={() => setShowPopup(true)}
          >
            Add to Cart
          </button>
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

            <h4>Add-ons</h4>
            <div className="extras-container">
              {product.addOns.map((addOn) => (
                <div key={addOn.name} className="extra-option">
                  <input
                    type="checkbox"
                    id={`addon-${addOn.name}`}
                    checked={selectedAddOns.some(a => a.name === addOn.name)}
                    onChange={() => handleAddOnChange(addOn)}
                  />
                  <label htmlFor={`addon-${addOn.name}`}>
                    {addOn.name} (+${addOn.price.toFixed(2)})
                  </label>
                </div>
              ))}
            </div>

            <h4>Extras</h4>
            <div className="extras-container">
              {product.extras.map((extra) => (
                <div key={extra.name} className="extra-option">
                  <input
                    type="checkbox"
                    id={`extra-${extra.name}`}
                    checked={selectedExtras.some(e => e.name === extra.name)}
                    onChange={() => handleExtraChange(extra)}
                  />
                  <label htmlFor={`extra-${extra.name}`}>
                    {extra.name} (+${extra.price.toFixed(2)})
                  </label>
                </div>
              ))}
            </div>

            <h4>Modifications</h4>
            <div className="extras-container">
              {product.modifications.map((mod) => (
                <div key={mod.name} className="extra-option">
                  <input
                    type="checkbox"
                    id={`mod-${mod.name}`}
                    checked={selectedModifications.some(m => m.name === mod.name)}
                    onChange={() => handleModificationChange(mod)}
                  />
                  <label htmlFor={`mod-${mod.name}`}>{mod.name}</label>
                </div>
              ))}
            </div>

            <h4>Special Instructions</h4>
            <textarea
              className="special-instruction-input"
              placeholder="Any special requests?"
              value={specialInstruction}
              onChange={(e) => setSpecialInstruction(e.target.value)}
            />

            <div className="popup-buttons">
              <button className="confirm-btn" onClick={confirmAddToCart}>
                Confirm
              </button>
              <button 
                className="cancel-btn" 
                onClick={() => setShowPopup(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Detail;