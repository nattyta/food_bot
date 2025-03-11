import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import RestaurantPage from "./pages/RestaurantPage"; 
import HomePage from "./pages/HomePage";
import CartPage from "./pages/CartPage";
import Detail from "./pages/Detail";
import PaymentPage from "./pages/PaymentPage";
import OrderHistory from "./pages/OrderHistory";
import MenuPage from "./pages/MenuPage";  // Import MenuPage
import "./App.css";

function App() {
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Default Page - Restaurant Selection */}
          <Route path="/" element={<RestaurantPage />} />  

          {/* Menu Page (After Selecting a Restaurant) */}
          <Route path="/menu/:restaurantId" element={<MenuPage cart={cart} setCart={setCart} />} />

          {/* Home Page (Should Only Be Accessible After Choosing a Restaurant) */}
          <Route path="/home" element={<HomePage cart={cart} setCart={setCart} />} />

          {/* Other Pages */}
          <Route path="/detail" element={<Detail cart={cart} setCart={setCart} />} />
          <Route path="/order-history" element={<OrderHistory />} />
          <Route path="/cart" element={<CartPage cart={cart} setCart={setCart} />} />
          <Route path="/payment" element={<PaymentPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
