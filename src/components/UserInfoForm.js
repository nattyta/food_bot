import { useEffect, useState } from 'react';
import axios from 'axios';

const WEB_APP = window.Telegram.WebApp;

export default function UserInfoForm() {
  const [userData, setUserData] = useState({
    chat_id: '',
    name: '',
    username: '',
  });

  useEffect(() => {
    const tgUser = WEB_APP.initDataUnsafe.user;

    if (tgUser) {
      const payload = {
        chat_id: tgUser.id,
        name: `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim(),
        username: tgUser.username || null,
      };

      setUserData(payload);

      // 🔥 Auto-register user
      axios.post("https://2869-196-188-253-199.ngrok-free.app/register", payload)
        .then((res) => console.log("✅ Auto-registered:", res.data))
        .catch((err) => console.error("❌ Auto-register failed:", err));
    }
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Welcome, {userData.name} 👋</h2>
      <p>Your info has been registered. You can now continue using the app.</p>
    </div>
  );
}
