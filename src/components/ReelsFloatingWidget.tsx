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
  language?: 'tl' | 'en';
  onAddReel: (url: string, title?: string) => void;
  onDeleteReel: (id: string) => void;
  onLikeReel: (id: string) => void;
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
  language = 'tl',
  onAddReel,
  onDeleteReel,
  onLikeReel
}: ReelsFloatingWidgetProps) {
  const [isOpen, setIsOpen] = useState(true);
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeReels = reels && reels.length > 0 ? reels : [];

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Natively intercept and isolate ad popups without breaking native touch scrolling
  useEffect(() => {
    const originalWindowOpen = window.open;

    const handleGlobalCapture = (e: Event) => {
      const el = widgetRef.current;
      if (!el) return;

      const target = e.target as HTMLElement | null;
      if (el.contains(target) || target === el) {
        // Handle Close and Open buttons directly
        if (target && (target.id === 'reels-widget-close-btn' || target.closest('#reels-widget-close-btn'))) {
          setIsOpen(false);
        }
        if (target && (target.id === 'reels-widget-open-btn' || target.closest('#reels-widget-open-btn'))) {
          setIsOpen(true);
        }

        // Only stop propagation for click/mouseup events to isolate Monetag ads while keeping touch scrolling 100% smooth
        if (e.type === 'click' || e.type === 'mouseup' || e.type === 'pointerup') {
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === 'function') {
            e.stopImmediatePropagation();
          }
        }

        // Block window.open popunder attempts unless clicking an explicit user link
        const isExternalLink = target && (target.tagName === 'A' || target.closest('a'));
        if (!isExternalLink) {
          window.open = function (...args) {
            console.log('Blocked popunder ad attempt in Reels Widget:', args);
            return null;
          };
          setTimeout(() => {
            window.open = originalWindowOpen;
          }, 300);
        }
      }
    };

    const events = ['click', 'mouseup', 'pointerup', 'touchstart', 'touchend'];
    
    // Attach capture listeners on window and document
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

  // Hide floating Install App button whenever Reels widget is open
  useEffect(() => {
    const installBtn = document.getElementById('installBtn');
    if (isOpen) {
      document.body.classList.add('reels-widget-open');
      if (installBtn) {
        installBtn.style.setProperty('display', 'none', 'important');
      }
    } else {
      document.body.classList.remove('reels-widget-open');
      if (installBtn && installBtn.innerText) {
        installBtn.style.display = 'block';
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

  const handleLike = (id: string) => {
    if (!likedIds.includes(id)) {
      const updated = [...likedIds, id];
      setLikedIds(updated);
      try {
        localStorage.setItem('gcash_liked_reels', JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving liked reels', e);
      }
      onLikeReel(id);
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

  // Closed Trigger Floating Button
  if (!isOpen) {
    return (
      <div 
        ref={widgetRef}
        className="fixed bottom-4 right-4 z-50"
      >
        <button
          id="reels-widget-open-btn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-black px-4 py-3 rounded-full shadow-2xl border-2 border-white/20 flex items-center gap-2.5 transition duration-300 hover:scale-105 active:scale-95 cursor-pointer group"
        >
          <div className="relative pointer-events-none">
            <Tv className="w-5 h-5 text-amber-300 animate-pulse" />
            {activeReels.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                {activeReels.length}
              </span>
            )}
          </div>
          <span className="text-xs uppercase tracking-wider font-extrabold pointer-events-none">
            🎬 {language === 'tl' ? 'Panoorin ang Reels' : 'Watch Reels'}
          </span>
        </button>
      </div>
    );
  }

  return (
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
        <form onSubmit={handlePublishSubmit} className="p-3 bg-indigo-950/90 border-b border-indigo-800/60 space-y-2 text-xs shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-300" />
              <span>Admin: Mag-publish ng TikTok / FB Reel</span>
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-white text-[10px] font-extrabold"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1">
            <input
              type="url"
              required
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="I-paste ang TikTok, FB Reel, o Shorts URL"
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-mono"
            />
          </div>

          <div className="space-y-1">
            <input
              type="text"
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              placeholder="Pamagat / Description (Opsyonal)"
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-2 rounded-xl text-xs uppercase tracking-wider shadow-md cursor-pointer transition flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>I-publish ang Reel Video (Unahan)</span>
          </button>
        </form>
      )}

      {/* 📹 MAIN CONTENT AREA - SMOOTH SNAP-SCROLLABLE FEED */}
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
            }, 120);
          }
        }}
        className="p-3 space-y-4 max-h-[70vh] sm:max-h-[460px] overflow-y-auto scroll-smooth touch-pan-y overscroll-contain snap-y snap-proximity"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4f46e5 #0f172a'
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
                className={`space-y-2 pb-3.5 border-b border-slate-800/90 last:border-0 last:pb-0 transition duration-300 snap-start ${
                  isActive ? 'ring-2 ring-indigo-500/60 p-2 rounded-2xl bg-indigo-950/30' : 'opacity-85 hover:opacity-100 cursor-pointer'
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
                <div className="relative bg-black rounded-2xl overflow-hidden border border-slate-800 aspect-[9/14] sm:aspect-[9/13] max-h-[320px] flex items-center justify-center shadow-lg group">
                  
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(reel.id);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs transition cursor-pointer active:scale-90 ${
                        likedIds.includes(reel.id)
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                          : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-rose-400 border border-slate-700'
                      }`}
                    >
                      <Heart className={`w-4 h-4 transition ${likedIds.includes(reel.id) ? 'fill-rose-500 text-rose-500 scale-110' : ''}`} />
                      <span>{reel.likes + (likedIds.includes(reel.id) ? 1 : 0)}</span>
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
  );
}

