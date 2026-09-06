import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  MessageCircle,
  Globe,
  Sparkles
} from 'lucide-react';
import { ShopProduct } from '../types';

interface ZoneShopSocialShareModalProps {
  product: ShopProduct;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  triggerNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ZoneShopSocialShareModal: React.FC<ZoneShopSocialShareModalProps> = ({
  product,
  isOpen,
  onClose,
  currentUserId,
  triggerNotification
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Construct canonical public product URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://z-oneapp.onrender.com';
  let shareUrl = `${baseUrl}/?shopProduct=${encodeURIComponent(product.id)}`;
  if (currentUserId && currentUserId.trim()) {
    shareUrl += `&sharedBy=${encodeURIComponent(currentUserId.trim())}`;
  }

  const shareTitle = `${product.name} - Z-oneShop`;
  const shareText = `Tingnan ang "${product.name}" sa Z-oneShop sa halagang ₱${product.price.toFixed(2)}!`;

  // Native Web Share API trigger
  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        triggerNotification('Matagumpay na naibahagi ang produkto!', 'success');
        onClose();
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Web share error:', err);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      triggerNotification('📋 Nakopya ang direct link sa clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      triggerNotification('Hindi makopya ang link.', 'error');
    }
  };

  const shareOnFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const shareOnTwitter = () => {
    const twUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(twUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const shareOnWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">Ibahagi ang Produkto</h3>
              <p className="text-[11px] text-slate-400 font-medium">I-share sa social media o kopyahin ang link</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* PRODUCT CARD PREVIEW */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <img
              src={product.image}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                {product.isAffiliate ? `Affiliate (${product.platform || 'Partner'})` : product.category}
              </span>
              <h4 className="text-xs font-black text-slate-900 truncate leading-snug">{product.name}</h4>
              <p className="text-xs font-mono font-black text-indigo-700">₱{product.price.toFixed(2)}</p>
            </div>
          </div>

          {/* NATIVE WEB SHARE BUTTON (IF SUPPORTED) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-xs py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Gamitin ang System Share (Apps, Messenger, atbp.)</span>
            </button>
          )}

          {/* SOCIAL CHANNELS GRID */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <button
              type="button"
              onClick={shareOnFacebook}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                <span className="font-black text-sm">f</span>
              </div>
              <span className="text-[11px] font-bold text-slate-700 mt-1.5">Facebook</span>
            </button>

            <button
              type="button"
              onClick={shareOnTwitter}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 hover:border-slate-800 hover:bg-slate-100 transition cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                <span className="font-black text-xs">𝕏</span>
              </div>
              <span className="text-[11px] font-bold text-slate-700 mt-1.5">X / Twitter</span>
            </button>

            <button
              type="button"
              onClick={shareOnWhatsApp}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 mt-1.5">WhatsApp</span>
            </button>
          </div>

          {/* COPY LINK INPUT */}
          <div className="space-y-1.5 pt-2">
            <label className="text-[11px] font-bold text-slate-700 block">Direct Public Product Link:</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 select-all focus:outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-indigo-600 text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopya!' : 'Kopyahin'}</span>
              </button>
            </div>
            {currentUserId && (
              <p className="text-[10px] text-slate-400 font-medium">
                ✓ May kasamang referral/share attribution tag ang link.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
