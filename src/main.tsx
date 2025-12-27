import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// This component catches crashes and shows the error message
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-red-600 bg-red-50 min-h-screen font-mono">
          <h1 className="text-2xl font-bold mb-4">⚠️ App Crushed on Start</h1>
          <div className="bg-white p-4 rounded border border-red-200 shadow-sm overflow-auto">
            <p className="font-bold">{this.state.error?.message}</p>
            <p className="text-xs mt-2 text-slate-500">{this.state.error?.stack}</p>
          </div>
          <p className="mt-4 text-slate-700">Take a screenshot of this error and share it!</p>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)