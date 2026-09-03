import React, { useState, useRef } from 'react';
import { 
  Play, 
  ExternalLink, 
  AlertCircle, 
  RotateCw, 
  Film,
  Sparkles
} from 'lucide-react';

interface ChallengeVideoPlayerProps {
  mediaUrl: string;
  caption?: string;
  isTl?: boolean;
  className?: string;
  autoPlay?: boolean;
}

/**
 * Extracts TikTok numeric video ID from various TikTok URL patterns:
 * e.g. https://www.tiktok.com/@user/video/7679038956691819794?_r=1
 * e.g. https://www.tiktok.com/v/7679038956691819794.html
 */
export function getTikTokVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();

  // Pattern 1: /video/(\d+)
  const videoMatch = clean.match(/\/video\/(\d+)/i);
  if (videoMatch && videoMatch[1]) return videoMatch[1];

  // Pattern 2: /v/(\d+)
  const vMatch = clean.match(/\/v\/(\d+)/i);
  if (vMatch && vMatch[1]) return vMatch[1];

  // Pattern 3: query parameter ?v=(\d+) or &v=(\d+)
  const paramMatch = clean.match(/[?&]v=(\d+)/i);
  if (paramMatch && paramMatch[1]) return paramMatch[1];

  return null;
}

/**
 * Extracts YouTube video ID from standard YouTube URL patterns:
 * e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * e.g. https://youtu.be/dQw4w9WgXcQ
 * e.g. https://www.youtube.com/shorts/dQw4w9WgXcQ
 */
export function getYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();
  const ytMatch = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) return ytMatch[1];
  return null;
}

/**
 * Checks if a given URL is from TikTok
 */
export function isTikTokUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return /tiktok\.com/i.test(url);
}

/**
 * Checks if a given URL is from YouTube
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

export const ChallengeVideoPlayer: React.FC<ChallengeVideoPlayerProps> = ({
  mediaUrl,
  caption,
  isTl = true,
  className = '',
  autoPlay = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoading, setVideoLoading] = useState<boolean>(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);
  const [iframeError, setIframeError] = useState<boolean>(false);

  const cleanUrl = String(mediaUrl || '').trim();
  const tiktokId = isTikTokUrl(cleanUrl) ? getTikTokVideoId(cleanUrl) : null;
  const youtubeId = isYouTubeUrl(cleanUrl) ? getYouTubeVideoId(cleanUrl) : null;

  const handleRetry = () => {
    setVideoError(null);
    setVideoLoading(true);
    setIframeError(false);
    setRetryKey(prev => prev + 1);
    if (videoRef.current) {
      try {
        videoRef.current.load();
      } catch (err) {
        console.error('Retry video load error:', err);
      }
    }
  };

  // 1. TIKTOK EMBED PLAYER PATH
  if (isTikTokUrl(cleanUrl)) {
    return (
      <div className={`w-full flex flex-col items-center bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 ${className}`}>
        {tiktokId && !iframeError ? (
          <div className="w-full flex justify-center bg-black min-h-[360px] sm:min-h-[440px] relative">
            <iframe
              key={`tiktok-${tiktokId}-${retryKey}`}
              src={`https://www.tiktok.com/embed/v2/${tiktokId}`}
              title={caption || 'TikTok Video Player'}
              className="w-full max-w-[420px] h-[440px] sm:h-[480px] border-0 rounded-2xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onError={() => setIframeError(true)}
            />
          </div>
        ) : (
          <div className="p-6 text-center space-y-3 my-auto max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 via-rose-500 to-indigo-600 flex items-center justify-center mx-auto text-white shadow-lg">
              <Play className="w-7 h-7 fill-white" />
            </div>
            <div className="space-y-1">
              <h5 className="text-white font-black text-sm">
                {isTl ? 'TikTok Video Entry' : 'TikTok Video Entry'}
              </h5>
              <p className="text-slate-400 text-xs leading-relaxed">
                {isTl 
                  ? 'I-click ang button sa ibaba upang buksan at panoorin ang video nang direkta sa TikTok.'
                  : 'Click the button below to open and play the video directly on TikTok.'}
              </p>
            </div>
          </div>
        )}

        {/* Clean TikTok Action Footer */}
        <div className="w-full p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            <span>TikTok Video</span>
          </div>

          <div className="flex items-center gap-2">
            {iframeError && (
              <button
                type="button"
                onClick={handleRetry}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{isTl ? 'Subukan Muli' : 'Retry'}</span>
              </button>
            )}

            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-black flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <span>{isTl ? 'Panoorin sa TikTok' : 'Watch on TikTok'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 2. YOUTUBE EMBED PLAYER PATH
  if (youtubeId) {
    return (
      <div className={`w-full flex flex-col items-center bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 ${className}`}>
        <div className="w-full aspect-video min-h-[220px] max-h-[380px] bg-black">
          <iframe
            key={`yt-${youtubeId}-${retryKey}`}
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&autoplay=${autoPlay ? 1 : 0}`}
            title={caption || 'YouTube Video Player'}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="w-full p-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>YouTube Video</span>
          </span>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center gap-1 transition cursor-pointer"
          >
            <span>{isTl ? 'Panoorin sa YouTube' : 'Watch on YouTube'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  // 3. HTML5 DIRECT VIDEO PLAYER PATH (MP4, WebM, MOV, blob, data URLs, etc.)
  return (
    <div className={`w-full flex flex-col items-center justify-center bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative group ${className}`}>
      {/* Video element with all required handlers */}
      {!videoError ? (
        <div className="w-full relative flex items-center justify-center bg-black min-h-[200px] max-h-[420px]">
          {videoLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950/60 backdrop-blur-2xs">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] font-bold text-slate-300">
                {isTl ? 'Ikinakarga ang video...' : 'Loading video...'}
              </span>
            </div>
          )}

          <video
            ref={videoRef}
            key={`direct-video-${retryKey}`}
            src={cleanUrl}
            controls
            playsInline
            preload="metadata"
            autoPlay={autoPlay}
            onLoadedMetadata={() => {
              setVideoLoading(false);
            }}
            onCanPlay={() => {
              setVideoLoading(false);
              setVideoError(null);
            }}
            onError={() => {
              setVideoLoading(false);
              setVideoError(
                isTl 
                  ? 'Hindi ma-play ang video entry na ito. Maaaring unavailable o unsupported ang video file.'
                  : 'Unable to play this video entry. The video file may be unavailable or unsupported.'
              );
            }}
            onStalled={() => {
              // Network stalled, will resume buffering automatically
            }}
            onAbort={() => {
              setVideoLoading(false);
            }}
            onWaiting={() => {
              setVideoLoading(true);
            }}
            className="w-full max-h-[400px] object-contain"
          />
        </div>
      ) : (
        /* Clear Robust Error State */
        <div className="p-6 text-center space-y-3 my-auto max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto shadow-inner">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h5 className="text-white font-black text-sm">
              {isTl ? 'Hindi ma-play ang video entry na ito.' : 'Cannot play this video entry.'}
            </h5>
            <p className="text-slate-400 text-xs leading-relaxed">
              {videoError}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleRetry}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{isTl ? 'Subukang Muli' : 'Retry'}</span>
            </button>

            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <span>{isTl ? 'Buksan sa Bagong Tab' : 'Open in New Tab'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
