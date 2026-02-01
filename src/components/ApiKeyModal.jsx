import { Icons } from './Icons';

export default function ApiKeyModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">API Settings</h3>
          <button className="modal-close" onClick={onClose}>
            <Icons.X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p className="modal-description">
            Your API key is used to authenticate requests. Keep it secure.
          </p>
          <div className="api-key-display">
            pk_live_••••••••••••••••
          </div>
          <p className="setting-hint" style={{ textAlign: 'center' }}>
            Contact support to generate a new API key
          </p>
        </div>
      </div>
    </div>
  );
}
