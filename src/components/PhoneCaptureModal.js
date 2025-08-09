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
    try {
      window.Telegram.WebApp.requestContact(
        (contact) => {
          if (contact && contact.phone_number) {
            const userPhone = contact.phone_number;
            setPhone(userPhone);
            
            // Save to backend
            const headers = {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            };
            
            if (telegramInitData) {
              headers['x-telegram-init-data'] = telegramInitData;
            }

            fetch('/update-phone', {
              method: 'POST',
              headers,
              body: JSON.stringify({ 
                phone: userPhone,
                source: 'telegram' 
              })
            })
            .then(response => {
              if (!response.ok) throw new Error('Failed to save phone');
              return response.json();
            })
            .then(() => {
              setMethod('telegram');
              onSave(userPhone);
              if (onClose) onClose();
              if (window.Telegram.WebApp) {
                window.Telegram.WebApp.showAlert('Phone number saved successfully!');
              }
            })
            .catch(error => {
              console.error('Save failed:', error);
              if (window.Telegram.WebApp) {
                window.Telegram.WebApp.showAlert('Failed to save phone. Please try again.');
              }
            });
          }
        },
        (error) => {
          console.error('Contact request failed:', error);
          if (window.Telegram.WebApp) {
            window.Telegram.WebApp.showAlert('Failed to access contacts. Please try manually.');
          }
        }
      );
    } catch (error) {
      console.error('Phone share failed:', error);
      if (window.Telegram.WebApp) {
        window.Telegram.WebApp.showAlert('An unexpected error occurred. Please try manually.');
      }
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