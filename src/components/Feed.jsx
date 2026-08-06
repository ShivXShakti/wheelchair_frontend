import React, { useEffect, useRef } from 'react';

const formatTiming = (timing) => {
  if (!timing) return '';
  const parts = [];
  if (timing.prematch) parts.push('⚡ pre-match');
  if (timing.whisper_ms != null) parts.push(`whisper:${timing.whisper_ms}ms`);
  if (timing.llm_ms != null && !timing.prematch) parts.push(`llm:${timing.llm_ms}ms`);
  if (timing.total_voice_ms != null) parts.push(`total:${timing.total_voice_ms}ms`);
  else if (timing.total_text_ms != null) parts.push(`total:${timing.total_text_ms}ms`);
  return parts.join(' · ');
};

const timingSpeedClass = (timing) => {
  if (!timing) return '';
  const total = timing.total_voice_ms || timing.total_text_ms || timing.llm_ms || 0;
  if (timing.prematch) return 'fast';
  if (total < 500) return 'fast';
  if (total < 2000) return 'medium';
  return 'slow';
};

const Feed = ({ messages, sendPrompt }) => {
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="feed" ref={feedRef}>
      {messages.map((msg, idx) => {
        if (msg.type === 'user') {
          return (
            <div key={idx} className="bubble user">
              <div className="bubble-label">You</div>
              <span>{msg.text}</span>
            </div>
          );
        }

        // System messages
        return (
          <div key={idx} className={`bubble system ${msg.style || ''}`}>
            <div className="bubble-label">System</div>
            
            {msg.actionTag && (
              <><span className={`bubble-action ${msg.style || 'none'}`}>{msg.actionTag}</span><br/></>
            )}
            
            {msg.isConfirm ? (
              <>
                <div>Navigate to <strong>{msg.destination}</strong>?</div>
                <div className="confirm-chips">
                  <button className="confirm-yes" onClick={() => sendPrompt('yes')}>Yes, go there</button>
                  <button className="confirm-no" onClick={() => sendPrompt('no')}>No, cancel</button>
                </div>
              </>
            ) : msg.isSuggest ? (
              <>
                <span>{msg.text}</span>
                <div className="chips">
                  {(msg.options || []).map((opt, i) => (
                    <button key={i} className="chip" onClick={() => sendPrompt(opt)}>{opt}</button>
                  ))}
                </div>
              </>
            ) : (
              <span>{msg.text}</span>
            )}

            {msg.timing && formatTiming(msg.timing) && (
              <><br/><span className={`bubble-timing ${timingSpeedClass(msg.timing)}`}>{formatTiming(msg.timing)}</span></>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Feed;
