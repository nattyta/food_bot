import React, { useState, useEffect } from "react";
import HomePage from "./pages/homePage";
import CartPage from "./pages/CartPage";
import Detail from "./pages/Detail";
import PaymentPage from "./pages/PaymentPage";
import OrderHistory from "./pages/OrderHistory";
import UserInfoForm from "./pages/UserInfoForm";
import DebugBanner from "./components/DebugBanner";
import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

const API_URL = "https://food-bot-vulm.onrender.com";

function App() {
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]);
  const [auth, setAuth] = useState(null);

  const addDebugLog = (message) => {
    setDebugLogs((prev) => [...prev, message]);
    console.log(message);
  };

  const authenticateUser = async () => {
    try {
      const tg = window.Telegram?.WebApp;
      if (!tg) {
        addDebugLog("❌ Telegram WebApp not available");
        throw new Error("Telegram environment missing");
      }
  
      // 🔍 FRONTEND DIAGNOSTICS
      const initData = tg.initData;
      const initDataUnsafe = tg.initDataUnsafe || {};
      
      // Critical checks
      addDebugLog(`🌐 WebApp version: ${tg.version}`);
      addDebugLog(`📦 initData length: ${initData.length}`);
      addDebugLog(`🔑 User ID: ${initDataUnsafe.user?.id || 'missing'}`);
      
      // 🔍 Check for encoding issues
      const containsPercent = initData.includes('%');
      const containsQuote = initData.includes('"');
      addDebugLog(`🔍 Contains %: ${containsPercent}`);
      addDebugLog(`🔍 Contains ": ${containsQuote}`);
      
      // 🔍 Sample critical segments
      addDebugLog(`🔍 Sample: ${initData.substring(0, 50)}`);
      addDebugLog(`🔍 Sample: ${initData.substring(initData.length - 50)}`);
      
      // 🧪 TEST: Send both encoded and raw versions
      const response = await fetch(`${API_URL}/auth/telegram`, {
        method: "POST",
        headers: {
          "x-telegram-init-data": initData,
          "x-debug-original": encodeURIComponent(initData)
        },
      });
  
      // ... rest of handling ...
    } catch (err) {
      // 🔍 Capture stack trace
      addDebugLog(`💥 ERROR: ${err.message} ${err.stack || ''}`);
      throw err;
    }
  };
  
  // Usage in useEffect
  useEffect(() => {
    if (!window.Telegram?.WebApp) return;
    
    const tg = window.Telegram.WebApp;
    tg.ready();
    addDebugLog("✅ Telegram WebApp initialized");
  
    // Add expanded debug info
    addDebugLog(`📦 Full initData: ${tg.initData}`);
    addDebugLog(`👤 Full user info: ${JSON.stringify(tg.initDataUnsafe?.user || {})}`);
    
    authenticateUser()
      .then(user => {
        setAuth({
          auth: tg.initData,
          user: user || tg.initDataUnsafe?.user
        });
      })
      .catch(err => {
        addDebugLog(`🔒 Auth error: ${err.message}`);
      });
  }, []);

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

    addDebugLog(`📦 initData: ${initData}`);
    addDebugLog(`👤 User info: ${JSON.stringify(initDataUnsafe.user)}`);

    setAuth({
      auth: initData,
      user: initDataUnsafe.user,
    });

    authenticateUser()
      .then((user) => {
        addDebugLog(`✅ Auth success: ${user.first_name} (${user.id})`);
      })
      .catch((err) => {
        addDebugLog(`❌ Auth failed: ${err.message}`);
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
