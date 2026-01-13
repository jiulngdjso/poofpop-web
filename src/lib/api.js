/**
 * Poofpop API Client
 * 
 * 调用流程：
 * 1. POST /upload-init -> 获取 presigned PUT URL
 * 2. PUT upload_url -> 直传文件到 R2
 * 3. POST /process -> 提交处理任务
 * 4. GET /jobs/{job_id} -> 轮询任务状态
 * 5. GET /download/{job_id} -> 获取下载链接
 */

// API Base URL（从环境变量读取，默认使用生产地址）
const API_BASE = import.meta.env.VITE_API_BASE || 'https://poofpop-api.15159759780cjh.workers.dev';

/**
 * 初始化上传，获取 presigned PUT URL
 * @param {string} taskType - 任务类型 (minimax_remove / video-object-removal)
 * @param {string} fileName - 文件名
 * @param {string} contentType - MIME 类型
 * @returns {Promise<{upload_url: string, file_id: string, input_key: string}>}
 */
export async function uploadInit(taskType, fileName, contentType) {
  const response = await fetch(`${API_BASE}/upload-init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task_type: taskType,
      file_name: fileName,
      content_type: contentType,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload init failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 上传文件到 R2（使用 presigned URL）
 * @param {string} uploadUrl - presigned PUT URL
 * @param {File} file - 文件对象
 * @param {function} onProgress - 进度回调 (percent: number)
 * @returns {Promise<void>}
 */
export async function uploadFile(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: HTTP ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: Network error'));
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * 提交处理任务
 * @param {string} taskType - 任务类型
 * @param {string} fileId - 文件 ID
 * @param {string} inputKey - 输入文件 key
 * @param {object} params - 任务参数
 * @returns {Promise<{job_id: string, status: string, input_key: string, output_key: string}>}
 */
export async function submitProcess(taskType, fileId, inputKey, params = {}) {
  const response = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task_type: taskType,
      file_id: fileId,
      input_key: inputKey,
      params,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Process submit failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 获取任务状态
 * @param {string} jobId - 任务 ID
 * @returns {Promise<{job_id: string, status: string, error?: string}>}
 */
export async function getJobStatus(jobId) {
  const response = await fetch(`${API_BASE}/jobs/${jobId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Get job status failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 获取下载链接
 * @param {string} jobId - 任务 ID
 * @returns {Promise<{download_url: string}>}
 */
export async function getDownloadUrl(jobId) {
  const response = await fetch(`${API_BASE}/download/${jobId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Get download URL failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 轮询任务状态直到完成或失败
 * @param {string} jobId - 任务 ID
 * @param {function} onStatusChange - 状态变化回调
 * @param {number} interval - 轮询间隔（毫秒）
 * @returns {Promise<{job_id: string, status: string}>}
 */
export async function pollJobStatus(jobId, onStatusChange, interval = 3000) {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getJobStatus(jobId);
        
        if (onStatusChange) {
          onStatusChange(status);
        }

        if (status.status === 'completed') {
          resolve(status);
        } else if (status.status === 'failed') {
          reject(new Error(status.error || 'Job failed'));
        } else {
          // 继续轮询
          setTimeout(poll, interval);
        }
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
}
