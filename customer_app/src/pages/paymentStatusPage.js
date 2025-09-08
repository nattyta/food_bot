import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './paymentStatusPage.css'; // We'll create this CSS

const PaymentStatusPage = () => {
  const navigate = useNavigate();

  // This effect runs once when the component mounts
  useEffect(() => {
    // Show the user a confirmation message for 3 seconds, then go home.
    const timer = setTimeout(() => {
      navigate('/');
    }, 3000); // 3 seconds

    // Cleanup the timer if the component unmounts early
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="payment-status-container">
      <div className="status-card">
        <div className="checkmark-circle">
          <div className="checkmark"></div>
        </div>
        <h1>Payment Initiated!</h1>
        <p>Thank you for your order.</p>
        <p className="subtext">Please check your phone to complete the transaction. You will be redirected to the homepage shortly.</p>
        <div className="spinner-status"></div>
      </div>
    </div>
  );
};

export default PaymentStatusPage;