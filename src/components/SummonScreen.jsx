import React, { useState, useEffect } from 'react';
import config from '../config';

const SummonScreen = ({ 
  goHome, 
  destination, 
  handleResponse, 
  setStatus, 
  addSystemBubble, 
  sendPrompt, 
  healthData,
  onStartNavigation,
  speak,
  streamUrl,
  isPaired,
  onOpenPairingModal
}) => {
  const [isSending, setIsSending] = useState(false);
  const [launchingNav, setLaunchingNav] = useState(false);

  const navReady = !!healthData?.nav2_ready;
  // Extract stations tagged as wheelchair stations
  const stations = healthData?.wheelchair_stations || healthData?.location_names || [];

  const handleStartNav = async () => {
    setLaunchingNav(true);
    await onStartNavigation();
    setTimeout(() => setLaunchingNav(false), 3000);
  };

  const handleSummonClick = async (stationName) => {
    if (!navReady) {
      alert("Wheelchair navigation is not ready yet. Please wait for status to show Ready.");
      return;
    }

    setIsSending(true);
    const prompt = `take me to ${stationName}`;
    await sendPrompt(prompt, 'text');
    setIsSending(false);
  };

  return (
    <div className="screen active" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', maxWidth: '650px', margin: '0 auto', width: '100%' }}>
      <div className="screen-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        {isPaired ? (
          <button className="back-btn" onClick={goHome} style={{ padding: '8px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>
            ← Exit Summon Mode
          </button>
        ) : (
          <button 
            onClick={onOpenPairingModal} 
            style={{ 
              padding: '6px 14px', 
              fontSize: '12px', 
              background: 'rgba(52, 152, 219, 0.15)', 
              border: '1px solid #3498db', 
              borderRadius: 'var(--radius)', 
              color: '#3498db', 
              cursor: 'pointer', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🔑 Authorize Full Access
          </button>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: isPaired ? 'flex-end' : 'center' }}>
          <img src="/static/ihublogo.svg" alt="iHub Logo" style={{ height: '28px' }} />
          <span className="screen-title" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>
            🎺 Wheelchair Summoning Portal
          </span>
        </div>
      </div>

      {/* Live Camera Stream Feed */}
      {streamUrl && (
        <div className="camera-container" style={{ marginBottom: '18px', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          <img 
            src={streamUrl} 
            alt="Wheelchair Live Camera Feed" 
            className="camera-feed"
            style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '240px', objectFit: 'cover' }}
            onError={(e) => {
              if (streamUrl.includes('/glass_detection/overlay')) {
                const fallbackUrl = `${config.API_BASE_URL}/camera_stream?topic=${encodeURIComponent('/camera1/color/image_raw')}`;
                e.target.src = fallbackUrl;
              } else {
                e.target.style.display = 'none';
              }
            }}
          />
        </div>
      )}

      {/* Navigation In Progress Banner */}
      {destination && (
        <div className="dest-banner visible" style={{ background: 'linear-gradient(135deg, rgba(74, 158, 255, 0.15), rgba(58, 123, 213, 0.25))', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '20px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <span className="dest-banner-icon" style={{ fontSize: '24px', marginRight: '8px' }}>🦽</span>
          <span style={{ fontSize: '16px', fontWeight: 600 }}>Wheelchair Coming To: <strong>{destination.replace(/_/g, ' ')}</strong></span>
        </div>
      )}

      {/* System Readiness Status Card */}
      <div style={{
        background: 'var(--surface)',
        border: `1px solid ${navReady ? '#2ecc71' : '#e74c3c'}`,
        borderRadius: 'var(--radius)',
        padding: '20px',
        marginBottom: '20px',
        textAlign: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>
          {navReady ? '⚡' : '⏳'}
        </div>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: navReady ? '#2ecc71' : '#e74c3c' }}>
          {navReady ? 'WHEELCHAIR READY TO SUMMON' : 'WHEELCHAIR SYSTEM INITIALIZING'}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
          {navReady 
            ? 'Select your current station below to call the wheelchair to your location.' 
            : 'Navigation hardware is starting up. Please wait for readiness.'}
        </p>

        {!navReady && (
          <button 
            onClick={handleStartNav}
            disabled={launchingNav}
            style={{
              marginTop: '14px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: launchingNav ? 'not-allowed' : 'pointer'
            }}
          >
            {launchingNav ? 'Starting Navigation...' : '🚀 Launch Navigation Hardware'}
          </button>
        )}
      </div>

      {/* Available Wheelchair Stations List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <h4 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          📍 Select Your Current Wheelchair Station:
        </h4>

        {stations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            No wheelchair stations loaded.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
            {stations.map((st, idx) => {
              const isServiceable = healthData?.location_serviceability?.[st] !== false;
              return (
                <button
                  key={idx}
                  disabled={isSending || !navReady || !isServiceable}
                  onClick={() => handleSummonClick(st)}
                  style={{
                    background: isServiceable ? 'var(--surface2)' : 'rgba(231, 76, 60, 0.08)',
                    border: `1px solid ${isServiceable ? (destination === st ? 'var(--accent)' : 'var(--border)') : 'rgba(231, 76, 60, 0.3)'}`,
                    borderRadius: 'var(--radius)',
                    padding: '20px 14px',
                    color: isServiceable ? 'var(--text)' : 'var(--text-muted)',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: (!navReady || isSending || !isServiceable) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    opacity: (navReady && isServiceable) ? 1 : 0.6,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    transition: 'transform 0.2s, border-color 0.2s'
                  }}
                  onMouseOver={(e) => {
                    if (navReady && isServiceable && !isSending) {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (navReady && isServiceable && !isSending) {
                      e.currentTarget.style.borderColor = destination === st ? 'var(--accent)' : 'var(--border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <span style={{ fontSize: '28px' }}>🦽</span>
                  <span style={{ textAlign: 'center', textTransform: 'capitalize', wordBreak: 'break-word', lineHeight: '1.3' }}>
                    {st.replace(/_/g, ' ')}
                  </span>
                  {!isServiceable && (
                    <span style={{ fontSize: '10px', color: '#e74c3c', background: 'rgba(231, 76, 60, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                      Unavailable
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

export default SummonScreen;
