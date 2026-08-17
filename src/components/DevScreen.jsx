import React, { useState, useEffect } from 'react';
import config from '../config';

const DevScreen = ({ setScreen, healthData, onShutdownNavigation, onStartNavigation, onStartIntelligence, onSetInitialPose }) => {
  const [securityEnable, setSecurityEnable] = useState(healthData?.security_enable ?? true);
  const [enableDeveloper, setEnableDeveloper] = useState(healthData?.enable_developer ?? true);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [localizing, setLocalizing] = useState(false);
  const [localizeMsg, setLocalizeMsg] = useState('');
  const [bbsScoreLog, setBbsScoreLog] = useState('Loading...');
  const [scoreCutoff, setScoreCutoff] = useState(0.90);
  const [savingCutoff, setSavingCutoff] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [showRebootModal, setShowRebootModal] = useState(false);
  const [rebooting, setRebooting] = useState(false);
  const [glassRunning, setGlassRunning] = useState(true);
  const [togglingGlass, setTogglingGlass] = useState(false);

  // Fetch BBS config, config flags, and glass status on mount
  useEffect(() => {
    fetchBbsConfig();
    fetchConfig();
    fetchGlassStatus();
    const interval = setInterval(fetchGlassStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchGlassStatus = async () => {
    try {
      const res = await fetch(`${config.API_BASE_URL}/glass_detection/status`);
      const data = await res.json();
      if (data.running !== undefined) setGlassRunning(data.running);
    } catch (e) {
      console.error("Failed to fetch glass detection status:", e);
    }
  };

  const handleToggleGlass = async (action) => {
    setTogglingGlass(true);
    try {
      const res = await fetch(`${config.API_BASE_URL}/glass_detection/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      setActionMsg(data.message || `Glass detection action '${action}' sent.`);
      setTimeout(fetchGlassStatus, 1500);
    } catch (e) {
      setActionMsg(`Failed to ${action} glass detection.`);
    } finally {
      setTogglingGlass(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${config.API_BASE_URL}/config`);
      const data = await res.json();
      if (data.security_enable !== undefined) setSecurityEnable(data.security_enable);
      if (data.enable_developer !== undefined) setEnableDeveloper(data.enable_developer);
    } catch (e) {
      console.error("Failed to fetch config:", e);
    }
  };

  const fetchBbsConfig = async () => {
    try {
      const res = await fetch(`${config.API_BASE_URL}/localization/bbs_config`);
      const data = await res.json();
      if (data.score_threshold_percentage !== undefined) {
        setScoreCutoff(data.score_threshold_percentage);
      }
      if (data.live_score_log) {
        setBbsScoreLog(data.live_score_log);
      }
    } catch (e) {
      console.error("Failed to fetch BBS config:", e);
    }
  };

  const handleToggleSecurity = async () => {
    const nextVal = !securityEnable;
    setSecurityEnable(nextVal);
    try {
      await fetch(`${config.API_BASE_URL}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ security_enable: nextVal })
      });
      setActionMsg(`Security Mode set to ${nextVal ? 'ENABLED (SROS2)' : 'DISABLED (Non-Secure)'}`);
    } catch (e) {
      console.error(e);
      setActionMsg('Failed to update Security Mode');
    }
  };

  const handleToggleDeveloper = async () => {
    const nextVal = !enableDeveloper;
    setEnableDeveloper(nextVal);
    try {
      await fetch(`${config.API_BASE_URL}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable_developer: nextVal })
      });
      setActionMsg(`Developer Mode Gating set to ${nextVal ? 'ENABLED' : 'DISABLED'}`);
    } catch (e) {
      console.error(e);
      setActionMsg('Failed to update Developer Mode Gating');
    }
  };

  const handleSaveCutoff = async () => {
    setSavingCutoff(true);
    try {
      const res = await fetch(`${config.API_BASE_URL}/localization/bbs_config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score_threshold_percentage: parseFloat(scoreCutoff) })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setActionMsg(`3D-BBS Score Threshold updated to ${(parseFloat(scoreCutoff) * 100).toFixed(0)}%`);
      } else {
        setActionMsg('Failed to update Score Threshold');
      }
    } catch (e) {
      console.error(e);
      setActionMsg('Error updating Score Threshold');
    } finally {
      setSavingCutoff(false);
    }
  };

  const handleSystemReboot = async () => {
    setRebooting(true);
    try {
      await fetch(`${config.API_BASE_URL}/system/reboot`, { method: 'POST' });
      setActionMsg('System reboot (sudo reboot now) initiated. The Jetson is restarting...');
    } catch (e) {
      console.error(e);
      setActionMsg('Failed to send reboot command');
    } finally {
      setRebooting(false);
      setShowRebootModal(false);
    }
  };

  const handleContainerAction = async (action) => {
    setActionMsg(`Executing container action: ${action}...`);
    try {
      await fetch(`${config.API_BASE_URL}/containers/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      setActionMsg(`Container action '${action}' initiated successfully.`);
    } catch (e) {
      setActionMsg(`Container action '${action}' failed.`);
    }
  };

  const handleNavRelaunchPane = async (pane) => {
    setActionMsg(`Relaunching Navigation pane ${pane}...`);
    try {
      await fetch(`${config.API_BASE_URL}/nav/relaunch_pane`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pane })
      });
      setActionMsg(`Navigation pane ${pane} relaunch initiated.`);
    } catch (e) {
      setActionMsg(`Navigation pane ${pane} relaunch failed.`);
    }
  };

  const handleIntelRelaunchComponent = async (component) => {
    setActionMsg(`Relaunching AI component ${component}...`);
    try {
      await fetch(`${config.API_BASE_URL}/intelligence/relaunch_component`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ component })
      });
      setActionMsg(`AI component ${component} relaunch initiated.`);
    } catch (e) {
      setActionMsg(`AI component ${component} relaunch failed.`);
    }
  };

  const handleManualLocalize = async () => {
    const loc = selectedLocation || (healthData?.has_last_location ? 'last_location' : healthData?.location_names?.[0]);
    if (!loc) {
      setLocalizeMsg('No locations available.');
      return;
    }
    setLocalizing(true);
    setLocalizeMsg('');
    try {
      const success = await onSetInitialPose(loc);
      if (success) {
        setLocalizeMsg('Initial pose sent! Aligning...');
      } else {
        setLocalizeMsg('Failed to set initial pose.');
      }
    } catch (e) {
      console.error(e);
      setLocalizeMsg('Error occurred.');
    } finally {
      setLocalizing(false);
    }
  };

  const locationNames = healthData?.location_names || [];
  const hasLastLocation = healthData?.has_last_location || false;
  const navReady = !!healthData?.nav2_ready;

  return (
    <div id="screen-dev" style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      {/* Top Header Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button 
          className="back-btn" 
          onClick={() => setScreen('welcome')}
          style={{ 
            padding: '8px 16px', 
            background: 'var(--surface2)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius)', 
            color: 'var(--text)', 
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          ← Back to Welcome Screen
        </button>
        <h2 style={{ margin: 0, fontSize: '20px', background: 'linear-gradient(135deg, #f39c12, #e67e22)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🛠️ Developer Control Dashboard
        </h2>
      </div>

      {actionMsg && (
        <div style={{ padding: '12px 16px', background: '#2c3e50', border: '1px solid #34495e', borderRadius: 'var(--radius)', color: '#ecf0f1', fontSize: '13px', textAlign: 'center', fontWeight: 500 }}>
          ℹ️ {actionMsg}
        </div>
      )}

      {/* SECTION 1: SYSTEM CONTROLS & SECURITY */}
      <div className="status-panel" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#f39c12' }}>⚙️ SYSTEM &amp; SECURITY CONTROLS</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Security Flag Toggle */}
          <div style={{ padding: '14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>ROS 2 SECURITY MODE</div>
            <button 
              onClick={handleToggleSecurity}
              style={{
                width: '100%',
                padding: '10px',
                background: securityEnable ? 'linear-gradient(135deg, #27ae60, #2ecc71)' : 'linear-gradient(135deg, #e67e22, #f39c12)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {securityEnable ? '🔒 Security ENABLED (SROS2)' : '🔓 Non-Secure (CycloneDDS)'}
            </button>
          </div>

          {/* Enable Developer Toggle */}
          <div style={{ padding: '14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>DEVELOPER MODE GATING</div>
            <button 
              onClick={handleToggleDeveloper}
              style={{
                width: '100%',
                padding: '10px',
                background: enableDeveloper ? 'linear-gradient(135deg, #2980b9, #3498db)' : 'linear-gradient(135deg, #7f8c8d, #95a5a6)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {enableDeveloper ? '🛠️ Developer Mode Allowed' : '🚫 Developer Mode Hidden'}
            </button>
          </div>

          {/* Shutdown Navigation */}
          <div style={{ padding: '14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>NAVIGATION STACK</div>
            <button 
              onClick={onShutdownNavigation}
              style={{
                width: '100%',
                padding: '10px',
                background: 'linear-gradient(135deg, #c0392b, #e74c3c)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🛑 Shutdown Navigation Stack
            </button>
          </div>

          {/* System Reboot */}
          <div style={{ padding: '14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>JETSON HOST OS</div>
            <button 
              onClick={() => setShowRebootModal(true)}
              style={{
                width: '100%',
                padding: '10px',
                background: 'linear-gradient(135deg, #8e44ad, #9b59b6)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🔄 System Reboot (sudo reboot now)
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: CONTAINER MANAGEMENT */}
      <div className="status-panel" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#3498db' }}>🐳 DOCKER CONTAINER MANAGEMENT</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <button onClick={() => handleContainerAction('build_nav')} style={{ padding: '12px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontWeight: 600, cursor: 'pointer' }}>
            🏗️ Build / Restart Nav Container
          </button>
          <button onClick={() => handleContainerAction('run_nav')} style={{ padding: '12px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontWeight: 600, cursor: 'pointer' }}>
            ▶️ Run Navigation Container
          </button>
          <button onClick={() => handleContainerAction('run_intelligence')} style={{ padding: '12px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontWeight: 600, cursor: 'pointer' }}>
            🧠 Run Intelligence Container
          </button>
        </div>
      </div>

      {/* SECTION 3: GRANULAR NAVIGATION RECOVERY PANEL */}
      <div className="status-panel" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#2ecc71' }}>🗺️ NAVIGATION STACK RECOVERY PANEL</h3>
          <button onClick={() => handleNavRelaunchPane('all')} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #27ae60, #2ecc71)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600, cursor: 'pointer' }}>
            🚀 Relaunch Complete Navigation Stack (All Panes)
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <button onClick={() => handleNavRelaunchPane('0')} style={{ padding: '12px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'left', cursor: 'pointer' }}>
            <strong>🤖 Pane 0: Bringup</strong>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>CAN Bus, Motors &amp; LiDAR Sensors</div>
          </button>
          <button onClick={() => handleNavRelaunchPane('1')} style={{ padding: '12px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'left', cursor: 'pointer' }}>
            <strong>📍 Pane 1: 3D-BBS &amp; Nav2</strong>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>3D Localization &amp; Nav2 Controller</div>
          </button>
          <button onClick={() => handleNavRelaunchPane('2')} style={{ padding: '12px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'left', cursor: 'pointer' }}>
            <strong>👁️ Pane 2: Silica</strong>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Silica Glass Reconstructor Node</div>
          </button>
          <button onClick={() => handleNavRelaunchPane('3')} style={{ padding: '12px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'left', cursor: 'pointer' }}>
            <strong>🌐 Pane 3: Bridge &amp; Video</strong>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Web Video Server &amp; ROS Bridge</div>
          </button>
        </div>
      </div>

      {/* SECTION 3.5: SILICA GLASS DETECTION NODE CONTROL */}
      <div className="status-panel" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#e67e22' }}>🔍 SILICA GLASS DETECTION CONTROL (Window 2)</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Controls `ros2 launch silica_ros align_metric.launch.py` (Camera PointCloud &amp; Glass Costmap Reconstruction)
            </div>
          </div>
          <span style={{ 
            padding: '6px 12px', 
            borderRadius: '12px', 
            fontSize: '12px', 
            fontWeight: 700, 
            background: glassRunning ? 'rgba(39, 174, 96, 0.2)' : 'rgba(231, 76, 60, 0.2)',
            color: glassRunning ? '#2ecc71' : '#e74c3c',
            border: `1px solid ${glassRunning ? '#2ecc71' : '#e74c3c'}`
          }}>
            {glassRunning ? '🟢 RUNNING' : '🔴 STOPPED'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => handleToggleGlass('stop')}
            disabled={togglingGlass}
            style={{ 
              flex: 1, 
              padding: '12px', 
              background: 'linear-gradient(135deg, #c0392b, #e74c3c)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 'var(--radius)', 
              fontWeight: 600, 
              cursor: togglingGlass ? 'not-allowed' : 'pointer' 
            }}
          >
            🛑 Stop / Terminate Glass Detection
          </button>
          
          <button 
            onClick={() => handleToggleGlass('start')}
            disabled={togglingGlass}
            style={{ 
              flex: 1, 
              padding: '12px', 
              background: 'linear-gradient(135deg, #27ae60, #2ecc71)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 'var(--radius)', 
              fontWeight: 600, 
              cursor: togglingGlass ? 'not-allowed' : 'pointer' 
            }}
          >
            ▶️ Start / Relaunch Glass Detection
          </button>
        </div>
      </div>

      {/* SECTION 4: GRANULAR AI INTELLIGENCE RECOVERY PANEL */}
      <div className="status-panel" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#9b59b6' }}>🧠 AI INTELLIGENCE RECOVERY PANEL</h3>
          <button onClick={() => handleIntelRelaunchComponent('all')} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #8e44ad, #9b59b6)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600, cursor: 'pointer' }}>
            ⚡ Relaunch Complete AI Stack
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <button onClick={() => handleIntelRelaunchComponent('silica')} style={{ padding: '14px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'left', cursor: 'pointer' }}>
            <strong>🔬 Silica Glass Detection Node</strong>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Relaunches Python TAESD+UNet AI inference</div>
          </button>
          <button onClick={() => handleIntelRelaunchComponent('llm')} style={{ padding: '14px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'left', cursor: 'pointer' }}>
            <strong>🎙️ LLaMA &amp; Whisper LLM Server</strong>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Relaunches whisper_llm_server_v4.sh</div>
          </button>
        </div>
      </div>

      {/* SECTION 5: 3D-BBS LOCALIZATION & MATCH SCORE PANEL */}
      <div className="status-panel" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#16a085' }}>📍 3D-BBS LOCALIZATION &amp; MATCH SCORE MONITOR</h3>
        
        {/* Score & Threshold Settings */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div style={{ padding: '14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>LIVE 3D-BBS SCORE LOG</label>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', background: '#111', padding: '10px', borderRadius: '4px', color: '#2ecc71', wordBreak: 'break-all' }}>
              {bbsScoreLog}
            </div>
            <button onClick={fetchBbsConfig} style={{ marginTop: '8px', padding: '4px 10px', fontSize: '11px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px', cursor: 'pointer' }}>
              🔄 Refresh Score
            </button>
          </div>

          <div style={{ padding: '14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              SCORE CONFIDENCE CUTOFF THRESHOLD: <strong>{(parseFloat(scoreCutoff) * 100).toFixed(0)}%</strong> (`score_threshold_percentage`)
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input 
                type="number" 
                step="0.05" 
                min="0.50" 
                max="1.00" 
                value={scoreCutoff} 
                onChange={(e) => setScoreCutoff(e.target.value)}
                style={{ flex: 1, padding: '10px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '14px' }}
              />
              <button 
                onClick={handleSaveCutoff}
                disabled={savingCutoff}
                style={{ padding: '10px 16px', background: 'linear-gradient(135deg, #16a085, #1abc9c)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600, cursor: savingCutoff ? 'not-allowed' : 'pointer' }}
              >
                {savingCutoff ? 'Saving...' : 'Save Cutoff'}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Directly updates `ros2_test.yaml` cutoff threshold percentage.
            </div>
          </div>
        </div>

        {/* Manual Localization Controls */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Manual Pose Initialization (Semantics Fallback)</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              style={{ flex: 1, minWidth: '200px', padding: '10px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '14px' }}
            >
              {selectedLocation === '' && <option value="">-- Choose Location --</option>}
              {hasLastLocation && <option value="last_location">📍 Wheelchair Last Location</option>}
              {locationNames.map((name) => (
                <option key={name} value={name}>🏢 {name}</option>
              ))}
            </select>
            <button
              onClick={handleManualLocalize}
              disabled={localizing}
              style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #11998e, #38ef7d)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600, cursor: localizing ? 'not-allowed' : 'pointer' }}
            >
              {localizing ? 'Setting Pose...' : 'Set Pose'}
            </button>
          </div>
          {localizeMsg && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: localizeMsg.includes('Failed') ? '#e74c3c' : '#2ecc71', fontWeight: 500 }}>
              {localizeMsg}
            </div>
          )}
        </div>
      </div>

      {/* REBOOT CONFIRMATION MODAL */}
      {showRebootModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid #e74c3c', borderRadius: 'var(--radius)', padding: '30px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <h3 style={{ color: '#e74c3c', marginTop: 0 }}>⚠️ CONFIRM SYSTEM REBOOT</h3>
            <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: '1.5' }}>
              Are you sure you want to reboot the complete wheelchair system?
              This will execute <strong>`sudo reboot now`</strong> on the Jetson.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
              <button 
                onClick={() => setShowRebootModal(false)}
                disabled={rebooting}
                style={{ padding: '10px 20px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSystemReboot}
                disabled={rebooting}
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #c0392b, #e74c3c)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600, cursor: rebooting ? 'not-allowed' : 'pointer' }}
              >
                {rebooting ? 'Rebooting...' : 'Yes, Reboot Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevScreen;
