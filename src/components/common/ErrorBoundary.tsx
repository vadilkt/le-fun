import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="error-boundary-container">
                    <style>{`
            .error-boundary-container {
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background-color: #f7f3f0; /* Fallback if var not loaded */
              background-color: var(--bg-app, #f7f3f0);
              padding: 2rem;
              text-align: center;
              font-family: system-ui, sans-serif;
            }
            .error-card {
              background: white;
              padding: 2rem;
              border-radius: 1rem;
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
              max-width: 500px;
              width: 100%;
              border: 1px solid rgba(0,0,0,0.05);
            }
            .error-icon {
              color: #fac5c5; /* Fallback */
              color: var(--error, #ef4444);
              margin-bottom: 1rem;
              display: inline-block;
              padding: 1rem;
              background: rgba(239, 68, 68, 0.1);
              border-radius: 50%;
            }
            .error-title {
              font-size: 1.5rem;
              font-weight: 700;
              margin-bottom: 0.5rem;
              color: #1f2933;
            }
            .error-message {
              color: #6b7280;
              margin-bottom: 1.5rem;
              font-size: 0.95rem;
              line-height: 1.5;
            }
            .retry-btn {
              background: #d4582f; /* Fallback */
              background: var(--primary, #d4582f);
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 99px;
              font-weight: 600;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
              transition: transform 0.1s, box-shadow 0.1s;
            }
            .retry-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 5px 15px rgba(212, 88, 47, 0.3);
            }
          `}</style>
                    <div className="error-card">
                        <div className="error-icon">
                            <AlertTriangle size={48} />
                        </div>
                        <h1 className="error-title">Oups ! Une erreur est survenue.</h1>
                        <p className="error-message">
                            Quelque chose s'est mal passé lors de l'affichage de cette page.
                            <br />
                            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                {this.state.error?.message || 'Erreur inconnue'}
                            </span>
                        </p>
                        <button
                            className="retry-btn"
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCw size={18} />
                            Recharger la page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
