"use client";

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error, errorInfo: React.ErrorInfo): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: error, errorInfo: errorInfo };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dashboard error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        // <div className="flex items-center justify-center min-h-screen">
        //   <div className="text-center">
        //     <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
        //     <p className="text-sm text-muted-foreground mb-4">
        //       {this.state.error?.message}
        //     </p>
        //     <button
        //       onClick={() => window.location.reload()}
        //       className="text-primary hover:underline"
        //     >
        //       Refresh Page
        //     </button>
        //   </div>
        // </div>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-red-500 text-xl font-semibold">
              Oops! Something went wrong.
            </h2>
            <p className="text-gray-600 mt-2">
              An unexpected error occurred. Please try the following:
            </p>
            <ul className="list-disc pl-5 mt-2">
              <li>
                <button
                  onClick={() => window.location.reload()}
                  className="text-primary hover:underline"
                >
                  Refresh Page
                </button>
              </li>
              <li>Check your network connection.</li>
              <li>Contact support if the issue persists.</li>
            </ul>
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4">
                <summary>Error Details</summary>
                <pre className="text-left text-sm text-gray-800 bg-gray-100 p-2 rounded-md">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
          </div>
      );
    }

    return this.props.children;
  }
} 