import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let isPermissionError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.error.includes('permission')) {
            errorMessage = "You don't have permission to access this data. Please check your account role or try logging in again.";
            isPermissionError = true;
          }
        }
      } catch (e) {
        // Not a JSON error message, use default or raw message
        if (this.state.error?.message.includes('permission')) {
          errorMessage = "Permission denied. Please contact support if you believe this is an error.";
          isPermissionError = true;
        }
      }

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500 mb-2">
              <AlertTriangle size={32} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Oops! Something went wrong</h2>
              <p className="text-slate-400 leading-relaxed">
                {errorMessage}
              </p>
            </div>

            {this.state.error && !isPermissionError && (
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-left overflow-auto max-h-40">
                <code className="text-xs text-red-400 font-mono break-all">
                  {this.state.error.message}
                </code>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              <RefreshCcw size={20} />
              Try Again
            </button>
            
            <p className="text-xs text-slate-500">
              If the problem persists, please contact our support team.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
