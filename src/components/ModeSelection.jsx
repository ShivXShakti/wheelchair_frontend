import React from 'react';

const ModeSelection = ({ setScreen }) => {
  return (
    <div id="screen-home" style={{ display: 'flex' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        SELECT INPUT MODE
      </p>
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
        <div className="mode-card" onClick={() => setScreen('teleop')}>
          <div className="mode-icon">🕹️</div>
          <div className="mode-label">Teleop</div>
          <div className="mode-desc">D-pad control</div>
        </div>
        <div className="mode-card" onClick={() => setScreen('stations')}>
          <div className="mode-icon">📍</div>
          <div className="mode-label">Stations</div>
          <div className="mode-desc">Select destination</div>
        </div>
      </div>
    </div>
  );
};

export default ModeSelection;
