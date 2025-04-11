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