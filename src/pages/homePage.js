import React, { useState, useEffect } from "react";
import { FaHome } from "react-icons/fa";
import { FaShoppingCart } from "react-icons/fa";
import { FaHeart } from "react-icons/fa";
import { FaBell } from "react-icons/fa";
import { FaSearch } from "react-icons/fa";
import { FaRegArrowAltCircleRight} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./homePage.css";

// At the top of your component, replace both with:
const API_BASE = process.env.REACT_APP_API_URL || "https://food-bot-vulm.onrender.com";
const TELEGRAM_TOKEN = process.env.REACT_APP_TELEGRAM_TOKEN;



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
  const [loading, setLoading] = useState(false);
  

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
    const initialize = async () => {
      try {
        const tg = window.Telegram?.WebApp;
        if (!tg?.initData) {
          console.warn("❌ Not running inside Telegram");
          return;
        }
  
        const initData = tg.initData;
  
        // ✅ Validate hash (optional, but adds security)
        const isHashValid = validateTelegramHash(initData, TELEGRAM_TOKEN);
        if (!isHashValid) {
          throw new Error("Invalid Telegram hash");
        }
  
        // 🔑 Authenticate with your backend
        const authResponse = await fetch(`${API_BASE}/auth/telegram`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Telegram-Init-Data": initData,
          },
        });
  
        if (!authResponse.ok) {
          const error = await authResponse.json();
          throw new Error(error.detail || "Authentication failed");
        }
  
        const auth = await authResponse.json();
        localStorage.setItem("auth_token", auth.token);
  
        // 🧠 Start session
        const sessionResponse = await fetch(`${API_BASE}/api/start-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Telegram-Init-Data": initData,
            "Authorization": `Bearer ${auth.token}`,
          },
        });
  
        if (!sessionResponse.ok) {
          throw new Error("Failed to start session");
        }
  
        const sessionData = await sessionResponse.json();
        console.log("✅ Session started:", sessionData);
      } catch (error) {
        console.error("⚠️ Auth/session error:", error.message);
        window.Telegram?.WebApp?.showAlert?.(`Auth failed: ${error.message}`);
      }
    };
  
    initialize();
  }, []);
  
  
  function validateTelegramHash(initData, botToken) {
    if (!window.crypto || !botToken) return false;
  
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    params.delete("hash");
  
    const dataCheckString = [...params.entries()]
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join("\n");
  
    const secret = new TextEncoder().encode(botToken);
    const algo = { name: "HMAC", hash: "SHA-256" };
  
    return window.crypto.subtle.importKey("raw", secret, algo, false, ["sign"])
      .then((key) =>
        window.crypto.subtle.sign(algo.name, key, new TextEncoder().encode(dataCheckString))
      )
      .then((signature) => {
        const hashArray = Array.from(new Uint8Array(signature));
        const hexHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        return hash === hexHash;
      })
      .catch(() => false);
  }
  

  

  
  
  
  
  
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
  <FaSearch className="search-icon" size={18} />
</div>
      <div className="category-container">
        {categories.map((category) => (
          <button key={category} className={`category-button ${activeCategory === category ? "active" : ""}`} onClick={() => setActiveCategory(category)}>{category}</button>
        ))}
      </div>
      <div className="product-grid">
  {products.filter(p => activeCategory === "All" || p.category === activeCategory).map((product) => (
    <div 
      key={product.id} 
      className="product-card" 
      onClick={() => {
        if (!product) return;
        navigate("/Detail", { 
          state: { 
            product: {
              ...product,
              addOns: product.addOns || [],
              extras: product.extras || [],
              modifications: product.modifications || [],
              // Ensure all required fields have fallbacks
              id: product.id || Date.now(),
              name: product.name || 'Unnamed Product',
              description: product.description || '',
              price: product.price || 0,
              image: product.image || 'default-food.jpg',
              category: product.category || 'Uncategorized'
            }
          } 
        });
      }}
    >
      <img 
        src={product.image || 'default-food.jpg'} 
        alt={product.name || 'Food item'} 
        className="product-image" 
        onError={(e) => {
          e.target.src = 'default-food.jpg';
        }}
      />
      <h3>{product.name || 'Unnamed Product'}</h3>
      <p>{product.description || ''}</p>
      <div className="product-footer">
        <span>${(product.price || 0).toFixed(2)}</span>
        <button 
          className="add-to-cart" 
          onClick={(e) => { 
            e.stopPropagation(); 
            openPopup({
              ...product,
              addOns: product.addOns || [],
              extras: product.extras || [],
              modifications: product.modifications || []
            }); 
          }}
        >
          +
        </button>
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
  <FaHome className="nav-icon" size={24} />
  <FaShoppingCart 
    className="nav-icon" 
    size={24}
    onClick={() => navigate("/CartPage")} 
  />
  <FaHeart className="nav-icon" size={24} />
  <FaBell className="nav-icon" size={24} />
</footer>
    </div>
  );
};

export default HomePage;
