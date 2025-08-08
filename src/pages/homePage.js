import React, { useState, useEffect } from "react";
import { FaHome, FaShoppingCart, FaHeart, FaBell, FaSearch, FaRegArrowAltCircleRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./homePage.css";

const HomePage = ({ cart, setCart, telegramInitData }) => {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [showSpecialInstruction, setShowSpecialInstruction] = useState(false);
  const [specialInstruction, setSpecialInstruction] = useState("");  
  const navigate = useNavigate();
  const [selectedModifications, setSelectedModifications] = useState([]);
  
  // New state for phone capture
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [userPhone, setUserPhone] = useState('');

  useEffect(() => {
    const fetchedCategories = ["All", "Popular", "Pizza", "Burger", "Pasta", "Drinks", "Desserts"];
    setCategories(fetchedCategories);

    const sampleProducts = [
      { id: 1, name: "Cheese Pizza", description: "With Extra Cheese", price: 9.99, image: "pizza.jpg", category: "Pizza", addOns: [{ name: "Extra Cheese", price: 1.5 }, { name: "Mushrooms", price: 2.0 }], extras: [{ name: "Fries", price: 2.5 }, { name: "Drink", price: 1.5 }], modifications: [{ name: "No Onions" }, { name: "Less Salt" }] },
      { id: 2, name: "Veggie Burger", description: "With Fresh Vegetables", price: 7.99, image: "burger.jpg", category: "Burger", addOns: [{ name: "Avocado", price: 1.2 }, { name: "Cheese Slice", price: 0.8 }], extras: [{ name: "Fries", price: 2.5 }, { name: "Drink", price: 1.5 }], modifications: [{ name: "No Tomato" }, { name: "No Mayo" }] }
    ];
    setProducts(sampleProducts);
  }, []);

  // Check if we're in Telegram WebApp
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

  // Phone capture modal component
  const PhoneCaptureModal = () => {
    const [phone, setPhone] = useState('');
    const [method, setMethod] = useState(null);

    const handleTelegramShare = async () => {
      try {
        const userContact = await new Promise((resolve) => {
          window.Telegram.WebApp.requestContact(resolve);
        });
        
        if (userContact && userContact.phone_number) {
          await fetch('/update-phone', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
              phone: userContact.phone_number,
              source: 'telegram' 
            })
          });
          setMethod('telegram');
          setPhone(userContact.phone_number);
          setUserPhone(userContact.phone_number);
          setShowPhoneModal(false);
        }
      } catch (error) {
        console.error('Phone share failed:', error);
        alert('Failed to share phone. Please try manually.');
      }
    };

    const handleManualSubmit = async () => {
      // Normalize phone number
      let normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '+251' + normalizedPhone.substring(1);
      } else if (!normalizedPhone.startsWith('251')) {
        normalizedPhone = '+251' + normalizedPhone;
      } else {
        normalizedPhone = '+' + normalizedPhone;
      }
      
      if (!/^\+251[79]\d{8}$/.test(normalizedPhone)) {
        alert('Please enter a valid Ethiopian phone number starting with +251 followed by 7 or 9');
        return;
      }
      
      try {
        await fetch('/update-phone', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ 
            phone: normalizedPhone,
            source: 'manual' 
          })
        });
        setMethod('manual');
        setPhone(normalizedPhone);
        setUserPhone(normalizedPhone);
        setShowPhoneModal(false);
      } catch (error) {
        console.error('Failed to save phone:', error);
        alert('Failed to save phone. Please try again.');
      }
    };

    return (
      <div className="phone-modal-overlay">
        <div className="phone-modal">
          <h2>Welcome to FoodBot!</h2>
          <p>We need your phone number to continue</p>
          
          <button className="btn-telegram" onClick={handleTelegramShare}>
            Share via Telegram
          </button>
          
          <div className="divider">OR</div>
          
          <div className="manual-entry">
            <input 
              type="tel"
              placeholder="+251XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button className="btn-submit" onClick={handleManualSubmit}>
              Submit Manually
            </button>
          </div>
        </div>
      </div>
    );
  };

  const openPopup = (product) => {
    setSelectedProduct(product);
    setSelectedAddOns([]);
    setSelectedExtras([]);
    setSelectedModifications([]);
    setSpecialInstruction("");
    setShowSpecialInstruction(false);
  };

  const closePopup = () => {
    setSelectedProduct(null);
    setSelectedAddOns([]);
    setSelectedExtras([]);
    setSelectedModifications([]);
    setSpecialInstruction("");
    setShowSpecialInstruction(false);
  };

  const handleAddOnChange = (addOn) => {
    setSelectedAddOns(prev => {
      const isSelected = prev.some(a => a.name === addOn.name);
      if (isSelected) {
        return prev.filter(a => a.name !== addOn.name);
      } else {
        return [...prev, { ...addOn, price: Number(addOn.price) || 0 }];
      }
    });
  };

  const handleExtraChange = (extra) => {
    setSelectedExtras(prev => {
      const isSelected = prev.some(e => e.name === extra.name);
      if (isSelected) {
        return prev.filter(e => e.name !== extra.name);
      } else {
        return [...prev, { ...extra, price: Number(extra.price) || 0 }];
      }
    });
  };

  const handleModificationChange = (mod) => {
    setSelectedModifications(prev => {
      const isSelected = prev.some(m => m.name === mod.name);
      if (isSelected) {
        return prev.filter(m => m.name !== mod.name);
      } else {
        return [...prev, mod];
      }
    });
  };
  
  const addToCart = () => {
    if (!selectedProduct) return;
    
    // Calculate total price including add-ons and extras
    const basePrice = Number(selectedProduct.price) || 0;
    const addOnsTotal = selectedAddOns.reduce((sum, addOn) => sum + (Number(addOn.price) || 0), 0);
    const extrasTotal = selectedExtras.reduce((sum, extra) => sum + (Number(extra.price) || 0), 0);
    const totalPrice = basePrice + addOnsTotal + extrasTotal;
    
    const newItem = {
      id: `${selectedProduct.id}-${Date.now()}`,
      name: selectedProduct.name,
      price: totalPrice,  // THIS IS THE FIX: Include add-ons/extras in price
      image: selectedProduct.image,
      quantity: 1,
      addOns: [...selectedAddOns],
      extras: [...selectedExtras],
      modifications: [...selectedModifications],
      specialInstruction: specialInstruction.trim() || null,
    };
    
    setCart(prevCart => [...prevCart, newItem]); 
    closePopup();
  };

  return (
    <div className="homepage">
      
      <header className="header">
        <h1>Find the best food for you</h1>
        <div className="profile-pic"></div>
      </header>
      <div className="search-bar">
        <input type="text" placeholder="Find Your Food..." />
        <FaSearch className="search-icon" />
      </div>
      <div className="category-container">
        {categories.map((category) => (
          <button key={category} className={`category-button ${activeCategory === category ? "active" : ""}`} onClick={() => setActiveCategory(category)}>{category}</button>
        ))}
      </div>
      <div className="product-grid">
        {products.filter(p => activeCategory === "All" || p.category === activeCategory).map((product) => (
          <div key={product.id} className="product-card" onClick={() => navigate("/Detail", { state: { product } })}>
            <img src={product.image} alt={product.name} className="product-image" />
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <div className="product-footer">
              <span>${product.price.toFixed(2)}</span>
              <button className="add-to-cart" onClick={(e) => { e.stopPropagation(); openPopup(product); }}>+</button>
            </div>
          </div>
        ))}
      </div>
      {selectedProduct && (
        <div className="popup-overlay">
          <div className="popup-content popup-centered">
            <h2>{selectedProduct.name}</h2>

            {/* Add-ons Section */}
            <h4>Add-ons</h4>
            {selectedProduct.addOns?.map((addOn) => (
              <div key={addOn.name} className="extra-option">
                <input
                  type="checkbox"
                  id={addOn.name}
                  onChange={() => handleAddOnChange(addOn)}
                />
                <label htmlFor={addOn.name}>
                  {addOn.name} (+${addOn.price.toFixed(2)})
                </label>
              </div>
            ))}

            {/* Extras Section */}
            <h4>Extras</h4>
            {selectedProduct.extras?.map((extra) => (
              <div key={extra.name} className="extra-option">
                <input
                  type="checkbox"
                  id={extra.name}
                  checked={selectedExtras.some(e => e.name === extra.name)}
                  onChange={() => handleExtraChange(extra)}
                />
                <label htmlFor={extra.name}>
                  {extra.name} (+${extra.price.toFixed(2)})
                </label>
              </div>
            ))}

            {/* Modifications Section */}
            <h4>Modifications</h4>
            {selectedProduct.modifications?.map((mod) => (
              <div key={mod.name} className="extra-option">
                <input
                  type="checkbox"
                  id={mod.name}
                  checked={selectedModifications.some(m => m.name === mod.name)}
                  onChange={() => handleModificationChange(mod)}
                />
                <label htmlFor={mod.name}>{mod.name}</label>
              </div>
            ))}

            {/* Special Instructions Section */}
            <h4>Special Instructions</h4>
            <button
              className="toggle-special-instruction"
              onClick={() => setShowSpecialInstruction(!showSpecialInstruction)}
            >
              {showSpecialInstruction ? "Hide Special Instructions" : "Add Special Instructions"}
              <FaRegArrowAltCircleRight size={24} className="nav-icon" />
            </button>
            {showSpecialInstruction && (
              <textarea
                placeholder="Add special instructions..."
                value={specialInstruction}
                onChange={(e) => setSpecialInstruction(e.target.value)}
                className="special-instruction"
              ></textarea>
            )}

            {/* Popup Buttons */}
            <div className="popup-buttons">
              <button className="confirm-btn" onClick={addToCart}>Confirm</button>
              <button className="cancel-btn" onClick={closePopup}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer-nav">
        <FaHome className="nav-icon" />
        <FaShoppingCart onClick={() => navigate("/CartPage")} size={24} className="nav-icon" />
        <FaHeart className="nav-icon" />
        <FaBell className="nav-icon" />
      </footer>
    </div>
  );
};

export default HomePage;