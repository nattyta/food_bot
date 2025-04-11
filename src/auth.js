// src/auth.js
const API_URL = process.env.REACT_APP_API_URL;

export const initTelegramSession = () => {
    if (!window.Telegram?.WebApp) {
      console.error("[AUTH] Telegram WebApp not detected");
      return null;
    }
  
    const tg = window.Telegram.WebApp;
    const urlParams = new URLSearchParams(window.location.search);
    const user = tg.initDataUnsafe?.user;
  
    // Detailed logging
    console.group("[AUTH] Telegram User Data");
    console.log("🆔 Chat ID:", user?.id || "Not available");
    console.log("👤 Name:", user?.first_name || "Anonymous");
    console.log("📛 Username:", user?.username || "Not set");
    console.log("🔗 WebApp URL Params:", Object.fromEntries(urlParams.entries()));
    console.groupEnd();
  
    return {
      auth: {
        chat_id: user?.id || urlParams.get('chat_id'),
        session_token: urlParams.get('token'),
        init_data: tg.initData
      },
      user: {
        name: user?.first_name || "Guest",
        username: user?.username
      },
      tg
    };
  };