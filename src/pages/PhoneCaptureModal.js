const PhoneCaptureModal = ({ onClose, onSave }) => {
    const [phone, setPhone] = useState('');
    const [method, setMethod] = useState(null);
  
    const handleTelegramShare = async () => {
      try {
        const userPhone = window.Telegram.WebApp.requestContact();
        if (userPhone) {
          await fetch('/update-phone', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
              phone: userPhone.phone_number,
              source: 'telegram' 
            })
          });
          onSave(userPhone.phone_number);
        }
      } catch (error) {
        console.error('Phone share failed:', error);
      }
    };
  
    const handleManualSubmit = async () => {
      if (!/^\+251[79]\d{8}$/.test(phone)) {
        alert('Please enter a valid Ethiopian phone number');
        return;
      }
      
      await fetch('/update-phone', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
          phone: phone,
          source: 'manual' 
        })
      });
      onSave(phone);
    };
  
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Welcome to Our Service!</h2>
          <p>Please share your phone number to continue</p>
          
          <button className="telegram-btn" onClick={handleTelegramShare}>
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
            <button onClick={handleManualSubmit}>
              Submit Manually
            </button>
          </div>
        </div>
      </div>
    );
  };