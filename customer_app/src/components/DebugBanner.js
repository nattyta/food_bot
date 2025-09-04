import React from 'react';

export default function DebugBanner({ logs = [], auth = null }) {
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
      {/* Session Info (if auth prop exists) */}
      {auth && (
        <div style={{ marginBottom: '10px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
          <h3 style={{ margin: '0 0 5px 0' }}>🔧 Active Session</h3>
          <p style={{ margin: '2px 0', fontSize: '14px' }}>👤 User: {auth.user?.name || 'Unknown'}</p>
          <p style={{ margin: '2px 0', fontSize: '14px' }}>🆔 Chat ID: {auth.auth?.chat_id || 'None'}</p>
        </div>
      )}

      {/* Logs */}
      <div>
        <h3 style={{ margin: '5px 0' }}>📝 Debug Logs</h3>
        {logs.map((log, i) => (
          <div 
            key={i} 
            style={{ 
              fontSize: '12px', 
              margin: '2px 0',
              fontFamily: 'monospace'
            }}
          >
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}