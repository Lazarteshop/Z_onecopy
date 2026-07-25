import React, { useState, useEffect, useRef } from 'react';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  X, 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Lock, 
  Compass, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  TrendingUp,
  Award,
  CircleCheck,
  Smartphone,
  Eye
} from 'lucide-react';
import { WebsiteCampaign } from '../types';

interface BrowserSimulatorProps {
  campaign: WebsiteCampaign;
  onComplete: (id: string, reward: number) => void;
  onClose: () => void;
  language?: 'en' | 'tl';
}

// Captcha Option Type
interface CaptchaOption {
  id: string;
  label: string;
  emoji: string;
}

export default function BrowserSimulator({ campaign, onComplete, onClose, language = 'en' }: BrowserSimulatorProps) {
  const isTl = language === 'tl';
  const [secondsLeft, setSecondsLeft] = useState(campaign.timer);
  const [isTimerFinished, setIsTimerFinished] = useState(false);
  const [captchaPassed, setCaptchaPassed] = useState(false);
  const [captchaTarget, setCaptchaTarget] = useState<CaptchaOption | null>(null);
  const [captchaOptions, setCaptchaOptions] = useState<CaptchaOption[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'proxy' | 'direct' | 'reader'>('proxy');
  
  // Audio node simulation or visual pulse indicator
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Captcha choices database (Philippine/Common theme)
  const ALL_CAPTCHA_ITEMS: CaptchaOption[] = isTl ? [
    { id: 'pera', label: 'Pera / PHP Bill', emoji: '💵' },
    { id: 'mangga', label: 'Mangga (Mango)', emoji: '🥭' },
    { id: 'jeepney', label: 'Jeepney / Traysikel', emoji: '🛺' },
    { id: 'saging', label: 'Saging (Banana)', emoji: '🍌' },
    { id: 'computer', label: 'Kompyuter / CP', emoji: '📱' },
    { id: 'pagkain', label: 'Ulam / Pagkain', emoji: '🍲' },
    { id: 'bahay', label: 'Bahay / Kubo', emoji: '🏠' },
    { id: 'kalesa', label: 'Kalesa / Kabayo', emoji: '🐴' },
  ] : [
    { id: 'pera', label: 'Money / PHP Bill', emoji: '💵' },
    { id: 'mangga', label: 'Mango', emoji: '🥭' },
    { id: 'jeepney', label: 'Jeepney / Tricycle', emoji: '🛺' },
    { id: 'saging', label: 'Banana', emoji: '🍌' },
    { id: 'computer', label: 'Computer / Mobile Phone', emoji: '📱' },
    { id: 'pagkain', label: 'Food / Dishes', emoji: '🍲' },
    { id: 'bahay', label: 'House / Hut', emoji: '🏠' },
    { id: 'kalesa', label: 'Carriage / Horse', emoji: '🐴' },
  ];

  // Initialize Timer and Captcha
  useEffect(() => {
    // Reset state on change
    setSecondsLeft(campaign.timer);
    setIsTimerFinished(false);
    setCaptchaPassed(false);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Setup countdown timer
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsTimerFinished(true);
          setupCaptcha();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [campaign]);

  // Setup verification captcha
  const setupCaptcha = () => {
    // Randomly select 1 target
    const targetIdx = Math.floor(Math.random() * ALL_CAPTCHA_ITEMS.length);
    const target = ALL_CAPTCHA_ITEMS[targetIdx];
    setCaptchaTarget(target);

    // Mix with 3 other random candidates
    const filtered = ALL_CAPTCHA_ITEMS.filter(item => item.id !== target.id);
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    const distractors = shuffled.slice(0, 3);
    
    // Combine & shuffle
    const finalOptions = [target, ...distractors].sort(() => 0.5 - Math.random());
    setCaptchaOptions(finalOptions);
  };

  const handleCaptchaSelection = (selectedOption: CaptchaOption) => {
    if (!captchaTarget) return;

    if (selectedOption.id === captchaTarget.id) {
      setCaptchaPassed(true);
      setErrorMessage(null);
      setSuccessMessage(isTl 
        ? `💰 Kagandahang-loob! Napatunayan mo ang sarili. +₱${campaign.reward.toFixed(2)} GCash reward idinagdag!` 
        : `💰 Awesome! You verified yourself. +₱${campaign.reward.toFixed(2)} GCash reward added!`);
      
      // Delay call onComplete to let the animation finish
      setTimeout(() => {
        onComplete(campaign.id, campaign.reward);
      }, 1800);
    } else {
      setErrorMessage(isTl 
        ? '❌ Maling sagot. Tuminging mabuti at subukan muli ang Captcha!' 
        : '❌ Incorrect answer. Look closely and try the Captcha again!');
       // Re-setup captcha with another option
      setTimeout(() => {
        setupCaptcha();
        setErrorMessage(null);
      }, 1500);
    }
  };

  return (
    <div id="browser-simulator-overlay" className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-sm">
      
      {/* 🚀 Header Status Info: Earning bar */}
      <div id="browser-top-earning-bar" className="bg-slate-800 text-white px-4 py-3 border-b border-slate-700 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isTimerFinished ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isTimerFinished ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <div>
              <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">{isTl ? "Aktibong Pagbisita" : "Active Visit"}</p>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1">
                {campaign.title}
                <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-emerald-500/20">
                  +₱{campaign.reward.toFixed(2)}
                </span>
              </h2>
            </div>
          </div>

          {/* TIMER CARD AND VERIFICATION CONTROL ZONE */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex-1 md:flex-initial">
              <AnimatePresence mode="wait">
                {!isTimerFinished ? (
                  <motion.div 
                    key="countdown"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="flex items-center justify-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2"
                  >
                    <div className="relative flex items-center justify-center w-8 h-8 rounded-full border border-amber-500/40 font-mono font-bold text-amber-400 text-sm">
                      {secondsLeft}
                      <svg className="absolute top-0 left-0 w-full h-full -rotate-90">
                        <circle 
                          cx="16" cy="16" r="14" 
                          fill="transparent" 
                          stroke="#F59E0B" 
                          strokeWidth="2" 
                          strokeDasharray={88}
                          strokeDashoffset={88 - (88 * secondsLeft) / campaign.timer}
                          className="transition-all duration-1000 ease-linear"
                        />
                      </svg>
                    </div>
                    <div className="text-xs leading-tight">
                      <p className="text-amber-400 font-semibold text-center md:text-left">{isTl ? "Manatili muna rito" : "Stay on this page"}</p>
                      <p className="text-[10px] text-slate-300">{isTl ? "Huwag i-close ang webpage" : "Do not close the webpage"}</p>
                    </div>
                  </motion.div>
                ) : captchaPassed ? (
                  <motion.div 
                    key="success"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500 text-emerald-400 px-4 py-2 rounded-xl text-xs font-semibold"
                  >
                    <CircleCheck className="w-4 h-4 text-emerald-400 animate-bounce" />
                    <span>{isTl ? "Tagumpay! Natanggap na ang Gantimpala!" : "Success! Reward credited!"}</span>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="captcha"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-slate-700/80 border border-slate-600 rounded-xl p-2.5 flex flex-col md:flex-row items-center gap-3 shadow-lg"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-slate-200">
                      <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-emerald-400">{isTl ? "Patunayan na Tao ka:" : "Verify you are Human:"}</p>
                        <p className="text-[11px] text-slate-300">
                          {isTl 
                            ? <>Piliin ang <span className="font-bold underline text-white">{captchaTarget?.label}</span> sa ibaba</> 
                            : <>Select the <span className="font-bold underline text-white">{captchaTarget?.label}</span> below</>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {captchaOptions.map((opt) => (
                        <button
                          key={opt.id}
                          id={`captcha-btn-${opt.id}`}
                          onClick={() => handleCaptchaSelection(opt)}
                          className="bg-slate-800 hover:bg-slate-600 active:bg-emerald-600 active:text-white px-2.5 py-1.5 rounded-lg border border-slate-600 text-xs transition duration-200 flex flex-col items-center justify-center min-w-[55px] cursor-pointer"
                        >
                          <span className="text-lg mb-0.5">{opt.emoji}</span>
                          <span className="text-[9px] text-slate-300 truncate w-full text-center">{opt.label.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* EXIT PANEL BUTTON */}
            <button
              id="browser-exit-btn"
              onClick={onClose}
              className="bg-slate-700 hover:bg-red-500 hover:text-white text-slate-300 p-2.5 rounded-lg border border-slate-600 transition cursor-pointer flex items-center justify-center self-stretch"
              title="Isara at Bumalik sa Dashboard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>

      {/* ⚠️ Error Messages inside the Browser Container */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-500/90 text-white py-2 px-4 shadow text-center text-xs font-semibold flex items-center justify-center gap-2 z-10"
          >
            <AlertCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-600 text-white py-2.5 px-4 shadow text-center text-sm font-bold flex items-center justify-center gap-2 z-10"
          >
            <Award className="w-5 h-5 text-yellow-300 animate-spin" />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🌐 Simulated Browser Navigation Bar */}
      <div id="simulated-browser-address-bar" className="bg-slate-800 border-b border-slate-700 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          <button className="p-1 hover:bg-slate-700 rounded transition cursor-not-allowed text-slate-600" disabled title="Back">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button className="p-1 hover:bg-slate-700 rounded transition cursor-not-allowed text-slate-600" disabled title="Forward">
            <ArrowRight className="w-4 h-4" />
          </button>
          <button className="p-1 hover:bg-slate-700 rounded transition text-slate-300 cursor-pointer" onClick={() => setSecondsLeft(campaign.timer)} title="Reload">
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <div id="browser-address-url-box" className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 flex items-center gap-2 min-w-[200px] max-w-lg shadow-inner">
          <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="text-emerald-500/80 select-all font-mono hidden sm:inline">Secure | </span>
          <span className="select-all font-mono truncate">{campaign.url}</span>
        </div>

        {/* View mode switcher */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setViewMode('proxy')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${viewMode === 'proxy' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            title="Proxy Unblocker - Bypasses iframe restrictions"
          >
            <span>🛡️ Proxy</span>
          </button>
          <button
            onClick={() => setViewMode('direct')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${viewMode === 'direct' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            title="Direct Web - Raw website URL"
          >
            <span>⚡ Direct</span>
          </button>
          {campaign.mockPageContent && (
            <button
              onClick={() => setViewMode('reader')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${viewMode === 'reader' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              title="Reader Mode - Clean app article preview"
            >
              <span>📖 Reader</span>
            </button>
          )}
        </div>
      </div>

      {/* ℹ️ Informative Banner for Iframe Compatibility and Analytics Transmission */}
      <div className="bg-indigo-950/90 text-white border-b border-indigo-900 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-sans">
        <div className="flex items-center gap-2 leading-relaxed">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-slate-200 font-medium">
            {isTl 
              ? "Para sa mabilis na pagbisita, gumagana ang ating Proxy Unblocker. Pwede mo ring buksan sa bagong tab habang tumatakbo ang timer." 
              : "Our Proxy Unblocker bypasses iframe blocks. You can also open the site in a new tab while your timer runs."}
          </span>
        </div>
        <a 
          href={campaign.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg transition text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md select-none"
        >
          <Compass className="w-3.5 h-3.5 animate-spin-slow" />
          <span>{isTl ? "Buksan sa Bagong Tab 🚀" : "Open in New Tab 🚀"}</span>
        </a>
      </div>

      {/* 🖥️ Real Live Webpage Area (Proxy / Direct / Reader View) */}
      <div 
        id="browser-webpage-viewport"
        className="flex-1 bg-white relative w-full h-full overflow-y-auto"
      >
        {viewMode === 'reader' && campaign.mockPageContent ? (
          <div className="p-6 max-w-3xl mx-auto space-y-6 text-slate-800">
            <div 
              className="p-6 rounded-2xl text-white shadow-md"
              style={{ backgroundColor: campaign.mockPageContent.primaryColor || '#002F6C' }}
            >
              <h1 className="text-2xl sm:text-3xl font-extrabold">{campaign.mockPageContent.heroTitle || campaign.title}</h1>
              {campaign.mockPageContent.heroSubtitle && (
                <p className="mt-2 text-white/90 text-sm">{campaign.mockPageContent.heroSubtitle}</p>
              )}
            </div>

            {campaign.mockPageContent.paragraphs?.map((p, idx) => (
              <p key={idx} className="text-base leading-relaxed text-slate-700">{p}</p>
            ))}

            {campaign.mockPageContent.features && campaign.mockPageContent.features.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Mga Tampok / Details:</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  {campaign.mockPageContent.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 flex justify-center">
              <a 
                href={campaign.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition flex items-center gap-2 text-sm"
              >
                <span>{isTl ? "Pumunta sa Opisyal na Website" : "Visit Official Website"}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : (
          <iframe 
            src={viewMode === 'proxy' ? `/api/proxy-web?url=${encodeURIComponent(campaign.url)}` : campaign.url}
            className="w-full h-full border-0 bg-white"
            title={campaign.title}
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        )}
      </div>
    
    </div>
  );
}
