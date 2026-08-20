import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, 
  WifiOff, 
  Smartphone, 
  Zap, 
  ShieldCheck, 
  X, 
  Layers, 
  RefreshCw, 
  Check, 
  Info, 
  Trash2,
  Activity,
  Download,
  Clock,
  Sparkles
} from 'lucide-react';
import { dataSaver, DataSaverMode, NetworkInfo } from '../utils/dataSaver';

interface DataSaverSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'tl';
  triggerNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const DataSaverSettingsModal: React.FC<DataSaverSettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  triggerNotification
}) => {
  const [mode, setMode] = useState<DataSaverMode>(dataSaver.getMode());
  const [isActive, setIsActive] = useState<boolean>(dataSaver.isDataSaverActive());
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>(dataSaver.getNetworkInfo());
  const [dataSavedFormatted, setDataSavedFormatted] = useState<string>(dataSaver.getDataSavedFormatted());
  const [isClearingCache, setIsClearingCache] = useState(false);

  useEffect(() => {
    const unsubscribe = dataSaver.subscribe((saving, currentMode) => {
      setIsActive(saving);
      setMode(currentMode);
      setNetworkInfo(dataSaver.getNetworkInfo());
      setDataSavedFormatted(dataSaver.getDataSavedFormatted());
    });

    const interval = setInterval(() => {
      setNetworkInfo(dataSaver.getNetworkInfo());
      setDataSavedFormatted(dataSaver.getDataSavedFormatted());
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleSelectMode = (newMode: DataSaverMode) => {
    dataSaver.setMode(newMode);
    setMode(newMode);
    setIsActive(dataSaver.isDataSaverActive());
    if (triggerNotification) {
      triggerNotification(
        language === 'tl'
          ? `📶 Data Saver Mode: ${newMode === 'auto' ? 'Smart Auto' : newMode === 'on' ? 'Laging Naka-ON' : 'Naka-OFF (High Quality)'}`
          : `📶 Data Saver Mode: ${newMode === 'auto' ? 'Smart Auto' : newMode === 'on' ? 'Always ON' : 'OFF (High Quality)'}`,
        'success'
      );
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      dataSaver.clearOldCache();
      dataSaver.resetDataSavedStats();
      setDataSavedFormatted('0 B');
      if (triggerNotification) {
        triggerNotification(
          language === 'tl' ? '🧹 Nalinis na ang local media at API cache!' : '🧹 Local media and API cache cleared!',
          'success'
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsClearingCache(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight flex items-center gap-1.5">
                  Mobile Data Saver
                  {isActive && (
                    <span className="text-[10px] bg-emerald-300 text-emerald-950 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </h3>
                <p className="text-xs text-emerald-100 font-medium">
                  {language === 'tl' ? 'Matalinong pagtitipid ng mobile data' : 'Intelligent mobile & prepaid data optimizer'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-700 dark:text-slate-200">
            {/* Live Connection Status Badge */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                  {networkInfo.type === 'cellular' || isActive ? (
                    <Smartphone className="w-5 h-5" />
                  ) : (
                    <Wifi className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {language === 'tl' ? 'Kasalukuyang Koneksyon' : 'Current Connection'}
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-white capitalize flex items-center gap-1.5">
                    {networkInfo.type || (networkInfo.effectiveType ? `${networkInfo.effectiveType.toUpperCase()} Network` : 'Standard Network')}
                    {networkInfo.effectiveType && (
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">
                        {networkInfo.effectiveType.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-semibold text-slate-400">
                  {language === 'tl' ? 'Tinatayang Natipid' : 'Estimated Saved'}
                </div>
                <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  {dataSavedFormatted}
                </div>
              </div>
            </div>

            {/* Mode Selection Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {language === 'tl' ? 'Pumili ng Mode' : 'Select Mode'}
              </label>

              <div className="grid grid-cols-3 gap-2">
                {/* AUTO */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('auto')}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                    mode === 'auto'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-5 h-5 mb-1 text-emerald-500" />
                  <span className="text-xs font-bold">Smart Auto</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    {language === 'tl' ? 'Recommended' : 'Recommended'}
                  </span>
                </button>

                {/* ON */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('on')}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                    mode === 'on'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Zap className="w-5 h-5 mb-1 text-amber-500" />
                  <span className="text-xs font-bold">{language === 'tl' ? 'Laging Naka-ON' : 'Always ON'}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    {language === 'tl' ? 'Max Data Save' : 'Max Savings'}
                  </span>
                </button>

                {/* OFF */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('off')}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                    mode === 'off'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Wifi className="w-5 h-5 mb-1 text-blue-500" />
                  <span className="text-xs font-bold">{language === 'tl' ? 'Naka-OFF' : 'OFF'}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    {language === 'tl' ? 'Wi-Fi HD' : 'Full Quality'}
                  </span>
                </button>
              </div>
            </div>

            {/* Active Data Saver Features Breakdown */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                {language === 'tl' ? 'Mga Aktibong Proteksyon sa Data' : 'Active Data Optimization Engines'}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center mt-0.5 shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-white">
                      {language === 'tl' ? 'Click-to-Play Video at Walang Auto-Preload' : 'Click-to-Play Videos & Zero Preload'}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'tl' ? 'Hindi nagda-download ng mabibigat na MP4/Reels video hangga\'t hindi mo kini-click.' : 'Does not download heavy video streams until explicitly tapped.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center mt-0.5 shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-white">
                      {language === 'tl' ? 'Awtomatikong WebP Thumbnail & Image Compression' : 'WebP Compression & Adaptive Thumbnails'}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'tl' ? 'Pinaliit ang sukat at memory ng mga larawan sa newsfeed at stories bago i-load.' : 'Compresses images up to 80% with low-res preview placeholders.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center mt-0.5 shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-white">
                      {language === 'tl' ? 'Batch Feed Pagination at Lazy-Loading' : 'Paginated Infinite Scroll & Lazy Loading'}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'tl' ? '8 hanggang 15 posts lamang ang kinukuha nang paisa-isa imbes na buong database.' : 'Loads only 8-15 posts on demand instead of the entire database.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center mt-0.5 shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-white">
                      {language === 'tl' ? 'Adaptive Polling at Background Auto-Pause' : 'Adaptive Polling & Background Suspension'}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'tl' ? 'Kusang hihinto ang lahat ng network requests kapag naka-minimize ang app o naka-lock ang screen.' : 'Instantly pauses all polling and media when the app is in the background.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Clear Cache Action */}
            <div className="pt-1 flex items-center justify-between">
              <button
                type="button"
                onClick={handleClearCache}
                disabled={isClearingCache}
                className="flex items-center space-x-1.5 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-semibold px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearingCache ? 'Nililinis...' : (language === 'tl' ? 'Linisin ang Local Cache' : 'Clear Local Cache')}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-sm"
              >
                {language === 'tl' ? 'Isara' : 'Done'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
