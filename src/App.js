import React, { useState, useEffect } from "react";
import HomePage from "./pages/homePage";
import CartPage from "./pages/CartPage";
import Detail from "./pages/Detail";
import PaymentPage from "./pages/PaymentPage";
import OrderHistory from "./pages/OrderHistory";
import UserInfoForm from './pages/UserInfoForm';
import DebugBanner from './components/DebugBanner';
import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

const API_URL = "https://food-bot-vulm.onrender.com";

function App() {
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]);
  const [auth, setAuth] = useState(null);

  const addDebugLog = (message) => {
    setDebugLogs(prev => [...prev, message]);
    console.log(message);
  };

  useEffect(() => {
    if (!window.Telegram || !window.Telegram.WebApp) {
      addDebugLog("❌ Not in Telegram environment");
      return;
    }
  
    const tg = window.Telegram.WebApp;
    tg.ready();
    addDebugLog("✅ Telegram WebApp initialized");
  
    const initData = tg.initData;
    const initDataUnsafe = tg.initDataUnsafe;
  
    if (!initData || !initDataUnsafe?.user) {
      addDebugLog("❌ Missing initData or user info");
      return;
    }
  
    const user = initDataUnsafe.user;
  
    setAuth({
      auth: initData,
      user: user
    });
  
    // ✅ Validate initData with backend
    fetch(`${API_URL}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    })
      .then(res => {
        if (!res.ok) throw new Error("Backend rejected initData");
        return res.json();
      })
      .then(data => {
        addDebugLog(`🔐 Verified initData for user_id: ${user.id}`);
      })
      .catch(err => {
        addDebugLog(`❌ Auth failed: ${err.message}`);
      });
  
    // 📥 Register user if new (optional)
    fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: user.id,
        username: user.username || "",
        first_name: user.first_name || ""
      }),
    });
  }, []);
  

  return (
    <Router>
      <div className="App">
        {/* <DebugBanner logs={debugLogs} /> */}
        <Routes>
          <Route path="/" element={<HomePage cart={cart} setCart={setCart} user={auth?.user} />} />
          <Route path="/detail" element={<Detail cart={cart} setCart={setCart} />} />
          <Route path="/order-history" element={<OrderHistory />} />
          <Route path="/CartPage" element={<CartPage cart={cart} setCart={setCart} />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/user-info" element={<UserInfoForm />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
