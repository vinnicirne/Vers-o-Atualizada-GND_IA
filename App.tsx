import React from 'react';
import { Layers } from 'lucide-react';
import { APP_NAME, APP_VERSION } from './constants';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <main className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {APP_NAME}
            </h1>
            <p className="text-slate-500">
              A clean, robust foundation for your next idea.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
              Version {APP_VERSION}
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-8 text-center text-sm text-slate-400">
        <p>Edit <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-600">App.tsx</code> to get started.</p>
      </footer>
    </div>
  );
};

export default App;