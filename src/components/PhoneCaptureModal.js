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
  const [loading, setLoading] = useState(false);



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
    
    // 1. Show loading state immediately
    setLoading(true);
    
    // 2. Request contact directly from Telegram
    window.Telegram.WebApp.requestContact(
      async (contactResult) => {
        try {
          console.log("[Telegram] Contact result:", contactResult);
          
          // 3. Handle invalid contact responses
          if (contactResult === true) {
            // This means user granted access but we didn't get contact
            console.warn("Got 'true' but no contact data");
            window.Telegram.WebApp.showAlert(
              "Please select a contact with a phone number",
              () => window.Telegram.WebApp.requestContact()
            );
            return;
          }
          
          if (!contactResult?.phone_number) {
            console.error("Invalid contact object:", contactResult);
            window.Telegram.WebApp.showAlert(
              "Telegram didn't provide a valid phone number. Please try manually."
            );
            return;
          }
  
          const userPhone = contactResult.phone_number;
          console.log("[Contact] Received phone:", userPhone);
          setPhone(userPhone);
          
          // 4. Normalize and validate phone
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
  
          // 5. Send only the normalized phone to backend
          const response = await fetch('/update-phone', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
              phone: normalizedPhone,
              source: 'telegram'
            })
          });
  
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to save phone');
          }
  
          // 6. Update UI state
          setMethod('telegram');
          onSave(normalizedPhone);
          
          // 7. GUARANTEED POPUP CLOSURE SEQUENCE
          console.log("Initiating close sequence");
          
          // First: Try standard close
          if (typeof window.Telegram.WebApp.close === 'function') {
            window.Telegram.WebApp.close();
          }
          
          // Second: Send close command after delay
          setTimeout(() => {
            try {
              if (typeof window.Telegram.WebApp.sendData === 'function') {
                window.Telegram.WebApp.sendData('__CLOSE_WEBAPP__');
              }
            } catch (e) {
              console.error("sendData error:", e);
            }
            
            // Third: Final fallback
            if (document.visibilityState === 'visible') {
              window.Telegram.WebApp.showAlert(
                "✅ Phone saved! You can now close this window",
                () => {
                  try {
                    window.Telegram.WebApp.close();
                  } catch (e) {
                    console.log("Final close attempt failed");
                  }
                }
              );
            }
          }, 500);
          
        } catch (error) {
          console.error('Contact processing failed:', error);
          window.Telegram.WebApp.showAlert(`Error: ${error.message}`);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Contact request failed:', error);
        window.Telegram.WebApp.showAlert('Failed to access contacts. Please try manually.');
        setLoading(false);
      }
    );
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