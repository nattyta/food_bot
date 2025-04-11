import React, { useState,useEffect } from "react";
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




const API_URL = "https://2c25-196-191-61-8.ngrok-free.app"; // Replace with your ngrok or backend URL

function App() {
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]);
  const [auth, setAuth] = useState(null); // Add auth state


  const addDebugLog = (message) => {
    setDebugLogs(prev => [...prev, message]);
    console.log(message);
  };

  useEffect(() => {
    // Initialize Telegram
    if (!window.Telegram || !window.Telegram.WebApp) {
      addDebugLog("❌ Not in Telegram environment");
      return;
    }

    const tg = window.Telegram.WebApp;
    tg.ready();
    addDebugLog("✅ Telegram WebApp initialized");

    // Initialize session
    const session = initTelegramSession();
    if (session) {
      setAuth(session);
      startBackendSession(session.auth)
        .then(res => addDebugLog(`🔑 Auth result: ${JSON.stringify(res)}`))
        .catch(err => addDebugLog(`❌ Auth failed: ${err.message}`));
    }

    // Your existing registration logic
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
      }).then(/* ... */);
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
          <Route path="/user-info" element={<UserInfoForm />} /> {/* New route for user info form */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
