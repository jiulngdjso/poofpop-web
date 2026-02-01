import { useEffect, useState } from 'react';

// Storage keys (same as in api.js)
const SESSION_TOKEN_KEY = 'poofpop_session_token';
const USER_DATA_KEY = 'poofpop_user';
const API_KEY_KEY = 'poofpop_api_key';

export default function AuthCallback() {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authData = params.get('auth');
    const errorParam = params.get('error');

    if (errorParam) {
      setStatus('error');
      const errorMessages = {
        'no_code': 'Authorization failed. Please try again.',
        'not_configured': 'Google Sign-In is not configured.',
        'token_exchange_failed': 'Failed to authenticate with Google.',
        'userinfo_failed': 'Failed to get user information.',
        'user_creation_failed': 'Failed to create account.',
        'server_error': 'Server error. Please try again.',
      };
      setError(errorMessages[errorParam] || `Authentication failed: ${errorParam}`);
      return;
    }

    if (authData) {
      try {
        const data = JSON.parse(decodeURIComponent(authData));

        // Save auth data to localStorage
        if (data.session_token) {
          localStorage.setItem(SESSION_TOKEN_KEY, data.session_token);
        }
        if (data.user) {
          localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
        }
        if (data.api_key) {
          localStorage.setItem(API_KEY_KEY, data.api_key);
        }

        setStatus('success');

        // Redirect to home page after a short delay
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } catch (e) {
        setStatus('error');
        setError('Failed to process authentication data.');
      }
    } else {
      setStatus('error');
      setError('No authentication data received.');
    }
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: 'Inter, sans-serif',
    }}>
      {status === 'processing' && (
        <>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ marginTop: '1rem', color: '#64748b' }}>Completing sign in...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </>
      )}

      {status === 'success' && (
        <>
          <div style={{
            width: '48px',
            height: '48px',
            background: '#10b981',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
          }}>✓</div>
          <p style={{ marginTop: '1rem', color: '#10b981', fontWeight: 600 }}>
            Signed in successfully!
          </p>
          <p style={{ color: '#64748b' }}>Redirecting...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <div style={{
            width: '48px',
            height: '48px',
            background: '#ef4444',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
          }}>✕</div>
          <p style={{ marginTop: '1rem', color: '#ef4444', fontWeight: 600 }}>
            Sign in failed
          </p>
          <p style={{ color: '#64748b', maxWidth: '400px' }}>{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1.5rem',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Back to Home
          </button>
        </>
      )}
    </div>
  );
}
