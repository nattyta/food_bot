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
    const tg = window.Telegram?.WebApp;
    
    try {
      // 1. Verify we're in Telegram environment
      if (!tg) {
        throw new Error("Telegram WebApp not detected");
      }
      
      // 2. Prevent WebApp from closing during auth process
      tg.enableClosingConfirmation();
      
      // 3. Critical parameter checks
      if (!tg.initData) {
        throw new Error("initData is missing from Telegram WebApp");
      }
      
      const requiredParams = ["hash", "user", "auth_date"];
      requiredParams.forEach(param => {
        if (!tg.initData.includes(`${param}=`)) {
          throw new Error(`Missing required parameter: ${param}`);
        }
      });
      
      // 4. Log critical information for debugging
      console.group("Telegram Authentication Debug");
      console.log("🌐 WebApp version:", tg.version);
      console.log("📦 Full initData:", tg.initData);
      console.log("👤 User info:", tg.initDataUnsafe?.user);
      console.log("🕒 Auth date:", tg.initDataUnsafe?.auth_date);
      console.groupEnd();
      
      // 5. Send to backend for validation
      const response = await fetch(`${API_URL}/auth/telegram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": tg.initData
        }
      });
  
      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
        } catch (e) {
          // Couldn't parse JSON error
        }
        throw new Error(`Backend error: ${errorDetail}`);
      }
  
      const data = await response.json();
      
      // 6. Store session token if available
      if (data.session_token) {
        localStorage.setItem("auth_token", data.session_token);
      }
      
      // 7. Return user data
      return data.user;
      
    } catch (err) {
      // Log detailed error
      console.error("🔒 Authentication failed:", err);
      
      // Show user-friendly alert in production
      if (process.env.NODE_ENV === "production") {
        tg?.showAlert?.(`Authentication failed: ${err.message || "Please reopen the app"}`);
      }
      
      throw err;
    } finally {
      // 8. Always disable closing confirmation
      tg?.disableClosingConfirmation?.();
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