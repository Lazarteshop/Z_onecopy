import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Coins, 
  Globe, 
  Users, 
  Wallet, 
  Upload, 
  CheckCircle,
  MessageCircle,
  Heart,
  Smartphone,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ZonePromoVideoProps {
  language: 'en' | 'tl';
  onNavigateTab: (tab: 'earn' | 'cashout' | 'zone' | 'guide' | 'admin') => void;
}

export default function ZonePromoVideo({ language, onNavigateTab }: ZonePromoVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // in seconds (0 to 32)
  const [isMuted, setIsMuted] = useState(false);
  const [activeScene, setActiveScene] = useState(0); // 0: Intro, 1: Earning, 2: Gallery, 3: Cashout
  const [hasEnded, setHasEnded] = useState(false);
  const [soundEffect, setSoundEffect] = useState<string | null>(null);

  const totalDuration = 32; // 32 seconds video simulation
  const progressPercent = (currentTime / totalDuration) * 100;

  // Sync intervals when playing
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            setHasEnded(true);
            return totalDuration;
          }
          const nextVal = prev + 0.1;
          return parseFloat(nextVal.toFixed(1));
        });
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // Update active scene based on time
  useEffect(() => {
    if (currentTime < 8) {
      setActiveScene(0);
    } else if (currentTime >= 8 && currentTime < 16) {
      setActiveScene(1);
    } else if (currentTime >= 16 && currentTime < 24) {
      setActiveScene(2);
    } else {
      setActiveScene(3);
    }
  }, [currentTime]);

  const handlePlayPause = () => {
    if (hasEnded) {
      setCurrentTime(0);
      setHasEnded(false);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    setHasEnded(false);
  };

  const selectScene = (sceneIndex: number) => {
    setCurrentTime(sceneIndex * 8);
    setHasEnded(false);
    setIsPlaying(true);
  };

  const triggerSoundFX = (effect: string) => {
    setSoundEffect(effect);
    setTimeout(() => setSoundEffect(null), 1000);
  };

  // Subtitles / Narration text mapped to current time
  const getSubtitles = () => {
    if (currentTime < 4) {
      return language === 'tl'
        ? "🎬 Mabuhay! Maligayang pagdating sa opisyal na animated introduction ng Z-oneApp!"
        : "🎬 Welcome to the official animated introduction of Z-oneApp!";
    }
    if (currentTime >= 4 && currentTime < 8) {
      return language === 'tl'
        ? "📱 Isang all-in-one platform kung saan pinagsama ang Social Community Feed at Instant Earning!"
        : "📱 An all-in-one platform combining Social Community Feed and Instant Earning!";
    }
    if (currentTime >= 8 && currentTime < 12) {
      return language === 'tl'
        ? "💰 GABAY SA PAG-IPON: Mag-browse lang ng mga featured campaign links mula sa sponsor websites."
        : "💰 HOW TO EARN: Simply browse featured campaign links from partner sponsor websites.";
    }
    if (currentTime >= 12 && currentTime < 16) {
      return language === 'tl'
        ? "⏱️ Manatili ng ilang segundo habang umaandar ang countdown, at may dagdag na ₱5.00 kaagad sa wallet!"
        : "⏱️ Stay for a few seconds during the countdown, and receive +₱5.00 instantly in your wallet!";
    }
    if (currentTime >= 16 && currentTime < 20) {
      return language === 'tl'
        ? "📸 GALLERY UPLOAD: Kumuha ng pictures o videos mula sa phone gallery mo at i-post sa Z-one Feed!"
        : "📸 GALLERY UPLOAD: Select pictures or videos from your phone gallery and share to the Z-one Feed!";
    }
    if (currentTime >= 20 && currentTime < 24) {
      return language === 'tl'
        ? "💬 Sumulat ng posts, mag-comment sa ibang members, at makipag-ugnayan sa komunidad!"
        : "💬 Write posts, leave comments, and connect with other community members!";
    }
    if (currentTime >= 24 && currentTime < 28) {
      return language === 'tl'
        ? "💸 GCASH CASHOUT: Kapag umabot sa ₱100.00 ang iyong ipon, madali itong mai-withdraw!"
        : "💸 GCASH CASHOUT: Once your savings hit ₱100.00, easily cash-out using GCash!";
    }
    return language === 'tl'
      ? "🎉 Approved ng Admin kaagad at may simulated network SMS confirmation! Subukan na ngayon!"
      : "🎉 Approved by the system instantly with simulated SMS network alerts! Try it now!";
  };

  // Poster Image path
  const posterPath = "/src/assets/images/zone_app_promo_banner_1782352476822.jpg";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative w-full max-w-4xl mx-auto my-6">
      {/* GLOW DECORATIONS */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* HEADER SECTION */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-md text-white animate-pulse">
            <Sparkles className="w-4 h-4 text-yellow-300" />
          </span>
          <div>
            <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
              <span>Z-oneApp Interactive Animated Tour</span>
              <span className="bg-emerald-500 text-slate-950 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider animate-bounce">
                NEW VIDEO
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              {language === 'tl' 
                ? 'Panoorin ang high-tech interactive preview kung paano mag-post at kumita!' 
                : 'Watch the high-tech interactive preview of how to share and earn!'}
            </p>
          </div>
        </div>

        {/* MOCK SOUND SOUNDBOARD IN VIDEO */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mr-1">Sound FX:</span>
          <button 
            onClick={() => triggerSoundFX('💰 Ka-ching!')}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-yellow-400 text-[10px] font-black rounded-lg cursor-pointer transition active:scale-95 border border-slate-700/60"
          >
            💰 Cash
          </button>
          <button 
            onClick={() => triggerSoundFX('👏 Clap!')}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 text-[10px] font-black rounded-lg cursor-pointer transition active:scale-95 border border-slate-700/60"
          >
            👏 Clap
          </button>
          <button 
            onClick={() => triggerSoundFX('😍 Wow!')}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-pink-400 text-[10px] font-black rounded-lg cursor-pointer transition active:scale-95 border border-slate-700/60"
          >
            😍 Love
          </button>
        </div>
      </div>

      {/* MAIN SIMULATION PLAY AREA */}
      <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800 group">
        {/* VIDEO COVER / THUMBNAIL (BEFORE STARTING) */}
        {!isPlaying && currentTime === 0 && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center">
            {/* Background Image poster */}
            <img 
              src={posterPath} 
              alt="Z-oneApp Promo poster" 
              className="absolute inset-0 w-full h-full object-cover opacity-35"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback if image path has issue in local bundle paths
                e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80";
              }}
            />
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs"></div>

            {/* Content overlay */}
            <div className="relative z-10 space-y-4 max-w-md">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-block p-3.5 bg-blue-600/20 border border-blue-500/30 rounded-3xl text-blue-400 mb-2"
              >
                <Smartphone className="w-10 h-10 mx-auto animate-bounce" />
              </motion.div>
              <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                Z-oneApp: Post & Earn Simulator
              </h4>
              <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                {language === 'tl' 
                  ? 'Isang makulay at interactive na simulated high-tech 3D video na magpapakita sa iyo ng buong sistema ng dashboard.' 
                  : 'An interactive, highly-vibrant simulated high-tech 3D video showcasing the dashboard features.'}
              </p>
              
              <button
                onClick={handlePlayPause}
                className="px-6 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-black text-xs uppercase rounded-2xl shadow-xl shadow-blue-900/30 hover:scale-105 active:scale-95 transition cursor-pointer flex items-center gap-2.5 mx-auto"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{language === 'tl' ? 'PANOORIN ANG ANIMATION' : 'WATCH THE ANIMATION'}</span>
              </button>
            </div>
          </div>
        )}

        {/* LIVE SIMULATED VIDEO CONTENT */}
        {(isPlaying || currentTime > 0) && (
          <div className="absolute inset-0 w-full h-full flex flex-col justify-between p-4 relative z-10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            
            {/* STAGE HEADER METADATA */}
            <div className="flex items-center justify-between text-white z-10 bg-slate-950/45 p-2 rounded-xl border border-slate-800 backdrop-blur-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                <span>Scene {activeScene + 1}: {
                  activeScene === 0 ? (language === 'tl' ? 'Introduksyon' : 'Introduction') :
                  activeScene === 1 ? (language === 'tl' ? 'Mag-browse & Kumita' : 'Browse & Earn') :
                  activeScene === 2 ? (language === 'tl' ? 'Phone Gallery' : 'Phone Gallery') :
                  (language === 'tl' ? 'GCash Cash-out' : 'GCash Cashout')
                }</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                0:{Math.floor(currentTime).toString().padStart(2, '0')} / 0:{totalDuration}
              </span>
            </div>

            {/* DYNAMIC SCENE GRAPHIC ANIMATIONS (MOCK SCREEN) */}
            <div className="flex-1 flex items-center justify-center my-2 overflow-hidden relative">
              
              {/* SCENE 0: INTRO - FLOATING SMARTPHONE AND COINS */}
              {activeScene === 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center space-y-4"
                >
                  <div className="relative">
                    {/* Spinning glowing background */}
                    <div className="absolute inset-0 bg-blue-600/25 rounded-full blur-2xl animate-pulse scale-150"></div>
                    
                    <motion.div 
                      animate={{ y: [0, -10, 0], rotate: [0, 2, 0] }}
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                      className="bg-slate-800 border-4 border-slate-700 w-32 h-44 rounded-2xl shadow-2xl p-2 relative overflow-hidden flex flex-col justify-between"
                    >
                      <div className="w-8 h-1.5 bg-slate-700 rounded-full mx-auto"></div>
                      
                      {/* Simulated Screen Content */}
                      <div className="flex-1 my-1.5 bg-slate-900 rounded-lg p-1.5 flex flex-col justify-between text-left relative overflow-hidden">
                        <div className="flex items-center gap-1 border-b border-slate-800 pb-1">
                          <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                          <span className="text-[6px] font-black text-slate-400">Z-one Social Feed</span>
                        </div>
                        
                        <div className="space-y-1 my-1">
                          <div className="h-2.5 w-10/12 bg-slate-800 rounded"></div>
                          <div className="h-1.5 w-full bg-slate-800 rounded"></div>
                          <div className="h-10 w-full bg-slate-850 rounded-md border border-slate-800 flex items-center justify-center">
                            <span className="text-[8px]">✨ Active ✨</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-800 pt-1 text-[5px] text-slate-500">
                          <span>❤️ 1,204 Likes</span>
                          <span>💬 482 Comments</span>
                        </div>
                      </div>

                      <div className="h-2 w-2 rounded-full bg-slate-700 mx-auto"></div>
                    </motion.div>

                    {/* Floating gold coins around */}
                    <motion.div 
                      animate={{ y: [-5, 5, -5], rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                      className="absolute -top-4 -left-6 bg-amber-500 border-2 border-yellow-300 text-slate-950 rounded-full h-8 w-8 flex items-center justify-center font-black shadow-lg"
                    >
                      <Coins className="w-4 h-4 text-yellow-100" />
                    </motion.div>

                    <motion.div 
                      animate={{ y: [5, -5, 5], rotate: -360 }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                      className="absolute bottom-4 -right-8 bg-amber-500 border-2 border-yellow-300 text-slate-950 rounded-full h-6 w-6 flex items-center justify-center font-black shadow-lg text-[10px]"
                    >
                      ₱
                    </motion.div>
                  </div>
                  
                  <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-full">
                    <span className="text-white text-xs font-black tracking-tight flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin-slow" />
                      <span>Z-oneApp Earning & Social Ecosystem</span>
                    </span>
                  </div>
                </motion.div>
              )}

              {/* SCENE 1: BROWSE & EARN SIMULATOR */}
              {activeScene === 1 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-xl space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-black text-indigo-400 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Sponsor Website Portal</span>
                    </span>
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold">
                      🔥 Active Task
                    </span>
                  </div>

                  {/* Simulated countdown bar & timer */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-center relative overflow-hidden">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      MOCK COUNTDOWN RUNNING
                    </p>
                    
                    {/* Ticking number simulation */}
                    <div className="text-3xl font-black text-indigo-400 tracking-tight animate-pulse font-mono">
                      {Math.max(1, 5 - Math.floor(currentTime % 5))}s
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full transition-all duration-300"
                        style={{ width: `${((currentTime % 5) / 5) * 100}%` }}
                      ></div>
                    </div>

                    <div className="text-[8px] text-slate-500 font-semibold">
                      Huwag isara ang simulator habang umaandar ang countdown!
                    </div>

                    {/* Exploding coin effect inside player when clock resets */}
                    {Math.floor(currentTime % 5) === 0 && (
                      <motion.div 
                        initial={{ scale: 0.5, opacity: 0, y: 10 }}
                        animate={{ scale: [1, 1.4, 1], opacity: [0, 1, 0], y: -25 }}
                        transition={{ duration: 1 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      >
                        <span className="bg-yellow-400 text-slate-950 font-black px-3 py-1.5 rounded-full text-xs shadow-lg flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 animate-spin" />
                          <span>+₱5.00 Reward!</span>
                        </span>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                    <span className="font-bold">🌐 Lazada Traffic Booster</span>
                    <span className="text-yellow-400 font-extrabold flex items-center gap-0.5">
                      <span>₱5.00 Per Visit</span>
                    </span>
                  </div>
                </motion.div>
              )}

              {/* SCENE 2: PHONE GALLERY & SOCIAL FEED */}
              {activeScene === 2 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-xl space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-black text-indigo-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>Z-one Social Community</span>
                    </span>
                    <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold">
                      📸 Gallery Upload
                    </span>
                  </div>

                  {/* Simulated Gallery upload post */}
                  <div className="bg-white rounded-xl overflow-hidden shadow-md text-slate-900 border border-slate-100">
                    {/* Author block */}
                    <div className="p-2 flex items-center gap-2 border-b border-slate-50">
                      <span className="text-lg">👸</span>
                      <div>
                        <div className="font-extrabold text-[10px] leading-tight text-slate-900">Jea Garcia</div>
                        <div className="text-[8px] text-slate-400 font-semibold">Aktibo Kanina</div>
                      </div>
                    </div>

                    {/* Post content */}
                    <div className="p-2 space-y-1.5">
                      <p className="text-[9px] font-bold text-slate-700">
                        {language === 'tl' 
                          ? 'I-upload ang paboritong alaala galing sa gallery! 😍 Ang ganda ng araw na ito!' 
                          : 'Uploaded my favorite memory directly from my phone gallery! 😍 Love this day!'}
                      </p>

                      {/* Mock Image container showing upload simulation */}
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-200 border border-slate-100 flex items-center justify-center">
                        <img 
                          src="https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&auto=format&fit=crop&q=60" 
                          alt="Feed pic" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2 left-2 bg-slate-950/70 backdrop-blur-xs text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <Upload className="w-2.5 h-2.5 text-blue-400 animate-bounce" />
                          <span>Gallery Source</span>
                        </div>

                        {/* Floating hearts animation */}
                        <motion.div 
                          animate={{ y: [-10, -40], opacity: [0, 1, 0], scale: [1, 1.5, 1] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                          className="absolute bottom-4 right-4 text-red-500"
                        >
                          <Heart className="w-6 h-6 fill-current animate-pulse" />
                        </motion.div>
                      </div>
                    </div>

                    {/* Post action footer */}
                    <div className="p-2 bg-slate-50 flex items-center justify-between text-[8px] border-t border-slate-100 text-slate-500">
                      <span className="font-extrabold text-blue-600 flex items-center gap-0.5">
                        <Heart className="w-3 h-3 fill-current text-red-500" />
                        <span>Liked by You and 48 others</span>
                      </span>
                      <span className="font-bold flex items-center gap-0.5">
                        <MessageCircle className="w-3 h-3" />
                        <span>12 Comments</span>
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SCENE 3: GCASH CASHOUT WITH SIMULATED SMS */}
              {activeScene === 3 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full max-w-sm flex flex-col items-center justify-center space-y-3"
                >
                  <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl space-y-2 relative">
                    <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black border-b border-slate-800 pb-1.5">
                      <Wallet className="w-3.5 h-3.5" />
                      <span>GCASH OUTPAYMENT SUCCESS</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[8px] text-slate-400 font-bold">RECIPIENT ACCOUNT</div>
                        <div className="font-black text-white text-[11px] font-mono">0917-XXX-1234</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] text-slate-400 font-bold">CASHOUT AMOUNT</div>
                        <div className="font-black text-emerald-400 text-[12px] font-mono">₱100.00</div>
                      </div>
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/25 p-2 rounded-xl text-center flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-[10px] text-emerald-300 font-black">
                        {language === 'tl' ? 'Matagumpay na Naipadala sa GCash' : 'Successfully Sent to GCash'}
                      </span>
                    </div>
                  </div>

                  {/* Simulated Mobile SMS Banner Slide down */}
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="w-full bg-slate-800 border-2 border-indigo-500/40 rounded-2xl p-2.5 shadow-2xl relative text-left"
                  >
                    <div className="flex items-center justify-between text-indigo-400 text-[8px] font-black tracking-wider border-b border-slate-700/60 pb-1 mb-1.5">
                      <span>🔔 SMART MOCK MESSAGE</span>
                      <span>NGAYON</span>
                    </div>
                    <p className="text-[9px] text-slate-200 font-bold leading-tight font-mono">
                      <span className="text-indigo-300">GCash:</span> You have received <span className="text-emerald-400 font-extrabold">PHP 100.00</span> of GCash from <span className="text-indigo-300 font-extrabold">Z-oneApp Rewards</span> on 2026-06-25. Ref. No. 90124892. Balance: PHP 124.00
                    </p>
                  </motion.div>
                </motion.div>
              )}

              {/* OVERLAY POPUP FOR TRIGGERSOUNDFX */}
              <AnimatePresence>
                {soundEffect && (
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0, y: 10 }}
                    animate={{ scale: 1.1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="absolute z-50 bg-yellow-300 text-slate-950 px-4 py-2 rounded-full font-black text-sm shadow-2xl border-2 border-white flex items-center gap-1.5"
                  >
                    <span>{soundEffect}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SPEECH AND NARRATOR SUBTITLES */}
            <div className="z-10 min-h-[48px] bg-slate-950/80 border border-slate-800 p-2.5 rounded-2xl backdrop-blur-xs text-center flex items-center justify-center">
              <motion.p 
                key={currentTime}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] sm:text-xs text-indigo-200 font-bold leading-relaxed max-w-xl"
              >
                {getSubtitles()}
              </motion.p>
            </div>

          </div>
        )}

        {/* EQUALIZER AUDIO VISUALIZER GRAPH (ONLY VISIBLE WHILE PLAYING) */}
        {isPlaying && (
          <div className="absolute bottom-20 left-4 z-20 flex items-end gap-0.5 h-6 bg-slate-950/60 border border-slate-800/80 p-1 rounded-md">
            {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
              <motion.div
                key={bar}
                animate={{ height: [4, 18, 4] }}
                transition={{
                  repeat: Infinity,
                  duration: 0.4 + (bar * 0.1),
                  ease: "easeInOut"
                }}
                className="w-1 bg-gradient-to-t from-blue-500 to-indigo-400 rounded-full"
                style={{ height: '10px' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* TIMELINE PROGRESS & CONTROL BAR */}
      <div className="p-4 sm:p-5 bg-slate-950/90 border-t border-slate-800 relative z-10">
        
        {/* TIMELINE INTERACTIVE SLIDER */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] font-mono text-slate-500 font-bold">0:00</span>
          <div className="flex-1 bg-slate-800 h-2.5 rounded-full relative cursor-pointer overflow-hidden"
               onClick={(e) => {
                 const rect = e.currentTarget.getBoundingClientRect();
                 const clickX = e.clientX - rect.left;
                 const percentage = clickX / rect.width;
                 setCurrentTime(parseFloat((percentage * totalDuration).toFixed(1)));
                 setHasEnded(false);
               }}>
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            ></div>
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white shadow"
              style={{ left: `${progressPercent}%` }}
            ></div>
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-bold">0:{totalDuration}</span>
        </div>

        {/* PRIMARY CONTROLS ROW */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayPause}
              className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase cursor-pointer transition active:scale-95 flex items-center gap-1.5 ${
                isPlaying 
                  ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/35'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>{language === 'tl' ? 'I-pause' : 'Pause'}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{language === 'tl' ? 'I-play' : 'Play'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              title="Restart Video"
              className="p-2.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* MUTE VOLUME SIMULATOR */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              title={isMuted ? 'Unmute voice guidance' : 'Mute voice guidance'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-indigo-400" />
              )}
            </button>
          </div>

          {/* SCENE QUICK JUMPS (PLAYLIST) */}
          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
            {[
              { id: 0, label: language === 'tl' ? 'Intro 📱' : 'Intro 📱' },
              { id: 1, label: language === 'tl' ? 'Browse 💰' : 'Browse 💰' },
              { id: 2, label: language === 'tl' ? 'Gallery 📸' : 'Gallery 📸' },
              { id: 3, label: language === 'tl' ? 'Withdraw 💸' : 'Withdraw 💸' },
            ].map((sc) => {
              const isActive = activeScene === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => selectScene(sc.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition duration-200 border ${
                    isActive 
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-black' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {sc.label}
                </button>
              );
            })}
          </div>

          {/* CTA: GO TO FEATURE BUTTON */}
          <button
            onClick={() => {
              if (activeScene === 0 || activeScene === 1) {
                onNavigateTab('earn');
              } else if (activeScene === 2) {
                onNavigateTab('zone');
              } else {
                onNavigateTab('cashout');
              }
            }}
            className="px-4.5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-450 hover:to-green-550 text-slate-950 font-black text-xs rounded-xl shadow-md hover:scale-105 active:scale-95 cursor-pointer transition flex items-center gap-1.5"
          >
            <span>
              {activeScene === 0 || activeScene === 1 ? (language === 'tl' ? 'Subukang Mag-ipon Now' : 'Try Earning Now') :
               activeScene === 2 ? (language === 'tl' ? 'Mag-upload sa Z-one Feed' : 'Upload to Z-one Feed') :
               (language === 'tl' ? 'Pumunta sa GCash Cash-out' : 'Go to GCash Cashout')}
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

        </div>

      </div>

      {/* QUICK INSTRUCTION INFO FOOTER */}
      <div className="bg-slate-950 p-3 flex items-center gap-2 text-[9px] text-slate-400 font-semibold border-t border-slate-900">
        <Info className="w-4 h-4 text-indigo-400 shrink-0" />
        <p>
          {language === 'tl' 
            ? 'TIPS: Gamitin ang Sound FX Soundboard sa itaas habang pinapanood ang animated simulation para mas maging makulay ang iyong karanasan sa panonood ng video presentation!' 
            : 'TIPS: Try hitting the Sound FX Soundboard above while watching the animated simulation to enrich your simulated video presentation experience!'}
        </p>
      </div>

    </div>
  );
}
