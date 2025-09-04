// src/pages/HistoryPage.js
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './historyPage.css';


const HistoryPage = ({ telegramInitData }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        // This is the same API_URL pattern you will use elsewhere
        const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:10000';
        
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
        <FaArrowLeft className="back-icon" onClick={() => navigate(-1)} />
        <h1>Order History</h1>
        <div /> {/* Placeholder for alignment */}
      </header>

      <main className="history-content">
        {loading && <p>Loading your history...</p>}
        {error && <p className="error-message">{error}</p>}
        
        {!loading && !error && orders.length === 0 && (
          <p>You have no past orders.</p>
        )}

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
                  {order.items.map((item, index) => (
                    <li key={index}>
                      {item.quantity}x {item.name}
                    </li>
                  ))}
                </ul>
                <div className="order-total">
                  Total: ${order.total_price.toFixed(2)}
                </div>
              </div>
              <div className="qr-code-container">
              <QRCodeSVG
               value={String(order.order_id)}
               bgColor="#1e1e1e"
               fgColor="#ffffff"
               level="H" 
              />
                <p>Show this to delivery person</p>
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default HistoryPage;