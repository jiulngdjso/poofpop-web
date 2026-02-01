import { Icons } from './Icons';
import { parseError } from '../lib/errorMessages';

export default function ErrorCard({ error, onDismiss }) {
  const errorInfo = parseError(error);

  return (
    <div className="result-card error">
      <div className="result-icon">
        <Icons.AlertTriangle size={28} />
      </div>
      <div className="result-title">{errorInfo.title}</div>
      <div className="result-message">{errorInfo.message}</div>
      {errorInfo.guidance && (
        <div className="error-guidance">
          <Icons.Lightbulb size={16} />
          <span>{errorInfo.guidance}</span>
        </div>
      )}
      <div className="error-actions">
        {errorInfo.action && (
          <a
            href={errorInfo.action.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            {errorInfo.action.label}
            <Icons.ExternalLink size={16} />
          </a>
        )}
        <button className="btn btn-secondary" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
