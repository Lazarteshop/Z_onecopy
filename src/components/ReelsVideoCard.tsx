import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Heart, 
  Share2, 
  ExternalLink, 
  Trash2, 
  Maximize2, 
  Music, 
  Sparkles, 
  Check, 
  TrendingUp, 
  AlertCircle,
  Plus
} from 'lucide-react';
import { ReelVideo } from '../types';
import { formatEmbedUrl } from '../utils/reels';

interface ReelsVideoCardProps {
  reel: ReelVideo;
  index: number;
  totalCount: number;
  isActive: boolean;
  isPlaying: boolean;
  watchProgress: number;
  isLiked: boolean;
  isClaimed: boolean;
  fitMode: 'contain' | 'cover';
  isAdmin?: boolean;
  language?: 'tl' | 'en';
  onTogglePlay: () => void;
  onToggleFitMode: () => void;
  onLike: (id: string, e?: React.MouseEvent) => void;
  onClaimReward: (id: string) => void;
  onDelete?: (id: string) => void;
  onOpenUploadModal?: () => void;
  triggerNotification?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ReelsVideoCard: React.FC<ReelsVideoCardProps> = ({
  reel,
  index,
  totalCount,
  isActive,
  isPlaying,
  watchProgress,
  isLiked,
  isClaimed,
  fitMode,
  isAdmin = false,
  language = 'tl',
  onTogglePlay,
  onToggleFitMode,
  onLike,
  onClaimReward,
  onDelete,
  onOpenUploadModal,
  triggerNotification
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [expandedDesc, setExpandedDesc] = useState<boolean>(false);
  const [showHeartBurst, setShowHeartBurst] = useState<boolean>(false);
  const [heartBurstPos, setHeartBurstPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const lastTapRef = useRef<number>(0);

  // Sync HTML5 video play/pause
  useEffect(() => {
    if (videoRef.current && isActive) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, isActive]);

  // Handle double tap for heart burst + like
  const handleCardTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (now - lastTapRef.current < 300) {
      // Double tap detected -> trigger heart burst & like
      setHeartBurstPos({ x, y });
      setShowHeartBurst(true);
      if (!isLiked) {
        onLike(reel.id, e);
      }
      setTimeout(() => setShowHeartBurst(false), 800);
    } else {
      // Single tap -> toggle play/pause
      onTogglePlay();
    }
    lastTapRef.current = now;
  };

  const formatted = formatEmbedUrl(reel.embedUrl || reel.url || '');
  const isDirectVideo = formatted.platform === 'direct' && (
    formatted.embedUrl.match(/\.(mp4|webm|mov|ogg)($|\?)/i) || 
    reel.url?.match(/\.(mp4|webm|mov|ogg)($|\?)/i)
  );

  const radius = 18;
  const circumference = 2 * Math.PI * radius; // ~113.1
  const effectiveProgress = isClaimed ? 100 : (isActive ? watchProgress : 0);
  const strokeDashoffset = circumference - (circumference * effectiveProgress) / 100;

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const platformBadge = () => {
    if (reel.platform === 'tiktok') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-black/80 text-cyan-300 border border-cyan-400/40">🎵 TikTok</span>;
    }
    if (reel.platform === 'facebook') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-900/80 text-blue-200 border border-blue-400/40">📘 FB Reel</span>;
    }
    if (reel.platform === 'youtube') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-950/80 text-rose-200 border border-rose-500/40">▶️ YT Short</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-800/80 text-slate-200 border border-slate-700">📹 Video</span>;
  };

