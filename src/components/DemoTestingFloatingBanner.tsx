import React from 'react';
import { AlertTriangle, ExternalLink, ShieldAlert, Sparkles, X } from 'lucide-react';

interface DemoTestingFloatingBannerProps {
  onExitDemo?: () => void;
}

export const DemoTestingFloatingBanner: React.FC<DemoTestingFloatingBannerProps> = ({
  onExitDemo
}) => {
  return (
    <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md z-[99999] bg-slate-950/95 border-2 border-amber-400 text-white rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-scaleUp flex flex-col gap-2.5">
      
      {/* HEADER BADGE & EXIT */}
      <div className="flex items-center justify-between gap-2 border-b border-amber-400/30 pb-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-amber-500/20 rounded-xl text-amber-400 border border-amber-400/40">
            <AlertTriangle className="w-4 h-4 animate-bounce" />
          </span>
          <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
            DEMO FOR TESTING ONLY
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-amber-400/20 text-yellow-300 border border-amber-400/40 text-[9px] font-mono font-black px-2 py-0.5 rounded-full uppercase">
            No Monetag Ads
          </span>
          {onExitDemo && (
            <button
              onClick={onExitDemo}
              className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Isara ang Demo Mode"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* EXACT REQUIRED TEXT */}
      <div className="space-y-1">
        <p className="text-xs font-extrabold text-slate-100 leading-relaxed">
          Any amount are not convertable to cash. Para sa totoong earning I search sa google chrome ang <span className="text-yellow-300 font-black underline underline-offset-2">ECHOZONEPH</span> . And click get started.
        </p>
      </div>

      {/* SEARCH LINK ACTION */}
      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 font-semibold">
        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>System Testing / Demo Clone Active</span>
        </span>
        <a
          href="https://www.google.com/search?q=ECHOZONEPH"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-2.5 py-1 rounded-lg transition inline-flex items-center gap-1 text-[10px] cursor-pointer shadow-xs active:scale-95"
        >
          <span>I-search sa Chrome (ECHOZONEPH)</span>
          <ExternalLink className="w-3 h-3 text-slate-950" />
        </a>
      </div>

    </div>
  );
};
