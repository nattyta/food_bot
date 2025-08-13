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
    console.log("[Telegram] Starting contact request...");
    
    // Add retry counter to prevent infinite loops
    const MAX_RETRIES = 2;
    let retryCount = 0;
    
    const requestContact = () => {
      window.Telegram.WebApp.requestContact(
        async (contact) => {  
          console.log("[Telegram] Contact response:", contact);
          
          // Handle Telegram's 'true' response bug
          if (contact === true) {
            if (retryCount < MAX_RETRIES) {
              retryCount++;
              console.warn(`Got 'true' response, retrying (${retryCount}/${MAX_RETRIES})`);
              requestContact(); // Recursive retry
              return;
            }
            
            // Final fallback after retries
            window.Telegram.WebApp.showAlert(
              "Contact shared successfully! Closing window...",
              () => window.Telegram.WebApp.close()
            );
            return;
          }
          
          // Handle actual contact object
          if (contact?.phone_number) {
            const userPhone = contact.phone_number;
            setPhone(userPhone);
            
            try {
              // ... [existing processing logic] ...
              
              // Close popup after processing
              setTimeout(() => {
                window.Telegram.WebApp.close();
              }, 500);
              
            } catch (error) {
              console.error('Save failed:', error);
              window.Telegram.WebApp.showAlert(`Error: ${error.message}`);
            }
          } else {
            console.error("Invalid contact object:", contact);
            window.Telegram.WebApp.showAlert(
              "Telegram didn't provide a valid phone number. Please try manually."
            );
          }
        },
        (error) => {
          console.error('Contact request failed:', error);
          window.Telegram.WebApp.showAlert('Failed to access contacts. Please try manually.');
        }
      );
    };
    
    // Start the contact request
    requestContact();
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