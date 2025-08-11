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
        async (result) => {
          console.log("[DEBUG] Contact request result:", result);
          
          let userPhone = null;
          
          // 1. First try to get from initData string
          if (tg.initData) {
            try {
              const params = new URLSearchParams(tg.initData);
              userPhone = params.get('phone_number');
              console.log(`[DEBUG] Phone from initData: ${userPhone}`);
            } catch (e) {
              console.error("[DEBUG] Failed to parse initData:", e);
            }
          }
          
          // 2. Try to get from initDataUnsafe
          if (!userPhone && tg.initDataUnsafe?.user?.phone_number) {
            userPhone = tg.initDataUnsafe.user.phone_number;
            console.log(`[DEBUG] Phone from initDataUnsafe: ${userPhone}`);
          }
          
          // 3. Try to get from initDataUnsafe top level
          if (!userPhone && tg.initDataUnsafe?.phone_number) {
            userPhone = tg.initDataUnsafe.phone_number;
            console.log(`[DEBUG] Phone from initDataUnsafe top level: ${userPhone}`);
          }
          
          // 4. Fallback to contact result if it's an object
          if (!userPhone && typeof result === 'object' && result.phone_number) {
            userPhone = result.phone_number;
            console.log(`[DEBUG] Phone from contact object: ${userPhone}`);
          }
          
          if (!userPhone) {
            console.error("[DEBUG] Phone number not found after contact sharing");
            tg.showAlert("Failed to get phone number. Please try manually.");
            return;
          }
          
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
              throw new Error('Invalid Ethiopian phone number format');
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
            
            // Use latest initData for authentication
            if (tg.initData) {
              headers['x-telegram-init-data'] = tg.initData;
            } else if (telegramInitData) {
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
  
            // Success handling
            setMethod('telegram');
            onSave(normalizedPhone);
            if (onClose) onClose();
            
            if (window.Telegram.WebApp) {
              window.Telegram.WebApp.showAlert('Phone number saved successfully!');
            }
          } catch (error) {
            console.error('Save failed:', error);
            if (window.Telegram.WebApp) {
              window.Telegram.WebApp.showAlert(`Error: ${error.message}`);
            }
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