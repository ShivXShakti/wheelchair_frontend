import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import WelcomeScreen from './components/WelcomeScreen';
import ModeSelection from './components/ModeSelection';
import VoiceScreen from './components/VoiceScreen';
import TextScreen from './components/TextScreen';
import TeleopScreen from './components/TeleopScreen';
import StationsScreen from './components/StationsScreen';
import SaveLocationModal from './components/SaveLocationModal';
import config from './config';

const App = () => {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [healthData, setHealthData] = useState(null);
  const [destination, setDestination] = useState(null);
  
  // Status pills
  const [status, setStatus] = useState({
    whisper: { state: 'idle', label: 'Whisper' },
    llama: { state: 'idle', label: 'LLaMA' },
    ros: { state: 'idle', label: 'ROS' },
  });

  // Feeds
  const [voiceMessages, setVoiceMessages] = useState([]);
  const [textMessages, setTextMessages] = useState([]);
  const [streamUrl, setStreamUrl] = useState('');

  // Dev Mode
  const [devMode, setDevMode] = useState(false);
  const [saveModalSource, setSaveModalSource] = useState(null); // 'current' or 'goal'

  useEffect(() => {
    if (config.SHOW_CAMERA) {
      const topic = config.CAMERA_TOPIC;
      // Use FastAPI proxy to bypass mixed-content blocker
      const url = `${config.API_BASE_URL}/camera_stream?topic=${encodeURIComponent(topic)}`;
      setStreamUrl(url);
    }
  }, []);

  // Setup speech synthesis
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.0; utt.pitch = 1.0; utt.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const eng = voices.find(v => v.lang.startsWith('en') && v.localService);
    if (eng) utt.voice = eng;
    window.speechSynthesis.speak(utt);
  };

  // Health Polling
  useEffect(() => {
    const pollHealth = async () => {
      try {
        const res = await fetch(`${config.API_BASE_URL}/health`, { cache: 'no-store' });
        const data = await res.json();
        setHealthData(data);
      } catch (err) {
        setHealthData(null); // Triggers offline UI
      }
    };
    pollHealth();
    const interval = setInterval(pollHealth, 3000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = (id, state, label) => {
    setStatus(prev => ({ ...prev, [id]: { state, label } }));
  };

  const resetStatus = () => {
    updateStatus('whisper', 'idle', 'Whisper');
    updateStatus('llama', 'idle', 'LLaMA');
    updateStatus('ros', 'idle', 'ROS');
  };

  const emergencyStop = async () => {
    speak('Emergency stop.');
    setDestination(null);
    updateStatus('ros', 'working', 'Stopping...');

    try {
      await fetch(`${config.API_BASE_URL}/stop`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devMode })
      });
      updateStatus('ros', 'done', 'Stopped ✓');
      const stopMsg = { type: 'system', style: 'stop', text: '⬛ Emergency stop sent.', actionTag: 'STOP' };
      if (currentScreen === 'voice') setVoiceMessages(prev => [...prev, stopMsg]);
      if (currentScreen === 'text') setTextMessages(prev => [...prev, stopMsg]);
    } catch {
      updateStatus('ros', 'error', 'Stop failed!');
      speak('Stop failed. Check server.');
    }
  };

  const goHome = () => {
    setCurrentScreen('home');
    resetStatus();
  };

  const startNavigation = async () => {
    try {
      await fetch(`${config.API_BASE_URL}/start_navigation`, { method: 'POST' });
    } catch (err) {
      console.error("Failed to start navigation stack:", err);
    }
  };

  const startIntelligence = async () => {
    try {
      await fetch(`${config.API_BASE_URL}/start_intelligence`, { method: 'POST' });
    } catch (err) {
      console.error("Failed to start intelligence stack:", err);
    }
  };

  const handleEnterSystem = async () => {
    if (healthData?.nav2_ready) {
      setCurrentScreen('home');
      return;
    }
    
    // Start navigation stack
    await startNavigation();
    
    // Wait until ready
    let checkCount = 0;
    const checkInterval = setInterval(async () => {
      checkCount++;
      try {
        const res = await fetch(`${config.API_BASE_URL}/health`, { cache: 'no-store' });
        const data = await res.json();
        setHealthData(data);
        if (data?.nav2_ready) {
          clearInterval(checkInterval);
          setCurrentScreen('home');
        }
      } catch (err) {
        // Keep polling
      }
      if (checkCount > 30) { // Limit to 30 attempts (30s)
        clearInterval(checkInterval);
        alert("Navigation startup is taking longer than expected. Please verify your Jetson TMUX logs.");
        setCurrentScreen('home'); // proceed anyway as fallback
      }
    }, 1000);
  };

  const addSystemBubble = (feedType, style, text, actionTag, timing = null, extra = {}) => {
    const msg = { type: 'system', style, text, actionTag, timing, ...extra };
    if (feedType === 'voice') setVoiceMessages(prev => [...prev, msg]);
    else if (feedType === 'text') setTextMessages(prev => [...prev, msg]);
  };

  const handleResponse = (data, feedType, userInput) => {
    const { action, destination: resDest, options, message, transcript, timing } = data;
    
    // Add user message
    const userMsg = { type: 'user', text: transcript ? `"${transcript}"` : `"${userInput}"` };
    if (feedType === 'voice') setVoiceMessages(prev => [...prev, userMsg]);
    else if (feedType === 'text') setTextMessages(prev => [...prev, userMsg]);

    if (['navigate','stop','resume','wait'].includes(action)) updateStatus('ros','done','Published ✓');
    else updateStatus('ros','idle','ROS');

    if (timing && timing.llm_ms != null) {
      if (timing.prematch) updateStatus('llama', 'done', `⚡ Pre-match`);
      else updateStatus('llama', 'done', `Done ${timing.llm_ms}ms`);
    }

    switch (action) {
      case 'navigate':
        addSystemBubble(feedType, 'navigate', `Navigating to: ${resDest}`, 'NAVIGATE', timing);
        setDestination(resDest);
        speak(`Navigating to ${resDest}`);
        break;
      case 'stop':
        addSystemBubble(feedType, 'stop', 'Wheelchair stopped.', 'STOP', timing);
        setDestination(null);
        speak('Wheelchair stopped.');
        break;
      case 'resume':
        addSystemBubble(feedType, 'navigate', 'Resuming navigation.', 'RESUME', timing);
        speak('Resuming navigation.');
        break;
      case 'wait':
        addSystemBubble(feedType, 'navigate', 'Waiting in place.', 'WAIT', timing);
        speak('Waiting in place.');
        break;
      case 'suggest':
        addSystemBubble(feedType, 'suggest', 'Multiple places found. Which one?', 'SUGGEST', timing, { isSuggest: true, options });
        speak(`I found ${(options||[]).length} places. Which one would you like?`);
        break;
      case 'confirm_navigation':
        addSystemBubble(feedType, 'confirm', '', 'CONFIRM', timing, { isConfirm: true, destination: resDest });
        speak(`I found ${resDest}. Do you want me to navigate there?`);
        break;
      default:
        addSystemBubble(feedType, 'none', message || "I didn't understand that.", 'NONE', timing);
    }
  };

  const executePrompt = async (prompt, feedId) => {
    if (!devMode && !healthData?.nav2_ready) {
      addSystemBubble(feedId || 'text', 'error', 'Robot is not ready to take commands.', 'NONE');
      speak("Robot is not ready to take commands.");
      return;
    }
    // Used by Feed chips and StationsScreen
    updateStatus('llama', 'working', 'Processing...');
    try {
      const res = await fetch(`${config.API_BASE_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, devMode })
      });
      const data = await res.json();
      handleResponse(data, feedId, prompt);
    } catch (err) {
      updateStatus('llama', 'error', 'Error');
      addSystemBubble(feedId, 'error', 'Server error', 'NONE');
    }
  };

  const getNav2StatusText = (statusCode) => {
    if (typeof statusCode === 'string') return statusCode;
    switch(statusCode) {
      case 1: return "Accepted";
      case 2: return "Navigating...";
      case 4: return "Reached Destination";
      case 5: return "Canceled";
      case 6: return "Failed/Aborted";
      default: return "Unknown";
    }
  };

  const isOk = healthData?.llama_server === 'up';
  const locs = healthData?.locations_loaded || 0;
  const sm = healthData?.state_machine ? ' SM' : '';
  const whisper = healthData?.whisper_model || '';

  let badgeClass = 'err';
  let badgeText = 'Server offline';

  if (healthData) {
    if (isOk) {
      badgeClass = 'ok';
      badgeText = `LLaMA ✓ ${locs}locs ${whisper}${sm}`;
    } else {
      badgeClass = 'warn';
      badgeText = 'LLaMA ✗ Server?';
    }
  } else {
    badgeText = 'Connecting...';
    badgeClass = 'warn';
  }

  return (
    <div className="shell">
      {currentScreen !== 'welcome' && <Header />}
      
      {currentScreen !== 'welcome' && (
        <div style={{display: 'flex', gap: '10px', margin: '20px 20px 0 20px'}}>
          <button className="stop-btn" style={{flex: 1, margin: 0}} onClick={emergencyStop}>
            <span className="stop-icon">⬛</span>
            STOP
          </button>
          <button 
            onClick={() => setDevMode(!devMode)}
            style={{
              padding: '0 20px', 
              background: devMode ? 'var(--accent)' : 'var(--surface2)',
              color: devMode ? '#fff' : 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {devMode ? 'Dev: ON' : 'Dev: OFF'}
          </button>
        </div>
      )}

      {currentScreen !== 'welcome' && devMode && (
        <div className="dev-panel">
          <button onClick={() => setSaveModalSource('current')}>
            💾 Save Current Pose
          </button>
          <button 
            onClick={() => setSaveModalSource('goal')}
            disabled={!healthData?.has_rviz_goal}
          >
            🎯 Save Last RViz Goal
          </button>
        </div>
      )}

      {currentScreen !== 'welcome' && (
        <div className="status-bar">
          {currentScreen !== 'text' && (
            <div className={`status-pill ${status.whisper.state}`}>
              <span className="sicon">🎙</span> {status.whisper.label}
              {status.whisper.state === 'working' && <span className="spinner"></span>}
            </div>
          )}
          <div className={`status-pill ${status.llama.state}`}>
            <span className="sicon">🧠</span> {status.llama.label}
            {status.llama.state === 'working' && <span className="spinner"></span>}
          </div>
          <div className={`status-pill ${status.ros.state !== 'working' ? (healthData?.nav2_ready ? 'done' : 'err') : 'working'}`}>
            <span className="sicon">📡</span> {status.ros.state === 'working' ? status.ros.label : (healthData?.nav2_ready ? 'ROS Ready' : 'ROS Offline')}
            {status.ros.state === 'working' && <span className="spinner"></span>}
          </div>
        </div>
      )}

      {currentScreen !== 'welcome' && (
        <div className={`health-badge ${badgeClass}`} style={{ width: 'fit-content', margin: '0 auto 10px auto', padding: '8px 16px', fontSize: '13px' }}>
          <span className="dot"></span>
          <span>{badgeText}</span>
        </div>
      )}

      {currentScreen !== 'welcome' && healthData && typeof healthData.nav2_status !== 'undefined' && (
        <div className="nav2-banner">
          <div className="nav2-status">
            <strong>Status:</strong> {getNav2StatusText(healthData.nav2_status)}
          </div>
          {(healthData.nav2_distance_remaining !== 'Unknown' && healthData.nav2_distance_remaining !== 0) && (
            <div className="nav2-distance">
              <strong>Distance:</strong> {healthData.nav2_distance_remaining}
            </div>
          )}
        </div>
      )}

      {currentScreen !== 'welcome' && config.SHOW_CAMERA && streamUrl && (
        <div className="camera-container" style={{ marginBottom: '20px' }}>
          <img 
            src={streamUrl} 
            alt="ROS Camera Stream" 
            className="camera-feed"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="camera-error" style={{ display: 'none' }}>
            <span className="sicon">⚠️</span>
            <p>Could not connect to camera stream.</p>
            <p style={{fontSize: '11px', marginTop: '4px'}}>Ensure web_video_server is running on port {config.VIDEO_SERVER_PORT}</p>
          </div>
        </div>
      )}

      {currentScreen === 'welcome' && (
        <WelcomeScreen 
          navReady={!!healthData?.nav2_ready}
          onStart={handleEnterSystem}
        />
      )}

      {currentScreen === 'home' && (
        <ModeSelection 
          setScreen={setCurrentScreen} 
          healthData={healthData}
          onStartNavigation={startNavigation}
          onStartIntelligence={startIntelligence}
        />
      )}
      
      {currentScreen === 'voice' && (
        <VoiceScreen 
          goHome={goHome} 
          destination={destination}
          handleResponse={handleResponse}
          setStatus={updateStatus}
          speak={speak}
          addSystemBubble={(style, text, actionTag) => addSystemBubble('voice', style, text, actionTag)}
          messages={voiceMessages}
          devMode={devMode}
          nav2Ready={!!healthData?.nav2_ready}
        />
      )}
      
      {currentScreen === 'text' && (
        <TextScreen 
          goHome={goHome} 
          destination={destination}
          handleResponse={handleResponse}
          setStatus={updateStatus}
          addSystemBubble={(style, text, actionTag) => addSystemBubble('text', style, text, actionTag)}
          messages={textMessages}
          devMode={devMode}
          nav2Ready={!!healthData?.nav2_ready}
          sendPrompt={executePrompt}
        />
      )}
      
      {currentScreen === 'teleop' && <TeleopScreen goHome={goHome} />}

      {currentScreen === 'stations' && (
        <StationsScreen 
          goHome={goHome}
          destination={destination}
          handleResponse={handleResponse}
          setStatus={updateStatus}
          addSystemBubble={(style, text, actionTag) => addSystemBubble('text', style, text, actionTag)}
          sendPrompt={executePrompt}
          devMode={devMode}
          nav2Ready={!!healthData?.nav2_ready}
          healthData={healthData}
        />
      )}

      {saveModalSource && (
        <SaveLocationModal 
          source={saveModalSource}
          onClose={() => setSaveModalSource(null)}
          onSuccess={(msg) => {
            alert(msg);
            setSaveModalSource(null);
          }}
        />
      )}
    </div>
  );
};

export default App;
