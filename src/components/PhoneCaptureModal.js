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
        async (contact) => {
          console.log("[DEBUG] Contact received:", contact);
          
          if (!contact?.phone_number) {
            console.error("[DEBUG] No phone number in contact");
            tg.showAlert("Failed to get phone number");
            return;
          }
  
          let phone = contact.phone_number;
          console.log(`[DEBUG] Raw phone: ${phone}`);
          
          // Normalize phone
          phone = phone.replace(/\D/g, '');
          if (phone.startsWith('0')) {
            phone = '+251' + phone.substring(1);
          } else if (!phone.startsWith('251')) {
            phone = '+251' + phone;
          } else {
            phone = '+' + phone;
          }
          
          console.log(`[DEBUG] Normalized phone: ${phone}`);
          
          // Validate format
          if (!/^\+251[79]\d{8}$/.test(phone)) {
            console.error(`[DEBUG] Invalid phone format: ${phone}`);
            tg.showAlert("Invalid Ethiopian phone format");
            return;
          }
  
          try {
            console.log("[DEBUG] Preparing API request");
            const payload = { phone, source: 'telegram' };
            const headers = {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            };
            
            if (telegramInitData) {
              headers['x-telegram-init-data'] = telegramInitData;
              console.log("[DEBUG] Added initData to headers");
            }
  
            console.log("[DEBUG] Sending to /update-phone:", payload);
            const response = await fetch('/update-phone', {
              method: 'POST',
              headers,
              body: JSON.stringify(payload)
            });
  
            console.log(`[DEBUG] Response status: ${response.status}`);
            
            if (!response.ok) {
              const errorData = await response.text();
              console.error(`[DEBUG] API error: ${response.status} - ${errorData}`);
              throw new Error(`API error: ${response.status}`);
            }
  
            const data = await response.json();
            console.log("[DEBUG] API response:", data);
            
            setMethod('telegram');
            onSave(phone);
            if (onClose) onClose();
            
            tg.showAlert("Phone number saved successfully!");
          } catch (error) {
            console.error('[DEBUG] Save failed:', error);
            tg.showAlert("Failed to save phone. Please try manually.");
          }
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