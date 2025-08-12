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
          // Critical contact validation
          if (!contact?.phone_number) {
            console.error("FULL CONTACT OBJECT:", JSON.stringify(contact));
            window.Telegram.WebApp.showAlert("Telegram didn't provide a phone number. Please try manually.");
            return;
          }
  
          const userPhone = contact.phone_number;
          setPhone(userPhone);
          
          try {
            // Normalization and validation
            let normalizedPhone = userPhone.replace(/\D/g, '');
            if (normalizedPhone.startsWith('0')) {
              normalizedPhone = '+251' + normalizedPhone.substring(1);
            } else if (!normalizedPhone.startsWith('251')) {
              normalizedPhone = '+251' + normalizedPhone;
            } else {
              normalizedPhone = '+' + normalizedPhone;
            }
  
            if (!/^\+251[79]\d{8}$/.test(normalizedPhone)) {
              throw new Error('Invalid Ethiopian phone number');
            }
  
            // DEBUG: Log WebApp state
            console.log("WEBAPP DEBUG:", {
              version: window.Telegram.WebApp.version,
              platform: window.Telegram.WebApp.platform,
              initData: window.Telegram.WebApp.initData,
              initDataUnsafe: window.Telegram.WebApp.initDataUnsafe
            });
  
            // OPTION A: Direct Bot API (immediate solution)
            const BOT_TOKEN = process.env.REACT_APP_BOT_TOKEN;
            const botApiResponse = await fetch(
              `https://api.telegram.org/bot${BOT_TOKEN}/sendContact`, 
              {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                  chat_id: window.Telegram.WebApp.initDataUnsafe.user.id,
                  phone_number: normalizedPhone,
                  first_name: contact.first_name || "User"
                })
              }
            );
            
            if (!botApiResponse.ok) {
              throw new Error('Failed to save via Bot API');
            }
  
            // OPTION B: HTTP Endpoint (long-term solution)
            const headers = {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            };
            
            if (window.Telegram.WebApp.initData) {
              headers['x-telegram-init-data'] = window.Telegram.WebApp.initData;
            }
  
            await fetch('/v1/handle-contact', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                phone: normalizedPhone,
                source: 'telegram',
                user_id: window.Telegram.WebApp.initDataUnsafe.user.id
              })
            });
  
            // Update state
            setMethod('telegram');
            onSave(normalizedPhone);
            
            // GUARANTEED POPUP CLOSE SEQUENCE
            console.log("Initiating nuclear close sequence");
            
            // 1. Primary close method
            if (typeof window.Telegram.WebApp.close === 'function') {
              window.Telegram.WebApp.close();
            }
            
            // 2. Force close via data message
            setTimeout(() => {
              try {
                if (typeof window.Telegram.WebApp.sendData === 'function') {
                  window.Telegram.WebApp.sendData(JSON.stringify({
                    __force_close: true,
                    timestamp: Date.now()
                  }));
                }
              } catch (e) {
                console.error("Force close failed:", e);
              }
              
              // 3. Final fallback
              if (document.visibilityState === 'visible') {
                window.Telegram.WebApp.showAlert(
                  "✅ Saved! This window will close automatically",
                  () => window.Telegram.WebApp.close()
                );
              }
            }, 300);
            
          } catch (error) {
            console.error('Contact processing failed:', error);
            window.Telegram.WebApp.showAlert(`Error: ${error.message}`);
          }
        },
        (error) => {
          console.error('Contact request failed:', error);
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