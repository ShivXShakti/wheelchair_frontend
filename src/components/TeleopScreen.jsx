import React, { useState, useRef, useEffect } from 'react';
import config from '../config';

const TeleopScreen = ({ goHome }) => {
  const [speed, setSpeed] = useState(0.2);
  const [isMoving, setIsMoving] = useState(false);
  const joystickRef = useRef(null);
  const thumbRef = useRef(null);

  // Joystick state refs to avoid closure stale state in intervals
  const dragState = useRef({
    active: false,
    startX: 0,
    startY: 0,
    centerX: 0,
    centerY: 0,
    maxRadius: 90, // (260/2) - (80/2) = 130 - 40 = 90
    currentX: 0,
    currentY: 0,
  });

  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Command state for the publisher
  const commandRef = useRef({ linear_x: 0.0, angular_z: 0.0 });
  const publishIntervalRef = useRef(null);

  // Publish to backend at 20Hz (50ms)
  const startPublishing = () => {
    if (publishIntervalRef.current) return;
    
    // Fire immediately once
    publishCommand();
    
    // Then loop at 20Hz
    publishIntervalRef.current = setInterval(publishCommand, 50);
  };

  const stopPublishing = () => {
    if (publishIntervalRef.current) {
      clearInterval(publishIntervalRef.current);
      publishIntervalRef.current = null;
    }
    // Fire one last zero command
    commandRef.current = { linear_x: 0.0, angular_z: 0.0 };
    publishCommand();
  };

  const publishCommand = () => {
    const { linear_x, angular_z } = commandRef.current;
    fetch(`${config.API_BASE_URL}/teleop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linear_x, angular_z }),
      keepalive: true
    }).catch(err => console.error("Teleop publish error:", err));
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    const zone = joystickRef.current;
    if (!zone) return;
    
    const rect = zone.getBoundingClientRect();
    const state = dragState.current;
    
    state.active = true;
    state.centerX = rect.left + rect.width / 2;
    state.centerY = rect.top + rect.height / 2;
    
    // Capture pointer events even if mouse goes outside the zone
    zone.setPointerCapture(e.pointerId);
    
    setIsMoving(true);
    updateThumbPosition(e.clientX, e.clientY);
    startPublishing();
  };

  const handlePointerMove = (e) => {
    if (!dragState.current.active) return;
    e.preventDefault();
    updateThumbPosition(e.clientX, e.clientY);
  };

  const handlePointerUp = (e) => {
    const state = dragState.current;
    if (!state.active) return;
    e.preventDefault();
    
    const zone = joystickRef.current;
    if (zone) zone.releasePointerCapture(e.pointerId);
    
    state.active = false;
    setIsMoving(false);
    
    // Snap thumb back to center visually
    if (thumbRef.current) {
      thumbRef.current.style.transform = `translate(-50%, -50%) translate(0px, 0px)`;
      thumbRef.current.classList.remove('active');
    }
    
    stopPublishing();
  };

  const updateThumbPosition = (clientX, clientY) => {
    const state = dragState.current;
    
    // Calculate raw delta from center
    let dx = clientX - state.centerX;
    let dy = clientY - state.centerY;
    
    // Clamp to max radius
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > state.maxRadius) {
      const ratio = state.maxRadius / distance;
      dx *= ratio;
      dy *= ratio;
    }
    
    // Update visual thumb via DOM directly for max performance (60fps)
    if (thumbRef.current) {
      thumbRef.current.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
      thumbRef.current.classList.add('active');
    }
    
    // Calculate ROS commands
    // -dy is forward, +dy is backward. Max is maxRadius
    // -dx is left, +dx is right. Max is maxRadius
    
    const maxSpeed = speedRef.current;
    const maxAngular = maxSpeed * 1.5; // Arbitrary comfortable turning ratio
    
    // Normalize to [-1.0, 1.0]
    const normX = dx / state.maxRadius;
    const normY = dy / state.maxRadius;
    
    // linear_x: Negative dy means moving UP (forward in robot frame = positive X)
    const linear_x = -normY * maxSpeed;
    
    // angular_z: Positive dx means moving RIGHT (turning right in robot frame = negative Z)
    const angular_z = -normX * maxAngular;
    
    commandRef.current = { linear_x, angular_z };
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPublishing();
    };
  }, []);

  return (
    <div className="screen active" style={{ flex: 1, display: 'flex' }}>
      <div className="screen-header">
        <button className="back-btn" onClick={() => {
          stopPublishing();
          goHome();
        }}>← Back</button>
        <span className="screen-title">Teleoperation</span>
      </div>

      <div className="teleop-wrap">
        <div className="teleop-speed-row">
          <label>Max speed (m/s)</label>
          <input 
            type="range" 
            min="0.05" 
            max="0.5" 
            step="0.05" 
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
          />
          <span className="teleop-speed-val">{speed.toFixed(2)}</span>
        </div>

        <div 
          className="joystick-zone" 
          ref={joystickRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="joystick-cross"></div>
          <span className="joystick-label top">FWD</span>
          <span className="joystick-label bottom">BACK</span>
          <span className="joystick-label left">L</span>
          <span className="joystick-label right">R</span>
          <div className="joystick-thumb" ref={thumbRef}></div>
        </div>

        <div className={`teleop-status ${isMoving ? 'moving' : ''}`}>
          {isMoving ? 'Driving...' : 'Touch & drag to drive'}
        </div>
      </div>
    </div>
  );
};

export default TeleopScreen;
