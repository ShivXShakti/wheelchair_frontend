import React, { useState } from 'react';

const WelcomeScreen = ({ navReady, onStart, healthData, onSetInitialPose }) => {
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [localizing, setLocalizing] = useState(false);
  const [message, setMessage] = useState('');

  const handleStart = async () => {
    console.log("[WelcomeScreen] Start button clicked!");
    setLoading(true);
    try {
      await onStart();
    } catch (e) {
      console.error("[WelcomeScreen] onStart failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleManualLocalize = async () => {
    const loc = selectedLocation || (healthData?.has_last_location ? 'last_location' : healthData?.location_names?.[0]);
    if (!loc) {
      setMessage('No locations available.');
      return;
    }
    setLocalizing(true);
    setMessage('');
    try {
      const success = await onSetInitialPose(loc);
      if (success) {
        setMessage('Initial pose sent! Aligning...');
      } else {
        setMessage('Failed to set initial pose.');
      }
    } catch (e) {
      console.error(e);
      setMessage('Error occurred.');
    } finally {
      setLocalizing(false);
    }
  };

  // Extract candidate locations and flags
  const locationNames = healthData?.location_names || [];
  const hasLastLocation = healthData?.has_last_location || false;

  return (
    <div className="welcome-screen" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      textAlign: 'center',
      padding: '20px',
      color: 'var(--text)'
    }}>
      <div className="welcome-card" style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        backdropFilter: 'blur(8px)'
      }}>
        <img 
          src="/static/ihublogo.svg" 
          alt="iHub-Data Logo" 
          style={{
            height: '100px',
            marginBottom: '24px',
            filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.2))'
          }} 
        />
        
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '12px',
          background: 'linear-gradient(135deg, #fff 0%, var(--text-muted) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Smart Wheelchair Navigation
        </h1>
        
        <p style={{
          color: 'var(--text-muted)',
          fontSize: '15px',
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          IIIT Hyderabad &amp; iHub-Data Assistive Robotics Platform
        </p>

        <button 
          onClick={handleStart}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: 600,
            background: loading ? 'var(--surface2)' : 'linear-gradient(135deg, var(--accent) 0%, #3a7bd5 100%)',
            color: '#white',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 15px rgba(58, 123, 213, 0.4)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
        >
          {loading ? (
            <>
              <span className="spinner" style={{ borderLeftColor: '#fff', width: '20px', height: '20px' }}></span>
              Launching Navigation...
            </>
          ) : navReady ? (
            'Enter System'
          ) : (
            'Start Navigation System'
          )}
        </button>

        <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
          System Status: {navReady ? (
            <span style={{ color: '#2ecc71', fontWeight: 600 }}>Ready ✓</span>
          ) : (
            <span style={{ color: '#e74c3c', fontWeight: 600 }}>Offline ✗</span>
          )}
        </div>

        {!navReady && (locationNames.length > 0 || hasLastLocation) && (
          <div style={{
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border)',
            textAlign: 'left'
          }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '10px',
              color: 'var(--text)'
            }}>
              Manual Localization Fallback
            </label>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginBottom: '15px',
              lineHeight: '1.4'
            }}>
              If automatic initialization fails, select the wheelchair's current area to set the initial pose.
            </p>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: 'var(--surface2)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {selectedLocation === '' && <option value="">-- Choose Location --</option>}
                
                {hasLastLocation && (
                  <option value="last_location">📍 Wheelchair Last Location</option>
                )}
                
                {locationNames.map((name) => (
                  <option key={name} value={name}>
                    🏢 {name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleManualLocalize}
                disabled={localizing || (!selectedLocation && !hasLastLocation && locationNames.length === 0)}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: localizing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(56, 239, 125, 0.2)',
                  transition: 'all 0.2s ease'
                }}
              >
                {localizing ? 'Setting...' : 'Set Pose'}
              </button>
            </div>
            
            {message && (
              <div style={{
                marginTop: '12px',
                fontSize: '12px',
                color: message.includes('failed') || message.includes('Error') ? '#e74c3c' : '#2ecc71',
                textAlign: 'center',
                fontWeight: 500
              }}>
                {message}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeScreen;
