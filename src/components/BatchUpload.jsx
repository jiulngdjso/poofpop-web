import { useState, useRef } from 'react';
import { Icons } from './Icons';
import { uploadInit, uploadFile, submitBatch, getBatchStatus, getDownloadUrl } from '../lib/api';

// Format file size
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function BatchUpload({ taskType, onClose, onCreditsUpdate }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [batchStatus, setBatchStatus] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const addFiles = (newFiles) => {
    const validFiles = Array.from(newFiles).filter(f => {
      if (!f.type.startsWith('video/')) return false;
      if (f.size > 200 * 1024 * 1024) return false;
      return true;
    });

    if (validFiles.length < newFiles.length) {
      setError('Some files were skipped (must be video under 200MB)');
    }

    setFiles(prev => [...prev, ...validFiles.map(f => ({
      file: f,
      id: crypto.randomUUID(),
      status: 'pending',
      progress: 0,
      uploadedKey: null,
      fileId: null,
    }))].slice(0, 20)); // Max 20 files
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleProcess = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      // Upload all files
      const uploadedFiles = [];
      for (const fileItem of files) {
        setFiles(prev => prev.map(f =>
          f.id === fileItem.id ? { ...f, status: 'uploading' } : f
        ));

        const init = await uploadInit(taskType, fileItem.file.name, fileItem.file.type, fileItem.file.size);
        await uploadFile(init.upload_url, fileItem.file, (progress) => {
          setFiles(prev => prev.map(f =>
            f.id === fileItem.id ? { ...f, progress } : f
          ));
        });

        uploadedFiles.push({
          id: fileItem.id,
          task_type: taskType,
          file_id: init.file_id,
          input_key: init.input_key,
        });

        setFiles(prev => prev.map(f =>
          f.id === fileItem.id ? { ...f, status: 'uploaded', uploadedKey: init.input_key, fileId: init.file_id } : f
        ));
      }

      setUploading(false);
      setProcessing(true);

      // Submit batch
      const batchJobs = uploadedFiles.map(f => ({
        task_type: f.task_type,
        file_id: f.file_id,
        input_key: f.input_key,
      }));

      const result = await submitBatch(batchJobs);
      setBatchStatus(result);

      // Poll for completion
      const pollBatch = async () => {
        const status = await getBatchStatus(result.batch_id);
        setBatchStatus(status);

        // Update individual file statuses
        if (status.jobs) {
          setFiles(prev => prev.map(f => {
            const job = status.jobs.find(j => j.input_key === f.uploadedKey);
            if (job) {
              return { ...f, status: job.status, jobId: job.job_id };
            }
            return f;
          }));
        }

        if (status.status === 'completed' || status.status === 'failed') {
          setProcessing(false);
        } else {
          setTimeout(pollBatch, 3000);
        }
      };

      pollBatch();
    } catch (err) {
      setError(err.message);
      setUploading(false);
      setProcessing(false);
    }
  };

  const downloadResult = async (file) => {
    if (file.jobId && file.status === 'completed') {
      try {
        const dl = await getDownloadUrl(file.jobId);
        window.open(dl.download_url, '_blank');
      } catch (err) {
        setError('Failed to get download URL');
      }
    }
  };

  const isWorking = uploading || processing;
  const completedCount = files.filter(f => f.status === 'completed').length;
  const totalProgress = batchStatus
    ? Math.round((batchStatus.completed_jobs / batchStatus.total_jobs) * 100)
    : 0;

  return (
    <div className="modal-overlay" onClick={() => !isWorking && onClose()}>
      <div className="modal batch-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Batch Processing</h3>
          <button className="modal-close" onClick={onClose} disabled={isWorking}>
            <Icons.X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Drop zone */}
          {!isWorking && files.length < 20 && (
            <div
              className="batch-dropzone"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                multiple
                onChange={(e) => addFiles(e.target.files)}
                style={{ display: 'none' }}
              />
              <Icons.Upload size={32} />
              <p>Drop videos here or click to browse</p>
              <span>Up to 20 videos, 200MB each</span>
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="batch-files">
              <div className="batch-files-header">
                <span>{files.length} file{files.length !== 1 ? 's' : ''}</span>
                {batchStatus && (
                  <span className="batch-progress-text">
                    {completedCount}/{batchStatus.total_jobs} completed
                  </span>
                )}
              </div>
              <div className="batch-files-list">
                {files.map(f => (
                  <div key={f.id} className={`batch-file-item ${f.status}`}>
                    <div className="batch-file-info">
                      <Icons.Video size={16} />
                      <span className="batch-file-name">{f.file.name}</span>
                      <span className="batch-file-size">{formatSize(f.file.size)}</span>
                    </div>
                    <div className="batch-file-status">
                      {f.status === 'pending' && !isWorking && (
                        <button className="btn-icon" onClick={() => removeFile(f.id)}>
                          <Icons.X size={16} />
                        </button>
                      )}
                      {f.status === 'uploading' && (
                        <span className="status-text">{f.progress}%</span>
                      )}
                      {f.status === 'uploaded' && (
                        <Icons.Check size={16} className="status-uploaded" />
                      )}
                      {f.status === 'processing' && (
                        <Icons.Spinner size={16} />
                      )}
                      {f.status === 'completed' && (
                        <button className="btn-icon btn-download" onClick={() => downloadResult(f)}>
                          <Icons.Download size={16} />
                        </button>
                      )}
                      {f.status === 'failed' && (
                        <Icons.AlertTriangle size={16} className="status-failed" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress bar for batch */}
          {processing && batchStatus && (
            <div className="batch-overall-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${totalProgress}%` }} />
              </div>
              <span>{totalProgress}% complete</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="modal-alert error">{error}</div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={isWorking}>
            {batchStatus?.status === 'completed' ? 'Done' : 'Cancel'}
          </button>
          {!batchStatus && (
            <button
              className="btn btn-primary"
              onClick={handleProcess}
              disabled={files.length === 0 || isWorking}
            >
              {isWorking ? (
                <>
                  <Icons.Spinner size={18} />
                  {uploading ? 'Uploading...' : 'Processing...'}
                </>
              ) : (
                <>
                  <Icons.Play size={18} />
                  Process {files.length} File{files.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
