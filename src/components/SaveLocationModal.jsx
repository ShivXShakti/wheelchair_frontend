import React, { useState } from 'react';

const SaveLocationModal = ({ source, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [aliases, setAliases] = useState('');
  const [tags, setTags] = useState('');
  const [type, setType] = useState('saved_location');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required!");
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const response = await fetch('/save_location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim().toLowerCase(),
          aliases: aliases.trim().toLowerCase(),
          tags: tags.trim().toLowerCase(),
          type: type.trim(),
          source: source
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        onSuccess(data.message);
      } else {
        setError(data.message || "Failed to save location");
      }
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{maxWidth: '400px'}}>
        <div className="modal-header">
          <h3>Save {source === 'goal' ? 'RViz2 Goal' : 'Current Robot'} Pose</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-banner" style={{marginBottom: '15px'}}>{error}</div>}
          
          <div className="form-group" style={{marginBottom: '15px'}}>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-muted)'}}>
              Location Name <span style={{color: 'var(--orange)'}}>*</span>
            </label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. library desk"
              style={{width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)'}}
              disabled={isSaving}
              autoFocus
            />
          </div>

          <div className="form-group" style={{marginBottom: '15px'}}>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-muted)'}}>
              Aliases (comma separated, optional)
            </label>
            <input 
              type="text" 
              value={aliases} 
              onChange={e => setAliases(e.target.value)} 
              placeholder="e.g. main library, quiet zone"
              style={{width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)'}}
              disabled={isSaving}
            />
          </div>

          <div className="form-group" style={{marginBottom: '15px'}}>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-muted)'}}>
              Tags (comma separated, optional)
            </label>
            <input 
              type="text" 
              value={tags} 
              onChange={e => setTags(e.target.value)} 
              placeholder="e.g. books, reading, study"
              style={{width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)'}}
              disabled={isSaving}
            />
          </div>

          <div className="form-group" style={{marginBottom: '20px'}}>
            <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-muted)'}}>
              Type (optional)
            </label>
            <input 
              type="text" 
              value={type} 
              onChange={e => setType(e.target.value)} 
              placeholder="e.g. facility, person, classroom"
              style={{width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)'}}
              disabled={isSaving}
            />
          </div>

          <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
            <button 
              type="button" 
              className="back-btn" 
              onClick={onClose}
              disabled={isSaving}
              style={{padding: '10px 20px', margin: 0}}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="send-btn"
              disabled={isSaving || !name.trim()}
              style={{margin: 0}}
            >
              {isSaving ? 'Saving...' : 'Save to YAML'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveLocationModal;
