import { useState, useRef, useEffect, lazy, Suspense, useCallback } from 'react';
import {
  uploadInit,
  uploadFile,
  submitProcess,
  watchJobProgress,
  getDownloadUrl,
  getJobStatus,
  getCredits,
  checkContentSafety,
  getStoredUser,
  getSessionToken,
  logout,
  isAuthenticated,
} from './lib/api';
import { Icons } from './components/Icons';
import './App.css';

// Lazy load modals for code splitting
const CreditsModal = lazy(() => import('./components/CreditsModal'));
const ApiKeyModal = lazy(() => import('./components/ApiKeyModal'));
const ErrorCard = lazy(() => import('./components/ErrorCard'));
const BatchUpload = lazy(() => import('./components/BatchUpload'));
const ShareModal = lazy(() => import('./components/ShareModal'));
const AuthModal = lazy(() => import('./components/AuthModal'));

// Loading fallback for modals
const ModalLoader = () => (
  <div className="modal-overlay">
    <div className="modal" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
      <Icons.Spinner size={32} />
    </div>
  </div>
);

// Task configurations
const TASKS = [
  {
    id: 'minimax_remove',
    name: 'Watermark Removal',
    description: 'Auto-detect and remove watermarks',
    icon: Icons.Droplet,
  },
  {
    id: 'video-object-removal',
    name: 'Object Removal',
    description: 'Remove any object from video',
    icon: Icons.Target,
  },
];

// Processing speed estimates (MB/min)
const PROCESSING_RATES = {
  'minimax_remove': 10,
  'video-object-removal': 5,
};

// Credit cost calculation: base + perMB * fileSizeMB
const CREDIT_COSTS = {
  'minimax_remove': { base: 2, perMB: 0.2, name: 'Watermark Removal' },
  'video-object-removal': { base: 3, perMB: 0.3, name: 'Object Removal' },
};

function estimateCredits(fileSize, taskType) {
  if (!fileSize || fileSize <= 0) return null;
  const config = CREDIT_COSTS[taskType];
  if (!config) return null;
  const sizeMB = fileSize / 1024 / 1024;
  const credits = Math.ceil(config.base + config.perMB * sizeMB);
  return Math.max(credits, config.base + 1); // minimum base + 1
}

