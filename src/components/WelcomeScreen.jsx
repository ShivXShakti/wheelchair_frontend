import React, { useState } from 'react';

const WelcomeScreen = ({ navReady, onStart }) => {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    await onStart();
    setLoading(false);
  };

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
      </div>
    </div>
  );
};

export default WelcomeScreen;
