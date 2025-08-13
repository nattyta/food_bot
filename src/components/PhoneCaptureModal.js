import React, { useState } from 'react';
import "./phoneCaptureModal.css";
const PhoneCaptureModal = ({ 
  onSave, 
  onClose, 
  telegramInitData,
  appName = "FoodBot"
}) => {
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const webAppVersion = window.Telegram?.WebApp?.version || '0';
  const [contactRequested, setContactRequested] = useState(false);
   const handleTelegramShare = () => {
        // Prevent multiple requests
        if (contactRequested || isProcessing) return;
        
        setContactRequested(true);
        setIsProcessing(true);
        
        try {
            window.Telegram.WebApp.requestContact(
                async (result) => {
                    console.log('Contact result:', result);
                    
                    // Handle intermediate state (true)
                    if (result === true) {
                        console.log('Contact request initiated');
                        return;
                    }
                    
                    // Handle actual contact
                    if (result?.phone_number) {
                        await processPhoneNumber(result.phone_number, 'telegram');
                    } 
                    // Handle cancellation
                    else if (result === false) {
                        window.Telegram.WebApp.showAlert('Contact sharing cancelled');
                    }
                    // Handle error case
                    else {
                        console.warn('Unexpected contact response:', result);
                        window.Telegram.WebApp.showAlert(
                            'Please select a contact with a phone number'
                        );
                    }
                    
                    setIsProcessing(false);
                },
                (error) => {
                    console.error('Contact request failed:', error);
                    window.Telegram.WebApp.showAlert(
                        'Contact access denied. Please enter manually.'
                    );
                    setMethod('manual');
                    setIsProcessing(false);
                }
            );
        } catch (error) {
            console.error('Phone share failed:', error);
            window.Telegram.WebApp.showAlert('System error. Please enter manually.');
            setMethod('manual');
            setIsProcessing(false);
        }
    };

    const processPhoneNumber = async (rawPhone, source) => {
      try {
          // Normalize phone number
          let normalizedPhone = rawPhone.replace(/\D/g, '');
          if (normalizedPhone.startsWith('0')) {
              normalizedPhone = '+251' + normalizedPhone.substring(1);
          } else if (!normalizedPhone.startsWith('251')) {
              normalizedPhone = '+251' + normalizedPhone;
          } else {
              normalizedPhone = '+' + normalizedPhone;
          }
  
          // Validate Ethiopian phone
          if (!/^\+251[79]\d{8}$/.test(normalizedPhone)) {
              window.Telegram.WebApp.showAlert(
                  'Please enter a valid Ethiopian phone number starting with +251 followed by 7 or 9'
              );
              return;
          }
  
          const headers = {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          };
          
          if (telegramInitData) {
              headers['x-telegram-init-data'] = telegramInitData;
          }
  
          await fetch('/update-phone', {
              method: 'POST',
              headers,
              body: JSON.stringify({ 
                  phone: normalizedPhone,
                  source 
              })
          });
  
          // Success handling
          setPhone(normalizedPhone);
          setMethod(source);
          onSave(normalizedPhone);
  
          if (onClose) onClose();
  
          window.Telegram.WebApp.showAlert('Phone number saved successfully!');
      } catch (error) {
          console.error('Save failed:', error);
          window.Telegram.WebApp.showAlert(`Error: ${error.message}`);
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