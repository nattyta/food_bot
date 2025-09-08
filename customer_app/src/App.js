import React, { useState, useEffect } from "react";
import HomePage from "./pages/homePage";
import CartPage from "./pages/CartPage";
import Detail from "./pages/Detail";
import PaymentPage from "./pages/PaymentPage";
import OrderHistory from "./pages/OrderHistory";
import DebugBanner from "./components/DebugBanner";
import PhoneCaptureModal from './components/PhoneCaptureModal';
import HistoryPage from './pages/HistoryPage';
import PaymentStatusPage from './pages/PaymentStatusPage';
import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_BASE || "http://localhost:10000";

function App() {
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]);
  const [auth, setAuth] = useState(null);
  const [telegramInitData, setTelegramInitData] = useState(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [userPhone, setUserPhone] = useState('');

  const addDebugLog = (message) => {
    setDebugLogs((prev) => [...prev, message]);
    console.log(message);
  };

  // Check if we're in Telegram WebApp
  const isTelegramWebApp = () => {
    try {
      return (
        typeof window !== 'undefined' &&
        window?.Telegram?.WebApp?.initDataUnsafe?.user?.id !== undefined
      );
    } catch (e) {
      return false;
    }
  };

  const authenticateUser = async (initData) => {
    const tg = window.Telegram?.WebApp;
    try {
      if (!tg) throw new Error("Telegram WebApp not detected");
      tg.enableClosingConfirmation();
      
      const requiredParams = ["hash", "user", "auth_date"];
      requiredParams.forEach(param => {
        if (!initData.includes(`${param}=`)) {
          throw new Error(`Missing required parameter: ${param}`);
        }
      });

      console.group("Telegram Authentication Debug");
      console.log("🌐 WebApp version:", tg.version);
      console.log("📦 Full initData:", initData);
      console.log("👤 User info:", tg.initDataUnsafe?.user);
      console.log("🕒 Auth date:", tg.initDataUnsafe?.auth_date);
      console.groupEnd();

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/telegram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": initData
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
      console.log("Authentication response:", data);
      
      if (data.session_token) {
        localStorage.setItem("auth_token", data.session_token);
        console.log("Stored auth token in localStorage:", data.session_token);
      } else {
        console.warn("No session token in authentication response");
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

  const checkPhone = async () => {
    try {
      if (!isTelegramWebApp()) return;
      
      // Get auth token
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) return;
      
      // Create headers with both auth token and Telegram initData
      const headers = {
        'Authorization': `Bearer ${authToken}`
      };
      
      // Always add Telegram initData if available
      if (telegramInitData) {
        headers['x-telegram-init-data'] = telegramInitData;
      } else {
        // Try to get initData directly from Telegram if not in state
        const tg = window.Telegram?.WebApp;
        if (tg && tg.initData) {
          headers['x-telegram-init-data'] = tg.initData;
        }
      }
  
      const response = await fetch(`${API_BASE_URL}/api/v1/me`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        if (!data.phone) {
          setShowPhoneModal(true);
        } else {
          setUserPhone(data.phone);
        }
      } else {
        setShowPhoneModal(true);
      }
    } catch (error) {
      console.error('Failed to check phone:', error);
      setShowPhoneModal(true);
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
    
    // PRESERVE THE INITDATA IMMEDIATELY - BEFORE USING IT
    const initData = tg.initData;
    setTelegramInitData(initData);

   
    localStorage.setItem('telegram_init_data', initData);
    
    addDebugLog("✅ Telegram WebApp initialized");
    addDebugLog(`📦 Full initData: ${initData}`);
    addDebugLog(`👤 Raw user info: ${JSON.stringify(tg.initDataUnsafe?.user || {})}`);

    authenticateUser(initData)
      .then(user => {
        setAuth({
          auth: initData,
          user: user || tg.initDataUnsafe?.user
        });
        // Check if we need to show phone modal after auth
        checkPhone();
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

  {showPhoneModal && (
    <PhoneCaptureModal 
      onSave={(phone) => {
        setUserPhone(phone);
        setShowPhoneModal(false);
      }}
      telegramInitData={telegramInitData}
      appName="FoodBot"
    />
  )}

  return (
    <Router>
      <div className="App">
        {/* Phone capture modal - appears only for first-time Telegram users */}
        {showPhoneModal && (
          <PhoneCaptureModal 
            onClose={() => setShowPhoneModal(false)}
            onSave={(phone) => {
              setUserPhone(phone);
              setShowPhoneModal(false);
            }}
            telegramInitData={telegramInitData}
            appName="FoodBot"
          />
        )}
        
        {/* <DebugBanner logs={debugLogs} /> */}
        <Routes>
          <Route path="/" element={<HomePage cart={cart} setCart={setCart} user={auth?.user}  telegramInitData={telegramInitData} />} />
          <Route path="/detail" element={<Detail cart={cart} setCart={setCart} />} />
          <Route path="/order-history" element={<OrderHistory />} />
          <Route path="/CartPage" element={
            <CartPage 
              cart={cart} 
              setCart={setCart} 
              telegramInitData={telegramInitData}
              userPhone={userPhone}
            />
          } />
          // App.js
            <Route path="/CartPage" element={
              <CartPage 
               cart={cart} 
               setCart={setCart} 
               telegramInitData={telegramInitData}
               userPhone={userPhone}  // Pass userPhone here
                />
            } />
          <Route path="/payment" element={<PaymentPage />} />

          <Route path="/payment-success" element={<PaymentStatusPage />} />

        </Routes>

       
      </div>
    </Router>
  );
}

export default App;