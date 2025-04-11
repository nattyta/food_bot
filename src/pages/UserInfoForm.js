import { useEffect, useState } from 'react';
import axios from 'axios';
import DebugBanner from '../components/DebugBanner';

export default function UserInfoForm() {
  const [debugLogs, setDebugLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tg, setTg] = useState(null);
  const [userData, setUserData] = useState(null);
  const [showTestUI, setShowTestUI] = useState(process.env.NODE_ENV === 'development');

  // Enhanced debug logging with Telegram fallback
  const addDebugLog = (message, type = 'info') => {
    const timestamp = new Date().toISOString().slice(11, 19);
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    setDebugLogs(prev => [...prev.slice(-50), logEntry]);
    console[type](logEntry);
    
    // Show critical errors as Telegram alerts
    if (type === 'error' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.showAlert(`ERROR: ${message.slice(0, 150)}...`);
    }
  };

  // ================= DEBUG MODE INITIALIZATION =================
  useEffect(() => {
    const initWebApp = async () => {
      console.log("=== WEBAPP INITIALIZATION ===");  // New debug line
      
      try {
        // 1. Check Telegram WebApp availability
        const tg = window.Telegram?.WebApp;
        if (!tg) {
          throw new Error('Telegram WebApp not detected - running in debug mode');
        }
  
        console.log("Telegram WebApp detected:", tg);  // New debug line
        setTg(tg);
        
        // 2. Expand WebApp and enable debug features
        tg.expand();
        tg.enableClosingConfirmation();
        addDebugLog('Telegram WebApp initialized');
  
        // 3. Verify user data
        if (!tg.initDataUnsafe?.user) {
          throw new Error('User data not found in initDataUnsafe');
        }
  
        const user = tg.initDataUnsafe.user;
        const userPayload = {
          id: user.id,
          name: `${user.first_name} ${user.last_name || ''}`.trim(),
          username: user.username
        };
        
        console.log("User data:", userPayload);  // New debug line
        setUserData(userPayload);
        addDebugLog(`User detected: ${JSON.stringify(userPayload)}`);
  
        // 4. Immediately attempt registration
        await registerUser(userPayload);
  
        // 5. NEW: Additional test request
        const testRequest = async () => {
          console.log("Sending test request...");
          try {
            const testResponse = await axios.post('/register', {
              chat_id: 999999,
              name: "Debug User",
              username: "debug_user"
            }, {
              headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'X-Telegram-Init-Data': tg.initData  // Maintain Telegram auth
              }
            });
            console.log("Test response:", testResponse.data);
          } catch (error) {
            console.error("Test request failed:", error);
          }
        };
        
        // Only run test in development
        if (process.env.NODE_ENV === 'development') {
          testRequest();
        }
  
      } catch (error) {
        console.error("Initialization error:", error);  // New debug line
        addDebugLog(error.message, 'error');
        setIsLoading(false);
        
        // Fallback for testing outside Telegram
        if (!window.Telegram?.WebApp) {
          setUserData({
            id: 999999,
            name: "Debug User",
            username: "debug_user"
          });
          addDebugLog('Running in debug mode with test data');
        }
      }
    };
  
    initWebApp();
  }, []);

  // ================= REGISTRATION HANDLER =================
  const registerUser = async (user) => {
    setIsLoading(true);
    try {
      const payload = {
        chat_id: user.id,
        name: user.name,
        username: user.username || null
      };

      addDebugLog(`Attempting registration: ${JSON.stringify(payload)}`);
      
      const response = await axios.post('/register', payload, {
        headers: {
          'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || 'debug-mode',
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true' // Bypass ngrok warning
        }
      });

      addDebugLog(`Server response: ${JSON.stringify(response.data)}`);
      
      if (tg) {
        tg.showAlert(response.data.message || 'Registration successful!');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message;
      addDebugLog(`Registration failed: ${errorMsg}`, 'error');
      
      if (tg) {
        tg.showAlert(`Registration failed: ${errorMsg.slice(0, 150)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ================= TEST FUNCTIONS =================
  const runTestRegistration = async () => {
    addDebugLog('--- STARTING MANUAL TEST ---');
    await registerUser({
      id: Math.floor(Math.random() * 1000000),
      name: "Test User",
      username: "test_user_" + Math.random().toString(36).substring(7)
    });
  };

  return (
    <div className="user-info-container">
      {/* Debug Controls */}
      <button 
        className="debug-toggle"
        onClick={() => setShowTestUI(!showTestUI)}
      >
        {showTestUI ? 'Hide Debug' : 'Show Debug'}
      </button>

      {/* Main UI */}
      <header>
        <h1>Food Delivery App</h1>
        {userData && (
          <div className="user-badge">
            👤 {userData.name} 
            {userData.username && <span> (@{userData.username})</span>}
          </div>
        )}
      </header>

      <main>
        {isLoading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading your account...</p>
          </div>
        ) : (
          <div className="content">
            <p>Welcome to our food delivery service!</p>
            
            {/* Debug Panel */}
            {showTestUI && (
              <div className="debug-panel">
                <h3>🛠 Debug Tools</h3>
                <button onClick={runTestRegistration} className="test-button">
                  Run Test Registration
                </button>
                <div className="debug-instructions">
                  <p>Check these in your terminal:</p>
                  <ol>
                    <li>Backend request logs</li>
                    <li>Database queries</li>
                    <li>Error messages (if any)</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Debug Banner - Always visible in debug mode */}
      {(showTestUI || process.env.NODE_ENV === 'development') && (
        <DebugBanner logs={debugLogs} />
      )}

      <style jsx>{`
        .user-info-container {
          padding: 20px;
          min-height: 100vh;
          position: relative;
          padding-bottom: 200px;
        }
        .debug-toggle {
          position: fixed;
          top: 10px;
          right: 10px;
          padding: 5px 10px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 4px;
          z-index: 1001;
          cursor: pointer;
        }
        .user-badge {
          background: #f0f0f0;
          padding: 8px 12px;
          border-radius: 20px;
          margin-top: 10px;
          display: inline-block;
        }
        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
          margin-top: 40px;
        }
        .spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top: 4px solid #007bff;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        .debug-panel {
          margin-top: 30px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }
        .test-button {
          padding: 10px 15px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        .debug-instructions {
          margin-top: 15px;
          font-size: 14px;
          color: #6c757d;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}