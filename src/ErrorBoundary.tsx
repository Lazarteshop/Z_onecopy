import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRITICAL React Runtime Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCacheAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      }
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch (e) {
      console.warn(e);
    }
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#090d16',
          color: '#f8fafc',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          zIndex: 999999
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: '#131b2e',
            border: '1px solid #273552',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px'
              }}>
                ⚠️
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#f87171' }}>
                  Application Recovery Mode
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                  Naharang ang fatal screen error upang hindi mag-blank ang preview.
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: '#0a0f1d',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '18px',
              border: '1px solid #1e293b',
              overflowX: 'auto',
              maxHeight: '160px'
            }}>
              <p style={{ margin: 0, fontSize: '12px', fontFamily: 'monospace', color: '#fca5a5' }}>
                {this.state.error?.toString() || 'Unknown runtime error'}
              </p>
              {this.state.errorInfo?.componentStack && (
                <pre style={{ margin: '8px 0 0', fontSize: '11px', color: '#64748b', whiteSpace: 'pre-wrap' }}>
                  {this.state.errorInfo.componentStack.slice(0, 400)}
                </pre>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  flex: '1 1 auto',
                  minWidth: '140px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                🔄 I-Reload ang App
              </button>
              <button
                onClick={this.handleClearCacheAndReload}
                style={{
                  flex: '1 1 auto',
                  minWidth: '160px',
                  backgroundColor: '#334155',
                  color: '#e2e8f0',
                  border: '1px solid #475569',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                🧹 Linisin ang Cache & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
