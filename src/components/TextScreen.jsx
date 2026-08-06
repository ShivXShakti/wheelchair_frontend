import React, { useState } from 'react';
import Feed from './Feed';

const TextScreen = ({ goHome, destination, handleResponse, setStatus, addSystemBubble, messages, sendPrompt, devMode, nav2Ready }) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim()) return;
    
    if (!devMode && !nav2Ready) {
      addSystemBubble('error', 'Robot is not ready to take commands.', 'NONE');
      return;
    }

    const currentText = text.trim();
    setText('');
    setIsSending(true);

    setStatus('llama', 'working', 'Processing...');
    
    try {
      const res = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentText, devMode })
      });
      const data = await res.json();
      handleResponse(data, "text", currentText);
    } catch (err) {
      setStatus('llama', 'error', 'Error');
      setStatus('ros', 'error', 'Error');
      addSystemBubble('error', 'Server error. Please try again.', 'NONE');
    }
    
    setIsSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="screen active" style={{ flex: 1, display: 'flex' }}>
      <div className="screen-header">
        <button className="back-btn" onClick={goHome}>← Back</button>
        <span className="screen-title">Text Command</span>
      </div>
      
      {destination && (
        <div className="dest-banner visible">
          <span className="dest-banner-icon">🧭</span>
          <span>Navigating to: {destination}</span>
        </div>
      )}
      
      <div className="text-input-wrap">
        <textarea 
          placeholder="e.g. take me to the conference room" 
          rows="3"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
        />
      </div>
      <button 
        className="send-btn" 
        onClick={handleSend}
        disabled={isSending || !text.trim()}
      >
        Send Command
      </button>

      <Feed messages={messages} sendPrompt={(prompt) => sendPrompt(prompt, "text")} />
    </div>
  );
};

export default TextScreen;
