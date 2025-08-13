import React, { useState , useEffect, useRef} from 'react';
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
  const [isSaved, setIsSaved] = useState(false);
  const contactReceivedRef = useRef(false);

  useEffect(() => {
    if (isSaved && onClose) {
        // Delay close slightly for better UX
        const timer = setTimeout(() => {
            onClose();
        }, 500);
        
        return () => clearTimeout(timer);
    }
}, [isSaved, onClose]);

const handleTelegramShare = () => {
  console.log("[DEBUG] handleTelegramShare initiated");
  
  // Reset tracking
  contactReceivedRef.current = false;
  setIsProcessing(true);
  
  try {
      console.log("[DEBUG] Calling Telegram.WebApp.requestContact");
      
      window.Telegram.WebApp.requestContact(
          async (result) => {
              console.log("[DEBUG] Contact callback received:", result);
              
              // Handle intermediate state (true)
              if (result === true) {
                  console.log("[DEBUG] Contact request initiated (intermediate state)");
                  return;
              }
              
              // Mark that we've received contact data
              contactReceivedRef.current = true;
              
              // Handle actual contact
              if (result?.phone_number) {
                  console.log("[DEBUG] Received valid contact:", result);
                  await processPhoneNumber(result.phone_number, 'telegram');
              } 
              // Handle cancellation
              else if (result === false) {
                  console.log("[DEBUG] Contact sharing cancelled by user");
                  window.Telegram.WebApp.showAlert('Contact sharing cancelled');
                  setIsProcessing(false);
              }
              // Handle other cases
              else {
                  console.warn("[WARN] Unexpected contact response:", result);
                  window.Telegram.WebApp.showAlert(
                      'Unexpected response. Please try again or enter manually.'
                  );
                  setIsProcessing(false);
              }
          },
          (error) => {
              console.error("[ERROR] Contact request failed:", error);
              window.Telegram.WebApp.showAlert(
                  'Contact access denied. Please enter manually.'
              );
              setIsProcessing(false);
          }
      );
      
      // Fallback: Check if contact was received after 3 seconds
      setTimeout(() => {
          if (!contactReceivedRef.current) {
              console.warn("[WARN] Contact not received. Using alternative method");
              
              // SOLUTION: Use the bot's contact endpoint directly
              requestContactFromBot();
          }
      }, 3000);
      
  } catch (error) {
      console.error("[ERROR] Phone share failed:", error);
      window.Telegram.WebApp.showAlert('System error. Please enter manually.');
      setIsProcessing(false);
  }
};

// NEW SOLUTION: Get contact from bot instead of WebApp
const requestContactFromBot = async () => {
  console.log("[DEBUG] Requesting contact via bot endpoint");
  
  try {
      // Prepare headers
      const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      };
      
      if (telegramInitData) {
          headers['x-telegram-init-data'] = telegramInitData;
      }

      // Request contact via bot
      const response = await fetch('/request-contact', {
          method: 'POST',
          headers,
          body: JSON.stringify({ via_bot: true })
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to request contact');
      }

      const result = await response.json();
      console.log("[DEBUG] Bot contact response:", result);
      
      if (result.phone) {
          await processPhoneNumber(result.phone, 'telegram');
      } else {
          throw new Error('No phone received from bot');
      }
      
  } catch (error) {
      console.error("[ERROR] Bot contact request failed:", error);
      window.Telegram.WebApp.showAlert(
          'Failed to get contact via bot. Please enter manually.'
      );
      setIsProcessing(false);
      setMethod('manual');
  }
};


const processPhoneNumber = async (rawPhone, source) => {
    console.log("[DEBUG] Processing phone:", rawPhone);
    
    try {
        // Normalize phone number
        let normalizedPhone = rawPhone.replace(/\D/g, '');
        console.log("[DEBUG] After digit removal:", normalizedPhone);
        
        if (normalizedPhone.startsWith('0')) {
            normalizedPhone = '+251' + normalizedPhone.substring(1);
        } else if (!normalizedPhone.startsWith('251')) {
            normalizedPhone = '+251' + normalizedPhone;
        } else {
            normalizedPhone = '+' + normalizedPhone;
        }
        
        console.log("[DEBUG] After normalization:", normalizedPhone);

        // Validate Ethiopian format
        if (!/^\+251[79]\d{8}$/.test(normalizedPhone)) {
            const errorMsg = 'Invalid Ethiopian phone number format: ' + normalizedPhone;
            console.error("[ERROR] " + errorMsg);
            throw new Error(errorMsg);
        }

        // Prepare request
        const payload = {
            phone: normalizedPhone,
            source
        };

        console.log("[DEBUG] Sending payload:", payload);

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        };
        
        if (telegramInitData) {
            headers['x-telegram-init-data'] = telegramInitData;
        }

        console.log("[DEBUG] Sending headers:", headers);

        // Send to backend
        const response = await fetch('/update-phone', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        console.log("[DEBUG] Received response status:", response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("[ERROR] API error response:", errorData);
            throw new Error(errorData.detail || 'Failed to save phone');
        }

        const responseData = await response.json();
        console.log("[DEBUG] API success response:", responseData);

        // Success handling
        setPhone(normalizedPhone);
        setMethod(source);
        onSave(normalizedPhone);
        
        // Close the modal
        if (onClose) {
            console.log("[DEBUG] Closing modal");
            onClose();
        }
        
        // Show success alert
        window.Telegram.WebApp.showAlert(
            'Phone number saved successfully!',
            () => console.log("[DEBUG] Alert dismissed")
        );
        
    } catch (error) {
        console.error("[ERROR] Save failed:", error);
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