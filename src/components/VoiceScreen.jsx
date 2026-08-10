import React, { useState, useRef } from 'react';
import Feed from './Feed';
import config from '../config';

const VoiceScreen = ({ goHome, destination, handleResponse, setStatus, speak, addSystemBubble, messages, devMode, nav2Ready }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const devModeRef = useRef(devMode);
  const nav2ReadyRef = useRef(nav2Ready);

  React.useEffect(() => {
    devModeRef.current = devMode;
    nav2ReadyRef.current = nav2Ready;
  }, [devMode, nav2Ready]);

  // Initialize microphone once when the component mounts
  React.useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        
        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await sendAudio(audioBlob);
        };
        
        mediaRecorderRef.current = recorder;
      })
      .catch(err => {
        console.error("Microphone access denied or error:", err);
        addSystemBubble('error', 'Microphone access denied. Check permissions.', 'NONE');
      });

    // Cleanup stream on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    startRecording();
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    stopRecording();
  };

  const sendAudio = async (blob) => {
    if (!devModeRef.current && !nav2ReadyRef.current) {
      addSystemBubble('error', 'Robot is not ready to take commands.', 'NONE');
      if (speak) speak("Robot is not ready to take commands.");
      return;
    }

    setStatus('whisper', 'working', 'Transcribing...');
    setStatus('llama', 'idle', 'LLaMA');
    setStatus('ros', 'idle', 'ROS');

    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    formData.append('devMode', devModeRef.current ? 'true' : 'false');

    try {
      const res = await fetch(`${config.API_BASE_URL}/transcribe`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (data.timing && data.timing.whisper_ms != null) {
        setStatus('whisper', 'done', `Done ${data.timing.whisper_ms}ms`);
      } else {
        setStatus('whisper', 'done', 'Done ✓');
      }
      
      handleResponse(data, "voice");
    } catch (err) {
      setStatus('whisper', 'error', 'Error');
      setStatus('llama', 'error', 'Error');
      setStatus('ros', 'error', 'Error');
      addSystemBubble('error', 'Server error. Please try again.', 'NONE');
    }
  };

  return (
    <div className="screen active" style={{ flex: 1, display: 'flex' }}>
      <div className="screen-header">
        <button className="back-btn" onClick={goHome}>← Back</button>
        <span className="screen-title">Voice Command</span>
      </div>
      
      {destination && (
        <div className="dest-banner visible">
          <span className="dest-banner-icon">🧭</span>
          <span>Navigating to: {destination}</span>
        </div>
      )}
      
      <div className="voice-center">
        <div className="mic-ring">
          <div className={`mic-ring-pulse ${isRecording ? 'active' : ''}`}></div>
          <button 
            className={`mic-btn ${isRecording ? 'recording' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            🎙
          </button>
        </div>
        <p className="mic-hint">{isRecording ? "Listening..." : "Hold to speak your command"}</p>
      </div>

      <Feed messages={messages} sendPrompt={(prompt) => handleResponse({ prompt }, "voice", true)} />
    </div>
  );
};

export default VoiceScreen;
