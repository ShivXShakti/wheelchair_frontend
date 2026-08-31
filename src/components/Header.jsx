import React from 'react';

const Header = ({ battery }) => {
  const pct = battery ? Math.round(battery.percentage) : null;
  const isCharging = battery?.status === 'Charging';

  let batteryIcon = '🔋';
  let batteryColor = '#2ecc71'; // Green
  if (pct !== null) {
    if (pct < 20) {
      batteryIcon = '🪫';
      batteryColor = '#e74c3c'; // Red
    } else if (pct < 50) {
      batteryColor = '#f1c40f'; // Yellow
    }
  }

  return (
    <header className="header" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 20px',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)'
    }}>
      <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src="/static/ihublogo.svg" alt="iHub" className="ihub-logo" style={{ height: '30px' }} />
        <span className="header-title" style={{ fontWeight: 600, color: 'var(--text)' }}>Wheelchair Nav</span>
      </div>
      {pct !== null && (
        <div className="header-battery" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--text-muted)'
        }} title={`Voltage: ${battery.voltage.toFixed(2)}V, Current: ${battery.current.toFixed(3)}A, Status: ${battery.status}`}>
          <span style={{ color: batteryColor, fontSize: '18px' }}>{batteryIcon}</span>
          <span style={{ color: 'var(--text)' }}>{pct}%</span>
          {isCharging && <span style={{ color: '#2ecc71', fontSize: '12px' }}>⚡</span>}
        </div>
      )}
    </header>
  );
};

export default Header;
