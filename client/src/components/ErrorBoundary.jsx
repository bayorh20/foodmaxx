import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('FoodMaxx Production Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    try {
      window.location.reload();
    } catch {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0D0F14] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="w-16 h-16 rounded-2xl bg-[#EA4C2A]/15 border border-[#EA4C2A]/30 flex items-center justify-center text-3xl mb-4 shadow-lg shadow-orange-500/10">
            🍔
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
            Something went wrong
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
            FoodMaxx encountered an unexpected issue while loading this view. Tap below to reload your delicious chow.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReload}
              className="bg-[#EA4C2A] hover:bg-[#D43D1D] active:scale-95 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-full shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
            >
              Reload FoodMaxx
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm px-5 py-3 rounded-full border border-white/15 transition-all cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
