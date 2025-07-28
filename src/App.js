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
  

  const addDebugLog = (message) => {
    setDebugLogs(prev => [...prev, message]);
    console.log(message);
  };


  

  
  return (
    <div className="App">
      <Routes>
      <Route path="/" element={<HomePage cart={cart} setCart={setCart} />} />
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
