import React, { useState } from 'react';

const ModeSelection = ({ setScreen, healthData, onStartNavigation, onStartIntelligence }) => {
  const [subModeActive, setSubModeActive] = useState(false);
  const [launchingNav, setLaunchingNav] = useState(false);
  const [launchingIntel, setLaunchingIntel] = useState(false);

  const navReady = !!healthData?.nav2_ready;
  const intelReady = healthData?.llama_server === 'up';

  const handleStartNav = async () => {
    setLaunchingNav(true);
    await onStartNavigation();
    setTimeout(() => setLaunchingNav(false), 3000);
  };

  const handleStartIntel = async () => {
    setLaunchingIntel(true);
    await onStartIntelligence();
    setTimeout(() => setLaunchingIntel(false), 3000);
  };

  const selectTeleop = () => {
    if (!navReady) {
      handleStartNav();
      alert("Navigation stack is offline. Initiating launch. Please wait...");
      return;
    }
    setScreen('teleop');
  };

  const selectAutonomous = () => {
    if (!navReady || !intelReady) {
      if (!navReady) handleStartNav();
      if (!intelReady) handleStartIntel();
      alert("Launching required services for Autonomous Navigation. Please wait...");
      return;
    }
    setSubModeActive(true);
  };

  if (subModeActive) {
    return (
      <div id="screen-home" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '10px' }}>
          <button 
            className="back-btn" 
            onClick={() => setSubModeActive(false)}
            style={{ 
              padding: '6px 12px', 
              background: 'var(--surface2)', 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius)', 
              color: 'var(--text)', 
              cursor: 'pointer' 
            }}
          >
            ← Back
          </button>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            SELECT AI INPUT MODE
          </p>
        </div>
        <div className="mode-grid">
          <div className="mode-card" onClick={() => setScreen('voice')}>
            <div className="mode-icon">🎙️</div>
            <div className="mode-label">Voice</div>
            <div className="mode-desc">Hold to speak</div>
          </div>
          <div className="mode-card" onClick={() => setScreen('text')}>
            <div className="mode-icon">⌨️</div>
            <div className="mode-label">Text</div>
            <div className="mode-desc">Type a command</div>
          </div>
          <div className="mode-card" onClick={() => setScreen('stations')}>
            <div className="mode-icon">📍</div>
            <div className="mode-label">Stations</div>
            <div className="mode-desc">Select destination</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="screen-home" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
        CHOOSE NAVIGATION MODE
      </p>
      
      <div className="mode-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div 
          className="mode-card" 
          onClick={selectTeleop}
          style={{ 
            padding: '24px', 
            textAlign: 'center',
            opacity: navReady ? 1 : 0.8,
            border: navReady ? '1px solid var(--accent)' : '1px solid var(--border)'
          }}
        >
          <div className="mode-icon" style={{ fontSize: '40px' }}>🕹️</div>
          <div className="mode-label" style={{ fontSize: '18px', marginTop: '12px' }}>Teleoperation Mode</div>
          <div className="mode-desc" style={{ marginTop: '8px' }}>Manual Joystick &amp; D-pad control</div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: navReady ? '#2ecc71' : '#e74c3c', fontWeight: 600 }}>
            {navReady ? 'Ready ✓' : 'Click to Launch Navigation'}
          </div>
        </div>

        <div 
          className="mode-card" 
          onClick={selectAutonomous}
          style={{ 
            padding: '24px', 
            textAlign: 'center',
            opacity: (navReady && intelReady) ? 1 : 0.8,
            border: (navReady && intelReady) ? '1px solid var(--accent)' : '1px solid var(--border)'
          }}
        >
          <div className="mode-icon" style={{ fontSize: '40px' }}>🧠</div>
          <div className="mode-label" style={{ fontSize: '18px', marginTop: '12px' }}>Autonomous Mode</div>
          <div className="mode-desc" style={{ marginTop: '8px' }}>SROS2 AI Voice &amp; Text navigation</div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: (navReady && intelReady) ? '#2ecc71' : '#e74c3c', fontWeight: 600 }}>
            {(navReady && intelReady) ? 'Ready ✓' : 'Click to Launch AI Services'}
          </div>
        </div>
      </div>

      {/* Status & Relaunch Control Panel */}
      <div className="status-panel" style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        marginTop: '12px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-muted)' }}>SYSTEM RECOVERY PANEL</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Navigation Stack */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="dot" style={{ 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                background: launchingNav ? '#f39c12' : (navReady ? '#2ecc71' : '#e74c3c'),
                display: 'inline-block'
              }}></span>
              <span style={{ fontSize: '14px' }}>Navigation Stack</span>
            </div>
            <button 
              onClick={handleStartNav}
              disabled={launchingNav}
              className="action-btn"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: launchingNav ? 'var(--surface2)' : 'var(--accent)',
                color: '#white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: launchingNav ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              {launchingNav ? 'Relaunching...' : (navReady ? 'Relaunch' : 'Launch')}
            </button>
          </div>

          {/* AI Intelligence */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="dot" style={{ 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                background: launchingIntel ? '#f39c12' : (intelReady ? '#2ecc71' : '#e74c3c'),
                display: 'inline-block'
              }}></span>
              <span style={{ fontSize: '14px' }}>AI Intelligence (LLaMA/Whisper)</span>
            </div>
            <button 
              onClick={handleStartIntel}
              disabled={launchingIntel}
              className="action-btn"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: launchingIntel ? 'var(--surface2)' : 'var(--accent)',
                color: '#white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: launchingIntel ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              {launchingIntel ? 'Relaunching...' : (intelReady ? 'Relaunch' : 'Launch')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModeSelection;
