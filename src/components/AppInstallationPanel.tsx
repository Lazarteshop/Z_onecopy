import React, { useState } from 'react';
import { 
  Smartphone, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink,
  Laptop
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
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadAPK = () => {
    if (isDownloading) return;
    
    // Play reward/click sound if audio utility is in use
    try {
      soundEffects.playClick();
    } catch (_) {}

    setIsDownloading(true);
    setDownloadProgress(0);

    triggerNotification(
      isTl 
        ? "📥 Sinisimulan ang pag-download ng Z-oneApp Mobile APK..." 
        : "📥 Starting Z-oneApp Mobile APK download...", 
      "info"
    );

    // Simulate standard, professional downloading steps
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev === null) return 0;
        if (prev >= 100) {
          clearInterval(interval);
          
          // Trigger actual browser download
          const link = document.createElement('a');
          link.href = '/Z-oneApp.apk';
          link.download = 'Z-oneApp.apk';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setIsDownloading(false);
          setDownloadProgress(null);

          try {
            soundEffects.playReward();
          } catch (_) {}

          triggerNotification(
            isTl 
              ? "🎉 Tagumpay! Naka-download na ang Z-oneApp.apk. Buksan ito sa iyong Android device para i-install." 
              : "🎉 Success! Z-oneApp.apk has been downloaded. Open it on your Android device to install.", 
            "success"
          );
          return 100;
        }
        return prev + 10;
      });
    }, 250);
  };

  return (
    <div id="pwa-apk-installation-panel" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      {/* CARD HEADER */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-extrabold text-slate-900 text-xs tracking-wider uppercase flex items-center gap-1.5">
          <Smartphone className="w-4 h-4 text-blue-600 animate-pulse" />
          <span>{isTl ? "I-install sa Mobile App" : "Install Mobile App"}</span>
        </h3>
        <span className="bg-emerald-50 border border-emerald-100 text-[10px] font-black text-emerald-600 px-2 py-0.5 rounded-full flex items-center gap-0.5 animate-bounce">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          <span>{isTl ? "Recomended" : "Recommended"}</span>
        </span>
      </div>

      {/* DESCRIPTION */}
      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
        {isTl 
          ? "I-install ang aming opisyal na Mobile App para sa mas mabilis at magandang full-screen experience. Mag-earn ng rewards nang tuloy-tuloy kahit nasaan ka!"
          : "Install our official Mobile App for a faster and beautiful full-screen experience. Earn rewards continuously wherever you are!"}
      </p>

      {/* ACTION ACTIONS FOR APK & PWA */}
      <div className="space-y-2.5">
        
        {/* OPTION 1: DOWNLOAD DIRECT ANDROID APK */}
        <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-indigo-700 font-black uppercase tracking-wider flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
              Option 1: Android APK File
            </span>
            <span className="text-[10px] text-slate-400 font-bold font-mono">Size: ~2.4MB</span>
          </div>
          
          {downloadProgress !== null ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                <span>Downloading package...</span>
                <span>{downloadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleDownloadAPK}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-3 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 text-xs cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <Download className="w-4 h-4" />
              <span>{isTl ? "I-download ang Android APK" : "Download Android APK"}</span>
            </button>
          )}
        </div>

        {/* OPTION 2: INSTALL PWA IF AVAILABLE */}
        {showInstallPwaBtn && deferredPrompt ? (
          <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-700 font-black uppercase tracking-wider flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                Option 2: Mobile Web App (PWA)
              </span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.2 rounded">Instant</span>
            </div>
            <button
              onClick={onInstallPwa}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-3 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 text-xs cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <Laptop className="w-4 h-4" />
              <span>{isTl ? "I-install ang Web App" : "Install Web App (PWA)"}</span>
            </button>
          </div>
        ) : (
          <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-[10px] text-slate-500 font-medium leading-relaxed">
            <span className="font-bold text-slate-700 block mb-0.5">💡 {isTl ? "Mabilisang PWA Install" : "Quick PWA Installation"}</span>
            {isTl 
              ? "Kung gamit mo ang Safari o Chrome, maaari mong piliin ang 'Add to Home Screen' sa menu ng iyong browser upang gawin itong app."
              : "If using Safari or Chrome, you can select 'Add to Home Screen' in your browser options to run it as an app immediately."}
          </div>
        )}

      </div>

      {/* STEP-BY-STEP MOBILE INSTALLATION GUIDE */}
      <div className="border-t border-slate-100 pt-3 space-y-2.5">
        <h4 className="font-extrabold text-slate-900 text-[10px] uppercase tracking-wider">
          {isTl ? "Paano I-install ang APK sa CP:" : "How to Install APK on Mobile:"}
        </h4>
        <ul className="text-[10px] font-semibold text-slate-500 space-y-1.5 list-none pl-0">
          <li className="flex items-start gap-1.5">
            <span className="h-4 w-4 bg-slate-150 text-slate-700 rounded-full flex items-center justify-center font-bold text-[8px] shrink-0 mt-0.5">1</span>
            <span>{isTl ? "I-click ang button sa itaas upang ma-download ang APK file." : "Click the button above to download the official APK package."}</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="h-4 w-4 bg-slate-150 text-slate-700 rounded-full flex items-center justify-center font-bold text-[8px] shrink-0 mt-0.5">2</span>
            <span>{isTl ? "Pagkatapos i-download, buksan ang file mula sa Downloads folder." : "Once downloaded, tap to open the file from your Downloads directory."}</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="h-4 w-4 bg-slate-150 text-slate-700 rounded-full flex items-center justify-center font-bold text-[8px] shrink-0 mt-0.5">3</span>
            <span>{isTl ? "Kung hiningi ng iyong CP, payagan ang 'Install from Unknown Sources' o 'Install unknown apps'." : "If prompted by your device, allow 'Install from Unknown Sources' in settings."}</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="h-4 w-4 bg-slate-150 text-slate-700 rounded-full flex items-center justify-center font-bold text-[8px] shrink-0 mt-0.5">4</span>
            <span>{isTl ? "I-tap ang 'Install' at hintaying makumpleto. Buksan at mag-sign in!" : "Tap 'Install' and wait. Launch Z-oneApp from your home screen and sign in!"}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
