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
    
    // Show loading state
    setLoading(true);
    
    window.Telegram.WebApp.requestContact(
      async (contact) => {  
        try {
          // 1. Handle contact response quirks
          if (contact === true) {
            // Special case: User granted access but no contact returned
            console.warn("Got 'true' response without contact data");
            window.Telegram.WebApp.showAlert(
              "Please select a contact with a phone number",
              () => window.Telegram.WebApp.requestContact()
            );
            return;
          }
          
          if (!contact?.phone_number) {
            console.error("Invalid contact object:", contact);
            window.Telegram.WebApp.showAlert(
              "Telegram didn't provide a valid phone number. Please try manually."
            );
            return;
          }
  
          // 2. Get phone number
          const userPhone = contact.phone_number;
          setPhone(userPhone);
          
          // 3. Send close command to bot
          console.log("Sending close command to bot");
          window.Telegram.WebApp.sendData('__SAVE_AND_CLOSE__');
          
          // 4. Close popup immediately
          window.Telegram.WebApp.close();
          
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