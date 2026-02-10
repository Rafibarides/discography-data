import { useState } from 'react';
import { getScriptUrl, setScriptUrl } from '../utils/api';
import './SettingsModal.css';

export default function SettingsModal({ onClose, onSave }) {
  const [url, setUrl] = useState(getScriptUrl());

  const handleSave = () => {
    setScriptUrl(url.trim());
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Settings</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="settings-field">
            <label className="settings-label">Google Apps Script Web App URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="settings-input"
            />
            <p className="settings-help">
              Deploy your Code.gs as a web app and paste the URL here. The app will
              fetch all discography data from your Google Sheet.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save & Reload</button>
        </div>
      </div>
    </div>
  );
}
