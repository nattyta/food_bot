import React, { useState, useEffect } from "react";
import { FaHome, FaShoppingCart, FaHeart, FaBell, FaSearch, FaRegFrownOpen, FaRegArrowAltCircleLeft, FaRegArrowAltCircleRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./homePage.css";

// At the top of your component, replace both with:
const API_BASE = process.env.REACT_APP_API_URL || "https://food-bot-vulm.onrender.com";



const HomePage = ({ cart, setCart }) => {
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

  

  useEffect(() => {
    const fetchedCategories = ["All", "Popular", "Pizza", "Burger", "Pasta", "Drinks", "Desserts"];
    setCategories(fetchedCategories);

    const sampleProducts = [
      { id: 1, name: "Cheese Pizza", description: "With Extra Cheese", price: 9.99, image: "pizza.jpg", category: "Pizza", addOns: [{ name: "Extra Cheese", price: 1.5 }, { name: "Mushrooms", price: 2.0 }], extras: [{ name: "Fries", price: 2.5 }, { name: "Drink", price: 1.5 }], modifications: [{ name: "No Onions" }, { name: "Less Salt" }] },
      { id: 2, name: "Veggie Burger", description: "With Fresh Vegetables", price: 7.99, image: "burger.jpg", category: "Burger", addOns: [{ name: "Avocado", price: 1.2 }, { name: "Cheese Slice", price: 0.8 }], extras: [{ name: "Fries", price: 2.5 }, { name: "Drink", price: 1.5 }], modifications: [{ name: "No Tomato" }, { name: "No Mayo" }] }
    ];
    setProducts(sampleProducts);
  }, []);

  const openPopup = (product) => {
    setSelectedProduct(product);
    setSelectedExtras([]);
    setSpecialInstruction("");
  };

  const closePopup = () => {
    setSelectedProduct(null);
    setSelectedExtras([]);
    setSpecialInstruction("");
  
  };


  const handleAddOnChange = (addOn) => {
    setSelectedAddOns((prev) =>
      prev.some((a) => a.name === addOn.name)
        ? prev.filter((a) => a.name !== addOn.name)
        : [...prev, { ...addOn, quantity: 1 }]
    );
  };
  

  const handleExtraChange = (extra) => {
    setSelectedExtras((prev) => {
      const isSelected = prev.some((e) => e.name === extra.name);
      if (isSelected) {
        return prev.filter((e) => e.name !== extra.name);
      } else {
        console.log("Extra being added:", extra);  // 🔍 Check if price exists
        return [...prev, { ...extra, price: Number(extra.price) || 0 }]; 
      }
    });
  };
  

  useEffect(() => {
    const initializeApp = async () => {
      const tg = window.Telegram?.WebApp;
      if (!tg) {
        console.warn("Telegram WebApp not available");
        return;
      }
  
      tg.ready();
      tg.expand();
  
      if (!tg.initData) {
        console.warn("No initData - not in Telegram WebApp");
        return;
      }
  
      try {
        if (!localStorage.getItem("auth_token")) {
          await authenticateWithTelegram();
        }
      } catch (error) {
        console.error("Initialization error:", error);
      }
    };
  
    initializeApp();
  }, []);
  


const authenticateWithTelegram = async () => {
  try {
    const tg = window.Telegram?.WebApp;
    if (!tg?.initData) {
      throw new Error("Telegram WebApp not available");
    }

    const response = await fetch(`${API_BASE}/auth/telegram`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": tg.initData
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Authentication failed");
    }

    const data = await response.json();
    localStorage.setItem("auth_token", data.token);
    return data;
  } catch (error) {
    console.error("❌ Auth failed:", error);
    window.Telegram?.WebApp?.showAlert?.(`Error: ${error.message}`);
    throw error;
  }
};
  
  
const startSession = async () => {
  try {
    const tg = window.Telegram?.WebApp;
    if (!tg?.initData) {
      throw new Error("Telegram WebApp not initialized");
    }

    const response = await fetch(`${API_BASE}/api/start-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": tg.initData
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Session start failed");
    }

    const data = await response.json();
    
    // Store the token if provided
    if (data.token) {
      localStorage.setItem("auth_token", data.token);
    }
    
    // Handle session data (customize based on your API response)
    console.log("Session started:", data);
    return data;
    
  } catch (error) {
    console.error("Session error:", error);
    
    // Show alert in Telegram WebApp if available
    window.Telegram?.WebApp?.showAlert?.(`Session error: ${error.message}`);
    
    // Re-throw for further handling if needed
    throw error;
  }
};
  
  
  
  
  
  const handleModificationChange = (mod) => {
    setSelectedModifications((prev) => {
      const isSelected = prev.some((m) => m.name === mod.name);
      if (isSelected) {
        return prev.filter((m) => m.name !== mod.name);
      } else {
        return [...prev, mod]; // ✅ Store full object
      }
    });
  };
  
  
  const addToCart = () => {
    if (!selectedProduct) return;
  
    console.log("Selected Extras Before Adding:", selectedExtras);  // 🔍 Debugging log
  
    const newItem = {
      id: `${selectedProduct.id}-${Date.now()}`,
      name: selectedProduct.name,
      price: Number(selectedProduct.price) || 0,  
      quantity: 1,
      addOns: selectedAddOns.map(a => ({ ...a, price: Number(a.price) || 0 })),  
      extras: selectedExtras.map(e => ({ 
        ...e, 
        price: Number(e.price) || 0 // 🔥 Converting price to number
      })),  
      modifications: selectedModifications || [],
      specialInstruction: specialInstruction?.trim() || null,
    };
  
    console.log("New Item Being Added to Cart:", newItem); // 🔍 Debugging log
  
    setCart((prevCart) => [...prevCart, newItem]); 
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
