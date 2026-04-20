/**
 * React Error Boundary component.
 * Catches rendering errors in child component trees and displays a graceful fallback UI
 * instead of crashing the entire application.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log to console in development; in production this would go to an error reporting service
    console.error('[CollabCanvas ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: '#0a0a0a',
            color: '#fff',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '3rem',
              marginBottom: '1rem',
            }}
            aria-hidden="true"
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', maxWidth: '400px' }}>
            CollabCanvas encountered an unexpected error. Your canvas data is safe — please
            try refreshing the page.
          </p>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <pre
              style={{
                fontSize: '0.75rem',
                color: '#f87171',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '0.5rem',
                padding: '1rem',
                maxWidth: '600px',
                textAlign: 'left',
                overflow: 'auto',
                marginBottom: '1.5rem',
              }}
            >
              {this.state.error.message}
              {this.state.errorInfo?.componentStack}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            aria-label="Try again – reload the canvas"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              border: 'none',
              borderRadius: '0.75rem',
              padding: '0.75rem 2rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
