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
      <div id="simulated-browser-address-bar" className="bg-slate-800 border-b border-slate-700 px-3 py-2 flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-slate-400">
          <button className="p-1 hover:bg-slate-700 rounded transition cursor-not-allowed text-slate-600" disabled>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button className="p-1 hover:bg-slate-700 rounded transition cursor-not-allowed text-slate-600" disabled>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button className="p-1 hover:bg-slate-700 rounded transition text-slate-300 cursor-pointer" onClick={() => setSecondsLeft(campaign.timer)}>
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <div id="browser-address-url-box" className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs text-slate-300 flex items-center gap-2 max-w-xl mx-auto shadow-inner">
          <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="text-emerald-500/80 select-all font-mono">Secure | </span>
          <span className="select-all font-mono truncate">{campaign.url}</span>
        </div>

        <div className="w-16 hidden md:flex items-center justify-end text-[10px] text-slate-400 font-mono gap-1">
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          <span>Active View</span>
        </div>
      </div>

      {/* 🖥️ Simulated Virtual Webpage Area (Scrollable Canvas Container) */}
      <div 
        id="browser-webpage-viewport"
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto bg-slate-50 text-slate-800"
      >
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          
          {/* Mock Website Container Card */}
          <div 
            id="simulated-campaign-page-frame"
            className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200"
            style={{ borderTop: `6px solid ${campaign.mockPageContent.primaryColor}` }}
          >
            
            {/* Header / Brand Area */}
            <div className="px-6 py-6 md:py-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">{isTl ? "Adbins Partner Advertiser" : "Partner Advertiser"}</span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1 font-sans">
                  {campaign.mockPageContent.heroTitle}
                </h1>
                <p className="text-xs md:text-sm text-slate-600 mt-1 font-medium">
                  {campaign.mockPageContent.heroSubtitle}
                </p>
              </div>
              <div 
                className="self-start md:self-center px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-sm flex items-center gap-1"
                style={{ backgroundColor: campaign.mockPageContent.primaryColor }}
              >
                <Compass className="w-3.5 h-3.5 animate-spin-slow" />
                <span>{isTl ? "Bisita muna" : "Visiting"}</span>
              </div>
            </div>

            {/* Grid layout with Main story/content and sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
              
              {/* Main Content Pane */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Paragraphs */}
                {campaign.mockPageContent.paragraphs.map((p, idx) => (
                  <p key={idx} className="text-slate-700 leading-relaxed text-sm md:text-base">
                    {p}
                  </p>
                ))}

                {/* Highly Dynamic Features/Guides */}
                {campaign.mockPageContent.features && (
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <h3 className="font-bold text-slate-950 mb-3 flex items-center gap-1.5 text-sm md:text-base">
                      <TrendingUp className="w-5 h-5 text-indigo-500" />
                      <span>{isTl ? "Mga Tampok na Impormasyon / Hakbang:" : "Key Features & Steps Guide:"}</span>
                    </h3>
                    <ul className="space-y-3">
                      {campaign.mockPageContent.features.map((feat, idx) => (
                        <li key={idx} className="flex gap-2.5 text-xs md:text-sm text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Offers/Rates lists if any */}
                {campaign.mockPageContent.offers && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm md:text-base">{isTl ? "🔥 Espesyal na mga Alok at Presyo ngayon:" : "🔥 Special Today: Deals & Promo Rates:"}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {campaign.mockPageContent.offers.map((offer, idx) => (
                        <div key={idx} className="p-3.5 bg-yellow-50 border border-yellow-200/60 rounded-xl text-xs md:text-sm text-yellow-900 flex justify-between items-center">
                          <span className="font-semibold">{offer.split(' - ')[0]}</span>
                          <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[11px] shrink-0 ml-2">
                            {offer.split(' - ')[1] || (isTl ? 'Tingnan' : 'View')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Static Interactive Elements for simulated landing page engagement */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-500">
                    © 2026 {campaign.title.split(' ')[0]} Media. {isTl ? "Nakareserba lahat ng karapatan." : "All rights reserved."}
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 bg-slate-150 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer">
                      {isTl ? "Ibahagi ang Tipid Hacks" : "Share Life Hacks"}
                    </button>
                    <button className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer">
                      {isTl ? "Mag-subscribe sa Alerts" : "Subscribe to Alerts"}
                    </button>
                  </div>
                </div>

              </div>

              {/* Sidebar Section */}
              <div className="space-y-6">
                
                {/* Simulated Ads Widget */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-5 text-center">
                  <div className="bg-indigo-100 text-indigo-700 text-[9px] font-bold tracking-wider rounded px-1.5 py-0.5 uppercase inline-block mx-auto mb-2">
                    Simulated Sponsor Card
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">{isTl ? "May sarili ka bang Negosyo?" : "Own a Business?"}</h4>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    {isTl 
                      ? "Maaari mo ring i-advertise ang iyong website homepage dito para makakuha ng libo-libong organic na bisita kada araw!" 
                      : "You can also advertise your website homepage here to reach thousands of organic simulated visitors daily!"}
                  </p>
                  <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-not-allowed" disabled>
                    {isTl ? "I-promote ang Aking Web (Soon)" : "Promote My Web (Soon)"}
                  </button>
                </div>

                {/* Simulated Security Check */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                  <h5 className="font-bold text-xs text-slate-400 tracking-wider uppercase">{isTl ? "Seguridad at Privacy" : "Security & Privacy"}</h5>
                  
                  <div className="flex items-start gap-2 text-xs">
                    <Lock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-800">SSL Encrypted</p>
                      <p className="text-slate-500">{isTl ? "Ang iyong session ay ligtas at mayroong end-to-end security certificate." : "Your slot session is guarded with trusted end-to-end encryption."}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-xs pt-2 border-t border-slate-100">
                    <Smartphone className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-800">Multi-Device Compatible</p>
                      <p className="text-slate-500">{isTl ? "Mabilis na naglo-load sa Cellphone, Tablet, at desktop monitor." : "Loads beautifully responsive on Mobile devices, Tablets and Desktops."}</p>
                    </div>
                  </div>
                </div>

                {/* Friendly tips */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4.5">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                    <div className="text-xs text-amber-900">
                      <p className="font-bold">{isTl ? "May problem ba sa countdown?" : "Stuck Countdown?"}</p>
                      <p className="mt-1 leading-relaxed">
                        {isTl 
                          ? <>Maaari mong pabilisin o i-restart ang tracker gamit ang <RotateCw className="inline w-3 h-3 mx-0.5" /> Reload icon sa Address bar.</>
                          : <>You can easily boost or restart the timer with the <RotateCw className="inline w-3 h-3 mx-0.5" /> Reload Icon in the Address bar.</>}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Spacer to make it scrollable */}
          <div className="h-20"></div>

        </div>
      </div>
    
    </div>
  );
}
