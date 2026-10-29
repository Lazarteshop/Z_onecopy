import React, {StrictMode, Suspense, lazy, useEffect, useState, useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import '../style.css';

const ZoneHoloPrototype = lazy(() => import('./components/holo/ZoneHoloPrototype.tsx'));

const HOLO_PREVIEW_STORAGE_KEY = 'zone_holo_prototype_preview';

function checkHoloPrototypeUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const pathname = window.location.pathname.replace(/\/+$/, '');
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace(/^#\/?/, '');
  const storedPreview = sessionStorage.getItem(HOLO_PREVIEW_STORAGE_KEY) === '1';
  return (
    pathname === '/holo-prototype' ||
    params.get('prototype') === 'holo' ||
    hash === 'holo-prototype' ||
    storedPreview
  );
}

function isDevOrAiStudioPreview(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  const isViteDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  return (
    isViteDev ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('ais-dev-') ||
    host.startsWith('ais-pre-') ||
    host.endsWith('.run.app')
  );
}

const RootEntry: React.FC = () => {
  const [showHoloPrototype, setShowHoloPrototype] = useState<boolean>(() => checkHoloPrototypeUrl());
  const showDevSwitch = isDevOrAiStudioPreview();

  const activateHoloPrototype = useCallback(() => {
    try {
      sessionStorage.setItem(HOLO_PREVIEW_STORAGE_KEY, '1');
      window.history.pushState({}, '', '/holo-prototype');
    } catch {
      // Ignore history/storage restrictions in sandboxed iframes
    }
    setShowHoloPrototype(true);
  }, []);

  const deactivateHoloPrototype = useCallback(() => {
    try {
      sessionStorage.removeItem(HOLO_PREVIEW_STORAGE_KEY);
      window.history.pushState({}, '', '/');
    } catch {
      // Ignore history/storage restrictions in sandboxed iframes
    }
    setShowHoloPrototype(false);
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      setShowHoloPrototype(checkHoloPrototypeUrl());
    };
    const handleCustomSwitch = (event: Event) => {
      const custom = event as CustomEvent<{ active?: boolean }>;
      if (custom.detail?.active === false) {
        deactivateHoloPrototype();
      } else if (custom.detail?.active === true) {
        activateHoloPrototype();
      } else {
        handleRouteChange();
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('zone:holo-prototype-switch', handleCustomSwitch);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('zone:holo-prototype-switch', handleCustomSwitch);
    };
  }, [activateHoloPrototype, deactivateHoloPrototype]);

  if (showHoloPrototype) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#030712] text-cyan-300 flex items-center justify-center font-mono text-xs uppercase tracking-widest">
            Initializing Z-ONEAPP Holographic Prototype...
          </div>
        }
      >
        <ZoneHoloPrototype />
      </Suspense>
    );
  }

  return (
    <>
      <App />
      {showDevSwitch && (
        <div className="fixed top-3 right-3 z-[99999] pointer-events-auto">
          <button
            type="button"
            onClick={activateHoloPrototype}
            data-testid="open-holo-prototype-preview"
            className="flex items-center gap-2 rounded-xl border border-cyan-400/60 bg-slate-950/90 px-3.5 py-2 text-xs font-extrabold tracking-wide text-cyan-200 shadow-[0_0_24px_rgba(0,242,254,0.3)] backdrop-blur-md transition hover:border-cyan-300 hover:bg-cyan-950/90 hover:text-white active:scale-95 cursor-pointer"
            title="Open the isolated Z-ONEAPP 3D Holographic World Phase 1 Prototype in Preview"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f2fe] animate-pulse" />
            <span>3D Holo Prototype (Preview)</span>
          </button>
        </div>
      )}
    </>
  );
};

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <RootEntry />
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

