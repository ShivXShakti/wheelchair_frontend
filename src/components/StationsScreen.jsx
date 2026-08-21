import React, { useState } from 'react';

const StationsScreen = ({ goHome, destination, handleResponse, setStatus, addSystemBubble, sendPrompt, devMode, nav2Ready, healthData }) => {
  const [isSending, setIsSending] = useState(false);

  const locations = healthData?.location_names || [];

  const handleStationClick = async (stationName) => {
    if (!devMode && !nav2Ready) {
      addSystemBubble('text', 'error', 'Robot is not ready to take commands.', 'NONE');
      return;
    }

    setIsSending(true);
    // Prefixing with "take me to" ensures it perfectly matches NAV_DIRECT_PATTERN in backend
    const prompt = `take me to ${stationName}`;
    await sendPrompt(prompt, 'text');
    setIsSending(false);
  };

  return (
    <div className="screen active" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="screen-header">
        <button className="back-btn" onClick={goHome}>← Back</button>
        <span className="screen-title">Wheelchair Stations</span>
      </div>
      
      {destination && (
        <div className="dest-banner visible">
          <span className="dest-banner-icon">🧭</span>
          <span>Navigating to: {destination}</span>
        </div>
      )}
      
      <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>
          Select a destination from the loaded map semantics:
        </p>

        {locations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>🗺️</span>
            No stations loaded from semantics file.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '12px'
          }}>
            {locations.map((loc, idx) => {
              const isServiceable = healthData?.location_serviceability?.[loc] !== false;
              return (
                <button 
                  key={idx}
                  disabled={isSending || !isServiceable}
                  onClick={() => {
                    if (!isServiceable) {
                      addSystemBubble('text', 'error', `Service not available for location: ${loc}`, 'NONE');
                      return;
                    }
                    handleStationClick(loc);
                  }}
                  style={{
                    background: isServiceable ? 'var(--surface2)' : 'rgba(231, 76, 60, 0.08)',
                    border: `1px solid ${isServiceable ? 'var(--border)' : 'rgba(231, 76, 60, 0.3)'}`,
                    borderRadius: 'var(--radius)',
                    padding: '16px',
                    color: isServiceable ? 'var(--text)' : 'var(--text-muted)',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: (isSending || !isServiceable) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: isServiceable ? 1 : 0.6,
                    transition: 'background 0.2s, border-color 0.2s',
                  }}
                  onMouseOver={(e) => {
                    if(!isSending && isServiceable) {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.background = 'rgba(74, 158, 255, 0.05)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if(!isSending && isServiceable) {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.background = 'var(--surface2)';
                    }
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{isServiceable ? '📍' : '⛔'}</span>
                  <span style={{ textAlign: 'center', wordBreak: 'break-word', textTransform: 'capitalize' }}>{loc.replace(/_/g, ' ')}</span>
                  {!isServiceable && (
                    <span style={{ fontSize: '10px', color: '#e74c3c', background: 'rgba(231, 76, 60, 0.15)', padding: '2px 6px', borderRadius: '4px', marginTop: '2px' }}>
                      Service Unavailable
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StationsScreen;
