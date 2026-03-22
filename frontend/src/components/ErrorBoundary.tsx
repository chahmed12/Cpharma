import React, { type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    // Rend le fallback UI à la prochaine render
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log exception to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif' }}>
          <h2>Oups, une erreur inattendue s'est produite.</h2>
          <p>Nous sommes désolés pour ce désagrément.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', marginTop: '20px' }}>
            Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
