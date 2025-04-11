import React, { useState,useEffect } from "react";
import HomePage from "./pages/homePage";
import CartPage from "./pages/CartPage";
import Detail from "./pages/Detail";
import PaymentPage from "./pages/PaymentPage";
import OrderHistory from "./pages/OrderHistory";
import UserInfoForm from './pages/UserInfoForm'; 
import DebugBanner from './components/DebugBanner'; 
import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";




const API_URL = " https://2c25-196-191-61-8.ngrok-free.app"; // Replace with your ngrok or backend URL

function App() {
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]);


  const addDebugLog = (message) => {
    setDebugLogs(prev => [...prev, message]);
    console.log(message);
  };

  useEffect(() => {
    if (!window.Telegram || !window.Telegram.WebApp) {
      console.error("Telegram WebApp is not available");
      return;
    }
  
    const tg = window.Telegram.WebApp;
    tg.ready();
    addDebugLog("✅ Telegram WebApp initialized");

    const user = tg.initDataUnsafe?.user;
    if (user) {
      addDebugLog(`👤 User detected: ${user.first_name} (ID: ${user.id})`);

      fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: user.id,
          username: user.username || "",
          first_name: user.first_name || "",
          last_name: user.last_name || ""
        }),
      })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        addDebugLog("📝 Registration response: " + JSON.stringify(data));
      })
      .catch(err => {
        addDebugLog("❌ Registration error: " + err.message);
      });
    } else {
      addDebugLog("❌ No user data in initDataUnsafe");
    }
  }, []);

  
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage cart={cart} setCart={setCart} />} />
          <Route path="/detail" element={<Detail cart={cart} setCart={setCart} />} />
          <Route path="/order-history" element={<OrderHistory />} />
          <Route path="/CartPage" element={<CartPage cart={cart} setCart={setCart} />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/user-info" element={<UserInfoForm />} /> {/* New route for user info form */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
