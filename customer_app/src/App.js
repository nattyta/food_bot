// src/pages/HistoryPage.js
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './historyPage.css'; // We will create this CSS file next

const HistoryPage = ({ telegramInitData }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const API_URL = "https://food-bot-vulm.onrender.com";
        
        const response = await fetch(`${API_URL}/api/v1/orders/me`, {
          headers: {
            // Your backend is secured with this header
            'x-telegram-init-data': telegramInitData,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to fetch order history');
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
      setError("Cannot fetch history. Please open the app via Telegram.");
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
        <div style={{ width: '20px' }} /> {/* Placeholder for alignment */}
      </header>

      <main className="history-content">
        {loading && <p className="loading-text">Loading your order history...</p>}
        {error && <p className="error-message">{error}</p>}
        
        {!loading && !error && orders.length === 0 && (
          <p className="empty-message">You have no past orders. Time to make some!</p>
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
                <QRCode 
                  value={String(order.order_id)} // The QR code data is the order ID
                  size={90}
                  bgColor="#1e1e1e"
                  fgColor="#ffffff"
                  level="H" 
                />
                <p>Delivery Confirmation</p>
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default HistoryPage;