import React, { useState } from 'react';

const PhoneCaptureModal = ({ 
  onSave, 
  onClose, 
  telegramInitData,
  appName = "FoodBot"
}) => {
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState(null);

  const handleTelegramShare = () => {
    console.log("[DEBUG] Share via Telegram button clicked");
    try {
      const tg = window.Telegram?.WebApp;
      if (!tg || !tg.requestContact) {
        console.error("[DEBUG] Telegram contact API not available");
        tg?.showAlert?.("Contact sharing not available in this version");
        return;
      }
  
      console.log("[DEBUG] Requesting contact access...");
      tg.requestContact(
        (contactResult) => {
          // Handle different response formats
          let contact;
          if (typeof contactResult === 'string') {
            console.log("[DEBUG] Received string contact data");
            try {
              // Decode URI component and parse JSON
              const decoded = decodeURIComponent(contactResult);
              const match = decoded.match(/contact=({.*})/);
              if (match && match[1]) {
                contact = JSON.parse(match[1]);
              }
            } catch (e) {
              console.error("[DEBUG] Failed to parse contact string", e);
            }
          } else if (typeof contactResult === 'object') {
            console.log("[DEBUG] Received object contact data");
            contact = contactResult;
          } else {
            console.error("[DEBUG] Unexpected contact format", contactResult);
          }
  
          if (!contact?.phone_number) {
            console.error("[DEBUG] No phone number in contact", contact);
            tg.showAlert("Failed to get phone number");
            return;
          }
  
          console.log("[DEBUG] Contact received:", contact);
          const userPhone = contact.phone_number;
          console.log(`[DEBUG] Raw phone: ${userPhone}`);
          
          // ... rest of your processing code ...
        },
        (error) => {
          console.error('[DEBUG] Contact request failed:', error);
          tg.showAlert("Contact access denied or failed");
        }
      );
    } catch (error) {
      console.error('[DEBUG] System error:', error);
      window.Telegram?.WebApp?.showAlert("System error. Please try manually.");
    }
  };

  const handleManualSubmit = async () => {
    // Normalize phone number
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