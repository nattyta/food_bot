import React, { useState, useEffect } from "react";
import HomePage from "./pages/homePage";
import CartPage from "./pages/CartPage";
import Detail from "./pages/Detail";
import PaymentPage from "./pages/PaymentPage";
import OrderHistory from "./pages/OrderHistory";
import UserInfoForm from './pages/UserInfoForm';
import DebugBanner from './components/DebugBanner';
import { initTelegramSession, startBackendSession } from './auth';
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
    // 1. Check if we're inside Telegram
    if (!window.Telegram || !window.Telegram.WebApp) {
      addDebugLog("❌ Not in Telegram environment");
      return;
    }

    const tg = window.Telegram.WebApp;
    tg.ready();
    addDebugLog("✅ Telegram WebApp initialized");

    // 2. Grab Telegram init data
    const session = initTelegramSession();
    if (session) {
      setAuth(session);
      
      startBackendSession(session.auth)
        .then(res => {
          addDebugLog(`🔑 Auth result: ${JSON.stringify(res)}`);
        })
        .catch(err => {
          addDebugLog(`❌ Auth failed: ${err.message}`);
        });
    }

    // 3. Register user to backend (optional)
    const user = tg.initDataUnsafe?.user;
    if (user) {
      addDebugLog(`👤 User detected: ${user.first_name}`);
      fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: user.id,
          username: user.username || "",
          first_name: user.first_name || ""
        }),
      });
    }
  }, []);

  return (
    <Router>
      <div className="App">
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
