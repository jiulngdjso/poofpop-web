import { useState } from 'react';
import { redeemLicenseKey } from '../lib/api';
import { Icons } from './Icons';

export default function CreditsModal({ onClose, onCreditsUpdate }) {
  const [redeemKey, setRedeemKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleRedeem = async () => {
    if (!redeemKey.trim()) {
      setError('Please enter a license key');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await redeemLicenseKey(redeemKey.trim());
      setSuccess(result.message);
      onCreditsUpdate(result.new_balance);
      setRedeemKey('');
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !loading && onClose()}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Redeem Credits</h3>
          <button className="modal-close" onClick={onClose}>
            <Icons.X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p className="modal-description">
            Enter your Gumroad license key to add 100 credits to your account
          </p>
          <input
            type="text"
            className="modal-input"
            placeholder="XXXX-XXXX-XXXX-XXXX"
            value={redeemKey}
            onChange={e => setRedeemKey(e.target.value)}
            disabled={loading}
          />
          {error && <div className="modal-alert error">{error}</div>}
          {success && <div className="modal-alert success">{success}</div>}
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleRedeem} disabled={loading}>
              {loading ? <Icons.Spinner size={18} /> : 'Redeem'}
            </button>
          </div>
        </div>
        <div className="modal-footer">
          <a className="modal-link" href="https://poofpop.gumroad.com/l/100Credits" target="_blank" rel="noopener noreferrer">
            Purchase credits on Gumroad
            <Icons.ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
