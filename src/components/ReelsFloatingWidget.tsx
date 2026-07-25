import React, { useState, useEffect, useRef } from 'react';
import { 
  Tv, 
  X, 
  Heart, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Sparkles, 
  Shield, 
  Play, 
  Video
} from 'lucide-react';
import { ReelVideo } from '../types';

interface ReelsFloatingWidgetProps {
  reels: ReelVideo[];
  isAdmin?: boolean;
  currentUserName?: string;
  isLoggedIn?: boolean;
  language?: 'tl' | 'en';
  onAddReel: (url: string, title?: string) => void;
  onDeleteReel: (id: string) => void;
  onLikeReel: (id: string, delta?: number) => void;
}

export function parseVideoUrl(inputUrl: string): { embedUrl: string; platform: 'tiktok' | 'facebook' | 'youtube' | 'direct' } {
  const url = inputUrl.trim();
  
  // 1. TikTok URL parsing
  if (url.includes('tiktok.com')) {
    const match = url.match(/video\/(\d+)/) || url.match(/\/v\/(\d+)/);
    if (match && match[1]) {
      return {
        embedUrl: `https://www.tiktok.com/embed/v2/${match[1]}`,
        platform: 'tiktok'
      };
    }
    return {
      embedUrl: url.includes('/embed/') ? url : `https://www.tiktok.com/embed/v2/${url.split('/').pop()?.split('?')[0]}`,
      platform: 'tiktok'
    };
  }
  
  // 2. Facebook Reel or FB Watch
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    const encoded = encodeURIComponent(url);
    return {
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&width=500`,
      platform: 'facebook'
    };
  }
  
  // 3. YouTube Shorts or Video
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('/shorts/')) {
      videoId = url.split('/shorts/')[1]?.split('?')[0] || '';
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (url.includes('v=')) {
      videoId = url.split('v=')[1]?.split('&')[0] || '';
    }
    
    if (videoId) {
      return {
        embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0&loop=1&playlist=${videoId}&controls=1&rel=0`,
        platform: 'youtube'
      };
    }
    
    return {
      embedUrl: url,
      platform: 'youtube'
    };
  }
  
  // 4. Direct video files
  if (url.match(/\.(mp4|webm|ogg)($|\?)/i)) {
    return {
      embedUrl: url,
      platform: 'direct'
    };
  }
  
  // 5. Default generic iframe
  return {
    embedUrl: url,
    platform: 'direct'
  };
}

