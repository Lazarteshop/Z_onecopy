import React, { useState } from 'react';
import { X, Play, ExternalLink, ShieldCheck, AlertCircle, Share2, Check } from 'lucide-react';
import { BilibiliFeedItem } from '../types';

interface BilibiliPlayerModalProps {
  item: BilibiliFeedItem | null;
  onClose: () => void;
  language: 'en' | 'tl';
  onNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const BilibiliPlayerModal: React.FC<BilibiliPlayerModalProps> = ({
  item,
  onClose,
  language,
  onNotification
}) => {
  const [copied, setCopied] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  if (!item) return null;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: `Panoorin ang "${item.title}" mula kay ${item.creatorName} sa BiliBili:`,
          url: item.videoUrl
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(item.videoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onNotification?.(
        language === 'tl' ? '📋 Nakopya ang link ng BiliBili video!' : '📋 BiliBili video link copied!',
        'success'
      );
    } catch {
      onNotification?.(item.videoUrl, 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/90 text-white">
          <div className="flex items-center gap-3 min-w-0">
            {item.creatorAvatar ? (
              <img
                src={item.creatorAvatar}
                alt={item.creatorName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border border-pink-500/50"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-pink-900 text-pink-300 flex items-center justify-center font-bold text-sm">
                🎬
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-sm text-white truncate max-w-[180px] sm:max-w-xs">
                  {item.creatorName}
                </span>
                <span className="bg-pink-950/80 text-pink-400 text-[10px] font-black px-1.5 py-0.5 rounded border border-pink-800">
                  BiliBili Creator
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Space ID: {item.creatorId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Isara"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Player or Fallback View */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {!iframeError ? (
            <iframe
              src={item.videoUrl}
              title={item.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onError={() => setIframeError(true)}
            />
          ) : (
            <div className="p-6 text-center text-white flex flex-col items-center gap-3">
              {item.thumbnailUrl && (
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover opacity-30"
                />
              )}
              <div className="relative z-10 max-w-md flex flex-col items-center gap-3">
                <AlertCircle className="w-10 h-10 text-pink-400" />
                <p className="font-extrabold text-sm sm:text-base">
                  {language === 'tl'
                    ? 'Pinoprotektahan ng BiliBili ang direct iframe playback para sa video na ito.'
                    : 'BiliBili restricts direct iframe playback for this stream.'}
                </p>
                <p className="text-xs text-slate-300">
                  {language === 'tl'
                    ? 'Pindutin ang button sa ibaba upang buksan ang opisyal na player sa BiliBili.'
                    : 'Click the button below to launch the official player on BiliBili.'}
                </p>
                <a
                  href={item.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-sm py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-lg transition"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Panoorin sa BiliBili (Opisyal)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Modal Info & Actions */}
        <div className="p-4 sm:p-5 flex flex-col gap-3 bg-slate-900 overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-black text-white text-base sm:text-lg leading-snug">
              {item.title}
            </h3>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
            {item.duration && <span>⏱️ Tagal: {item.duration}</span>}
            {item.views && <span>👁️ {item.views}</span>}
            <span>🎬 Pinagmulan: bilibili.tv</span>
          </div>

          {/* Critical Disclaimer Notice */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-slate-200">
                {language === 'tl' ? 'Opisyal na Creator Content' : 'Official Creator Content'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {language === 'tl'
                  ? 'Ito ay public feed mula sa verified creator space sa BiliBili. Hindi ito binibigyan ng Watch & Earn cash rewards.'
                  : 'This is a public feed from a verified BiliBili creator space. Watch & Earn cash rewards do not apply.'}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex items-center gap-3">
            <a
              href={item.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-extrabold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition active:scale-98"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{language === 'tl' ? 'Panoorin sa BiliBili (Opisyal)' : 'Watch on BiliBili (Official)'}</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={handleShare}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-3 px-4 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-slate-300" />}
              <span>{copied ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
