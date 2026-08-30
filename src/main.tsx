import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import '../style.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (mountErr) {
    console.error('Fatal mounting error in main.tsx:', mountErr);
    rootElement.innerHTML = `
      <div style="min-height: 100vh; background: #0f172a; color: #fff; padding: 24px; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="max-width: 480px; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; text-align: center;">
          <h2 style="color: #ef4444; margin-top: 0;">Mounting Error Detected</h2>
          <p style="font-size: 14px; color: #cbd5e1;">Hindi nag-mount ang React component. Pindutin ang button sa ibaba upang i-reload.</p>
          <pre style="background: #020617; padding: 10px; border-radius: 6px; font-size: 12px; color: #f87171; text-align: left; overflow: auto;">${String(mountErr)}</pre>
          <button onclick="window.location.reload()" style="background: #2563eb; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 12px;">🔄 I-refresh ang Preview</button>
        </div>
      </div>
    `;
  }
}
