import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-black text-white p-6 font-sans relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2560)', 
            backgroundSize: 'cover', 
            filter: 'blur(20px)' 
          }}></div>
          <div className="glass-panel p-8 md:p-12 rounded-[32px] border border-white/10 bg-black/40 backdrop-blur-2xl relative z-10 max-w-md text-center shadow-2xl">
            <h1 className="text-3xl font-bold mb-4 text-white tracking-tight">System Halted</h1>
            <p className="text-white/60 mb-8 leading-relaxed">The atmosphere has been disrupted. Please re-synchronize to continue your session.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 shadow-lg"
            >
              Reload System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;