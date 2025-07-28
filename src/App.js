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
import { Route, Routes } from "react-router-dom";




const API_URL = "https://food-bot-vulm.onrender.com"; 

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
    if (!window.Telegram?.WebApp) {
      console.warn("❌ Not in Telegram environment");
      return;
    }
  
    const tg = window.Telegram.WebApp;
    tg.ready();
  
    const session = initTelegramSession();
    if (!session) return;
  
    // optional: only log the user
    console.log("👤 Telegram user:", session.user?.first_name);
  }, []);
  

  
  return (
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
  );
  
}

export default App;
