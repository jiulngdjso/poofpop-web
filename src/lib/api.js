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

// Storage keys
const SESSION_TOKEN_KEY = 'poofpop_session_token';
const USER_DATA_KEY = 'poofpop_user';
const API_KEY_KEY = 'poofpop_api_key';

// Get stored session token
export function getSessionToken() {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

// Get stored API key (returns null if not logged in)
export function getStoredApiKey() {
  return localStorage.getItem(API_KEY_KEY);
}

// Get stored user data
export function getStoredUser() {
  const userData = localStorage.getItem(USER_DATA_KEY);
  return userData ? JSON.parse(userData) : null;
}

// Save auth data to localStorage
function saveAuthData(sessionToken, user, apiKey) {
  if (sessionToken) localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
  if (user) localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  if (apiKey) localStorage.setItem(API_KEY_KEY, apiKey);
}

// Clear auth data from localStorage
export function clearAuthData() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
  localStorage.removeItem(API_KEY_KEY);
}

// 通用请求头（包含认证）
function getHeaders(extra = {}) {
  const apiKey = getStoredApiKey();
  const headers = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  return headers;
}

// Get API key for EventSource (query param)
export function getApiKeyForEvents() {
  return getStoredApiKey() || '';
}

/**
 * 初始化上传，获取 presigned PUT URL
 * @param {string} taskType - 任务类型 (minimax_remove / video-object-removal / upscale)
 * @param {string} fileName - 文件名
 * @param {string} contentType - MIME 类型
 * @param {number} contentLength - 文件大小（字节），用于服务端验证
 * @returns {Promise<{upload_url: string, file_id: string, input_key: string, expires_in: number}>}
 */
