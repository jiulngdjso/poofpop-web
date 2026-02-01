import { useState } from 'react';
import { Icons } from './Icons';

export default function ShareModal({ downloadUrl, fileName, onClose }) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState(null);

  const shareTitle = 'Check out my processed video!';
  const shareText = `I just removed unwanted content from my video using Poofpop AI! 🎬✨`;
  const shareUrl = window.location.origin;

  // Native Web Share API
  const handleNativeShare = async () => {
    if (!navigator.share) {
      setShareError('Native sharing not supported on this browser');
      return;
    }

    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      });
      onClose();
    } catch (err) {
      if (err.name !== 'AbortError') {
        setShareError('Failed to share');
      }
    }
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(downloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setShareError('Failed to copy link');
    }
  };

  // Share to Twitter/X
  const handleTwitterShare = () => {
    const text = encodeURIComponent(`${shareText}\n\nTry it yourself:`);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=550,height=420');
  };

  // Share to Facebook
  const handleFacebookShare = () => {
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=550,height=420');
  };

  // Download to share manually
  const handleDownloadForShare = () => {
    window.open(downloadUrl, '_blank');
  };

  const supportsNativeShare = typeof navigator !== 'undefined' && navigator.share;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Icons.Share size={24} />
            Share Your Result
          </h2>
          <button className="btn-close" onClick={onClose}>
            <Icons.X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {shareError && (
            <div className="share-error">
              <Icons.AlertTriangle size={16} />
              {shareError}
            </div>
          )}

          <div className="share-options">
            {/* Native Share (mobile-friendly) */}
            {supportsNativeShare && (
              <button className="share-option share-native" onClick={handleNativeShare}>
                <Icons.Share size={24} />
                <span>Share</span>
              </button>
            )}

            {/* Twitter/X */}
            <button className="share-option share-twitter" onClick={handleTwitterShare}>
              <Icons.Twitter size={24} />
              <span>Twitter</span>
            </button>

            {/* Facebook */}
            <button className="share-option share-facebook" onClick={handleFacebookShare}>
              <Icons.Facebook size={24} />
              <span>Facebook</span>
            </button>

            {/* Copy Link */}
            <button className="share-option share-copy" onClick={handleCopyLink}>
              {copied ? <Icons.Check size={24} /> : <Icons.Link size={24} />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          <div className="share-divider">
            <span>or download to share</span>
          </div>

          <button className="btn btn-secondary btn-block" onClick={handleDownloadForShare}>
            <Icons.Download size={18} />
            Download Video
          </button>

          <p className="share-hint">
            Download your video and share it directly on any platform!
          </p>
        </div>
      </div>
    </div>
  );
}
