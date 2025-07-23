import { createHmac } from 'crypto-browserify';

const API_URL = process.env.REACT_APP_API_URL || "https://food-bot-vulm.onrender.com";
const TELEGRAM_TOKEN = process.env.REACT_APP_TELEGRAM_TOKEN;

// HMAC-SHA256 implementation
const hmacSha256 = (data, key) => {
  return createHmac('sha256', key)
    .update(data)
    .digest('hex');
};

// Telegram hash validation
export const validateTelegramHash = (initData, botToken) => {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    const dataCheckString = Array.from(params)
      .filter(([key]) => key !== 'hash')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = hmacSha256(botToken, "WebAppData");
    const calculatedHash = hmacSha256(dataCheckString, secretKey);

    return calculatedHash === hash;
  } catch (error) {
    console.error("Hash validation failed:", error);
    return false;
  }
};

// Telegram authentication
export const authenticateWithTelegram = async (initData) => {
  try {
    const response = await fetch(`${API_URL}/auth/telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Authentication failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Telegram auth failed:', error);
    throw error;
  }
};

// Initialize Telegram session
export const initTelegramSession = () => {
  if (!window.Telegram?.WebApp) {
    console.error("[AUTH] Telegram WebApp not detected");
    return null;
  }

  const tg = window.Telegram.WebApp;
  const user = tg.initDataUnsafe?.user;

  console.group("[AUTH] Telegram User Data");
  console.log("🆔 Chat ID:", user?.id || "Not available");
  console.log("👤 Name:", user?.first_name || "Anonymous");
  console.log("📛 Username:", user?.username || "Not set");
  console.groupEnd();

  return {
    tg,
    user,
    initData: tg.initData
  };
};

// Start backend session
export const startBackendSession = async (authData) => {
  try {
    const response = await fetch(`${API_URL}/api/start-session`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': authData.init_data
      },
      body: JSON.stringify(authData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Session initialization failed");
    }
    
    const result = await response.json();
    
    if (result.token) {
      localStorage.setItem('session_token', result.token);
    }
    
    return result;
  } catch (error) {
    console.error("Session error:", error);
    window.Telegram?.WebApp?.showAlert("Session initialization failed");
    throw error;
  }
};

// Main authentication flow
export const initializeAuth = async () => {
  const session = initTelegramSession();
  if (!session) return { status: 'error', error: 'Not in Telegram' };
  
  try {
    if (!validateTelegramHash(session.initData, TELEGRAM_TOKEN)) {
      throw new Error("Invalid Telegram hash");
    }
    
    const authResponse = await authenticateWithTelegram(session.initData);
    const backendSession = await startBackendSession({
      chat_id: authResponse.user.id,
      init_data: session.initData,
      token: authResponse.token
    });
    
    return { 
      status: 'authenticated',
      user: session.user,
      session: backendSession
    };
  } catch (error) {
    session.tg.showAlert(`Auth failed: ${error.message}`);
    return { status: 'error', error: error.message };
  }
};