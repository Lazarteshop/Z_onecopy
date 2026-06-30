import React from 'react';
import { 
  Smartphone, 
  Download, 
  Sparkles, 
  Laptop,
  Copy,
  Check,
  Info
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface AppInstallationPanelProps {
  deferredPrompt: any;
  showInstallPwaBtn: boolean;
  onInstallPwa: () => Promise<void>;
  triggerNotification: (message: string, type: 'success' | 'info' | 'error') => void;
  language?: 'en' | 'tl';
}

export default function AppInstallationPanel({
  deferredPrompt,
  showInstallPwaBtn,
  onInstallPwa,
  triggerNotification,
  language = 'en'
}: AppInstallationPanelProps) {
  const isTl = language === 'tl';

  const handleInstallClick = async () => {
    try {
      soundEffects.playClick();
    } catch (_) {}
    
    if (showInstallPwaBtn && deferredPrompt) {
      await onInstallPwa();
    } else {
      triggerNotification(
        isTl 
          ? "💡 Pakisunod ang gabay sa ibaba para i-install ang app gamit ang menu ng iyong browser."
          : "💡 Please follow the guide below to install the app using your browser menu.",
        "info"
      );
    }
  };

  return (
    <div id="pwa-installation-panel" className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl border border-blue-100 p-5 shadow-xs space-y-4">
      {/* CARD HEADER */}
      <div className="flex items-center justify-between border-b border-blue-100/70 pb-3">
        <h3 className="font-extrabold text-slate-900 text-xs tracking-wider uppercase flex items-center gap-1.5">
          <Smartphone className="w-4 h-4 text-blue-600 animate-pulse" />
          <span>{isTl ? "I-install ang Z-oneApp" : "Install Z-oneApp"}</span>
        </h3>
        <span className="bg-emerald-50 border border-emerald-100 text-[10px] font-black text-emerald-600 px-2.5 py-0.5 rounded-full flex items-center gap-0.5 animate-bounce">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          <span>{isTl ? "Mabilis" : "Fast & Secure"}</span>
        </span>
      </div>

      <p className="text-xs text-slate-600 font-medium leading-relaxed">
        {isTl 
          ? "I-install ang Z-oneApp bilang isang Progressive Web App (PWA) sa iyong cellphone. Magkakaroon ito ng sariling icon sa iyong Home Screen at gagana nang buong-screen para sa pinakamagandang karanasan!"
          : "Install Z-oneApp as a Progressive Web App (PWA) on your mobile device. It adds a shortcut icon to your Home Screen and runs in beautiful fullscreen mode!"}
      </p>

      {/* INSTALL ACTION BUTTON */}
      <button
        onClick={handleInstallClick}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-4 rounded-xl transition shadow-sm flex items-center justify-center gap-2 text-xs cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
      >
        <Download className="w-4 h-4 animate-bounce" />
        <span>{isTl ? "I-install ang App" : "Install App"}</span>
      </button>

      {/* HOW TO INSTALL GUIDE */}
      <div className="p-3.5 bg-white border border-blue-100 rounded-xl text-xs text-slate-700 font-medium space-y-2">
        <div className="flex items-center gap-1.5 text-blue-950 font-bold border-b border-slate-100 pb-1.5">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <span>{isTl ? "Paano I-install nang Mano-mano:" : "How to Install Manually:"}</span>
        </div>
        
        <ul className="space-y-2 text-[11px] leading-relaxed pl-1 text-slate-600">
          <li className="flex items-start gap-1.5">
            <span className="text-blue-500 font-bold">1.</span>
            <span>
              <strong>Google Chrome (Android):</strong> {isTl 
                ? "I-tap ang tatlong tuldok (⋮) sa kanang itaas ng browser, at piliin ang 'I-install ang app' o 'Idagdag sa Home screen'."
                : "Tap the three dots (⋮) in the top-right corner of the browser, and select 'Install app' or 'Add to Home screen'."}
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-blue-500 font-bold">2.</span>
            <span>
              <strong>Safari (iPhone / iOS):</strong> {isTl 
                ? "I-tap ang 'Share' button (pataas na arrow sa loob ng kahon) sa ibaba ng screen, at piliin ang 'Add to Home Screen'."
                : "Tap the 'Share' button (square with arrow pointing up) at the bottom, and select 'Add to Home Screen'."}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
