import React, { useState } from 'react';
import { Play, ExternalLink, Share2, Film, ShieldCheck, Check } from 'lucide-react';
import { BilibiliFeedItem } from '../types';

interface BilibiliCardProps {
  item: BilibiliFeedItem;
  onPreview: (item: BilibiliFeedItem) => void;
  language: 'en' | 'tl';
  onNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const BilibiliCard: React.FC<BilibiliCardProps> = ({
  item,
  onPreview,
  language,
  onNotification
}) => {
  const [copied, setCopied] = useState(false);

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
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition-all duration-200 hover:shadow-md hover:border-slate-300">
      {/* 🏷️ Header: Creator Attribution & BiliBili Identity */}
      <div className="p-4 flex items-center justify-between gap-3 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <a
            href={`https://www.bilibili.tv/en/space/${item.creatorId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="relative group shrink-0"
            title={`Bisitahin ang page ni ${item.creatorName} sa BiliBili`}
          >
            {item.creatorAvatar ? (
              <img
                src={item.creatorAvatar}
                alt={item.creatorName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border border-slate-200 group-hover:ring-2 group-hover:ring-pink-500 transition"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-black text-sm">
                🎬
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 bg-pink-600 text-[9px] text-white font-black px-1 rounded-full border border-white shadow-xs">
              Bili
            </span>
          </a>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <a
                href={`https://www.bilibili.tv/en/space/${item.creatorId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-extrabold text-sm text-slate-900 hover:text-pink-600 transition truncate max-w-[180px] sm:max-w-[260px]"
              >
                {item.creatorName}
              </a>
              <span className="bg-pink-50 text-pink-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-pink-200/60 inline-flex items-center gap-1 shrink-0">
                <ShieldCheck className="w-3 h-3 text-pink-600" />
                BiliBili Creator
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate">
              Public feed • bilibili.tv/en/space/{item.creatorId}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <ExternalLink className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">External</span>
          </span>
        </div>
      </div>

      {/* 🎬 Media Preview / Poster */}
      <div 
        onClick={() => onPreview(item)}
        className="relative aspect-video bg-slate-950 overflow-hidden cursor-pointer group"
      >
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
            <Film className="w-12 h-12 stroke-1" />
            <span className="text-xs font-bold">BiliBili Video</span>
          </div>
        )}

        {/* Gradient dark bottom shade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none"></div>

        {/* Duration Badge */}
        {item.duration && (
          <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-xs text-white text-[11px] font-black px-2 py-0.5 rounded-md border border-white/10 shadow-xs">
            {item.duration}
          </div>
        )}

        {/* Views Count Badge */}
        {item.views && (
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-md border border-white/10">
            {item.views}
          </div>
        )}

        {/* Center Hover Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:opacity-100 transition">
          <div className="w-14 h-14 rounded-full bg-pink-600/90 text-white flex items-center justify-center shadow-xl transform group-hover:scale-110 transition backdrop-blur-xs border-2 border-white/30">
            <Play className="w-7 h-7 fill-white translate-x-0.5" />
          </div>
        </div>
      </div>

      {/* 📝 Content Body */}
      <div className="p-4 flex flex-col gap-3">
        <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 hover:text-pink-600 transition cursor-pointer"
            onClick={() => onPreview(item)}>
          {item.title}
        </h4>

        {/* External Notice Pill */}
        <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl px-3 py-1.5 flex items-center justify-between text-[11px] text-amber-800">
          <span className="font-medium">
            {language === 'tl'
              ? 'External video mula sa BiliBili (Walang Watch & Earn reward)'
              : 'External BiliBili video (No Watch & Earn reward)'}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
            Free Stream
          </span>
        </div>

        {/* 🔘 Action Buttons */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
          <a
            href={item.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 active:scale-98 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{language === 'tl' ? 'Panoorin sa BiliBili' : 'Watch on BiliBili'}</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>

          <button
            onClick={() => onPreview(item)}
            className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
            title="Preview player modal"
          >
            <Film className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">{language === 'tl' ? 'Silipin' : 'Preview'}</span>
          </button>

          <button
            onClick={handleShare}
            className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
            title="I-share ang link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-600" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
