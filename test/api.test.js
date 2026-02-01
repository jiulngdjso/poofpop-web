/**
 * API Client 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getStoredApiKey,
  getSessionToken,
  isAuthenticated,
  clearAuthData,
} from '../src/lib/api';

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem.mockReset();
    localStorage.setItem.mockReset();
    localStorage.removeItem.mockReset();
  });

  describe('getStoredApiKey', () => {
    it('should return stored API key', () => {
      localStorage.getItem.mockReturnValue('pk_live_test123');
      expect(getStoredApiKey()).toBe('pk_live_test123');
      expect(localStorage.getItem).toHaveBeenCalledWith('poofpop_api_key');
    });

    it('should return null if no key stored', () => {
      localStorage.getItem.mockReturnValue(null);
      expect(getStoredApiKey()).toBeNull();
    });
  });

  describe('getSessionToken', () => {
    it('should return stored session token', () => {
      localStorage.getItem.mockReturnValue('session_abc123');
      expect(getSessionToken()).toBe('session_abc123');
      expect(localStorage.getItem).toHaveBeenCalledWith('poofpop_session_token');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when both token and key exist', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'poofpop_session_token') return 'token';
        if (key === 'poofpop_api_key') return 'key';
        return null;
      });
      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when token is missing', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'poofpop_api_key') return 'key';
        return null;
      });
      expect(isAuthenticated()).toBe(false);
    });

    it('should return false when key is missing', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'poofpop_session_token') return 'token';
        return null;
      });
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('clearAuthData', () => {
    it('should remove all auth keys from localStorage', () => {
      clearAuthData();
      expect(localStorage.removeItem).toHaveBeenCalledWith('poofpop_session_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('poofpop_user');
      expect(localStorage.removeItem).toHaveBeenCalledWith('poofpop_api_key');
    });
  });
});

describe('API Requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockReset();
    localStorage.getItem.mockReturnValue('pk_live_test123');
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const { uploadInit } = await import('../src/lib/api');

      await expect(
        uploadInit('minimax_remove', 'test.mp4', 'video/mp4', 1000)
      ).rejects.toThrow('Unable to connect to server');
    });

    it('should handle API errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid request' }),
      });

      const { uploadInit } = await import('../src/lib/api');

      await expect(
        uploadInit('minimax_remove', 'test.mp4', 'video/mp4', 1000)
      ).rejects.toThrow('Invalid request');
    });
  });
});