export default function ReelsFloatingWidget({
  reels,
  isAdmin = false,
  isLoggedIn = false,
  language = 'tl',
  onAddReel,
  onDeleteReel,
  onLikeReel
}: ReelsFloatingWidgetProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Listen for open event from header button
  useEffect(() => {
    const handleOpenWidget = () => setIsOpen(true);
    window.addEventListener('open-reels-widget', handleOpenWidget);
    return () => window.removeEventListener('open-reels-widget', handleOpenWidget);
  }, []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [likedIds, setLikedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gcash_liked_reels');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const widgetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeReels = reels && reels.length > 0 ? reels : [];

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Draggable position state for the Watch Reels floating button
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const isDraggingRef = useRef(false);

  // Initialize position to bottom right default if not dragged yet
  useEffect(() => {
    if (!btnPos && typeof window !== 'undefined') {
      setBtnPos({
        x: Math.max(12, window.innerWidth - 185),
        y: Math.max(12, window.innerHeight - 75)
      });
    }
  }, [btnPos]);

  // Handle Drag Start (Mouse & Touch)
  const handleDragStart = (clientX: number, clientY: number) => {
    const currentX = btnPos ? btnPos.x : Math.max(12, window.innerWidth - 185);
    const currentY = btnPos ? btnPos.y : Math.max(12, window.innerHeight - 75);
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: currentX,
      initialY: currentY,
    };
    isDraggingRef.current = false;
  };

  // Handle Drag Move (Mouse & Touch)
  const handleDragMove = (clientX: number, clientY: number) => {
    if (!dragStartRef.current) return;
    const dx = clientX - dragStartRef.current.startX;
    const dy = clientY - dragStartRef.current.startY;

    if (Math.hypot(dx, dy) > 5) {
      isDraggingRef.current = true;
    }

    if (isDraggingRef.current) {
      const newX = Math.min(Math.max(8, dragStartRef.current.initialX + dx), window.innerWidth - 170);
      const newY = Math.min(Math.max(8, dragStartRef.current.initialY + dy), window.innerHeight - 65);
      setBtnPos({ x: newX, y: newY });
    }
  };

  // Handle Drag End
  const handleDragEnd = () => {
    dragStartRef.current = null;
  };

  // COMPLETELY BLOCK ALL MONETAG ADS & POPUNDERS WHEN REELS WIDGET IS OPEN
  useEffect(() => {
    if (!isOpen) return;

    // 1. Immediately remove Monetag ad script tag if present
    const monetagScript = document.getElementById('monetag-login-ads-script');
    if (monetagScript) {
      monetagScript.remove();
    }

    // 2. Safely override window.open to permanently block ad popunders while Reels Widget is active
    const originalWindowOpen = window.open;
    window.open = function (url?: string | URL, target?: string, features?: string) {
      const activeEl = document.activeElement as HTMLElement | null;
      const isExplicitUserLink = activeEl && (activeEl.tagName === 'A' || activeEl.closest('a'));
      if (isExplicitUserLink && url) {
        return originalWindowOpen.call(window, url, target || '_blank', features);
      }
      console.log('Blocked Monetag / Ad popunder attempt while Reels widget is open:', url);
      return null;
    };

    // 3. Intercept events for widget open/close without blocking internal React button clicks
    const handleGlobalCapture = (e: Event) => {
      const el = widgetRef.current;
      const backdrop = backdropRef.current;
      const target = e.target as HTMLElement | null;

      if ((el && (el.contains(target) || target === el)) || (backdrop && (backdrop.contains(target) || target === backdrop))) {
        // Handle Close and Open buttons directly
        if (target && (target.id === 'reels-widget-close-btn' || target.closest('#reels-widget-close-btn'))) {
          setIsOpen(false);
        }
        if (target && (target.id === 'reels-widget-open-btn' || target.closest('#reels-widget-open-btn'))) {
          setIsOpen(true);
        }
      }
    };

    const events = ['click', 'pointerup', 'mouseup'];
    
    events.forEach((evt) => {
      window.addEventListener(evt, handleGlobalCapture, { capture: true, passive: true });
      document.addEventListener(evt, handleGlobalCapture, { capture: true, passive: true });
    });

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleGlobalCapture, { capture: true });
        document.removeEventListener(evt, handleGlobalCapture, { capture: true });
      });
      window.open = originalWindowOpen;
    };
  }, [isOpen]);

  // Hide floating Install App button whenever Reels widget is open OR when user is logged in
  useEffect(() => {
    const installBtn = document.getElementById('installBtn');
    const isLoggedIn = document.body.classList.contains('user-logged-in');

    if (isOpen) {
      document.body.classList.add('reels-widget-open');
      if (installBtn) {
        installBtn.style.setProperty('display', 'none', 'important');
      }
    } else {
      document.body.classList.remove('reels-widget-open');
      if (installBtn && !isLoggedIn) {
        installBtn.style.display = 'block';
      } else if (installBtn && isLoggedIn) {
        installBtn.style.setProperty('display', 'none', 'important');
      }
    }

    return () => {
      document.body.classList.remove('reels-widget-open');
    };
  }, [isOpen]);

  useEffect(() => {
    if (currentIndex >= activeReels.length && activeReels.length > 0) {
      setCurrentIndex(0);
    }
  }, [activeReels.length, currentIndex]);

  const scrollToReel = (index: number) => {
    if (index < 0 || index >= activeReels.length) return;
    setCurrentIndex(index);
    if (scrollContainerRef.current) {
      const child = scrollContainerRef.current.children[index] as HTMLElement;
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleNext = () => {
    if (activeReels.length === 0) return;
    const nextIdx = (currentIndex + 1) % activeReels.length;
    scrollToReel(nextIdx);
  };

  const handlePrev = () => {
    if (activeReels.length === 0) return;
    const prevIdx = (currentIndex - 1 + activeReels.length) % activeReels.length;
    scrollToReel(prevIdx);
  };

  const handleLike = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const isLiked = likedIds.includes(id);
    let updated: string[];
    if (isLiked) {
      updated = likedIds.filter(i => i !== id);
      onLikeReel(id, -1);
    } else {
      updated = [...likedIds, id];
      onLikeReel(id, 1);
    }
    setLikedIds(updated);
    try {
      localStorage.setItem('gcash_liked_reels', JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving liked reels', err);
    }
  };

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    onAddReel(inputUrl.trim(), inputTitle.trim());
    setInputUrl('');
    setInputTitle('');
    setShowAddForm(false);
    // Jump to newly added reel at index 0 (top)
    scrollToReel(0);
  };

  // Closed Trigger Floating Button (Vibrant Solid Gradient & Draggable)
  if (!isOpen) {
    if (isLoggedIn || (typeof document !== 'undefined' && document.body.classList.contains('user-logged-in'))) {
      return null;
    }

    const posStyle = btnPos
      ? { left: `${btnPos.x}px`, top: `${btnPos.y}px` }
      : { bottom: '16px', right: '16px' };

    return (
      <div 
        ref={widgetRef}
        style={posStyle}
        className="fixed z-50 touch-none select-none"
        onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
        onMouseUp={() => handleDragEnd()}
        onTouchStart={(e) => {
          if (e.touches.length === 1) {
            handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 1) {
            handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchEnd={() => handleDragEnd()}
      >
        <button
          id="reels-widget-open-btn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isDraggingRef.current) {
              isDraggingRef.current = false;
              return;
            }
            setIsOpen(true);
          }}
          className="bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black px-5 py-3.5 rounded-full shadow-[0_12px_35px_rgba(225,29,72,0.75)] border-2 border-white flex items-center gap-2.5 transition-transform duration-150 hover:scale-105 active:scale-95 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="relative pointer-events-none flex items-center justify-center bg-white/25 p-1.5 rounded-full shadow-inner">
            <Tv className="w-5 h-5 text-amber-300 drop-shadow-md" />
            {activeReels.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-slate-950 text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-slate-950 shadow-md">
                {activeReels.length}
              </span>
            )}
          </div>
          <span className="text-xs uppercase tracking-wider font-black text-white drop-shadow-md pointer-events-none flex items-center gap-1.5">
            🎬 {language === 'tl' ? 'Panoorin ang Reels' : 'Watch Reels'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* 🌑 BACKDROP OVERLAY to completely lock and freeze background Login/Register area when widget is open */}
      <div 
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn touch-none"
        onClick={() => setIsOpen(false)}
        onTouchMove={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />

      <div 
        ref={widgetRef}
        className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 max-w-[340px] w-[92vw] bg-slate-950/98 border border-slate-800 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col transition duration-300 animate-fadeIn"
      >
      
      {/* 🔮 HEADER BAR WITH NAVIGATION CONTROLS */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-3 border-b border-slate-800 flex items-center justify-between gap-1.5 shrink-0 select-none">
        
        {/* Title & Badge */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-400 shrink-0">
            <Video className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-xs text-white tracking-tight uppercase flex items-center gap-1">
                <span>REELS & SHORTS</span>
              </h3>
              {activeReels.length > 0 && (
                <span className="bg-rose-500/20 text-rose-300 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border border-rose-500/30">
                  {currentIndex + 1}/{activeReels.length}
                </span>
              )}
            </div>
            <p className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">
              {language === 'tl' ? 'I-scroll pababa o gamitin ang ⬆️⬇️' : 'Scroll down or use ⬆️⬇️'}
            </p>
          </div>
        </div>

        {/* Navigation & Action Controls */}
        <div className="flex items-center gap-1">
          
          {/* Scroll Up / Previous Reel */}
          {activeReels.length > 1 && (
            <button
              onClick={handlePrev}
              className="bg-slate-800 hover:bg-slate-700 text-white p-1.5 rounded-xl transition cursor-pointer border border-slate-700 active:scale-90"
              title={language === 'tl' ? 'Itaas / Nakaraang Reel' : 'Scroll Up'}
            >
              <ChevronUp className="w-3.5 h-3.5 text-indigo-300" />
            </button>
          )}

          {/* Scroll Down / Next Reel */}
          {activeReels.length > 1 && (
            <button
              onClick={handleNext}
              className="bg-slate-800 hover:bg-slate-700 text-white p-1.5 rounded-xl transition cursor-pointer border border-slate-700 active:scale-90"
              title={language === 'tl' ? 'Ibaba / Susunod na Reel' : 'Scroll Down'}
            >
              <ChevronDown className="w-3.5 h-3.5 text-indigo-300" />
            </button>
          )}

          {/* Admin Add Reel button */}
          {isAdmin && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
              title={language === 'tl' ? 'Magdagdag ng Reel (Admin)' : 'Add Reel'}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Close Floating Window Button */}
          <button
            id="reels-widget-close-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsOpen(false);
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer z-10"
            title={language === 'tl' ? 'Isara ang Window' : 'Close Floating Window'}
          >
            <X className="w-4 h-4 pointer-events-none" />
          </button>
        </div>
      </div>

      {/* ⚙️ ADMIN ADD REEL FORM INLINE */}
      {showAddForm && isAdmin && (
        <form onSubmit={handlePublishSubmit} className="pt-4 pb-3.5 px-3.5 mt-1 bg-slate-900/98 border-b border-indigo-500/40 space-y-3 text-xs shrink-0 shadow-xl transition-all">
          <div className="flex items-center justify-between pb-1.5 border-b border-indigo-900/50">
            <span className="text-[11px] font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-300" />
              <span>Admin: Mag-publish ng TikTok / FB Reel</span>
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-white text-xs font-extrabold px-1.5 py-0.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2.5 pt-1.5">
            <div>
              <label className="block text-[10px] font-extrabold text-indigo-300 uppercase tracking-wide mb-1">
                Link / Video URL <span className="text-rose-400">*</span>
              </label>
              <input
                type="url"
                required
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="I-paste ang TikTok, FB Reel, o Shorts URL"
                className="w-full bg-slate-950 border border-indigo-500/50 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-mono shadow-inner"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-indigo-300 uppercase tracking-wide mb-1">
                Pamagat / Description (Opsyonal)
              </label>
              <input
                type="text"
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                placeholder="Pamagat / Description ng Reel"
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 cursor-pointer transition active:scale-98 flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>I-publish ang Reel Video (Unahan)</span>
          </button>
        </form>
      )}

      {/* 📹 MAIN CONTENT AREA - SMOOTH ULTRA-RESPONSIVE FEED */}
      <div 
        ref={scrollContainerRef}
        onScroll={() => {
          if (!scrollContainerRef.current) return;
          const container = scrollContainerRef.current;
          const children = Array.from(container.children) as HTMLElement[];
          let closestIndex = currentIndex;
          let minDiff = Infinity;
          const containerTop = container.scrollTop;

          children.forEach((child, idx) => {
            const childTop = child.offsetTop - container.offsetTop;
            const diff = Math.abs(childTop - containerTop);
            if (diff < minDiff) {
              minDiff = diff;
              closestIndex = idx;
            }
          });

          if (closestIndex !== currentIndex && closestIndex >= 0 && closestIndex < activeReels.length) {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => {
              setCurrentIndex(closestIndex);
            }, 600);
          }
        }}
        className="reels-widget-scroll-container p-3 space-y-4 max-h-[68vh] sm:max-h-[460px] overflow-y-auto touch-pan-y overscroll-contain"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4f46e5 #0f172a',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {activeReels.length > 0 ? (
          activeReels.map((reel, index) => {
            const isActive = index === currentIndex;

            return (
              <div 
                key={reel.id} 
                onClick={() => {
                  if (!isActive) scrollToReel(index);
                }}
                className={`space-y-2 p-2.5 rounded-2xl border transition duration-200 ${
                  isActive 
                    ? 'ring-2 ring-indigo-500/60 bg-indigo-950/40 border-indigo-500/50 shadow-lg' 
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 opacity-90 hover:opacity-100 cursor-pointer'
                }`}
              >
                
                {/* Header bar for each reel */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-1">
                  <span className="flex items-center gap-1.5">
                    <span className={`font-extrabold px-2 py-0.5 rounded-md border ${
                      isActive ? 'bg-rose-500 text-white border-rose-400 shadow-md' : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      Reel #{index + 1} {isActive && '▶️ NOW PLAYING'}
                    </span>
                    {index === 0 && (
                      <span className="bg-emerald-500/20 text-emerald-300 font-extrabold px-1.5 py-0.5 rounded-md border border-emerald-500/30 uppercase text-[8px]">
                        ✨ BAGO
                      </span>
                    )}
                  </span>
                  
                  <span className={`font-black px-2 py-0.5 rounded-full border text-[9px] ${
                    reel.platform === 'tiktok'
                      ? 'bg-black/80 text-cyan-300 border-cyan-500/40'
                      : reel.platform === 'facebook'
                      ? 'bg-blue-900/80 text-blue-200 border-blue-400/40'
                      : reel.platform === 'youtube'
                      ? 'bg-rose-950/80 text-rose-200 border-rose-500/40'
                      : 'bg-slate-900/80 text-slate-200 border-slate-700'
                  }`}>
                    {reel.platform === 'tiktok' && '🎵 TikTok'}
                    {reel.platform === 'facebook' && '📘 FB Reel'}
                    {reel.platform === 'youtube' && '▶️ YT Short'}
                    {reel.platform === 'direct' && '📹 Video'}
                  </span>
                </div>

                {/* Video Container Frame */}
                <div className="relative bg-black rounded-2xl overflow-hidden border border-slate-800 aspect-[9/14] sm:aspect-[9/13] max-h-[320px] flex items-center justify-center shadow-lg group touch-pan-y">
                  
                  {/* IF ACTIVE: Render iframe / video. IF INACTIVE: Render placeholder thumbnail preview to stop audio/video background playing */}
                  {isActive ? (
                    reel.platform === 'direct' && reel.embedUrl.match(/\.(mp4|webm)($|\?)/i) ? (
                      <video
                        src={reel.embedUrl}
                        controls
                        autoPlay
                        loop
                        playsInline
                        className="w-full h-full object-contain bg-black"
                      />
                    ) : (
                      <iframe
                        src={reel.embedUrl}
                        title={reel.title || `Reel Video ${index + 1}`}
                        className="w-full h-full border-0 bg-slate-950"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
                      />
                    )
                  ) : (
                    /* Inactive Reel Card Overlay (Stops video/audio playback completely until clicked/scrolled) */
                    <div 
                      onClick={() => scrollToReel(index)}
                      className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-slate-900/90 transition group/play"
                    >
                      <div className="p-4 bg-indigo-600/30 border border-indigo-500/50 rounded-full text-indigo-300 group-hover/play:scale-110 group-hover/play:bg-indigo-600 transition shadow-xl mb-2">
                        <Play className="w-7 h-7 fill-indigo-300 text-indigo-300 group-hover/play:fill-white group-hover/play:text-white" />
                      </div>
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        I-tap para i-play ang Reel #{index + 1}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 max-w-[200px]">
                        {reel.title || 'Panoorin ang video reel'}
                      </p>
                    </div>
                  )}

                  {/* Delete Button for Admin */}
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteReel(reel.id);
                      }}
                      className="absolute top-2 right-2 bg-rose-600/90 hover:bg-rose-600 text-white p-1.5 rounded-full border border-rose-400/30 transition cursor-pointer shadow-md z-10"
                      title="Delete Reel (Admin)"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Title & Interactive Controls Bar */}
                <div className="space-y-2 bg-slate-900/80 border border-slate-800/80 p-2.5 rounded-2xl">
                  
                  {/* Title / Description */}
                  {reel.title && (
                    <p className="text-xs font-bold text-slate-200 leading-snug line-clamp-2">
                      {reel.title}
                    </p>
                  )}

                  {/* Like Button & Open Original Link */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                    
                    {/* LIKE BUTTON */}
                    <button
                      type="button"
                      onClick={(e) => handleLike(reel.id, e)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer active:scale-90 select-none z-20 ${
                        likedIds.includes(reel.id)
                          ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white border border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.6)] scale-105'
                          : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-rose-400 border border-slate-700'
                      }`}
                    >
                      <Heart className={`w-4 h-4 transition ${likedIds.includes(reel.id) ? 'fill-white text-white scale-110' : ''}`} />
                      <span>{reel.likes}</span>
                    </button>

                    {/* Open original link button */}
                    <a
                      href={reel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-indigo-300 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border border-slate-700 flex items-center gap-1 transition"
                      title="Open original link in new tab"
                    >
                      <span>Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                  </div>
                </div>

              </div>
            );
          })
        ) : (
          <div className="py-8 text-center space-y-2">
            <Tv className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
            <p className="text-xs text-slate-400 font-semibold">
              {language === 'tl' ? 'Walang available na reels video.' : 'No reels videos published yet.'}
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs"
              >
                + Magdagdag ng Unang Reel
              </button>
            )}
          </div>
        )}
      </div>

      {/* 📜 BOTTOM SCROLL NAVIGATION CONTROL BAR */}
      {activeReels.length > 1 && (
        <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <button
            onClick={handlePrev}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold border border-slate-700 transition cursor-pointer text-[11px]"
          >
            <ChevronUp className="w-4 h-4" />
            <span>Itaas (Previous)</span>
          </button>

          <span className="text-[10px] font-black text-slate-400 uppercase">
            {currentIndex + 1} / {activeReels.length}
          </span>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold border border-slate-700 transition cursor-pointer text-[11px]"
          >
            <span>Ibaba (Next)</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
    </>
  );
}

