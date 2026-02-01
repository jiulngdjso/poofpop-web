import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import AuthCallback from './AuthCallback.jsx'

// Lazy load legal pages
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'))
const TermsOfService = lazy(() => import('./pages/TermsOfService.jsx'))

// Simple router based on pathname
const pathname = window.location.pathname
const isAuthCallback = pathname === '/auth/callback'
const isPrivacyPage = pathname === '/privacy'
const isTermsPage = pathname === '/terms'

// Loading fallback for lazy-loaded pages
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontFamily: 'system-ui, sans-serif',
    color: '#666'
  }}>
    Loading...
  </div>
)

// Determine which component to render
const getPageComponent = () => {
  if (isAuthCallback) return <AuthCallback />
  if (isPrivacyPage) return <Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>
  if (isTermsPage) return <Suspense fallback={<PageLoader />}><TermsOfService /></Suspense>
  return <App />
}

// Initialize Sentry for error tracking
// TODO: Replace with your Sentry DSN from https://sentry.io
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || ''

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,  // Protect sensitive text like license keys
        maskAllInputs: true,
        blockAllMedia: false,
      }),
    ],
    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    // Session replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  })
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available - could show update prompt here
              }
            })
          }
        })
      })
      .catch(() => { /* SW registration failed - non-critical */ })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error }) => (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1>Something went wrong</h1>
          <p style={{ color: '#666' }}>
            {error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      )}
      onError={(error, componentStack) => {
        // Sentry automatically captures these errors
        Sentry.setContext('componentStack', { stack: componentStack });
      }}
    >
      {getPageComponent()}
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
