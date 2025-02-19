import React, { useState, useEffect } from "react";
import { FaHome, FaShoppingCart, FaHeart, FaBell, FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./homePage.css";

const HomePage = ({ cart, setCart }) => {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchedCategories = ["All", "Popular", "Pizza", "Burger", "Pasta", "Drinks", "Desserts"];
    setCategories(fetchedCategories);

    const sampleProducts = [
      { id: 1, name: "Cheese Pizza", description: "With Extra Cheese", price: 9.99, image: "pizza.jpg", category: "Pizza", extras: [{ name: "Extra Cheese", price: 1.5 }, { name: "Mushrooms", price: 2.0 }] },
      { id: 2, name: "Veggie Burger", description: "With Fresh Vegetables", price: 7.99, image: "burger.jpg", category: "Burger", extras: [{ name: "Avocado", price: 1.2 }, { name: "Cheese Slice", price: 0.8 }] },
    ];
    setProducts(sampleProducts);
  }, []);

  const filteredProducts = activeCategory === "All" ? products : products.filter((product) => product.category === activeCategory);

  const openPopup = (product) => {
    setSelectedProduct(product);
    setSelectedExtras([]);
  };

  const closePopup = () => {
    setSelectedProduct(null);
    setSelectedExtras([]);
  };

  const handleExtraChange = (extra) => {
    setSelectedExtras((prevExtras) => {
      if (prevExtras.includes(extra)) {
        return prevExtras.filter((e) => e !== extra);
      } else {
        return [...prevExtras, extra];
      }
    });
  };

  const addToCart = (e) => {
    e.stopPropagation();
    if (!selectedProduct) return;

    const totalExtraPrice = selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
    const totalPrice = selectedProduct.price + totalExtraPrice;

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === selectedProduct.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === selectedProduct.id ? { ...item, quantity: item.quantity + 1, totalPrice: item.totalPrice + totalExtraPrice, selectedExtras: [...item.selectedExtras, ...selectedExtras] } : item
        );
      }
      return [...prevCart, { ...selectedProduct, quantity: 1, totalPrice, selectedExtras }];
    });

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
        <div className="category-scroll">
          {categories.map((category) => (
            <button
              key={category}
              className={`category-button ${activeCategory === category ? "active" : ""}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="product-grid">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="product-card"
            onClick={() => navigate(`/detail`, { state: { product } })}
          >
            <img src={product.image} alt={product.name} className="product-image" />
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <div className="product-footer">
              <span>${product.price.toFixed(2)}</span>
              <button className="add-to-cart" onClick={(e) => { e.stopPropagation(); openPopup(product); }}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedProduct && (
        <div className="popup-overlay">
          <div className="popup">
            <h2>{selectedProduct.name}</h2>
            <p>{selectedProduct.description}</p>
            <h3>Extras:</h3>
            {selectedProduct.extras.map((extra) => (
              <div key={extra.name}>
                <input
                  type="checkbox"
                  id={extra.name}
                  checked={selectedExtras.includes(extra)}
                  onChange={() => handleExtraChange(extra)}
                />
                <label htmlFor={extra.name}>{extra.name} (+${extra.price.toFixed(2)})</label>
              </div>
            ))}
            <button onClick={addToCart}>Add to Cart</button>
            <button onClick={closePopup}>Cancel</button>
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
