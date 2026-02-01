// User-friendly error messages with guidance

const ERROR_MESSAGES = {
  // File errors
  FILE_TOO_LARGE: {
    title: 'File Too Large',
    message: 'Your video exceeds the 200MB size limit.',
    guidance: 'Try compressing your video or trimming it to a shorter length.',
  },
  INVALID_FILE_TYPE: {
    title: 'Unsupported Format',
    message: 'This file type is not supported.',
    guidance: 'Please upload a video in MP4, MOV, or WebM format.',
  },

  // Credit errors
  INSUFFICIENT_CREDITS: {
    title: 'Not Enough Credits',
    message: 'You need more credits to process this video.',
    guidance: 'Purchase more credits from Gumroad to continue.',
    action: { label: 'Get Credits', url: 'https://poofpop.gumroad.com/l/100Credits' },
  },

  // Processing errors
  RUNPOD_SUBMIT_ERROR: {
    title: 'Processing Failed to Start',
    message: 'We couldn\'t start processing your video.',
    guidance: 'This is usually temporary. Please try again in a few minutes.',
  },
  RUNPOD_TIMEOUT: {
    title: 'Processing Timed Out',
    message: 'Your video took too long to process.',
    guidance: 'Try uploading a shorter video (under 2 minutes works best).',
  },
  PROCESSING_FAILED: {
    title: 'Processing Failed',
    message: 'Something went wrong while processing your video.',
    guidance: 'Make sure your video is not corrupted. If the issue persists, try a different video.',
  },

  // Network errors
  NETWORK_ERROR: {
    title: 'Connection Problem',
    message: 'We couldn\'t connect to our servers.',
    guidance: 'Check your internet connection and try again.',
  },
  UPLOAD_FAILED: {
    title: 'Upload Failed',
    message: 'Your video failed to upload.',
    guidance: 'Check your internet connection and try uploading again.',
  },

  // Rate limit
  RATE_LIMITED: {
    title: 'Too Many Requests',
    message: 'You\'ve made too many requests.',
    guidance: 'Please wait a minute before trying again.',
  },

  // Auth errors
  INVALID_API_KEY: {
    title: 'Authentication Failed',
    message: 'Your API key is invalid or expired.',
    guidance: 'Contact support to get a new API key.',
  },

  // Default
  UNKNOWN_ERROR: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred.',
    guidance: 'Please try again. If the issue persists, contact support.',
  },
};

// Parse error from API response or error message
export function parseError(error) {
  // If it's already a structured error
  if (error?.error_code && ERROR_MESSAGES[error.error_code]) {
    return ERROR_MESSAGES[error.error_code];
  }

  // Try to match by error message content
  const message = error?.message || error?.error || String(error);

  if (message.includes('429') || message.toLowerCase().includes('rate limit')) {
    return ERROR_MESSAGES.RATE_LIMITED;
  }
  if (message.includes('401') || message.includes('403') || message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('api key') || message.toLowerCase().includes('api_key')) {
    return ERROR_MESSAGES.INVALID_API_KEY;
  }
  if (message.toLowerCase().includes('insufficient credits') || message.toLowerCase().includes('not enough credits')) {
    return ERROR_MESSAGES.INSUFFICIENT_CREDITS;
  }
  if (message.toLowerCase().includes('timeout')) {
    return ERROR_MESSAGES.RUNPOD_TIMEOUT;
  }
  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  if (message.toLowerCase().includes('upload')) {
    return ERROR_MESSAGES.UPLOAD_FAILED;
  }
  if (message.toLowerCase().includes('file') && message.toLowerCase().includes('large')) {
    return ERROR_MESSAGES.FILE_TOO_LARGE;
  }
  if (message.toLowerCase().includes('file') && message.toLowerCase().includes('type')) {
    return ERROR_MESSAGES.INVALID_FILE_TYPE;
  }

  // Default error with original message
  return {
    ...ERROR_MESSAGES.UNKNOWN_ERROR,
    message: message || ERROR_MESSAGES.UNKNOWN_ERROR.message,
  };
}
