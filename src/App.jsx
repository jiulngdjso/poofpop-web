import { useState, useRef } from 'react';
import {
  uploadInit,
  uploadFile,
  submitProcess,
  pollJobStatus,
  getDownloadUrl,
} from './lib/api';
import './App.css';

// 任务类型配置
const TASK_TYPES = [
  { value: 'minimax_remove', label: '视频去水印 (minimax_remove)' },
  { value: 'video-object-removal', label: '视频物体移除 (video-object-removal)' },
];

// 状态显示映射
const STATUS_LABELS = {
  idle: '等待上传',
  uploading: '上传中...',
  processing: '处理中...',
  completed: '处理完成',
  failed: '处理失败',
  pending: '排队中...',
};

function App() {
  // 任务类型
  const [taskType, setTaskType] = useState('minimax_remove');
  
  // 文件相关
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  
  // 参数
  const [removeText, setRemoveText] = useState('person');
  
  // 状态
  const [status, setStatus] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState(null);
  
  // 是否正在处理
  const isProcessing = ['uploading', 'processing', 'pending'].includes(status);

  // 选择文件
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // 验证文件类型
      if (!selectedFile.type.startsWith('video/')) {
        setError('请选择视频文件 (mp4)');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setStatus('idle');
      setJobId(null);
      setJobStatus(null);
      setDownloadUrl(null);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 开始处理
  const handleStart = async () => {
    if (!file) {
      setError('请先选择文件');
      return;
    }

    setError(null);
    setStatus('uploading');
    setUploadProgress(0);
    setJobId(null);
    setJobStatus(null);
    setDownloadUrl(null);

    try {
      // Step 1: 初始化上传
      const initResult = await uploadInit(taskType, file.name, file.type);
      
      // Step 2: 上传文件
      await uploadFile(initResult.upload_url, file, (percent) => {
        setUploadProgress(percent);
      });

      // Step 3: 提交处理任务
      setStatus('pending');
      const params = taskType === 'video-object-removal' 
        ? { remove_text: removeText }
        : {};
      
      const processResult = await submitProcess(
        taskType,
        initResult.file_id,
        initResult.input_key,
        params
      );

      setJobId(processResult.job_id);
      setStatus('processing');

      // Step 4: 轮询状态
      await pollJobStatus(processResult.job_id, (statusData) => {
        setJobStatus(statusData);
        if (statusData.status === 'processing') {
          setStatus('processing');
        } else if (statusData.status === 'pending') {
          setStatus('pending');
        }
      });

      // Step 5: 获取下载链接
      const downloadResult = await getDownloadUrl(processResult.job_id);
      setDownloadUrl(downloadResult.download_url);
      setStatus('completed');

    } catch (err) {
      setError(err.message || '处理失败');
      setStatus('failed');
    }
  };

  // 重置
  const handleReset = () => {
    setFile(null);
    setStatus('idle');
    setUploadProgress(0);
    setJobId(null);
    setJobStatus(null);
    setDownloadUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 下载
  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  return (
    <div className="app">
      {/* 标题 */}
      <header className="header">
        <h1>🎬 Poofpop</h1>
        <p className="subtitle">视频/图片 AI 处理工具</p>
      </header>

      <main className="main">
        {/* 任务选择 */}
        <section className="section">
          <label className="label">任务类型</label>
          <select
            className="select"
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            disabled={isProcessing}
          >
            {TASK_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </section>

        {/* 上传区 */}
        <section className="section">
          <label className="label">选择文件</label>
          <div className="upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/*"
              onChange={handleFileSelect}
              disabled={isProcessing}
              className="file-input"
            />
            {file && (
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
              </div>
            )}
          </div>
        </section>

        {/* 参数区 */}
        {taskType === 'video-object-removal' && (
          <section className="section">
            <label className="label">移除目标 (remove_text)</label>
            <input
              type="text"
              className="input"
              value={removeText}
              onChange={(e) => setRemoveText(e.target.value)}
              placeholder="例如: person, car, text"
              disabled={isProcessing}
            />
            <p className="hint">描述要从视频中移除的物体</p>
          </section>
        )}

        {/* 按钮区 */}
        <section className="section buttons">
          <button
            className="button primary"
            onClick={handleStart}
            disabled={!file || isProcessing}
          >
            {isProcessing ? '处理中...' : '开始处理'}
          </button>
          <button
            className="button secondary"
            onClick={handleReset}
            disabled={isProcessing}
          >
            重置
          </button>
        </section>

        {/* 进度区 */}
        {status !== 'idle' && (
          <section className="section progress-section">
            <h3>处理状态</h3>
            
            {/* 上传进度 */}
            {status === 'uploading' && (
              <div className="progress-item">
                <span>上传进度</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span>{uploadProgress}%</span>
              </div>
            )}

            {/* 任务状态 */}
            <div className="status-info">
              <div className="status-row">
                <span className="status-label">状态:</span>
                <span className={`status-value status-${status}`}>
                  {STATUS_LABELS[status] || status}
                </span>
              </div>
              
              {jobId && (
                <div className="status-row">
                  <span className="status-label">Job ID:</span>
                  <span className="status-value job-id">{jobId}</span>
                </div>
              )}

              {jobStatus?.output_key && (
                <div className="status-row">
                  <span className="status-label">输出:</span>
                  <span className="status-value">{jobStatus.output_key}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 错误提示 */}
        {error && (
          <section className="section error-section">
            <p className="error-message">❌ {error}</p>
          </section>
        )}

        {/* 下载区 */}
        {status === 'completed' && downloadUrl && (
          <section className="section download-section">
            <h3>✅ 处理完成</h3>
            <button className="button download" onClick={handleDownload}>
              📥 下载结果
            </button>
          </section>
        )}
      </main>

      {/* 页脚 */}
      <footer className="footer">
        <p>Powered by Cloudflare Workers + RunPod</p>
      </footer>
    </div>
  );
}

export default App;
