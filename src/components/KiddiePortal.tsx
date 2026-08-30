import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause,
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  Disc, 
  Music, 
  Search, 
  ArrowLeft, 
  Volume2, 
  VolumeX, 
  Radio, 
  Plus, 
  Check, 
  ShieldCheck, 
  ChevronUp, 
  ChevronDown, 
  RotateCw, 
  X, 
  Sparkles,
  BookOpen,
  Info,
  Tv,
  Maximize2
} from 'lucide-react';
import Hls from 'hls.js';
import { KiddieContentItem, UserSession } from '../types';

interface KiddiePortalProps {
  currentUser?: UserSession;
  user?: UserSession;
  onLogout?: () => void;
  onBackToLauncher?: () => void;
}

interface VideoCardProps {
  item: KiddieContentItem;
  isActive: boolean;
  isMuted: boolean;
  fitMode: 'contain' | 'cover';
  onToggleMute: () => void;
  onToggleFitMode: () => void;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onFollow: (channel: string) => void;
  onOpenLesson: (item: KiddieContentItem) => void;
  onOpenSearch: () => void;
  isLiked: boolean;
  isSaved: boolean;
  isFollowed: boolean;
  likeCount: number;
  onBackToLauncher?: () => void;
}

const TikTokVideoCard: React.FC<VideoCardProps> = ({
  item,
  isActive,
  isMuted,
  fitMode,
  onToggleMute,
  onToggleFitMode,
  onLike,
  onSave,
  onFollow,
  onOpenLesson,
  onOpenSearch,
  isLiked,
  isSaved,
  isFollowed,
  likeCount,
  onBackToLauncher
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [expandedDesc, setExpandedDesc] = useState<boolean>(false);
  const [showHeartBurst, setShowHeartBurst] = useState<boolean>(false);
  const [heartBurstPos, setHeartBurstPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [audioBlocked, setAudioBlocked] = useState<boolean>(false);
  const lastTapRef = useRef<number>(0);

  // Forcefully unlock audio on user action
  const unlockAudio = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
      videoRef.current.play().then(() => {
        setAudioBlocked(false);
      }).catch(() => {});
    }
  }, []);

  // Initialize or cleanup player when active state changes
  useEffect(() => {
    if (!isActive) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    // Card is active: start playback
    setStreamError(null);
    setIsPlaying(true);
    setExpandedDesc(false);

    const videoEl = videoRef.current;
    if (!videoEl) return;

    // Apply mute state
    videoEl.muted = isMuted;
    videoEl.volume = 1.0;

    const attemptPlay = () => {
      // First attempt to play directly with sound
      videoEl.muted = isMuted;
      videoEl.volume = 1.0;
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
          setAudioBlocked(false);
        }).catch((err) => {
          // If unmuted autoplay blocked by browser policy, play muted and prepare immediate unlock on first tap
          console.warn('Unmuted autoplay blocked by browser policy, falling back to muted stream until interaction:', err);
          videoEl.muted = true;
          setAudioBlocked(true);
          videoEl.play().catch(() => {});

          const handleUserInteraction = () => {
            if (videoRef.current) {
              videoRef.current.muted = false;
              videoRef.current.volume = 1.0;
              videoRef.current.play().then(() => {
                setAudioBlocked(false);
              }).catch(() => {});
            }
          };

          window.addEventListener('touchstart', handleUserInteraction, { once: true });
          window.addEventListener('click', handleUserInteraction, { once: true });
          window.addEventListener('scroll', handleUserInteraction, { once: true });
        });
      }
    };

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 5,
      });

      hlsRef.current = hls;
      hls.loadSource(item.videoUrl);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStreamError(null);
        attemptPlay();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setStreamError('Nagre-reconnect ang 24/7 Live Stream. I-click ang "Subukan Muli".');
              break;
          }
        }
      });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple iOS Safari
      videoEl.src = item.videoUrl;
      videoEl.addEventListener('loadedmetadata', () => {
        attemptPlay();
      });
    } else {
      videoEl.src = item.videoUrl;
      attemptPlay();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isActive, item.videoUrl, isMuted]);

  // Sync mute property when global isMuted state changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      if (!isMuted) {
        videoRef.current.volume = 1.0;
        setAudioBlocked(false);
      }
    }
  }, [isMuted]);

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    unlockAudio();
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Double tap to like handler
  const handleVideoTap = (e: React.MouseEvent<HTMLDivElement>) => {
    unlockAudio();
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (now - lastTapRef.current < 300) {
      // Double tap detected!
      if (!isLiked) {
        onLike(item.id);
      }
      setHeartBurstPos({ x, y });
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 900);
    } else {
      // Single tap -> toggle play/pause
      togglePlayPause();
    }
    lastTapRef.current = now;
  };

  const formatNumber = (num?: number) => {
    if (!num) return '12.4K';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div 
      className="relative w-full h-[100dvh] snap-start snap-always shrink-0 overflow-hidden bg-black flex flex-col justify-between select-none"
    >
      {/* ================= BACKGROUND VIDEO PLAYER (Full-Width 16:9 Without Side Cropping) ================= */}
      <div 
        onClick={handleVideoTap}
        className="absolute inset-0 z-0 bg-black cursor-pointer flex items-center justify-center overflow-hidden"
      >
        {/* Ambient Blurred Glowing Backdrop for TikTok presentation */}
        <div 
          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-40 scale-125 transition duration-700 pointer-events-none"
          style={{ backgroundImage: `url(${item.thumbnailUrl})` }}
        />
        
        {/* Main 24/7 Live Stream Video: 
            fitMode === 'contain' guarantees the FULL 16:9 actual widescreen width (Lawak) with ZERO side cropping! */}
        <video
          ref={videoRef}
          playsInline
          muted={isMuted}
          loop
          poster={item.thumbnailUrl}
          className={`relative z-10 w-full max-w-full transition-all duration-300 ${
            fitMode === 'contain' 
              ? 'aspect-video object-contain drop-shadow-[0_10px_35px_rgba(0,0,0,0.85)] max-h-[80vh]' 
              : 'h-full object-cover'
          }`}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Stream Error Reconnect Overlay */}
        {streamError && (
          <div className="absolute inset-0 z-20 bg-black/85 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <Radio className="w-10 h-10 text-red-500 animate-pulse" />
            <p className="text-xs text-slate-200 font-semibold max-w-xs">{streamError}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  videoRef.current.load();
                  videoRef.current.play().catch(() => {});
                }
              }}
              className="px-4 py-2 rounded-full bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg active:scale-95 transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Subukan Muli
            </button>
          </div>
        )}

        {/* Tap to Unmute Floating Prompt (shown if browser blocked sound until user taps) */}
        {(isMuted || audioBlocked) && isActive && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              unlockAudio();
              onToggleMute();
            }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-black/80 backdrop-blur-md border border-amber-400/60 text-amber-300 text-xs font-black px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce cursor-pointer hover:bg-amber-400 hover:text-black transition"
          >
            <VolumeX className="w-4 h-4 text-red-400 animate-pulse" />
            <span>I-tap para buksan ang TUNOG 🔊</span>
          </div>
        )}

        {/* Pause Indicator overlay */}
        {!isPlaying && isActive && (
          <div className="absolute z-20 w-16 h-16 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center text-white pointer-events-none transition scale-110">
            <Play className="w-8 h-8 fill-current ml-1" />
          </div>
        )}

        {/* Double Tap Heart Burst Animation */}
        {showHeartBurst && (
          <div 
            className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2 transition transform animate-ping duration-700"
            style={{ left: `${heartBurstPos.x}%`, top: `${heartBurstPos.y}%` }}
          >
            <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.9)]" />
          </div>
        )}

        {/* Top and Bottom Gradients for readable text */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 via-black/35 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none z-10" />
      </div>

      {/* Top Spacer to prevent overlap with sticky header */}
      <div className="h-16 w-full pointer-events-none" />

      {/* ================= RIGHT SIDEBAR ACTION BUTTONS ================= */}
      <aside className="absolute right-3.5 bottom-24 z-30 flex flex-col items-center gap-3.5 pointer-events-auto">
        {/* Creator / Channel Avatar with '+' Follow Badge */}
        <div className="relative group">
          <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 shadow-xl overflow-hidden">
            <img 
              src={item.thumbnailUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200'} 
              alt={item.channelName || 'Live Channel'} 
              className="w-full h-full object-cover rounded-full bg-slate-900"
            />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFollow(item.channelName || item.id);
            }}
            className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-lg transition duration-200 active:scale-75 ${
              isFollowed
                ? 'bg-emerald-500 scale-90'
                : 'bg-red-500 hover:bg-red-600'
            }`}
            title="I-follow ang Channel"
          >
            {isFollowed ? (
              <Check className="w-3 h-3 stroke-[3]" />
            ) : (
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            )}
          </button>
        </div>

        {/* 1. Heart / Like Button */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLike(item.id);
            }}
            className="p-1.5 active:scale-125 transition duration-200"
            title="I-like ang palabas"
          >
            <Heart 
              className={`w-7 h-7 drop-shadow-md transition duration-200 ${
                isLiked 
                  ? 'text-red-500 fill-red-500 scale-110' 
                  : 'text-white fill-black/20 hover:text-red-400'
              }`} 
            />
          </button>
          <span className="text-[11px] font-extrabold text-white drop-shadow">
            {formatNumber(likeCount)}
          </span>
        </div>

        {/* 2. Lesson Notes / Trivia / Comments ("Aral ng Kwento") */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenLesson(item);
            }}
            className="p-1.5 active:scale-125 transition duration-200 hover:text-amber-400"
            title="Aral at Kaalaman"
          >
            <MessageCircle className="w-7 h-7 text-white fill-black/20 drop-shadow-md" />
          </button>
          <span className="text-[11px] font-extrabold text-white drop-shadow">
            {item.tags?.length ? item.tags.length * 75 + 120 : '420'}
          </span>
        </div>

        {/* 3. Bookmark / Save Favorite */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSave(item.id);
            }}
            className="p-1.5 active:scale-125 transition duration-200"
            title="I-save sa Favorites"
          >
            <Bookmark 
              className={`w-7 h-7 drop-shadow-md transition duration-200 ${
                isSaved 
                  ? 'text-amber-400 fill-amber-400 scale-110' 
                  : 'text-white fill-black/20 hover:text-amber-300'
              }`} 
            />
          </button>
          <span className="text-[11px] font-extrabold text-white drop-shadow">
            {isSaved ? 'Saved' : '1,742'}
          </span>
        </div>

        {/* 4. Share Button */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (navigator.share) {
                navigator.share({
                  title: item.title,
                  text: item.description,
                  url: window.location.href,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Na-kopya na ang link ng Z-oneKiddie!');
              }
            }}
            className="p-1.5 active:scale-125 transition duration-200 hover:text-blue-400"
            title="I-share ang palabas"
          >
            <Share2 className="w-7 h-7 text-white fill-black/20 drop-shadow-md" />
          </button>
          <span className="text-[11px] font-extrabold text-white drop-shadow">2,447</span>
        </div>

        {/* 5. Fit / Fill Screen Mode Toggle (Allows Full Width Widescreen vs Zoom) */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFitMode();
            }}
            className="p-1.5 active:scale-125 transition duration-200 text-white/90 hover:text-amber-300"
            title={fitMode === 'contain' ? 'Widescreen Fit (Lahat Kita) - I-click para i-Zoom' : 'Zoom (Fill Screen) - I-click para Makita Lahat'}
          >
            <Maximize2 className={`w-6 h-6 drop-shadow-md ${fitMode === 'contain' ? 'text-amber-400' : 'text-white'}`} />
          </button>
          <span className="text-[9px] font-bold text-slate-300">
            {fitMode === 'contain' ? 'Fit' : 'Fill'}
          </span>
        </div>

        {/* 6. Spinning Music Record / Vinyl */}
        <div className="pt-1">
          <div className={`w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center shadow-2xl ${isPlaying && isActive ? 'animate-spin' : ''} [animation-duration:4s]`}>
            <div className="w-5 h-5 rounded-full overflow-hidden">
              <img 
                src={item.thumbnailUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=100'} 
                alt="Record" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </aside>

      {/* ================= BOTTOM INFO OVERLAY & SEARCH BAR ================= */}
      <div className="relative z-30 flex flex-col justify-end w-full pb-3 pointer-events-auto">
        {/* Creator Info & Description */}
        <div className="px-4 pb-2 space-y-1.5 max-w-[80%]">
          {/* Channel Name & Verified Badge */}
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-extrabold text-white drop-shadow-md tracking-tight flex items-center gap-1.5">
              <span>{item.channelName || '@KiddieLiveTV'}</span>
              <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-black">
                ✓
              </span>
            </h2>
            
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-600 text-white flex items-center gap-1 shadow-sm animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              LIVE 24/7
            </span>
          </div>

          {/* Title & Expandable Description */}
          <div className="text-xs sm:text-sm text-slate-100 font-medium leading-snug drop-shadow">
            <p className={`${expandedDesc ? '' : 'line-clamp-2'}`}>
              <span className="font-bold text-white mr-1.5">{item.title}</span>
              <span className="text-slate-300">{item.description}</span>
            </p>
            {item.description && item.description.length > 50 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedDesc(!expandedDesc);
                }}
                className="text-xs font-black text-amber-300 ml-1 hover:underline inline-block"
              >
                {expandedDesc ? 'less' : 'more'}
              </button>
            )}
          </div>

          {/* Hashtags */}
          <div className="flex flex-wrap gap-1 text-[11px] font-bold text-amber-300 drop-shadow">
            {item.tags && item.tags.map((tag, idx) => (
              <span key={idx} className="cursor-pointer hover:underline">
                #{tag.replace(/\s+/g, '')}
              </span>
            ))}
          </div>

          {/* Sound / Music Ticker at bottom */}
          <div className="flex items-center gap-2 text-xs text-white/90 font-semibold pt-0.5">
            <Music className="w-3.5 h-3.5 shrink-0 text-amber-400 animate-bounce" />
            <div className="overflow-hidden whitespace-nowrap w-full">
              <p className="inline-block animate-marquee font-medium text-[11px]">
                {item.channelName ? `${item.channelName} • 24/7 Live Kids Audio Broadcast` : 'Z-oneKiddie 24/7 Live Stream Audio'}
              </p>
            </div>
          </div>
        </div>

        {/* ================= BOTTOM SEARCH BAR ================= */}
        <div className="px-3 pt-1 pointer-events-auto">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full bg-black/60 backdrop-blur-md border border-white/15 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-slate-300 hover:bg-black/80 transition"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                Search · {item.title ? item.title.slice(0, 32) + '...' : 'mr bean, baby shark, cartoons live 24/7'}
              </span>
            </div>
            <span className="text-[10px] font-black text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded-md shrink-0 ml-1">
              Explore
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
        {/* Creator / Channel Avatar with '+' Follow Badge */}
        <div className="relative group">
          <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 shadow-xl overflow-hidden">
            <img 
              src={item.thumbnailUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200'} 
              alt={item.channelName || 'Channel'} 
              className="w-full h-full object-cover rounded-full bg-slate-900"
            />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFollow(item.channelName || item.id);
            }}
            className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-lg transition duration-200 active:scale-75 ${
              isFollowed
                ? 'bg-emerald-500 scale-90'
                : 'bg-red-500 hover:bg-red-600'
            }`}
            title="I-follow ang Channel"
          >
            {isFollowed ? (
              <Check className="w-3 h-3 stroke-[3]" />
            ) : (
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            )}
          </button>
        </div>

        {/* 1. Heart / Like Button */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLike(item.id);
            }}
            className="p-1.5 active:scale-125 transition duration-200"
            title="I-like ang palabas"
          >
            <Heart 
              className={`w-7 h-7 drop-shadow-md transition duration-200 ${
                isLiked 
                  ? 'text-red-500 fill-red-500 scale-110' 
                  : 'text-white fill-black/20 hover:text-red-400'
              }`} 
            />
          </button>
          <span className="text-[11px] font-extrabold text-white drop-shadow">
            {formatNumber(likeCount)}
          </span>
        </div>

        {/* 2. Lesson Notes / Trivia / Comments ("Aral ng Kwento") */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenLesson(item);
            }}
            className="p-1.5 active:scale-125 transition duration-200 hover:text-amber-400"
            title="Aral at Kaalaman"
          >
            <MessageCircle className="w-7 h-7 text-white fill-black/20 drop-shadow-md" />
          </button>
          <span className="text-[11px] font-extrabold text-white drop-shadow">
            {item.tags?.length ? item.tags.length * 75 + 120 : '420'}
          </span>
        </div>

        {/* 3. Bookmark / Save Favorite */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSave(item.id);
            }}
            className="p-1.5 active:scale-125 transition duration-200"
            title="I-save sa Favorites"
          >
            <Bookmark 
              className={`w-7 h-7 drop-shadow-md transition duration-200 ${
                isSaved 
                  ? 'text-amber-400 fill-amber-400 scale-110' 
                  : 'text-white fill-black/20 hover:text-amber-300'
              }`} 
            />
          </button>
          <span className="text-[11px] font-extrabold text-white drop-shadow">
            {isSaved ? 'Saved' : '1,742'}
          </span>
        </div>

        {/* 4. Share Button */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (navigator.share) {
                navigator.share({
                  title: item.title,
                  text: item.description,
                  url: window.location.href,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Na-kopya na ang link ng Z-oneKiddie!');
              }
            }}
            className="p-1.5 active:scale-125 transition duration-200 hover:text-blue-400"
            title="I-share ang palabas"
          >
            <Share2 className="w-7 h-7 text-white fill-black/20 drop-shadow-md" />
          </button>
          <span className="text-[11px] font-extrabold text-white drop-shadow">2,447</span>
        </div>

        {/* 5. Fit / Fill Screen Mode Toggle */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFitMode();
            }}
            className="p-1.5 active:scale-125 transition duration-200 text-white/90 hover:text-amber-300"
            title={fitMode === 'contain' ? 'Fit (Lahat Kita) - I-click para i-Zoom' : 'Zoom (Fill Screen) - I-click para Makita Lahat'}
          >
            <Maximize2 className={`w-6 h-6 drop-shadow-md ${fitMode === 'contain' ? 'text-amber-400' : 'text-white'}`} />
          </button>
          <span className="text-[9px] font-bold text-slate-300">
            {fitMode === 'contain' ? 'Fit' : 'Fill'}
          </span>
        </div>

        {/* 6. Spinning Music Record / Vinyl (Screenshot Icon) */}
        <div className="pt-1">
          <div className={`w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center shadow-2xl ${isPlaying && isActive ? 'animate-spin' : ''} [animation-duration:4s]`}>
            <div className="w-5 h-5 rounded-full overflow-hidden">
              <img 
                src={item.thumbnailUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=100'} 
                alt="Record" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </aside>

      {/* ================= BOTTOM INFO OVERLAY & SEARCH BAR (Matching Screenshot) ================= */}
      <div className="relative z-30 flex flex-col justify-end w-full pb-3 pointer-events-auto">
        {/* Creator Info & Description */}
        <div className="px-4 pb-2 space-y-1.5 max-w-[80%]">
          {/* Channel Name & Verified Badge */}
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-extrabold text-white drop-shadow-md tracking-tight flex items-center gap-1.5">
              <span>{item.channelName || '@KnowledgeChannelPH'}</span>
              <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-black">
                ✓
              </span>
            </h2>
            
            {item.isLive && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-600 text-white flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                LIVE
              </span>
            )}
          </div>

          {/* Title & Expandable Description */}
          <div className="text-xs sm:text-sm text-slate-100 font-medium leading-snug drop-shadow">
            <p className={`${expandedDesc ? '' : 'line-clamp-2'}`}>
              <span className="font-bold text-white mr-1.5">{item.title}</span>
              <span className="text-slate-300">{item.description}</span>
            </p>
            {item.description && item.description.length > 50 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedDesc(!expandedDesc);
                }}
                className="text-xs font-black text-amber-300 ml-1 hover:underline inline-block"
              >
                {expandedDesc ? 'less' : 'more'}
              </button>
            )}
          </div>

          {/* Hashtags */}
          <div className="flex flex-wrap gap-1 text-[11px] font-bold text-amber-300 drop-shadow">
            {item.tags && item.tags.map((tag, idx) => (
              <span key={idx} className="cursor-pointer hover:underline">
                #{tag.replace(/\s+/g, '')}
              </span>
            ))}
          </div>

          {/* Sound / Music Ticker at bottom */}
          <div className="flex items-center gap-2 text-xs text-white/90 font-semibold pt-0.5">
            <Music className="w-3.5 h-3.5 shrink-0 text-amber-400 animate-bounce" />
            <div className="overflow-hidden whitespace-nowrap w-full">
              <p className="inline-block animate-marquee font-medium text-[11px]">
                {item.channelName ? `${item.channelName} • Original Educational Sound 24/7` : 'Knowledge Channel Philippines • Sineskwela & MathDali Audio'}
              </p>
            </div>
          </div>
        </div>

        {/* ================= BOTTOM SEARCH BAR (Identical to TikTok screenshot bottom) ================= */}
        <div className="px-3 pt-1 pointer-events-auto">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full bg-black/60 backdrop-blur-md border border-white/15 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-slate-300 hover:bg-black/80 transition"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                Search · {item.title ? item.title.slice(0, 32) + '...' : 'sineskwela, mr bean, baby shark live'}
              </span>
            </div>
            <span className="text-[10px] font-black text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded-md shrink-0 ml-1">
              Explore
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const KiddiePortal: React.FC<KiddiePortalProps> = ({ 
  currentUser, 
  user, 
  onBackToLauncher 
}) => {
  const activeUser = currentUser || user || null;
  const [contentList, setContentList] = useState<KiddieContentItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'for_you' | 'live' | 'cartoon' | 'educational' | 'story'>('for_you');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [showLessonModal, setShowLessonModal] = useState<boolean>(false);
  const [selectedLessonItem, setSelectedLessonItem] = useState<KiddieContentItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Fit Mode: 'contain' shows the FULL 16:9 widescreen video without cropping (matching Picture 1), 'cover' fills screen
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');

  // Audio unmuted by default as requested!
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioPromptDismissed, setAudioPromptDismissed] = useState<boolean>(false);

  // Interactive like & bookmark states per item ID
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});
  const [savedItems, setSavedItems] = useState<Record<string, boolean>>({});
  const [followedChannels, setFollowedChannels] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchKiddieContent();
  }, []);

  // Global listener to immediately unmute / open audio on the very first touch or interaction anywhere
  useEffect(() => {
    const handleFirstInteraction = () => {
      setIsMuted(false);
      setAudioPromptDismissed(true);
    };

    window.addEventListener('touchstart', handleFirstInteraction, { once: true });
    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  const fetchKiddieContent = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/kiddie/feed');
      if (res.ok) {
        const data = await res.json();
        if (data.items && Array.isArray(data.items)) {
          setContentList(data.items);
          
          // Seed realistic initial like counts
          const initialLikes: Record<string, number> = {};
          data.items.forEach((item: KiddieContentItem, idx: number) => {
            initialLikes[item.id] = 12400 + (idx * 3420) % 86000;
          });
          setLikeCounts(initialLikes);
        }
      }
    } catch (e) {
      console.error('Failed to load kiddie content:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filter content by top tab and search query
  const filteredContent = contentList.filter(item => {
    let matchesTab = true;
    if (activeTab === 'live') {
      matchesTab = Boolean(item.isLive || item.category === 'live_tv' || item.videoUrl.includes('.m3u8'));
    } else if (activeTab === 'cartoon') {
      matchesTab = item.category === 'cartoon';
    } else if (activeTab === 'educational') {
      matchesTab = item.category === 'educational';
    } else if (activeTab === 'story') {
      matchesTab = item.category === 'story' || item.category === 'kiddie_movie';
    }

    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.channelName && item.channelName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

    return matchesTab && matchesSearch;
  });

  // Handle scroll event to accurately detect active video card in the snap container
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const height = el.clientHeight;
    if (height > 0) {
      const newIndex = Math.round(el.scrollTop / height);
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < filteredContent.length) {
        setActiveIndex(newIndex);
      }
    }
  };

  const scrollToCard = (index: number) => {
    const el = containerRef.current;
    if (!el) return;
    const height = el.clientHeight;
    el.scrollTo({
      top: index * height,
      behavior: 'smooth'
    });
    setActiveIndex(index);
  };

  const goToNext = () => {
    if (activeIndex < filteredContent.length - 1) {
      scrollToCard(activeIndex + 1);
    } else {
      scrollToCard(0);
    }
  };

  const goToPrev = () => {
    if (activeIndex > 0) {
      scrollToCard(activeIndex - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSearchModal || showLessonModal) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'm') {
        e.preventDefault();
        setIsMuted(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, filteredContent.length, showSearchModal, showLessonModal]);

  const toggleLike = (id: string) => {
    setLikedItems(prev => {
      const isLiked = !prev[id];
      setLikeCounts(c => ({
        ...c,
        [id]: (c[id] || 1000) + (isLiked ? 1 : -1)
      }));
      return { ...prev, [id]: isLiked };
    });
  };

  const toggleSave = (id: string) => {
    setSavedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFollow = (channel: string) => {
    setFollowedChannels(prev => ({ ...prev, [channel]: !prev[channel] }));
  };

  const openLessonModal = (item: KiddieContentItem) => {
    setSelectedLessonItem(item);
    setShowLessonModal(true);
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-[100dvh] bg-black text-white overflow-hidden select-none flex justify-center items-center">
      {/* ================= TIKTOK VERTICAL SCROLL FRAME (Full Screen Mobile & Fixed Centered Desktop) ================= */}
      <div className="relative w-full h-full max-w-[480px] bg-black overflow-hidden flex flex-col justify-between">
        
        {/* ================= FIXED TOP HEADER (Identical to Screenshot) ================= */}
        <header className="absolute top-0 inset-x-0 z-40 pt-3 pb-2 px-3 flex items-center justify-between pointer-events-auto bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {/* Left: LIVE Badge & Back Button */}
          <div className="flex items-center gap-2">
            {onBackToLauncher && (
              <button
                type="button"
                onClick={onBackToLauncher}
                className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-90 transition shadow-md"
                title="Bumalik sa Launcher"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => { setActiveTab('live'); scrollToCard(0); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wide border transition backdrop-blur-md ${
                activeTab === 'live' 
                  ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/30' 
                  : 'bg-black/40 text-slate-300 border-white/10 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span>LIVE</span>
            </button>
          </div>

          {/* Center Tabs: Cartoons, Agham, Kwento, For You */}
          <nav className="flex items-center gap-3.5 text-xs font-bold tracking-tight text-white/70">
            <button
              onClick={() => { setActiveTab('cartoon'); scrollToCard(0); }}
              className={`transition relative ${activeTab === 'cartoon' ? 'text-white font-extrabold text-sm' : 'hover:text-white'}`}
            >
              Cartoons
              {activeTab === 'cartoon' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-white rounded-full" />}
            </button>
            <button
              onClick={() => { setActiveTab('educational'); scrollToCard(0); }}
              className={`transition relative ${activeTab === 'educational' ? 'text-white font-extrabold text-sm' : 'hover:text-white'}`}
            >
              Agham
              {activeTab === 'educational' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-white rounded-full" />}
            </button>
            <button
              onClick={() => { setActiveTab('story'); scrollToCard(0); }}
              className={`transition relative ${activeTab === 'story' ? 'text-white font-extrabold text-sm' : 'hover:text-white'}`}
            >
              Kwento
              {activeTab === 'story' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-white rounded-full" />}
            </button>
            <button
              onClick={() => { setActiveTab('for_you'); scrollToCard(0); }}
              className={`transition relative ${activeTab === 'for_you' ? 'text-white font-extrabold text-sm' : 'hover:text-white'}`}
            >
              For You
              {activeTab === 'for_you' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-white rounded-full" />}
            </button>
          </nav>

          {/* Right: Search & Sound Toggle (Auto Unmute Support) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSearchModal(true)}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-90 transition shadow-md"
              title="Maghanap ng Palabas"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className={`w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center active:scale-90 transition shadow-md ${
                isMuted 
                  ? 'bg-red-500/30 border-red-400/50 text-red-300' 
                  : 'bg-emerald-500/30 border-emerald-400/50 text-emerald-300'
              }`}
              title={isMuted ? 'Naka-Mute (I-click para magka-Sound)' : 'Naka-Sound ON'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Up / Down Desktop / Touch Navigation Chevrons */}
        <div className="absolute right-3 top-20 z-40 flex flex-col gap-1.5 pointer-events-auto">
          <button
            onClick={goToPrev}
            disabled={activeIndex === 0}
            className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white disabled:opacity-20 active:scale-90 transition"
            title="Naunang palabas (Up)"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-90 transition"
            title="Susunod na palabas (Down)"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* ================= VERTICAL SNAP SCROLLABLE FEED CONTAINER ================= */}
        <main
          ref={containerRef}
          onScroll={handleScroll}
          className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth touch-pan-y scrollbar-none z-10"
          style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          {loading ? (
            <div className="w-full h-[100dvh] flex flex-col items-center justify-center space-y-3 text-center p-6">
              <Sparkles className="w-10 h-10 text-amber-400 animate-spin" />
              <p className="text-sm text-slate-300 font-bold">Naglo-load ng Z-oneKiddie TikTok feed...</p>
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="w-full h-[100dvh] flex flex-col items-center justify-center p-6 space-y-4 text-center">
              <p className="text-sm text-slate-400">Walang nahanap na palabas sa kategoryang ito.</p>
              <button
                onClick={() => { setActiveTab('for_you'); setSearchQuery(''); }}
                className="px-4 py-2 bg-amber-400 text-slate-950 rounded-full text-xs font-black"
              >
                Bumalik sa Lahat
              </button>
            </div>
          ) : (
            filteredContent.map((item, index) => (
              <TikTokVideoCard
                key={item.id}
                item={item}
                isActive={index === activeIndex}
                isMuted={isMuted}
                fitMode={fitMode}
                onToggleMute={() => setIsMuted(!isMuted)}
                onToggleFitMode={() => setFitMode(prev => prev === 'contain' ? 'cover' : 'contain')}
                onLike={toggleLike}
                onSave={toggleSave}
                onFollow={toggleFollow}
                onOpenLesson={openLessonModal}
                onOpenSearch={() => setShowSearchModal(true)}
                isLiked={Boolean(likedItems[item.id])}
                isSaved={Boolean(savedItems[item.id])}
                isFollowed={Boolean(followedChannels[item.channelName || item.id])}
                likeCount={likeCounts[item.id] || 12400}
                onBackToLauncher={onBackToLauncher}
              />
            ))
          )}
        </main>
      </div>

      {/* ================= LESSON / TRIVIA / COMMENTS MODAL (Aral ng Kwento) ================= */}
      {showLessonModal && selectedLessonItem && (
        <div 
          onClick={() => setShowLessonModal(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Aral at Kaalaman (Child-Safe)</h3>
                  <p className="text-[10px] text-slate-400">Mula sa {selectedLessonItem.channelName || 'Z-oneKiddie Hub'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowLessonModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">🌟 Buod at Magandang Aral:</span>
                <p className="text-slate-200 leading-relaxed font-medium">
                  {selectedLessonItem.description}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-300 text-xs">100% Protektado at Ligtas sa Bata</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Ang video at stream na ito ay nasuri para sa tamang moralidad, edukasyon, at masayang pag-aaral ng mga bata.
                  </p>
                </div>
              </div>

              {/* Sample Safe Trivia Comments */}
              <div className="space-y-2 pt-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trivia & Comment Highlights:</h4>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      KC
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-200">Knowledge Channel Pro</span>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Alam mo ba na ang panonood ng educational videos tulad nito ay nagpapalakas ng memorya at logic skills? 🧠✨
                      </p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      🌟
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-200">Kiddie Explorer</span>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Paborito ko ang episode na 'to! Napakadaling intindihin at masaya panoorin! 🎉
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowLessonModal(false)}
              className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl transition"
            >
              Naintindihan Ko Na! 👍
            </button>
          </div>
        </div>
      )}

      {/* ================= QUICK SEARCH & CHANNEL PICKER MODAL ================= */}
      {showSearchModal && (
        <div 
          onClick={() => setShowSearchModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start justify-center p-4 pt-12 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Maghanap ng Sineskwela, Cartoons, Agham..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Filter Tag Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {['Lahat', 'Live TV', 'Knowledge Channel', 'Mr Bean', 'Alamat', 'Edukasyon'].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setSearchQuery(q === 'Lahat' ? '' : q)}
                  className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold whitespace-nowrap transition"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredContent.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Walang nahanap na tugma sa "{searchQuery}".</p>
              ) : (
                filteredContent.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      scrollToCard(idx);
                      setShowSearchModal(false);
                    }}
                    className={`flex items-center gap-3 p-2 rounded-2xl cursor-pointer transition border ${
                      filteredContent[activeIndex]?.id === item.id 
                        ? 'bg-amber-500/20 border-amber-400/50' 
                        : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800/80'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 shrink-0 relative">
                      <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                      {item.isLive && (
                        <span className="absolute top-1 left-1 px-1 rounded bg-red-600 text-[8px] font-black text-white">
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-amber-400 uppercase">{item.channelName || item.category}</span>
                      <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{item.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

