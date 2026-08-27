import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import WelcomeScreen from './components/WelcomeScreen';
import ModeSelection from './components/ModeSelection';
import VoiceScreen from './components/VoiceScreen';
import TextScreen from './components/TextScreen';
import TeleopScreen from './components/TeleopScreen';
import StationsScreen from './components/StationsScreen';
import SaveLocationModal from './components/SaveLocationModal';
import DevScreen from './components/DevScreen';
import SummonScreen from './components/SummonScreen';
import config from './config';

const App = () => {
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

  useEffect(() => {
    if (config.SHOW_CAMERA) {
      const topic = config.CAMERA_TOPIC || '/glass_detection/overlay';
      const url = `${config.API_BASE_URL}/camera_stream?topic=${encodeURIComponent(topic)}`;
      setStreamUrl(url);
    }
  }, []);

  // Dev Mode & Security States
  const [devMode, setDevMode] = useState(false);
  const [saveModalSource, setSaveModalSource] = useState(null); // 'current' or 'goal'

  // Client Session & Pairing States
  const [clientId] = useState(() => {
    let id = localStorage.getItem("wheelchair_client_id");
    if (!id) {
      id = 'client_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem("wheelchair_client_id", id);
    }
    return id;
  });

  const [currentScreen, setCurrentScreen] = useState(() => {
    // If URL has ?mode=summon or if device is not paired, go straight to summon screen!
    if (window.location.search.includes('mode=summon') || !localStorage.getItem("device_pairing_token")) {
      return 'summon';
    }
    return 'welcome';
  });

  const [sessionAllowed, setSessionAllowed] = useState(true);
  const [sessionBlockedReason, setSessionBlockedReason] = useState('');

  // Device Pairing & Dev Password Modals
  const [isPaired, setIsPaired] = useState(() => !!localStorage.getItem("device_pairing_token"));
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [pairingKeyInput, setPairingKeyInput] = useState('');
  const [pairingMsg, setPairingMsg] = useState('');
  const [verifyingPairing, setVerifyingPairing] = useState(false);

  const [showDevPassModal, setShowDevPassModal] = useState(false);
  const [devPassInput, setDevPassInput] = useState('');
  const [devPassMsg, setDevPassMsg] = useState('');
  const [verifyingDevPass, setVerifyingDevPass] = useState(false);
  const [isDevAuthenticated, setIsDevAuthenticated] = useState(false);

  // Session Heartbeat Polling
  useEffect(() => {
    // If the mobile user completed their summoning session, STOP sending heartbeats!
    if (currentScreen === 'summon_disconnected') return;

    const sendHeartbeat = async () => {
      try {
        const token = localStorage.getItem("device_pairing_token") || "";
        const res = await fetch(`${config.API_BASE_URL}/session/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            client_id: clientId,
            is_paired: isPaired || !!token,
            pairing_token: token
          })
        });
        const data = await res.json();
        if (data.allowed !== undefined) {
          const allowed = data.allowed || isPaired || !!token;
          setSessionAllowed(allowed);
          if (allowed) {
            setSessionBlockedReason(null);
          } else {
            setSessionBlockedReason(data.message || 'Maximum concurrent user limit reached.');
          }
        }
      } catch (e) {
        console.error("Heartbeat error:", e);
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 4000);

    const handleBeforeUnload = () => {
      navigator.sendBeacon(`${config.API_BASE_URL}/session/disconnect`, JSON.stringify({ client_id: clientId }));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [clientId, currentScreen, isPaired]);

  // Check if Device Pairing Modal should be shown (Only for full on-board system access)
  useEffect(() => {
    if (currentScreen === 'summon' || currentScreen === 'summon_disconnected') {
      setShowPairingModal(false);
      return;
    }
    if (healthData?.enable_developer !== false) {
      if (!localStorage.getItem("device_pairing_token")) {
        setShowPairingModal(true);
      } else {
        setShowPairingModal(false);
      }
    } else {
      setShowPairingModal(false);
    }
  }, [healthData, currentScreen]);

  const handleVerifyPairing = async (e) => {
    e.preventDefault();
    if (!pairingKeyInput.trim()) {
      setPairingMsg('❌ Please enter the Secret Device Pairing Key.');
      return;
    }
    setVerifyingPairing(true);
    setPairingMsg('');
    try {
      const res = await fetch(`${config.API_BASE_URL}/device/verify_pairing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairing_key: pairingKeyInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("device_pairing_token", data.token);
        setIsPaired(true);
        setShowPairingModal(false);
        setPairingKeyInput('');
      } else {
        setPairingMsg(`❌ ${data.message || 'Incorrect pairing key.'}`);
      }
    } catch (e) {
      console.error(e);
      setPairingMsg('❌ Error verifying pairing key.');
    } finally {
      setVerifyingPairing(false);
    }
  };

  const handleVerifyDevPassword = async (e) => {
    e.preventDefault();
    if (!devPassInput) {
      setDevPassMsg('❌ Please enter Developer Password.');
      return;
    }
    setVerifyingDevPass(true);
    setDevPassMsg('');
    try {
      const res = await fetch(`${config.API_BASE_URL}/dev/verify_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: devPassInput })
      });
      const data = await res.json();
      if (data.success) {
        setIsDevAuthenticated(true);
        setShowDevPassModal(false);
        setDevPassInput('');
        setCurrentScreen('dev');
      } else {
        setDevPassMsg(`❌ ${data.message || 'Incorrect password.'}`);
      }
    } catch (e) {
      console.error(e);
      setDevPassMsg('❌ Error verifying password.');
    } finally {
      setVerifyingDevPass(false);
    }
  };

  const handleOpenDevDashboard = () => {
    if (isDevAuthenticated || currentScreen === 'dev') {
      if (currentScreen === 'dev') {
        setCurrentScreen('welcome');
      } else {
        setCurrentScreen('dev');
      }
    } else {
      setShowDevPassModal(true);
    }
  };

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
    // Replace underscores with spaces so TTS pronounces natural words (e.g. "wheelchair station bodh 105")
    const cleanText = text ? text.replace(/_/g, ' ') : '';
    const utt = new SpeechSynthesisUtterance(cleanText);
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

  // Helper to check if a nav status value indicates arrival / destination reached
  const isStatusReached = (statusVal) => {
    if (!statusVal || statusVal === 'Unknown' || statusVal === 'Idle') return false;
    if (statusVal === 4) return true;
    let str = '';
    if (typeof statusVal === 'object') {
      str = JSON.stringify(statusVal).toLowerCase();
    } else {
      str = String(statusVal).toLowerCase();
    }
    return str.includes('reached') || str.includes('succeeded') || str.includes('status 4') || str.includes('"status": 4') || str.includes('"status": "reached"') || str.includes('"status":"reached"') || str.includes('arrived');
  };

  // Arrival Tracker & Rider Continuation Modal
  const [prevNav2Status, setPrevNav2Status] = useState(null);
  const [showUseWheelchairModal, setShowUseWheelchairModal] = useState(false);
  const [arrivedStationName, setArrivedStationName] = useState('');
  const [showArrivalContinuationModal, setShowArrivalContinuationModal] = useState(false);
  const timeoutVal = config.AUTO_RELEASE_TIMEOUT_SEC || 10;
  const [arrivedGoalName, setArrivedGoalName] = useState('');
  const [countdownSeconds, setCountdownSeconds] = useState(timeoutVal);

  // Teleoperating Idle Timer Ref
  const teleopTimeoutRef = useRef(null);

  const handleTeleopActivity = (active) => {
    // Clear any existing idle timeout when there is joystick activity
    if (teleopTimeoutRef.current) {
      clearTimeout(teleopTimeoutRef.current);
      teleopTimeoutRef.current = null;
    }

    if (active === false) {
      // Joystick released: start idle countdown of teleope_idle_f seconds
      const idleSeconds = config.teleope_idle_f || 10;
      teleopTimeoutRef.current = setTimeout(() => {
        speak("Do you want to proceed further to another location?");
        setArrivedGoalName("Teleop Mode");
        setArrivedStationName("Teleop Mode");
        setShowArrivalContinuationModal(true);
        setCurrentScreen('home');
        try {
          fetch(`${config.API_BASE_URL}/wheelchair/usage_state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: 'in_use', station: 'Teleop Mode' })
          });
        } catch(e) {}
      }, idleSeconds * 1000);
    }
  };

  // Auto-close residual arrival modal and clear destination when wheelchair is ready_to_summon or summon_cancelled
  useEffect(() => {
    if (healthData?.usage_state === 'ready_to_summon' || healthData?.usage_state === 'summon_cancelled') {
      setShowUseWheelchairModal(false);
      setDestination(null);
    }
  }, [healthData?.usage_state]);

  // Configurable Auto-Timeout for Arrival Continuation Modal
  useEffect(() => {
    let timer = null;
    const initialSec = config.AUTO_RELEASE_TIMEOUT_SEC || 10;
    if (showArrivalContinuationModal) {
      setCountdownSeconds(initialSec);
      timer = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Timeout expired! Auto-release wheelchair state to ready_to_summon
            handleReleaseWheelchair();
            setShowArrivalContinuationModal(false);
            setCurrentScreen('welcome');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdownSeconds(initialSec);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showArrivalContinuationModal]);

  // Configurable Auto-Timeout for Use Wheelchair Modal (Unauthorized Summoner)
  useEffect(() => {
    let timer = null;
    const initialSec = config.AUTO_RELEASE_TIMEOUT_SEC || 10;
    if (showUseWheelchairModal) {
      timer = setTimeout(() => {
        handleReleaseWheelchair();
        setShowUseWheelchairModal(false);
        setDestination(null);
      }, initialSec * 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showUseWheelchairModal]);

  const handleContinuationYes = () => {
    if (teleopTimeoutRef.current) {
      clearTimeout(teleopTimeoutRef.current);
      teleopTimeoutRef.current = null;
    }
    setShowArrivalContinuationModal(false);
  };

  const handleContinuationNo = async () => {
    if (teleopTimeoutRef.current) {
      clearTimeout(teleopTimeoutRef.current);
      teleopTimeoutRef.current = null;
    }
    setShowArrivalContinuationModal(false);
    await handleReleaseWheelchair();
    setCurrentScreen('welcome');
  };

  useEffect(() => {
    if (!healthData || currentScreen === 'summon_disconnected') return;
    const currentStatus = healthData.nav2_status;
    const isReached = isStatusReached(currentStatus);
    const wasNotReached = !isStatusReached(prevNav2Status);

    if (isReached && wasNotReached) {
      const locName = destination || healthData?.last_destination || arrivedStationName || 'destination';
      const isUnauthSummoner = (currentScreen === 'summon' && !localStorage.getItem("device_pairing_token"));
      
      if (isUnauthSummoner) {
        // Unauthorized summoning portal: ONLY show arrival prompt if THIS session is actively summoning
        const isActivelySummoning = (healthData?.usage_state === 'summoning') && (!!destination || !!healthData?.active_summon_station);
        if (isActivelySummoning) {
          speak(`Reached ${locName}. Please press button to use wheelchair.`);
          setArrivedStationName(locName);
          setShowUseWheelchairModal(true);
        } else {
          setShowUseWheelchairModal(false);
        }
      } else {
        // Authorized / On-Board Wheelchair Tablet
        speak(`Reached ${locName}. Do you want to proceed further to another location?`);
        setArrivedGoalName(locName);
        setArrivedStationName(locName);
        setShowArrivalContinuationModal(true);
        try {
          fetch(`${config.API_BASE_URL}/wheelchair/usage_state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: 'in_use', station: locName })
          });
        } catch(e) {}
      }
    }
    setPrevNav2Status(currentStatus);
  }, [healthData?.nav2_status, healthData?.usage_state, healthData?.active_summon_station, currentScreen, destination, prevNav2Status, arrivedStationName, healthData?.last_destination]);

  const handleUseWheelchairClick = async () => {
    speak("Please use wheelchair tab for further navigation.");
    setShowUseWheelchairModal(false);
    
    // 1. Set wheelchair usage state to in_use on backend
    try {
      await fetch(`${config.API_BASE_URL}/wheelchair/usage_state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'in_use', station: arrivedStationName || destination || '' })
      });
    } catch(e) {}

    // 2. Send immediate disconnect request to backend
    try {
      await fetch(`${config.API_BASE_URL}/session/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId })
      });
      navigator.sendBeacon(`${config.API_BASE_URL}/session/disconnect`, JSON.stringify({ client_id: clientId }));
    } catch(e) {}

    // 3. Remove client ID so future connections require a new session
    localStorage.removeItem("wheelchair_client_id");

    // 4. Transition mobile summoner to clean summon_disconnected screen
    setCurrentScreen('summon_disconnected');
    setDestination(null);
  };

  const handleReleaseWheelchair = async () => {
    try {
      await fetch(`${config.API_BASE_URL}/wheelchair/usage_state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'ready_to_summon', station: '' })
      });
    } catch(e) {}
    speak("Wheelchair released and ready for new summoning.");
  };

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
    
    // Set destination name for the continuation modal
    const locName = destination || healthData?.last_destination || arrivedStationName || 'Last Location';
    setArrivedGoalName(locName);
    setArrivedStationName(locName);

    setDestination(null);
    updateStatus('ros', 'working', 'Stopping...');

    // Trigger continuation modal and transition to home screen
    setShowArrivalContinuationModal(true);
    setCurrentScreen('home');

    // Make sure usage_state is locked to in_use during stop decision
    try {
      fetch(`${config.API_BASE_URL}/wheelchair/usage_state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'in_use', station: locName })
      });
    } catch(e) {}

    const payload = JSON.stringify({ devMode });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600);

    // 1. Send parallel high-priority fetch and sendBeacon to ensure immediate delivery
    try {
      fetch(`${config.API_BASE_URL}/stop`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        priority: 'high',
        signal: controller.signal
      }).catch(() => {});

      try {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(`${config.API_BASE_URL}/stop`, blob);
      } catch (e) {
        console.warn("Beacon stop failed:", e);
      }

      // 2. Perform a second redundant high-priority fetch request
      await fetch(`${config.API_BASE_URL}/stop`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        priority: 'high'
      });

      updateStatus('ros', 'done', 'Stopped ✓');
      const stopMsg = { type: 'system', style: 'stop', text: '⬛ Emergency stop sent.', actionTag: 'STOP' };
      if (currentScreen === 'voice') setVoiceMessages(prev => [...prev, stopMsg]);
      if (currentScreen === 'text') setTextMessages(prev => [...prev, stopMsg]);
    } catch {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(`${config.API_BASE_URL}/stop`, blob);
      } catch (e) {}
      updateStatus('ros', 'done', 'Stopped ✓');
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const goHome = () => {
    if (teleopTimeoutRef.current) {
      clearTimeout(teleopTimeoutRef.current);
      teleopTimeoutRef.current = null;
    }
    setCurrentScreen('home');
    resetStatus();
  };

  const startNavigation = async () => {
    console.log("[App] startNavigation() called. API_BASE_URL =", config.API_BASE_URL);
    try {
      const url = `${config.API_BASE_URL}/start_navigation`;
      console.log("[App] Fetching url:", url);
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      console.log("[App] start_navigation response:", data);
    } catch (err) {
      console.error("[App] Failed to start navigation stack:", err);
    }
  };

  const startIntelligence = async () => {
    try {
      await fetch(`${config.API_BASE_URL}/start_intelligence`, { method: 'POST' });
    } catch (err) {
      console.error("Failed to start intelligence stack:", err);
    }
  };

  const shutdownNavigation = async () => {
    const confirmShutdown = window.confirm("Are you sure you want to completely shutdown the navigation system? This will stop all sensors and return to the welcome screen.");
    if (!confirmShutdown) return;

    try {
      setCurrentScreen('welcome');
      await fetch(`${config.API_BASE_URL}/shutdown_navigation`, { method: 'POST' });
    } catch (err) {
      console.error("Failed to shutdown navigation stack:", err);
    }
  };

  const setInitialPose = async (location) => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/set_initial_pose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location })
      });
      const data = await response.json();
      return data.status === 'success';
    } catch (err) {
      console.error("Failed to set initial pose:", err);
      return false;
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
      {currentScreen !== 'welcome' && currentScreen !== 'summon' && <Header />}
      
      {currentScreen !== 'welcome' && currentScreen !== 'summon' && (
        <div style={{display: 'flex', gap: '10px', margin: '20px 20px 0 20px'}}>
          <button className="stop-btn" style={{flex: 1, margin: 0}} onClick={emergencyStop}>
            <span className="stop-icon">⬛</span>
            STOP
          </button>
          {healthData?.enable_developer !== false && (
            <button 
              onClick={handleOpenDevDashboard}
              style={{
                padding: '0 20px', 
                background: currentScreen === 'dev' ? '#f39c12' : 'var(--surface2)',
                color: currentScreen === 'dev' ? '#fff' : 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {currentScreen === 'dev' ? '🛠️ Dev Mode: Active' : '🛠️ Dev Dashboard'}
            </button>
          )}
        </div>
      )}

      {currentScreen !== 'welcome' && currentScreen !== 'summon' && currentScreen !== 'dev' && devMode && (
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

      {currentScreen !== 'welcome' && currentScreen !== 'summon' && (
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

      {config.SHOW_CAMERA && streamUrl && currentScreen !== 'summon' && (
        <div className="camera-container" style={{ marginBottom: '20px' }}>
          <img 
            src={streamUrl} 
            alt="ROS Camera Stream" 
            className="camera-feed"
            onError={(e) => {
              if (streamUrl.includes('/glass_detection/overlay')) {
                const fallbackUrl = `${config.API_BASE_URL}/camera_stream?topic=${encodeURIComponent('/camera1/color/image_raw')}`;
                setStreamUrl(fallbackUrl);
              } else {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
              }
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
          healthData={healthData}
          onSetInitialPose={setInitialPose}
          setScreen={setCurrentScreen}
          onOpenDev={handleOpenDevDashboard}
        />
      )}

      {currentScreen === 'dev' && (
        <DevScreen 
          setScreen={setCurrentScreen}
          healthData={healthData}
          onShutdownNavigation={shutdownNavigation}
          onStartNavigation={startNavigation}
          onStartIntelligence={startIntelligence}
          onSetInitialPose={setInitialPose}
        />
      )}

      {currentScreen === 'home' && (
        <ModeSelection 
          setScreen={setCurrentScreen} 
          healthData={healthData}
          onStartNavigation={startNavigation}
          onStartIntelligence={startIntelligence}
          onReleaseWheelchair={handleReleaseWheelchair}
          isPaired={isPaired}
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
      
      {currentScreen === 'teleop' && (
        <TeleopScreen 
          goHome={goHome} 
          onActivity={handleTeleopActivity}
        />
      )}

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

      {(currentScreen === 'summon' || currentScreen === 'summon_disconnected') && (
        <SummonScreen 
          goHome={goHome}
          destination={destination}
          handleResponse={handleResponse}
          setStatus={updateStatus}
          addSystemBubble={(style, text, actionTag) => addSystemBubble('text', style, text, actionTag)}
          sendPrompt={executePrompt}
          healthData={healthData}
          isDisconnected={currentScreen === 'summon_disconnected'}
          onStartNavigation={startNavigation}
          speak={speak}
          streamUrl={streamUrl}
          isPaired={isPaired}
          onOpenPairingModal={() => setShowPairingModal(true)}
          sessionAllowed={sessionAllowed}
          sessionBlockedReason={sessionBlockedReason}
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

      {/* USE WHEELCHAIR ARRIVAL DISCONNECT MODAL */}
      {showUseWheelchairModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 15, 20, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: 'var(--surface)', border: '2px solid #2ecc71', borderRadius: 'var(--radius)', padding: '35px', maxWidth: '440px', width: '90%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '54px', marginBottom: '16px' }}>🦽</div>
            <h3 style={{ color: '#2ecc71', margin: '0 0 12px 0', fontSize: '22px', fontWeight: 700 }}>
              WHEELCHAIR HAS ARRIVED!
            </h3>
            <p style={{ fontSize: '15px', color: 'var(--text)', lineHeight: '1.6', margin: '0 0 24px 0' }}>
              The wheelchair has arrived at <strong>{arrivedStationName.replace(/_/g, ' ')}</strong>. Please press the button below to start using the wheelchair.
            </p>
            <button
              onClick={handleUseWheelchairClick}
              style={{
                width: '100%',
                padding: '16px 24px',
                fontSize: '18px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #2ecc71, #27ae60)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(46, 204, 113, 0.4)',
                transition: 'transform 0.2s'
              }}
            >
              ♿ Use Wheelchair
            </button>
          </div>
        </div>
      )}

      {/* 1. CONCURRENT USER LIMIT EXCEEDED MODAL */}
      {!sessionAllowed && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 15, 20, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid #e74c3c', borderRadius: 'var(--radius)', padding: '35px', maxWidth: '440px', width: '90%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⛔</div>
            <h3 style={{ color: '#e74c3c', margin: '0 0 12px 0', fontSize: '20px' }}>WHEELCHAIR SYSTEM BUSY</h3>
            <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: '1.6', margin: '0 0 20px 0' }}>
              {sessionBlockedReason || "Another device is currently controlling the wheelchair (Limit: 1 active user)."}
            </p>
            <div style={{ padding: '12px', background: 'var(--surface2)', borderRadius: 'var(--radius)', fontSize: '12px', color: 'var(--text-muted)' }}>
              🔒 Controls are locked to prevent conflicting commands. Please wait for the active user to disconnect.
            </div>
          </div>
        </div>
      )}

      {/* 2. DEVICE PAIRING MODAL */}
      {showPairingModal && sessionAllowed && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 15, 20, 0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid #3498db', borderRadius: 'var(--radius)', padding: '30px', maxWidth: '420px', width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📱</div>
            <h3 style={{ color: '#3498db', margin: '0 0 8px 0', fontSize: '18px' }}>DEVICE AUTHORIZATION REQUIRED</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '20px' }}>
              Enter the Secret Device Pairing Key to unlock controls on this device.
            </p>
            <form onSubmit={handleVerifyPairing} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input 
                type="password"
                placeholder="Enter Secret Pairing Key"
                value={pairingKeyInput}
                onChange={(e) => setPairingKeyInput(e.target.value)}
                style={{ padding: '12px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '14px', textAlign: 'center' }}
              />
              <button 
                type="submit"
                disabled={verifyingPairing}
                style={{ padding: '12px', background: 'linear-gradient(135deg, #2980b9, #3498db)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600, cursor: verifyingPairing ? 'not-allowed' : 'pointer' }}
              >
                {verifyingPairing ? 'Verifying...' : '🔑 Authorize Device'}
              </button>
            </form>
            {pairingMsg && (
              <div style={{ marginTop: '14px', fontSize: '12px', color: pairingMsg.includes('❌') ? '#e74c3c' : '#2ecc71', fontWeight: 500 }}>
                {pairingMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. DEVELOPER MODE PASSWORD MODAL */}
      {showDevPassModal && sessionAllowed && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 15, 20, 0.90)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid #f39c12', borderRadius: 'var(--radius)', padding: '30px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
            <h3 style={{ color: '#f39c12', margin: '0 0 8px 0', fontSize: '18px' }}>DEVELOPER AUTHENTICATION</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '20px' }}>
              Enter Developer Password to access system settings.
            </p>
            <form onSubmit={handleVerifyDevPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input 
                type="password"
                placeholder="Developer Password"
                value={devPassInput}
                onChange={(e) => setDevPassInput(e.target.value)}
                style={{ padding: '12px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '14px', textAlign: 'center' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button"
                  onClick={() => {
                    setShowDevPassModal(false);
                    setDevPassInput('');
                    setDevPassMsg('');
                  }}
                  style={{ flex: 1, padding: '12px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={verifyingDevPass}
                  style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #f39c12, #e67e22)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600, cursor: verifyingDevPass ? 'not-allowed' : 'pointer' }}
                >
                  {verifyingDevPass ? 'Checking...' : 'Unlock'}
                </button>
              </div>
            </form>
            {devPassMsg && (
              <div style={{ marginTop: '14px', fontSize: '12px', color: devPassMsg.includes('❌') ? '#e74c3c' : '#2ecc71', fontWeight: 500 }}>
                {devPassMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. FULL-SCREEN BLOCKING RIDER CONTINUATION MODAL (10s Countdown) */}
      {showArrivalContinuationModal && (
        <div 
          className="modal-backdrop" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(10, 15, 30, 0.88)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div 
            style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              border: '2px solid #2ecc71',
              borderRadius: '24px',
              padding: '32px 24px',
              maxWidth: '480px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              animation: 'popIn 0.3s ease-out'
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚩</div>
            <h2 style={{ fontSize: '24px', color: '#2ecc71', fontWeight: 800, marginBottom: '12px' }}>
              Wheelchair Arrived!
            </h2>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
              {(arrivedGoalName || healthData?.active_summon_station || healthData?.last_destination || 'Destination').replace(/_/g, ' ')}
            </div>
            
            <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '24px' }}>
              Do you want to proceed further with navigation to another location?
            </p>

            {/* 10-Second Countdown Badge */}
            <div style={{ 
              background: 'rgba(231, 76, 60, 0.15)', 
              border: '1px solid #e74c3c', 
              color: '#e74c3c', 
              padding: '10px 16px', 
              borderRadius: '30px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              fontWeight: 700, 
              fontSize: '14px',
              marginBottom: '28px' 
            }}>
              ⏱️ Auto-releasing for new summoners in <span style={{ fontSize: '18px', color: '#ff6b6b' }}>{countdownSeconds}s</span>
            </div>

            <div style={{ display: 'flex', gap: '14px', flexDirection: 'column' }}>
              <button 
                onClick={handleContinuationYes}
                style={{ 
                  padding: '16px', 
                  background: 'linear-gradient(135deg, #27ae60, #2ecc71)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '14px', 
                  fontWeight: 800, 
                  fontSize: '16px',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(46, 204, 113, 0.4)'
                }}
              >
                ✅ YES (Navigate Further)
              </button>
              
              <button 
                onClick={handleContinuationNo}
                style={{ 
                  padding: '14px', 
                  background: 'rgba(239, 68, 68, 0.15)', 
                  color: '#ef4444', 
                  border: '1px solid #ef4444', 
                  borderRadius: '14px', 
                  fontWeight: 700, 
                  fontSize: '15px',
                  cursor: 'pointer'
                }}
              >
                🛑 NO (Finish Ride / Release)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. AUTHORIZED OPERATOR MODAL FOR CANCELLED SUMMON */}
      {healthData?.usage_state === 'summon_cancelled' && isPaired && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(10, 15, 30, 0.88)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div 
            style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              border: '2px solid #f39c12',
              borderRadius: '24px',
              padding: '32px 24px',
              maxWidth: '480px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '22px', color: '#f39c12', fontWeight: 800, marginBottom: '12px' }}>
              Summoning Trip Cancelled
            </h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '28px' }}>
              The current summoning trip was stopped. Please select how to update the wheelchair state:
            </p>

            <div style={{ display: 'flex', gap: '14px', flexDirection: 'column' }}>
              <button 
                onClick={handleReleaseWheelchair}
                style={{ 
                  padding: '16px', 
                  background: 'linear-gradient(135deg, #27ae60, #2ecc71)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '14px', 
                  fontWeight: 800, 
                  fontSize: '15px',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(46, 204, 113, 0.4)'
                }}
              >
                🔄 Ready to Summon (Free for mobile users)
              </button>
              
              <button 
                onClick={async () => {
                  try {
                    await fetch(`${config.API_BASE_URL}/wheelchair/usage_state`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ state: 'in_use', station: '' })
                    });
                  } catch(e) {}
                }}
                style={{ 
                  padding: '14px', 
                  background: 'linear-gradient(135deg, #2980b9, #3498db)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '14px', 
                  fontWeight: 700, 
                  fontSize: '15px',
                  cursor: 'pointer'
                }}
              >
                🦽 Use for Navigation (Tablet rider)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