  return (
    <div className="relative w-full h-[100dvh] snap-start snap-always shrink-0 overflow-hidden bg-black flex flex-col justify-between select-none">
      
      {/* ================= BACKGROUND VIDEO PLAYER AREA ================= */}
      <div 
        onClick={handleCardTap}
        className="absolute inset-0 z-0 bg-black cursor-pointer flex items-center justify-center overflow-hidden"
      >
        {/* Ambient Blurred Glow Backdrop */}
        <div 
          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-125 transition duration-700 pointer-events-none"
          style={{ backgroundImage: `url(${reel.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'})` }}
        />

        {/* Video / Iframe Rendering */}
        {isActive ? (
          isDirectVideo ? (
            <video
              ref={videoRef}
              src={formatted.embedUrl || reel.url}
              playsInline
              loop
              autoPlay={isPlaying}
              className={`relative z-10 w-full max-w-full transition-all duration-300 ${
                fitMode === 'contain'
                  ? 'aspect-video object-contain drop-shadow-[0_10px_35px_rgba(0,0,0,0.85)] max-h-[85vh]'
                  : 'h-full object-cover'
              }`}
              onPlay={() => {}}
              onPause={() => {}}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration && v.duration > 0) {
                  const pct = Math.min(100, Math.floor((v.currentTime / v.duration) * 100));
                  if (pct >= 100) {
                    onClaimReward(reel.id);
                  }
                }
              }}
              onEnded={() => onClaimReward(reel.id)}
            />
          ) : (
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <iframe
                src={
                  formatted.platform === 'youtube'
                    ? (formatted.embedUrl.includes('?') 
                        ? `${formatted.embedUrl}&autoplay=${isPlaying ? 1 : 0}` 
                        : `${formatted.embedUrl}?autoplay=${isPlaying ? 1 : 0}`)
                    : formatted.embedUrl
                }
                title={reel.title || `Reel Video ${index + 1}`}
                className={`w-full h-full border-0 bg-slate-950 transition-all duration-300 ${
                  fitMode === 'contain' ? 'max-h-[85vh] object-contain' : 'object-cover'
                }`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          )
        ) : (
          /* INACTIVE CARD PLACEHOLDER: stops audio/video execution while offscreen */
          <div className="relative z-10 w-full h-full bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-600/30 border border-rose-500/50 flex items-center justify-center text-rose-300 shadow-2xl mb-3">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
            <span className="text-sm font-black text-white uppercase tracking-wider">
              Reel #{index + 1}
            </span>
            <p className="text-xs text-slate-400 mt-1 max-w-xs line-clamp-1">
              {reel.title || 'I-scroll para i-play'}
            </p>
          </div>
        )}

        {/* Center Pause Indicator Overlay */}
        {!isPlaying && isActive && !isClaimed && (
          <div className="absolute z-20 w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white pointer-events-none transition scale-110 shadow-[0_0_30px_rgba(244,63,94,0.6)]">
            <Play className="w-8 h-8 fill-current ml-1 text-rose-400" />
          </div>
        )}

        {/* Double Tap Heart Burst Animation */}
        {showHeartBurst && (
          <div 
            className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2 transition transform animate-ping duration-700"
            style={{ left: `${heartBurstPos.x}%`, top: `${heartBurstPos.y}%` }}
          >
            <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.9)]" />
          </div>
        )}

        {/* Top and Bottom Gradients for readable text */}
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none z-10" />
      </div>

      {/* Top Spacer to prevent header overlap */}
      <div className="h-16 w-full pointer-events-none" />

      {/* ================= FLOATING RED POCKET WATCH REWARD PROGRESS PILL (Top-Left) ================= */}
      <div className="absolute top-16 left-3 z-30 pointer-events-auto">
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (!isPlaying && !isClaimed) onTogglePlay();
          }}
          className={`flex items-center gap-2 p-1.5 pr-3 rounded-full backdrop-blur-md border transition cursor-pointer shadow-xl ${
            isClaimed
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              : 'bg-black/60 border-amber-500/50 text-amber-300 hover:bg-black/80'
          }`}
        >
          {/* Circular Countdown Ring */}
          <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
            <svg className="w-8 h-8 -rotate-90 transform">
              <circle
                cx="16"
                cy="16"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="3"
                fill="transparent"
              />
              <circle
                cx="16"
                cy="16"
                r={radius}
                className={isClaimed ? 'stroke-emerald-400' : 'stroke-amber-400'}
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{ transition: 'stroke-dashoffset 0.2s linear' }}
              />
            </svg>
            <div className={`absolute inset-0 m-auto w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-inner ${
              isClaimed ? 'bg-emerald-600 text-white' : 'bg-red-600 text-amber-200 animate-pulse'
            }`}>
              {isClaimed ? '✓' : '🧧'}
            </div>
          </div>

          {/* Progress Label */}
          <div className="flex flex-col text-left">
            <span className="text-[8px] font-black uppercase tracking-wider leading-none">
              {isClaimed ? 'RED POCKET CLAIMED' : 'RED POCKET REWARD'}
            </span>
            <span className="text-[11px] font-black text-white leading-tight flex items-center gap-1 mt-0.5">
              {isClaimed ? (
                <span className="text-emerald-400 font-extrabold text-[10px]">
                  100% DONE (+₱0.10)
                </span>
              ) : (
                <>
                  <span className="text-amber-400">{effectiveProgress}%</span>
                  <span className="text-[9px] text-slate-300 font-semibold">
                    {isActive ? (isPlaying ? '▶️ Nanonood...' : '⏸️ Tap to Watch') : '0%'}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ================= RIGHT SIDEBAR ACTION BUTTONS (TikTok Style) ================= */}
      <aside className="absolute right-3.5 bottom-24 z-30 flex flex-col items-center gap-3.5 pointer-events-auto">
        
        {/* Creator / Channel Avatar with '+' Upload / Follow Badge */}
        <div className="relative group">
          <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 shadow-xl overflow-hidden">
            <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-white font-black text-sm">
              {reel.addedBy ? reel.addedBy.charAt(0).toUpperCase() : 'Z'}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenUploadModal) onOpenUploadModal();
            }}
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-lg transition duration-200 active:scale-75 cursor-pointer"
            title="Mag-upload ng Reels (0.50 Tokens)"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>

        {/* 1. Heart / Like Button (+₱0.05 Reward) */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => onLike(reel.id, e)}
            className="p-1.5 active:scale-125 transition duration-200 cursor-pointer select-none"
            title="I-like ang Reel (+₱0.05 Reward)"
          >
            <Heart 
              className={`w-8 h-8 drop-shadow-md transition duration-200 ${
                isLiked 
                  ? 'text-rose-500 fill-rose-500 scale-110' 
                  : 'text-white fill-black/30 hover:text-rose-400'
              }`} 
            />
          </button>
          <span className="text-[11px] font-extrabold text-white drop-shadow">
            {formatNumber(reel.likes)}
          </span>
        </div>

        {/* 2. Red Pocket Reward Button (+₱0.10) */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay();
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition duration-200 cursor-pointer shadow-lg ${
              isClaimed
                ? 'bg-emerald-600/90 text-white border border-emerald-400'
                : 'bg-gradient-to-tr from-red-600 to-amber-500 text-amber-200 border border-amber-300 animate-pulse'
            }`}
            title={isClaimed ? 'Nakuha na ang ₱0.10 Red Pocket' : 'Panoorin hanggang 100% para sa ₱0.10'}
          >
            <span className="text-sm">{isClaimed ? '✓' : '🧧'}</span>
          </button>
          <span className="text-[10px] font-black text-amber-300 drop-shadow">
            {isClaimed ? '₱0.10' : `${effectiveProgress}%`}
          </span>
        </div>

        {/* 3. Share Button */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (navigator.share) {
                navigator.share({
                  title: reel.title || 'Panoorin ang Reel sa Z-oneApp',
                  text: 'Panoorin ang viral video na ito at kumita sa GCash!',
                  url: window.location.href,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                if (triggerNotification) {
                  triggerNotification('📋 Na-kopya na ang link ng Reel sa clipboard!', 'success');
                }
              }
            }}
            className="p-1.5 active:scale-125 transition duration-200 hover:text-cyan-400 cursor-pointer"
            title="I-share ang Reel"
          >
            <Share2 className="w-7 h-7 text-white fill-black/30 drop-shadow-md" />
          </button>
          <span className="text-[11px] font-extrabold text-white drop-shadow">Share</span>
        </div>

        {/* 4. Original Source Link */}
        <div className="flex flex-col items-center gap-0.5">
          <a
            href={reel.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 active:scale-125 transition duration-200 text-white/90 hover:text-indigo-300"
            title="Buksan ang original source link"
          >
            <ExternalLink className="w-6 h-6 drop-shadow-md" />
          </a>
          <span className="text-[9px] font-bold text-slate-300">Link</span>
        </div>

        {/* 5. Fit / Fill Screen Mode Toggle */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFitMode();
            }}
            className="p-1.5 active:scale-125 transition duration-200 text-white/90 hover:text-amber-300 cursor-pointer"
            title={fitMode === 'contain' ? 'Widescreen Fit - I-click para i-Zoom Fill' : 'Zoom Fill - I-click para Makita Lahat'}
          >
            <Maximize2 className={`w-6 h-6 drop-shadow-md ${fitMode === 'contain' ? 'text-amber-400' : 'text-white'}`} />
          </button>
          <span className="text-[9px] font-bold text-slate-300">
            {fitMode === 'contain' ? 'Fit' : 'Fill'}
          </span>
        </div>

        {/* 6. Admin Delete Option */}
        {isAdmin && onDelete && (
          <div className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(reel.id);
              }}
              className="p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-full transition cursor-pointer shadow-md"
              title="Delete Reel (Admin)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 7. Spinning Music Record / Vinyl Disc */}
        <div className="pt-1">
          <div className={`w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center shadow-2xl ${isPlaying && isActive ? 'animate-spin' : ''} [animation-duration:4s]`}>
            <div className="w-4 h-4 rounded-full overflow-hidden bg-rose-600 flex items-center justify-center">
              <span className="text-[8px] font-black text-white">Z</span>
            </div>
          </div>
        </div>

      </aside>

      {/* ================= BOTTOM INFO OVERLAY & METADATA (TikTok Style) ================= */}
      <div className="relative z-30 flex flex-col justify-end w-full pb-3 pointer-events-auto">
        
        {/* Creator Info & Description */}
        <div className="px-4 pb-2 space-y-1.5 max-w-[80%]">
          
          {/* Creator / Channel & Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm sm:text-base font-extrabold text-white drop-shadow-md tracking-tight flex items-center gap-1.5">
              <span>@{reel.addedBy || 'Z-oneReels'}</span>
              <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-black">
                ✓
              </span>
            </h2>
            {platformBadge()}
            <span className="text-[9px] font-bold text-slate-300 bg-white/10 px-1.5 py-0.5 rounded-md backdrop-blur-xs">
              #{index + 1}/{totalCount}
            </span>
          </div>

          {/* Title & Expandable Description */}
          {reel.title && (
            <div className="text-xs sm:text-sm text-slate-100 font-medium leading-snug drop-shadow">
              <p className={`${expandedDesc ? '' : 'line-clamp-2'}`}>
                <span className="font-bold text-white mr-1.5">{reel.title}</span>
              </p>
              {reel.title.length > 50 && (
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
          )}

          {/* Hashtags */}
          <div className="flex flex-wrap gap-1 text-[11px] font-bold text-amber-300 drop-shadow">
            <span className="hover:underline">#Z-oneReels</span>
            <span className="hover:underline">#WatchAndEarn</span>
            <span className="hover:underline">#GCashProfit</span>
            <span className="hover:underline">#Shorts</span>
          </div>

          {/* Sound / Music Ticker at bottom */}
          <div className="flex items-center gap-2 text-xs text-white/90 font-semibold pt-0.5">
            <Music className="w-3.5 h-3.5 shrink-0 text-amber-400 animate-bounce" />
            <div className="overflow-hidden whitespace-nowrap w-full">
              <p className="inline-block animate-marquee font-medium text-[11px]">
                {reel.title ? `${reel.title} • Original Sound & Audio` : 'Z-oneApp Reels Viral Sound • Trending Audio'}
              </p>
            </div>
          </div>

        </div>

        {/* ================= BOTTOM QUICK ACTION BAR ================= */}
        <div className="px-3 pt-1 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenUploadModal) onOpenUploadModal();
            }}
            className="w-full bg-black/60 backdrop-blur-md border border-white/15 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-slate-300 hover:bg-black/80 transition cursor-pointer shadow-lg"
          >
            <div className="flex items-center gap-2 truncate">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                {language === 'tl' ? 'Mag-upload ng Reels (0.50 Tokens) • Kumita sa Views' : 'Upload Reels • Earn from Views & Likes'}
              </span>
            </div>
            <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30 shrink-0 ml-1">
              Upload
            </span>
          </button>
        </div>

      </div>

    </div>
  );
};
