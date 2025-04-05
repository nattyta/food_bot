import React, { useState,useEffect } from "react";
import HomePage from "./pages/homePage";
import CartPage from "./pages/CartPage";
import Detail from "./pages/Detail";
import PaymentPage from "./pages/PaymentPage";
import OrderHistory from "./pages/OrderHistory";
import UserInfoForm from './components/UserInfoForm'; // Ensure this path is correct
import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";




const API_URL = "https://daec-196-188-253-234.ngrok-free.app"; // Replace with your ngrok or backend URL

function App() {
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);


  useEffect(() => {
    if (!window.Telegram || !window.Telegram.WebApp) {
      console.error("Telegram WebApp is not available");
      return;
    }
  
    const tg = window.Telegram.WebApp;
    tg.ready(); // Let Telegram know we're good to go
  
    const user = tg.initDataUnsafe?.user;
  
    if (user) {
      const payload = {
        chat_id: user.id,
        username: user.username || "",
        first_name: user.first_name || "",
        last_name: user.last_name || ""
      };
  
      fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error("Registration failed");
          }
          return res.json();
        })
        .then((data) => {
          console.log("User registration success or already exists:", data);
        })
        .catch((err) => {
          console.error("User registration error:", err);
        });
    } else {
      console.error("Telegram user not found in initDataUnsafe.");
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
