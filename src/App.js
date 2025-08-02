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
    let tg; // Define tg here so it's accessible in catch block
    
    try {
      tg = window.Telegram?.WebApp;
      
      // 1. Verify WebApp environment
      if (!tg) {
        throw new Error("Telegram WebApp not detected");
      }
      
      // 2. Critical parameter check
      const requiredParams = ["hash", "user", "auth_date"];
      requiredParams.forEach(param => {
        if (!tg.initData.includes(`${param}=`)) {
          throw new Error(`Missing required parameter: ${param}`);
        }
      });
      
      // 3. Validate initData format
      if (!tg.initData.match(/hash=[a-f0-9]{64}/)) {
        throw new Error("Invalid hash format in initData");
      }
      
      // 4. Send to backend for authentication
      const response = await fetch(`${API_URL}/auth/telegram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": tg.initData
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Backend error: ${errorData.detail || response.status}`);
      }

      const data = await response.json();
      addDebugLog(`✅ Auth success! User: ${data.user?.first_name || 'unknown'}`);
      return data.user;
      
    } catch (err) {
      // Handle error - tg is now accessible
      const errorMessage = `🔒 Auth error: ${err.message}`;
      
      if (process.env.NODE_ENV === "production") {
        // Safely use optional chaining
        tg?.showAlert?.(`Authentication failed. Please reopen from Telegram.`);
        tg?.close?.();
      } else {
        console.error(err);
      }
      
      addDebugLog(errorMessage);
      throw err;
    }
  };
  
  // Single useEffect to handle Telegram initialization
  useEffect(() => {
    if (!window.Telegram?.WebApp) {
      addDebugLog("⚠️ Not in Telegram environment - running in browser mode");
      return;
    }

    const tg = window.Telegram.WebApp;
    tg.ready();
    addDebugLog("✅ Telegram WebApp initialized");
    addDebugLog(`📦 Full initData: ${tg.initData}`);
    addDebugLog(`👤 Raw user info: ${JSON.stringify(tg.initDataUnsafe?.user || {})}`);

    authenticateUser()
      .then(user => {
        setAuth({
          auth: tg.initData,
          user: user || tg.initDataUnsafe?.user
        });
      })
      .catch(err => {
        addDebugLog(`🔒 Final auth failure: ${err.message}`);
        // Show user-friendly alert
        tg.showPopup({
          title: "Authentication Error",
          message: "Failed to verify your session. Please reopen the app.",
          buttons: [{ type: "ok" }]
        });
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