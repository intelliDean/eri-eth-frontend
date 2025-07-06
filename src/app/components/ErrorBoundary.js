"use client";

import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
        
        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                        <div className="text-6xl mb-4">⚠️</div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">
                            Something went wrong
                        </h1>
                        <p className="text-gray-600 mb-6">
                            We're sorry, but something unexpected happened. Please try refreshing the page.
                        </p>
                        
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="text-left mb-6">
                                <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                                    Error Details (Development)
                                </summary>
                                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                        
                        <div className="space-y-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
                            >
                                Refresh Page
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;