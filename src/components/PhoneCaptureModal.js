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

  const handleTelegramShare = () => {
      // Check if WebApp supports contact sharing
      if (!window.Telegram?.WebApp?.requestContact) {
          window.Telegram.WebApp.showAlert(
              'Contact sharing not supported. Please enter manually.'
          );
          setMethod('manual');
          return;
      }

      // Check minimum supported version
      if (parseFloat(webAppVersion) < 6.0) {
          window.Telegram.WebApp.showAlert(
              'Please update Telegram to use contact sharing.'
          );
          setMethod('manual');
          return;
      }

      setIsProcessing(true);
      
      try {
          window.Telegram.WebApp.requestContact(
              async (result) => {
                  console.log('Telegram contact result:', result);
                  
                  if (result?.phone_number) {
                      await processPhoneNumber(result.phone_number, 'telegram');
                  } else {
                      console.warn('Received invalid contact:', result);
                      window.Telegram.WebApp.showAlert(
                          'Please select a contact with a phone number or enter manually.'
                      );
                      setMethod('manual');
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
          window.Telegram.WebApp.showAlert(
              'System error. Please enter manually.'
          );
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

          // Validate Ethiopian format
          if (!/^\+251[79]\d{8}$/.test(normalizedPhone)) {
              throw new Error('Invalid Ethiopian phone number format');
          }

          // Debug logs
          console.log('Sending phone:', normalizedPhone);
          console.log('Auth token:', localStorage.getItem('auth_token'));
          console.log('Init data:', telegramInitData);

          // Prepare request
          const payload = {
              phone: normalizedPhone,
              source
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

          // Handle response
          const responseData = await response.json();
          console.log('Update response:', responseData);

          if (!response.ok) {
              throw new Error(responseData.detail || 'Failed to save phone');
          }

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