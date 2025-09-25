// src/pages/HistoryPage.js
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './historyPage.css';


const HistoryPage = ({ telegramInitData, userPhone  }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        // This is the same API_URL pattern you will use elsewhere
        const API_URL = process.env.REACT_APP_API_URL || 'https://food-bot-vulm.onrender.com';
        
        const response = await fetch(`${API_URL}/api/v1/orders/me`, {
          headers: {
            // We send the initData to prove who the user is
            'x-telegram-init-data': telegramInitData,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch order history');
        }

        const data = await response.json();
        setOrders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (telegramInitData) {
      fetchOrders();
    } else {
      // Handle case where telegram data is not available
      setError("Authentication data not found. Please open this app through Telegram.");
      setLoading(false);
    }
  }, [telegramInitData]);

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'preparing': return 'status-preparing';
      case 'pending': return 'status-pending';
      default: return '';
    }
  };

  return (
    <div className="history-page">
      <header className="history-header">
        <FaArrowLeft className="back-icon" onClick={() => navigate('/')} />
        <h1>Order History</h1>
        <div style={{ width: '20px' }} />
      </header>
   
      <main className="history-content">
        {/* ... (your loading and error states) ... */}
   
        {orders.map((order) => (
          <div key={order.order_id} className="order-card">
            <div className="order-card-header">
              <div>
                <h3>Order #{order.order_id}</h3>
                <p>{new Date(order.order_date).toLocaleString()}</p>
              </div>
              <div className={`order-status ${getStatusClass(order.status)}`}>
                {order.status}
              </div>
            </div>
            <div className="order-card-body">
              <div className="order-items">
                <h4>Items</h4>
                <ul>
                  {/* Assuming items is a JSON string, parse it */}
                  {(typeof order.items === 'string' ? JSON.parse(order.items) : order.items).map((item, index) => (
                    <li key={index}>{item.quantity}x {item.name}</li>
                  ))}
                </ul>
                <div className="order-total">
                  Total: ${order.total_price.toFixed(2)}
                </div>
              </div>
   
              {/* --- CONDITIONAL QR CODE DISPLAY --- */}
              {order.payment_status === 'paid' ? (
                <div className="qr-code-container">
                  <QRCodeSVG
                   value={String(order.order_id)}
                   size={128}
                   bgColor="#ffffff"
                   fgColor="#000000"
                   level="L" 
                  />
                  <p>Delivery Confirmation</p>
                </div>
              ) : (
                <div className="payment-pending-container">
                  <p className="payment-pending-text">Payment Pending</p>
                  <button 
                    className="retry-payment-btn"
                    onClick={() => navigate('/payment', { 
                      state: { 
                        orderId: order.order_id,
                        totalPrice: order.total_price,
                        phone: userPhone
                      }
                    })}
                  >
                    Retry Payment
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
   );
};

export default HistoryPage;