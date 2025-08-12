import React, { useState, useEffect } from 'react';
import "./phoneCaptureModal.css";

const PhoneCaptureModal = ({ 
  onSave, 
  onClose, 
  telegramInitData,
  appName = "FoodBot"
}) => {
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState(null);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const handler = (event) => {
        if (event?.data === "__close_phone_popup__") {
          console.log("Signal from bot: closing popup");
          if (onClose) onClose();
        }
      };

      window.Telegram.WebApp.onEvent("message", handler);

      return () => {
        window.Telegram.WebApp.offEvent("message", handler);
      };
    }
  }, [onClose]);

  const handleTelegramShare = () => {
    try {
      window.Telegram.WebApp.requestContact(
        async (contact) => {  
          if (contact && contact.phone_number) {
            const userPhone = contact.phone_number;
            setPhone(userPhone);
            
            try {
              // Normalize phone number
              let normalizedPhone = userPhone.replace(/\D/g, '');
              if (normalizedPhone.startsWith('0')) {
                normalizedPhone = '+251' + normalizedPhone.substring(1);
              } else if (!normalizedPhone.startsWith('251')) {
                normalizedPhone = '+251' + normalizedPhone;
              } else {
                normalizedPhone = '+' + normalizedPhone;
              }

              // Validate Ethiopian format
              if (!/^\+251[79]\d{8}$/.test(normalizedPhone)) {
                throw new Error('Invalid Ethiopian phone number');
              }

              // Prepare request
              const payload = {
                phone: normalizedPhone,
                source: 'telegram'
              };

              // Prepare headers
              const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              };
              
              if (telegramInitData) {
                headers['x-telegram-init-data'] = telegramInitData;
              }

              // Send to backend
              const response = await fetch('/update-phone', {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to save phone');
              }

              // 🔹 Check if phone is saved using /me
              const meRes = await fetch("/me", {
                headers: {
                  "x-telegram-init-data": window.Telegram.WebApp.initData
                }
              });
              const meData = await meRes.json();

              if (meData.phone) {
                alert("✅ Phone number saved successfully!");
                window.Telegram.WebApp.close();
              } else {
                alert("❌ Failed to save phone, please try again.");
              }

              setMethod('telegram');
              onSave(normalizedPhone);
              
            } catch (error) {
              console.error('Save failed:', error);
              if (window.Telegram.WebApp) {
                window.Telegram.WebApp.showAlert(`Error: ${error.message}`);
              } else {
                alert(`Error: ${error.message}`);
              }
            }
          }
        },
        (error) => {
          console.error('Contact request failed:', error);
          if (window.Telegram.WebApp) {
            window.Telegram.WebApp.showAlert('Failed to access contacts. Please try manually.');
          }
        }
      );
    } catch (error) {
      console.error('Phone share failed:', error);
      if (window.Telegram.WebApp) {
        window.Telegram.WebApp.showAlert('An unexpected error occurred. Please try manually.');
      }
    }
  };
  
  const handleManualSubmit = async () => {
    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+251' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('251')) {
      normalizedPhone = '+251' + normalizedPhone;
    } else {
      normalizedPhone = '+' + normalizedPhone;
    }
    
    if (!/^\+251[79]\d{8}$/.test(normalizedPhone)) {
      if (window.Telegram.WebApp) {
        window.Telegram.WebApp.showAlert('Please enter a valid Ethiopian phone number starting with +251 followed by 7 or 9');
      } else {
        alert('Please enter a valid Ethiopian phone number');
      }
      return;
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    };
    
    if (telegramInitData) {
      headers['x-telegram-init-data'] = telegramInitData;
    }

    try {
      await fetch('/update-phone', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          phone: normalizedPhone,
          source: 'manual' 
        })
      });
      setMethod('manual');
      onSave(normalizedPhone);
      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to save phone:', error);
      if (window.Telegram.WebApp) {
        window.Telegram.WebApp.showAlert('Failed to save phone. Please try again.');
      } else {
        alert('Failed to save phone. Please try again.');
      }
    }
  };

  return (
    <div className="phone-modal-overlay">
      <div className="phone-modal">
        <button className="close-button" onClick={onClose}>
          &times;
        </button>
        
        <h2>Welcome to {appName}!</h2>
        <p>We need your phone number to continue</p>
        
        <button className="btn-telegram" onClick={handleTelegramShare}>
          Share via Telegram
        </button>
        
        <div className="divider">OR</div>
        
        <div className="manual-entry">
          <input 
            type="tel"
            placeholder="+251XXXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button className="btn-submit" onClick={handleManualSubmit}>
            Submit Manually
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhoneCaptureModal;
