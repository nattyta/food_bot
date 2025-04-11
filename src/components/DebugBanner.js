import { useState } from 'react';

export default function DebugBanner({ logs = [] }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      background: 'black',
      color: 'white',
      padding: '10px',
      maxHeight: '200px',
      overflow: 'auto',
      zIndex: 1000,
      width: '100%'
    }}>
      {logs.map((log, i) => (
        <div key={i} style={{ fontSize: '12px', margin: '2px 0' }}>{log}</div>
      ))}
    </div>
  );
}
export default function DebugBanner({ logs, auth }) {
  return (
    <div className="debug-banner">
      <h3>🔧 Debug Console</h3>
      <div>
        <strong>Active Session:</strong>
        {auth ? (
          <>
            <p>👤 User: {auth.user.name}</p>
            <p>🆔 Chat ID: {auth.auth.chat_id}</p>
            <p>🔑 Token: {auth.auth.session_token?.slice(0, 8)}...</p>
          </>
        ) : (
          <p>❌ No active session</p>
        )}
      </div>
      <div>
        <strong>Logs:</strong>
        {logs.map((log, i) => (
          <p key={i}>{log}</p>
        ))}
      </div>
    </div>
  );
}