function estimateTime(fileSize, taskType) {
  if (!fileSize || fileSize <= 0) return null;
  const rate = PROCESSING_RATES[taskType] || 8;
  const minutes = Math.ceil((fileSize / 1024 / 1024) / rate);
  if (minutes < 1) return '< 1 min';
  return `~${minutes} min`;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatTime(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function App() {
  // Theme
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });
  const [scrolled, setScrolled] = useState(false);

  // Mouse tracking for card hover effects
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        setMousePos({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      }
    };

    const card = cardRef.current;
    if (card) {
      card.addEventListener('mousemove', handleMouseMove);
      return () => card.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  // Task state
  const [taskType, setTaskType] = useState('minimax_remove');
  const [removeText, setRemoveText] = useState('');

  // File state
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  // Processing state
  const [status, setStatus] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processProgress, setProcessProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [jobId, setJobId] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState(null);

  // User state
  const [credits, setCredits] = useState(0);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('jobHistory');
    return saved ? JSON.parse(saved) : [];
  });

  // Modals
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Auth state
  const [user, setUser] = useState(() => getStoredUser());
  const [isLoggedIn, setIsLoggedIn] = useState(() => isAuthenticated());

  const isProcessing = ['uploading', 'checking', 'processing', 'pending', 'queued'].includes(status);

  // Effects
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('jobHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    // Only fetch credits when logged in
    if (isLoggedIn) {
      getCredits().then(r => setCredits(r.credits)).catch(() => {});
    }
  }, [isLoggedIn]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Auth handlers
  const handleAuthSuccess = useCallback((userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    // Refresh credits
    getCredits().then(r => setCredits(r.credits)).catch(() => {});
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setUser(null);
    setIsLoggedIn(false);
    setCredits(0);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // File handlers
  const validateFile = useCallback((f) => {
    if (!f.type.startsWith('video/')) {
      setError('Please select a video file (MP4, MOV)');
      return;
    }
    if (f.size > 200 * 1024 * 1024) {
      setError('File size must be under 200MB');
      return;
    }
    // Revoke previous preview URL if exists
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
    setStatus('idle');
    setJobId(null);
    setDownloadUrl(null);
  }, [preview]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) validateFile(e.dataTransfer.files[0]);
  }, [validateFile]);

  // Process
  const handleProcess = useCallback(async () => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    if (!file) {
      setError('Please select a video first');
      return;
    }

    setError(null);
    setStatus('uploading');
    setUploadProgress(0);
    setProcessProgress(0);
    setProgressMsg('');

    try {
      const init = await uploadInit(taskType, file.name, file.type, file.size);
      await uploadFile(init.upload_url, file, setUploadProgress);

      // Content safety check
      setStatus('checking');
      setProgressMsg('Verifying file...');
      const safetyCheck = await checkContentSafety(init.file_id, init.input_key, file.type);

      if (!safetyCheck.safe) {
        throw new Error(safetyCheck.message || 'Content safety check failed');
      }

      setStatus('pending');
      const params = taskType === 'video-object-removal' ? { remove_text: removeText || 'object' } : {};
      const result = await submitProcess(taskType, init.file_id, init.input_key, params, null, file.size);

      // Update credits balance if returned
      if (result.credits_remaining !== null && result.credits_remaining !== undefined) {
        setCredits(result.credits_remaining);
      }

      setJobId(result.job_id);
      // Handle both 'queued' and 'pending' status from backend
      setStatus(result.status === 'queued' ? 'queued' : 'processing');

      setHistory(prev => [{
        job_id: result.job_id,
        task_type: taskType,
        file_name: file.name,
        created_at: new Date().toISOString(),
        status: 'processing',
      }, ...prev].slice(0, 10));

      await watchJobProgress(result.job_id, (data) => {
        if (data.progress !== undefined) setProcessProgress(data.progress);
        if (data.progress_message) setProgressMsg(data.progress_message);
        setHistory(prev => prev.map(h =>
          h.job_id === result.job_id ? { ...h, status: data.status } : h
        ));
      });

      const dl = await getDownloadUrl(result.job_id);
      setDownloadUrl(dl.download_url);
      setStatus('completed');
      setHistory(prev => prev.map(h =>
        h.job_id === result.job_id ? { ...h, status: 'completed' } : h
      ));
    } catch (err) {
      setError(err.message || 'Processing failed');
      setStatus('failed');
      if (jobId) {
        setHistory(prev => prev.map(h =>
          h.job_id === jobId ? { ...h, status: 'failed' } : h
        ));
      }
    }
  }, [isLoggedIn, file, taskType, removeText, jobId]);

  const handleReset = useCallback(() => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setStatus('idle');
    setUploadProgress(0);
    setProcessProgress(0);
    setProgressMsg('');
    setJobId(null);
    setDownloadUrl(null);
    setError(null);
  }, [preview]);

  const loadHistoryJob = useCallback(async (job) => {
    try {
      const st = await getJobStatus(job.job_id);
      if (st.status === 'completed') {
        const dl = await getDownloadUrl(job.job_id);
        window.open(dl.download_url, '_blank');
      }
    } catch (err) {
      setError('Failed to load job');
    }
  }, []);

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      {/* Navigation */}
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-content">
          <a href="/" className="nav-brand">
            <div className="nav-logo">
              <Icons.LogoGlow size={32} />
            </div>
            <span className="nav-title">Poofpop</span>
          </a>
          <div className="nav-actions">
            {/* Credits only shown when logged in */}
            {isLoggedIn && (
              <button className="nav-credits" onClick={() => setShowCreditsModal(true)}>
                <Icons.Coins size={18} />
                <span className="credits-value">{credits}</span>
                <Icons.Plus size={14} />
              </button>
            )}
            <button className="btn-nav" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Icons.Sun size={20} /> : <Icons.Moon size={20} />}
            </button>
            {isLoggedIn ? (
              <div className="user-menu">
                <div className="user-info">
                  <span className="user-email">{user?.email || 'User'}</span>
                </div>
                <button className="btn-logout" onClick={handleLogout}>
                  Sign Out
                </button>
              </div>
            ) : (
              <button className="btn-login" onClick={() => setShowAuthModal(true)}>
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Guest Banner */}
      {!isLoggedIn && (
        <div className="guest-banner">
          <Icons.Info size={16} />
          <span><button onClick={() => setShowAuthModal(true)}>Sign in</button> or <button onClick={() => setShowAuthModal(true)}>create an account</button> to save your history and track credits. New users get 5 free credits!</span>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text" style={{ animationDelay: '0.1s' }}>
            <div className="hero-badge" style={{ animationDelay: '0.2s' }}>
              <Icons.Zap size={16} />
              AI-Powered Video Processing
            </div>
            <h1 className="hero-title" style={{ animationDelay: '0.3s' }}>
              Remove Anything from<br />
              <span className="gradient-text">Your Videos</span>
            </h1>
            <p className="hero-description" style={{ animationDelay: '0.4s' }}>
              Instantly remove watermarks, logos, and unwanted objects from your videos
              using advanced AI. No technical skills required.
            </p>
          </div>

          {/* App Card with mouse tracking */}
          <div
            className="hero-card"
            style={{ animationDelay: '0.4s', '--mouse-x': `${mousePos.x}%`, '--mouse-y': `${mousePos.y}%` }}
            ref={cardRef}
          >
            <div className="app-card">
              {/* Task Selector */}
              <div className="task-selector">
                <div className="task-selector-label">Select Task</div>
                <div className="task-options">
                  {TASKS.map(task => (
                    <div
                      key={task.id}
                      className={`task-option ${taskType === task.id ? 'active' : ''} ${isProcessing ? 'disabled' : ''}`}
                      onClick={() => !isProcessing && setTaskType(task.id)}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        e.currentTarget.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
                        e.currentTarget.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
                      }}
                    >
                      <div className="task-option-icon">
                        <task.icon size={24} />
                      </div>
                      <div className="task-option-label">{task.name}</div>
                      <div className="task-option-desc">{task.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload Zone */}
              <div
                className={`upload-zone ${dragging ? 'dragging' : ''} ${isProcessing ? 'disabled' : ''} ${file ? 'has-file' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !isProcessing && fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => e.target.files?.[0] && validateFile(e.target.files[0])}
                  disabled={isProcessing}
                  className="file-input-hidden"
                />
                {!file ? (
                  <>
                    <div className="upload-icon">
                      <Icons.Upload size={36} />
                    </div>
                    <div className="upload-title">Drop your video here</div>
                    <div className="upload-subtitle">or click to browse</div>
                    <div className="upload-hints">
                      <span className="upload-hint">
                        <Icons.CheckCircle size={14} />
                        MP4, MOV, WebM
                      </span>
                      <span className="upload-hint">
                        <Icons.CheckCircle size={14} />
                        Up to 200MB
                      </span>
                      <span className="upload-hint">
                        <Icons.CheckCircle size={14} />
                        Fast processing
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="file-preview">
                    <div className="preview-video-container">
                      <video src={preview} controls className="preview-video" />
                    </div>
                    <div className="file-details">
                      <div className="file-name">
                        <Icons.Video size={16} />
                        {file.name}
                      </div>
                      <div className="file-size">{formatSize(file.size)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Settings */}
              {taskType === 'video-object-removal' && (
                <div className="settings-panel">
                  <div className="settings-title">Settings</div>
                  <div className="setting-group">
                    <label className="setting-label">Object to Remove</label>
                    <input
                      type="text"
                      className="setting-input"
                      value={removeText}
                      onChange={(e) => setRemoveText(e.target.value)}
                      placeholder="e.g. person, logo, watermark"
                      disabled={isProcessing}
                    />
                    <div className="setting-hint">Describe what you want to remove</div>
                  </div>
                </div>
              )}

              {taskType === 'minimax_remove' && (
                <div className="settings-panel">
                  <div className="auto-mode-notice">
                    <Icons.Zap size={20} />
                    Watermarks will be automatically detected and removed
                  </div>
                </div>
              )}

              {/* Cost Estimate - Show when file is selected */}
              {file && !isProcessing && status !== 'completed' && (
                <div className="cost-estimate">
                  <div className="cost-estimate-header">
                    <Icons.Coins size={18} />
                    <span>Estimated Cost</span>
                  </div>
                  <div className="cost-estimate-details">
                    <div className="cost-item">
                      <span className="cost-label">Task</span>
                      <span className="cost-value">{CREDIT_COSTS[taskType]?.name || taskType}</span>
                    </div>
                    <div className="cost-item">
                      <span className="cost-label">File Size</span>
                      <span className="cost-value">{formatSize(file.size)}</span>
                    </div>
                    <div className="cost-item">
                      <span className="cost-label">Est. Time</span>
                      <span className="cost-value">{estimateTime(file.size, taskType)}</span>
                    </div>
                    <div className="cost-item highlight">
                      <span className="cost-label">Credits Required</span>
                      <span className="cost-value credits">
                        <Icons.Coins size={16} />
                        {estimateCredits(file.size, taskType)} credits
                      </span>
                    </div>
                    {isLoggedIn && credits < estimateCredits(file.size, taskType) && (
                      <div className="cost-warning">
                        <Icons.AlertTriangle size={16} />
                        <span>
                          Insufficient credits. You have {credits}, need {estimateCredits(file.size, taskType)}.
                          <button onClick={() => setShowCreditsModal(true)}>Get more</button>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Progress */}
              {(status === 'uploading' || status === 'checking' || ['processing', 'pending', 'queued'].includes(status)) && (
                <div className="progress-section">
                  {/* Step Indicators */}
                  <div className="progress-steps">
                    <div className={`progress-step ${status === 'uploading' ? 'active' : ''} ${['checking', 'processing', 'pending', 'queued'].includes(status) ? 'completed' : ''}`}>
                      <div className="progress-step-dot">
                        {['checking', 'processing', 'pending', 'queued'].includes(status) ? <Icons.CheckCircle size={14} /> : <Icons.Upload size={14} />}
                      </div>
                      <span className="progress-step-label">Upload</span>
                    </div>
                    <div className={`progress-step ${status === 'checking' ? 'active' : ''} ${['processing', 'pending', 'queued'].includes(status) ? 'completed' : ''}`}>
                      <div className="progress-step-dot">
                        {['processing', 'pending', 'queued'].includes(status) ? <Icons.CheckCircle size={14} /> : <Icons.Shield size={14} />}
                      </div>
                      <span className="progress-step-label">Verify</span>
                    </div>
                    <div className={`progress-step ${['processing', 'pending', 'queued'].includes(status) ? 'active' : ''}`}>
                      <div className="progress-step-dot">
                        <Icons.Zap size={14} />
                      </div>
                      <span className="progress-step-label">Process</span>
                    </div>
                    <div className="progress-step">
                      <div className="progress-step-dot">
                        <Icons.Download size={14} />
                      </div>
                      <span className="progress-step-label">Done</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="progress-header">
                    <span className="progress-label">
                      {status === 'uploading' && 'Uploading your video...'}
                      {status === 'checking' && (
                        <>
                          <Icons.Shield size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                          Verifying file safety...
                        </>
                      )}
                      {status === 'queued' && (processProgress === 0 ? 'Waiting in queue...' : (progressMsg || 'Processing...'))}
                      {status === 'pending' && (processProgress === 0 ? 'Starting AI engine...' : (progressMsg || 'Processing...'))}
                      {status === 'processing' && (progressMsg || 'AI is processing...')}
                    </span>
                    <span className="progress-value">
                      {status === 'uploading' ? `${uploadProgress}%` : ''}
                      {['processing', 'pending', 'queued'].includes(status) && processProgress > 0 ? `${processProgress}%` : ''}
                    </span>
                  </div>
                  <div className="progress-bar">
                    {status === 'uploading' && <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />}
                    {status === 'checking' && <div className="progress-fill progress-indeterminate" />}
                    {/* 当进度为0时显示不确定动画，否则显示实际进度 */}
                    {['processing', 'pending', 'queued'].includes(status) && (
                      processProgress === 0 
                        ? <div className="progress-fill progress-indeterminate" />
                        : <div className="progress-fill" style={{ width: `${processProgress}%` }} />
                    )}
                  </div>

                  {/* Status hint when progress is 0 */}
                  {['processing', 'pending', 'queued'].includes(status) && processProgress === 0 && (
                    <div className="progress-hint">
                      <Icons.Info size={14} />
                      <span>
                        {status === 'queued' && 'Your job is in queue. Processing will start shortly...'}
                        {status === 'pending' && 'Initializing AI model. This may take a moment...'}
                        {status === 'processing' && 'AI is analyzing your video...'}
                      </span>
                    </div>
                  )}

                  {/* ETA Info - only show when actually processing */}
                  {file && ['processing', 'pending', 'queued'].includes(status) && processProgress > 0 && estimateTime(file.size, taskType) && (
                    <div className="progress-info">
                      <span>Processing {formatSize(file.size)} video...</span>
                      <span className="progress-eta">
                        <Icons.Clock size={14} />
                        {estimateTime(file.size, taskType)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <Suspense fallback={
                  <div className="result-card error">
                    <Icons.Spinner size={24} />
                  </div>
                }>
                  <ErrorCard error={error} onDismiss={() => setError(null)} />
                </Suspense>
              )}

              {/* Success */}
              {status === 'completed' && downloadUrl && (
                <div className="result-card success">
                  <div className="result-icon">
                    <Icons.CheckCircle size={32} />
                  </div>
                  <div className="result-title">Processing Complete!</div>
                  <div className="result-message">Your video has been successfully processed and is ready to download</div>
                  {/* Video Preview */}
                  <div className="result-preview">
                    <video src={downloadUrl} controls preload="metadata" />
                  </div>
                  <div className="result-actions">
                    <button className="btn btn-primary btn-lg" onClick={() => window.open(downloadUrl, '_blank')}>
                      <Icons.Download size={20} />
                      Download
                    </button>
                    <button className="btn btn-secondary btn-lg" onClick={() => setShowShareModal(true)}>
                      <Icons.Share size={20} />
                      Share
                    </button>
                    <button className="btn btn-secondary btn-lg" onClick={handleReset}>
                      <Icons.Refresh size={20} />
                      New
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              {status !== 'completed' && !error && (
                <div className="action-buttons">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleProcess}
                    disabled={!file || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Icons.Spinner size={20} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Icons.Play size={20} />
                        Start Processing
                      </>
                    )}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleReset}
                    disabled={isProcessing}
                  >
                    <Icons.Refresh size={18} />
                  </button>
                </div>
              )}

              {/* History */}
              {history.length > 0 && (
                <div className="history-section">
                  <div className="history-header">
                    <div className="history-title">
                      <Icons.History size={16} />
                      Recent Jobs
                    </div>
                    <button className="btn btn-ghost" onClick={() => setHistory([])}>
                      Clear
                    </button>
                  </div>
                  <div className="history-list">
                    {history.slice(0, 3).map(job => (
                      <div
                        key={job.job_id}
                        className={`history-item ${job.status === 'completed' ? 'clickable' : ''}`}
                        onClick={() => job.status === 'completed' && loadHistoryJob(job)}
                      >
                        <div className="history-info">
                          <div className="history-name">{job.file_name}</div>
                          <div className="history-meta">{formatTime(job.created_at)}</div>
                        </div>
                        <div className={`history-status ${job.status}`}>
                          {job.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="features-content">
          <div className="features-header">
            <h2 className="features-title">Why Choose Poofpop?</h2>
            <p className="features-subtitle">
              Professional-grade video processing powered by cutting-edge AI technology
            </p>
          </div>
          <div className="features-grid">
            {[
              { icon: Icons.Zap, title: 'Lightning Fast', desc: 'Powered by GPU clusters, process videos in minutes instead of hours. No waiting, no delays.' },
              { icon: Icons.Target, title: 'Pixel Perfect', desc: 'Advanced AI ensures seamless removal with no artifacts or visual glitches. Results look natural.' },
              { icon: Icons.Shield, title: 'Secure & Private', desc: 'Your files are encrypted and automatically deleted after processing. Your content stays yours.' },
            ].map((feature, i) => (
              <div
                key={i}
                className="feature-card hover-lift"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
                  e.currentTarget.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
                }}
              >
                <div className="feature-icon">
                  <feature.icon size={28} />
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="section-content">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">
              Remove watermarks and objects in just 3 simple steps
            </p>
          </div>
          <div className="steps-container">
            {[
              { step: 1, icon: Icons.Upload, title: 'Upload Your Video', desc: 'Drag and drop or click to upload your video file. We support MP4, MOV, and WebM formats up to 200MB.' },
              { step: 2, icon: Icons.Sparkles, title: 'AI Processing', desc: 'Our advanced AI automatically detects and removes watermarks or specified objects while preserving video quality.' },
              { step: 3, icon: Icons.Download, title: 'Download Result', desc: 'Preview your processed video and download it in high quality. Your files are automatically deleted for privacy.' },
            ].map((item, i) => (
              <div key={i} className="step-card">
                <div className="step-number">{item.step}</div>
                <div className="step-icon">
                  <item.icon size={32} />
                </div>
                <h3 className="step-title">{item.title}</h3>
                <p className="step-desc">{item.desc}</p>
                {i < 2 && <div className="step-connector"><Icons.ArrowRight size={24} /></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before/After Showcase Section */}
      <section id="showcase" className="showcase-section">
        <div className="section-content">
          <div className="section-header">
            <h2 className="section-title">See the Difference</h2>
            <p className="section-subtitle">
              Real examples of AI-powered watermark and object removal
            </p>
          </div>
          <div className="showcase-grid">
            {[
              { title: 'Watermark Removal', desc: 'Automatically detect and remove watermarks from any video', before: 'With watermark overlay', after: 'Clean, watermark-free' },
              { title: 'Logo Removal', desc: 'Remove channel logos and branding from video corners', before: 'With channel logo', after: 'Logo completely removed' },
              { title: 'Object Removal', desc: 'Remove unwanted objects and people from your footage', before: 'With unwanted object', after: 'Seamlessly removed' },
            ].map((item, i) => (
              <div key={i} className="showcase-card">
                <div className="showcase-header">
                  <h3 className="showcase-title">{item.title}</h3>
                  <p className="showcase-desc">{item.desc}</p>
                </div>
                <div className="showcase-comparison">
                  <div className="showcase-before">
                    <div className="showcase-placeholder">
                      <Icons.Video size={48} />
                      <span>Before</span>
                    </div>
                    <div className="showcase-label before-label">
                      <Icons.X size={14} />
                      {item.before}
                    </div>
                  </div>
                  <div className="showcase-divider">
                    <Icons.ArrowRight size={20} />
                  </div>
                  <div className="showcase-after">
                    <div className="showcase-placeholder success">
                      <Icons.Video size={48} />
                      <span>After</span>
                    </div>
                    <div className="showcase-label after-label">
                      <Icons.Check size={14} />
                      {item.after}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="section-content">
          <div className="section-header">
            <h2 className="section-title">Simple, Transparent Pricing</h2>
            <p className="section-subtitle">
              Pay only for what you use. No subscriptions, no hidden fees.
            </p>
          </div>
          <div className="pricing-grid">
            {/* Free Tier */}
            <div className="pricing-card">
              <div className="pricing-header">
                <h3 className="pricing-name">Free Trial</h3>
                <div className="pricing-price">
                  <span className="price-amount">5</span>
                  <span className="price-unit">credits</span>
                </div>
                <p className="pricing-desc">Perfect for trying out Poofpop</p>
              </div>
              <ul className="pricing-features">
                <li><Icons.Check size={18} /> 5 free credits on signup</li>
                <li><Icons.Check size={18} /> All AI features included</li>
                <li><Icons.Check size={18} /> Up to 200MB file size</li>
                <li><Icons.Check size={18} /> No credit card required</li>
              </ul>
              <button className="btn btn-secondary btn-full" onClick={() => setShowAuthModal(true)}>
                Get Started Free
              </button>
            </div>

            {/* Credits Pack */}
            <div className="pricing-card featured">
              <div className="pricing-badge">Most Popular</div>
              <div className="pricing-header">
                <h3 className="pricing-name">100 Credits</h3>
                <div className="pricing-price">
                  <span className="price-currency">$</span>
                  <span className="price-amount">9.99</span>
                </div>
                <p className="pricing-desc">Best value for regular users</p>
              </div>
              <ul className="pricing-features">
                <li><Icons.Check size={18} /> 100 video processing credits</li>
                <li><Icons.Check size={18} /> Credits never expire</li>
                <li><Icons.Check size={18} /> Priority processing queue</li>
                <li><Icons.Check size={18} /> Email support</li>
              </ul>
              <a
                href="https://poofpop.gumroad.com/l/100Credits"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-full"
              >
                Buy Credits
                <Icons.ExternalLink size={16} />
              </a>
            </div>

            {/* API Access */}
            <div className="pricing-card">
              <div className="pricing-header">
                <h3 className="pricing-name">API Access</h3>
                <div className="pricing-price">
                  <span className="price-amount">Custom</span>
                </div>
                <p className="pricing-desc">For developers and businesses</p>
              </div>
              <ul className="pricing-features">
                <li><Icons.Check size={18} /> RESTful API access</li>
                <li><Icons.Check size={18} /> Webhook notifications</li>
                <li><Icons.Check size={18} /> Batch processing</li>
                <li><Icons.Check size={18} /> Dedicated support</li>
              </ul>
              <a href="mailto:support@poofpop.com" className="btn btn-secondary btn-full">
                Contact Us
                <Icons.Mail size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="section-content">
          <div className="section-header">
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-subtitle">
              Everything you need to know about Poofpop
            </p>
          </div>
          <div className="faq-list">
            {[
              { q: 'What video formats are supported?', a: 'We support MP4, MOV, and WebM formats. Maximum file size is 200MB. Most videos from phones, cameras, and screen recordings work perfectly.' },
              { q: 'How long does processing take?', a: 'Processing time depends on video length and complexity. Most videos under 2 minutes are processed in 1-3 minutes. Longer videos may take up to 10 minutes.' },
              { q: 'What happens to my videos after processing?', a: 'Your privacy is important to us. All uploaded files and processed results are automatically deleted from our servers within 24 hours. We never share or use your content.' },
              { q: 'Can the AI remove any watermark?', a: 'Our AI can remove most common watermarks including text overlays, logos, and semi-transparent marks. Complex animated watermarks may have varying results.' },
              { q: 'Do credits expire?', a: 'No, your purchased credits never expire. Use them whenever you need, at your own pace.' },
              { q: 'What if I\'m not satisfied with the result?', a: 'If the AI fails to properly remove the watermark or object, you can try again with different settings. For persistent issues, contact our support team.' },
            ].map((item, i) => (
              <details key={i} className="faq-item">
                <summary className="faq-question">
                  {item.q}
                  <Icons.ChevronDown size={20} className="faq-chevron" />
                </summary>
                <div className="faq-answer">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-main">
            <div className="footer-brand">
              <a href="/" className="footer-logo">
                <Icons.LogoGlow size={32} />
                <span>Poofpop</span>
              </a>
              <p className="footer-tagline">
                AI-powered video processing. Remove watermarks and objects instantly.
              </p>
              <div className="footer-social">
                <a href="https://twitter.com/poofpop" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                  <Icons.Twitter size={20} />
                </a>
                <a href="https://github.com/poofpop" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                  <Icons.Github size={20} />
                </a>
                <a href="mailto:support@poofpop.com" aria-label="Email">
                  <Icons.Mail size={20} />
                </a>
              </div>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="#how-it-works">How it Works</a>
                <a href="#faq">FAQ</a>
              </div>
              <div className="footer-column">
                <h4>Company</h4>
                <a href="/about">About Us</a>
                <a href="/contact">Contact</a>
                <a href="/blog">Blog</a>
              </div>
              <div className="footer-column">
                <h4>Legal</h4>
                <a href="/privacy">Privacy Policy</a>
                <a href="/terms">Terms of Service</a>
                <a href="/refund">Refund Policy</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Poofpop. All rights reserved.</p>
            <p className="footer-made">
              Made with <Icons.Heart size={14} className="heart-icon" /> for creators worldwide
            </p>
          </div>
        </div>
      </footer>

      {/* Credits Modal - Lazy loaded */}
      {showCreditsModal && (
        <Suspense fallback={<ModalLoader />}>
          <CreditsModal
            onClose={() => setShowCreditsModal(false)}
            onCreditsUpdate={setCredits}
          />
        </Suspense>
      )}

      {/* API Key Modal - Lazy loaded */}
      {showApiKeyModal && (
        <Suspense fallback={<ModalLoader />}>
          <ApiKeyModal onClose={() => setShowApiKeyModal(false)} />
        </Suspense>
      )}

      {/* Batch Upload Modal - Lazy loaded */}
      {showBatchModal && (
        <Suspense fallback={<ModalLoader />}>
          <BatchUpload
            taskType={taskType}
            onClose={() => setShowBatchModal(false)}
            onCreditsUpdate={setCredits}
          />
        </Suspense>
      )}

      {/* Share Modal - Lazy loaded */}
      {showShareModal && downloadUrl && (
        <Suspense fallback={<ModalLoader />}>
          <ShareModal
            downloadUrl={downloadUrl}
            fileName={file?.name}
            onClose={() => setShowShareModal(false)}
          />
        </Suspense>
      )}

      {/* Auth Modal - Lazy loaded */}
      {showAuthModal && (
        <Suspense fallback={<ModalLoader />}>
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onSuccess={handleAuthSuccess}
          />
        </Suspense>
      )}
    </div>
  );
}
