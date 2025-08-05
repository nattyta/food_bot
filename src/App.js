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
        if (!tg) throw new Error("Telegram WebApp not detected");
        tg.enableClosingConfirmation();
        if (!tg.initData) throw new Error("initData is missing from Telegram WebApp");

        const requiredParams = ["hash", "user", "auth_date"];
        requiredParams.forEach(param => {
            if (!tg.initData.includes(`${param}=`)) {
                throw new Error(`Missing required parameter: ${param}`);
            }
        });

        console.group("Telegram Authentication Debug");
        console.log("🌐 WebApp version:", tg.version);
        console.log("📦 Full initData:", tg.initData);
        console.log("👤 User info:", tg.initDataUnsafe?.user);
        console.log("🕒 Auth date:", tg.initDataUnsafe?.auth_date);
        console.groupEnd();

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
            } catch (e) {}
            throw new Error(`Backend error: ${errorDetail}`);
        }

        const data = await response.json();
        console.log("Authentication response:", data); // Log the response
        
        // STORE THE SESSION TOKEN
        if (data.session_token) {
            localStorage.setItem("auth_token", data.session_token);
            console.log("Stored auth token:", data.session_token);
        } else {
            console.warn("No session token in response");
        }

        return data.user;
        
    } catch (err) {
        console.error("🔒 Authentication failed:", err);
        if (process.env.NODE_ENV === "production") {
            tg?.showAlert?.(`Authentication failed: ${err.message || "Please reopen the app"}`);
        }
        throw err;
    } finally {
        tg?.disableClosingConfirmation?.();
    }
};

  // FIXED: Restore cart from localStorage on load
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem("cart");
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        
        // Validate cart structure before setting state
        if (Array.isArray(parsedCart)) {
          setCart(parsedCart);
          addDebugLog("🛒 Cart restored from localStorage");
        } else {
          console.warn("Stored cart is not an array. Resetting cart.");
          localStorage.removeItem("cart");
          addDebugLog("❌ Invalid cart format - resetting");
        }
      }
    } catch (e) {
      console.error("❌ Failed to parse stored cart:", e);
      localStorage.removeItem("cart");
      addDebugLog("❌ Corrupted cart data - resetting");
    }
  }, []);

  // FIXED: Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      // Only save if cart is valid
      if (Array.isArray(cart)) {
        localStorage.setItem("cart", JSON.stringify(cart));
        addDebugLog("💾 Cart saved to localStorage");
      } else {
        console.warn("Attempted to save invalid cart format");
        addDebugLog("⚠️ Invalid cart format - not saved");
      }
    } catch (e) {
      console.error("❌ Failed to save cart to localStorage:", e);
      addDebugLog("❌ Failed to save cart");
    }
  }, [cart]);

  // Telegram WebApp initialization
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