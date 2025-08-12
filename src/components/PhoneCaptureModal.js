import React, { useState, useEffect} from 'react';
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
    console.log("[Telegram] Starting contact request...");
    try {
      window.Telegram.WebApp.requestContact(
        async (contact) => {  
          console.log("[Telegram] Contact received:", contact);
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
              console.log("[Phone] Normalized:", normalizedPhone);
  
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
              
              // Use WebApp's initData
              const initData = window.Telegram.WebApp.initData;
              if (initData) {
                headers['x-telegram-init-data'] = initData;
                console.log("[Auth] Using WebApp initData:", initData.slice(0, 50) + "...");
              } else {
                console.warn("[Auth] No WebApp initData available");
              }
  
              console.log("[API] Sending to /update-phone:", payload);
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
              console.log("[API] Update successful!");
  
              // Update state
              setMethod('telegram');
              onSave(normalizedPhone);
              
              // Close mechanisms
              console.log("[WebApp] Attempting to close...");
              console.log("[WebApp] Version:", window.Telegram.WebApp.version);
              console.log("[WebApp] Platform:", window.Telegram.WebApp.platform);
              console.log("[WebApp] isExpanded:", window.Telegram.WebApp.isExpanded);
              
              // 1. Try close method
              if (typeof window.Telegram.WebApp.close === 'function') {
                console.log("[Close] Using close() method");
                window.Telegram.WebApp.close();
              }
              
              // 2. If still not closed after delay, use sendData
              setTimeout(() => {
                if (document.visibilityState !== 'hidden') {
                  console.log("[Close] Fallback to sendData()");
                  if (typeof window.Telegram.WebApp.sendData === 'function') {
                    window.Telegram.WebApp.sendData('close');
                  }
                }
              }, 300);
              
            } catch (error) {
              console.error('Save failed:', error);
              window.Telegram.WebApp.showAlert(`Error: ${error.message}`);
            }
          } else {
            console.error('[Contact] No phone number found in contact:', contact);
            window.Telegram.WebApp.showAlert('No phone number found in contact. Please try manually.');
          }
        },
        (error) => {
          console.error('[Telegram] Contact request failed:', error);
          window.Telegram.WebApp.showAlert('Failed to access contacts. Please try manually.');
        }
      );
    } catch (error) {
      console.error('Phone share failed:', error);
      window.Telegram.WebApp.showAlert('An unexpected error occurred. Please try manually.');
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