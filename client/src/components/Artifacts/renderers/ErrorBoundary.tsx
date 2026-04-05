import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onSwitchToCode?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class RendererErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6">
          <div className="text-text-secondary text-sm font-medium">Preview Error</div>
          <pre className="bg-surface-secondary max-h-40 max-w-full overflow-auto rounded-md p-3 text-xs">
            {this.state.error.message}
          </pre>
          {this.props.onSwitchToCode && (
            <button
              onClick={this.props.onSwitchToCode}
              className="text-text-primary bg-surface-tertiary rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-80"
            >
              View Source
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