export async function uploadInit(taskType, fileName, contentType, contentLength) {
  let response;
  try {
    response = await fetch(`${API_BASE}/upload-init`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        task_type: taskType,
        file_name: fileName,
        content_type: contentType,
        content_length: contentLength,
      }),
    });
  } catch (fetchError) {
    console.error('[uploadInit] Fetch error:', fetchError);
    throw new Error(`Unable to connect to server: ${fetchError.message}`);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload init failed' }));
    console.error('[uploadInit] API error:', error);
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
 * @param {string} webhookUrl - 完成后的回调 URL（可选）
 * @returns {Promise<{job_id: string, status: string, input_key: string, output_key: string}>}
 */
export async function submitProcess(taskType, fileId, inputKey, params = {}, webhookUrl = null, fileSize = null) {
  const body = {
    task_type: taskType,
    file_id: fileId,
    input_key: inputKey,
    params,
  };
  if (webhookUrl) {
    body.webhook_url = webhookUrl;
  }
  if (fileSize) {
    body.file_size = fileSize; // 传递文件大小用于动态计算积分
  }

  const response = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Process submit failed' }));
    // 特殊处理积分不足的错误
    if (response.status === 402 || error.error_code === 'INSUFFICIENT_CREDITS') {
      throw new Error(error.error || 'Insufficient credits. Please purchase more credits.');
    }
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
  const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
    headers: getHeaders(),
  });

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
  const response = await fetch(`${API_BASE}/download/${jobId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Get download URL failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 使用 SSE 订阅任务进度更新（推荐）
 * @param {string} jobId - 任务 ID
 * @param {function} onProgress - 进度回调 ({progress: number, progress_message: string, status: string})
 * @param {function} onComplete - 完成回调 ({status: string, output_key: string, error?: string})
 * @param {function} onError - 错误回调 (error: Error)
 * @returns {{close: function}} - 返回一个对象，调用 close() 可关闭连接
 */
export function subscribeJobProgress(jobId, onProgress, onComplete, onError) {
  // 由于 EventSource 不支持自定义 headers，我们需要通过 URL 参数传递 API key
  const apiKey = getStoredApiKey();
  const url = `${API_BASE}/jobs/${jobId}/events?api_key=${encodeURIComponent(apiKey || '')}`;

  const eventSource = new EventSource(url);

  eventSource.addEventListener('progress', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onProgress) {
        onProgress(data);
      }
    } catch (e) {
      console.error('Failed to parse progress event:', e);
    }
  });

  eventSource.addEventListener('complete', (event) => {
    try {
      const data = JSON.parse(event.data);
      eventSource.close();
      if (onComplete) {
        onComplete(data);
      }
    } catch (e) {
      console.error('Failed to parse complete event:', e);
      if (onError) {
        onError(new Error('Failed to parse completion data'));
      }
    }
  });

  eventSource.addEventListener('error', (event) => {
    // Check if it's a server-sent error event with data
    if (event.data) {
      try {
        const data = JSON.parse(event.data);
        eventSource.close();
        if (onError) {
          onError(new Error(data.message || 'Server error'));
        }
        return;
      } catch (e) {
        // Not a JSON error, continue to handle as connection error
      }
    }

    // Connection error - EventSource will auto-reconnect for some errors
    // but we treat all errors as terminal to avoid infinite reconnects
    eventSource.close();
    if (onError) {
      onError(new Error('Connection lost'));
    }
  });

  return {
    close: () => eventSource.close(),
  };
}

/**
 * 监听任务进度（自动选择 SSE 或轮询）
 * 优先使用 SSE，如果 SSE 不可用则回退到轮询
 * @param {string} jobId - 任务 ID
 * @param {function} onStatusChange - 状态变化回调 (status对象包含 progress 和 progress_message)
 * @returns {Promise<{job_id: string, status: string, progress: number}>}
 */
export async function watchJobProgress(jobId, onStatusChange) {
  return new Promise((resolve, reject) => {
    let subscription = null;
    let fallbackTimeout = null;

    // 设置 SSE 连接超时，如果 5 秒内没有收到任何事件，回退到轮询
    fallbackTimeout = setTimeout(() => {
      if (subscription) {
        subscription.close();
      }
      pollJobStatus(jobId, onStatusChange)
        .then(resolve)
        .catch(reject);
    }, 5000);

    subscription = subscribeJobProgress(
      jobId,
      (data) => {
        // 收到进度更新，清除超时
        if (fallbackTimeout) {
          clearTimeout(fallbackTimeout);
          fallbackTimeout = null;
        }
        if (onStatusChange) {
          onStatusChange({
            job_id: jobId,
            status: data.status,
            progress: data.progress,
            progress_message: data.progress_message,
          });
        }
      },
      (data) => {
        // 任务完成
        if (fallbackTimeout) {
          clearTimeout(fallbackTimeout);
        }
        if (data.status === 'completed') {
          resolve({
            job_id: jobId,
            status: data.status,
            progress: data.progress,
            output_key: data.output_key,
          });
        } else if (data.status === 'failed') {
          reject(new Error(data.error || 'Job failed'));
        } else if (data.status === 'cancelled') {
          reject(new Error('Job was cancelled'));
        }
      },
      (error) => {
        // SSE 错误，回退到轮询
        if (fallbackTimeout) {
          clearTimeout(fallbackTimeout);
        }
        pollJobStatus(jobId, onStatusChange)
          .then(resolve)
          .catch(reject);
      }
    );
  });
}

/**
 * 轮询任务状态直到完成或失败
 * @param {string} jobId - 任务 ID
 * @param {function} onStatusChange - 状态变化回调 (status对象包含 progress 和 progress_message)
 * @param {number} interval - 轮询间隔（毫秒）
 * @returns {Promise<{job_id: string, status: string, progress: number}>}
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
        } else if (status.status === 'cancelled') {
          reject(new Error('Job was cancelled'));
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

/**
 * 取消任务
 * @param {string} jobId - 任务 ID
 * @returns {Promise<{job_id: string, status: string, message: string}>}
 */
export async function cancelJob(jobId) {
  const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Cancel job failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 批量提交任务
 * @param {Array<{task_type: string, file_id: string, input_key?: string, params?: object}>} jobs - 任务列表
 * @param {string} webhookUrl - 完成后的回调 URL（可选）
 * @returns {Promise<{batch_id: string, jobs: Array, total: number}>}
 */
export async function submitBatch(jobs, webhookUrl = null) {
  const body = { jobs };
  if (webhookUrl) {
    body.webhook_url = webhookUrl;
  }

  const response = await fetch(`${API_BASE}/batch/process`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Batch submit failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 获取批量任务状态
 * @param {string} batchId - 批量任务 ID
 * @returns {Promise<{batch_id: string, status: string, total_jobs: number, completed_jobs: number, jobs: Array}>}
 */
export async function getBatchStatus(batchId) {
  const response = await fetch(`${API_BASE}/batch/${batchId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Get batch status failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 获取用户积分余额
 * @returns {Promise<{credits: number}>}
 */
export async function getCredits() {
  const response = await fetch(`${API_BASE}/credits`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Get credits failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 兑换 Gumroad 许可证密钥获取积分
 * @param {string} licenseKey - Gumroad 许可证密钥
 * @returns {Promise<{success: boolean, message: string, credits_added: number, new_balance: number}>}
 */
export async function redeemLicenseKey(licenseKey) {
  const response = await fetch(`${API_BASE}/redeem`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ license_key: licenseKey }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Redeem failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 内容安全检测 - 验证上传文件的安全性
 * @param {string} fileId - 文件 ID
 * @param {string} inputKey - 输入文件 key
 * @param {string} expectedType - 期望的 MIME 类型（可选）
 * @returns {Promise<{safe: boolean, file_exists: boolean, file_size?: number, detected_type?: string, message: string}>}
 */
export async function checkContentSafety(fileId, inputKey, expectedType = null) {
  const body = {
    file_id: fileId,
    input_key: inputKey,
  };
  if (expectedType) {
    body.expected_type = expectedType;
  }

  const response = await fetch(`${API_BASE}/content-check`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Content check failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ==================== Auth Functions ====================

/**
 * Register a new user
 * @param {string} email - User email
 * @param {string} password - User password (min 8 chars)
 * @param {string} name - User name (optional)
 * @returns {Promise<{success: boolean, user: object, api_key: string, session_token: string}>}
 */
export async function register(email, password, name = null) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();

  // Save auth data
  saveAuthData(data.session_token, data.user, data.api_key);

  return data;
}

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, user: object, session_token: string}>}
 */
export async function login(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();

  // Save auth data including API key
  saveAuthData(data.session_token, data.user, data.api_key);

  return data;
}

/**
 * Get current user info
 * @returns {Promise<{user: object, api_key_prefix: string}>}
 */
export async function getMe() {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthData();
      throw new Error('Session expired');
    }
    const error = await response.json().catch(() => ({ error: 'Failed to get user info' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();

  // Update stored user data
  if (data.user) {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
  }

  return data;
}

/**
 * Logout user
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function logout() {
  const sessionToken = getSessionToken();

  try {
    if (sessionToken) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });
    }
  } catch (e) {
    console.error('Logout API call failed:', e);
  }

  // Always clear local data
  clearAuthData();

  return { success: true, message: 'Logged out' };
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!getSessionToken() && !!getStoredApiKey();
}
