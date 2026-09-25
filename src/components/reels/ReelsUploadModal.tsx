import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  X, 
  Upload, 
  Coins, 
  Activity, 
  Ticket, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Copy, 
  Check, 
  Globe, 
  Tag, 
  ShoppingBag, 
  Users, 
  Eye, 
  Plus, 
  Trash2,
  FileVideo,
  Play
} from 'lucide-react';
import { ReelVideo, ReelRedemption, SocialProductRef } from '../../types';
import { formatEmbedUrl, calculateReelRevenue, AUDIENCE_CPM_RATES, AudienceCountry } from '../../utils/reels';

interface ReelsUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  isAdmin?: boolean;
  currentUserId?: string;
  currentUserName?: string;
  userTokens?: number;
  onUploadSuccess?: (newReel: ReelVideo) => void;
  triggerNotification?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ReelsUploadModal: React.FC<ReelsUploadModalProps> = ({
  isOpen,
  onClose,
  token = '',
  isAdmin = false,
  currentUserId,
  currentUserName,
  userTokens = 0,
  onUploadSuccess,
  triggerNotification
}) => {
  const authToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
  const [activeUploadTab, setActiveUploadTab] = useState<'upload' | 'buy_tokens' | 'activity'>('upload');
  const [localTokens, setLocalTokens] = useState<number>(userTokens);

  // Upload Form States
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string>('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isUploadingUserReel, setIsUploadingUserReel] = useState(false);

  // Community Integration States
  const [communities, setCommunities] = useState<Array<{ id: string; name: string; privacy?: string }>>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>('');

  // Product Tagging States (Max 3)
  const [availableProducts, setAvailableProducts] = useState<SocialProductRef[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SocialProductRef[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);

  // Buy Tokens State
  const [gcashRefNo, setGcashRefNo] = useState('');
  const [isSubmittingTokenSub, setIsSubmittingTokenSub] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);

  // User Activity & Profit States
  const [myReelsList, setMyReelsList] = useState<ReelVideo[]>([]);
  const [myRedemptionsList, setMyRedemptionsList] = useState<ReelRedemption[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isRedeemingProfit, setIsRedeemingProfit] = useState(false);
  const [reelCountries, setReelCountries] = useState<Record<string, AudienceCountry>>({});

  useEffect(() => {
    setLocalTokens(userTokens);
  }, [userTokens]);

  // Fetch joined communities and products on modal mount
  useEffect(() => {
    if (!isOpen) return;

    // Fetch communities
    fetch('/api/zone/communities', {
      headers: { ...(authToken ? { 'Authorization': authToken } : {}) }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.communities)) {
          setCommunities(data.communities);
        }
      })
      .catch(() => {});

    // Fetch products
    fetch('/api/shop/products')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.products)) {
          setAvailableProducts(data.products);
        }
      })
      .catch(() => {});
  }, [isOpen, authToken]);

  // Fetch user activity when activity tab is active
  const fetchUserReelsActivity = async () => {
    if (!currentUserId) return;
    setIsLoadingActivity(true);
    try {
      const res = await fetch(`/api/reels/my-activity?userId=${currentUserId}`, {
        headers: { ...(authToken ? { 'Authorization': authToken } : {}) }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMyReelsList(data.myReels || []);
        setMyRedemptionsList(data.myRedemptions || []);
      }
    } catch (e) {
      console.error('Failed to load user reels activity:', e);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeUploadTab === 'activity') {
      fetchUserReelsActivity();
    }
  }, [isOpen, activeUploadTab]);

  // Handle direct file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 50MB
    if (file.size > 50 * 1024 * 1024) {
      if (triggerNotification) triggerNotification('Masyadong malaki ang video file. Hanggang 50MB lamang.', 'error');
      return;
    }

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setFilePreviewUrl(localUrl);
  };

  // Upload file to Cloudflare R2 / Server storage
  const uploadVideoFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const res = await fetch('/api/zone/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken ? { 'Authorization': authToken } : {})
            },
            body: JSON.stringify({
              dataUrl,
              category: 'reels',
              entityId: currentUserId || 'reels-uploader'
            })
          });
          const data = await res.json();
          if (res.ok && data.url) {
            resolve(data.url);
          } else {
            reject(new Error(data.error || 'Upload failed'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Add product to tag list (Max 3)
  const handleAddProduct = (prod: SocialProductRef) => {
    if (selectedProducts.some(p => p.id === prod.id)) {
      if (triggerNotification) triggerNotification('Nai-tag na ang produktong ito.', 'info');
      return;
    }
    if (selectedProducts.length >= 3) {
      if (triggerNotification) triggerNotification('Hanggang 3 produkto lamang ang maaaring i-tag.', 'error');
      return;
    }
    setSelectedProducts(prev => [...prev, prod]);
    setShowProductPicker(false);
  };

  const handleRemoveProduct = (prodId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== prodId));
  };

  // Submit Reel
  const handleSubmitReel = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalVideoUrl = uploadUrl.trim();

    // If uploading via file mode, first upload the file
    if (uploadMode === 'file') {
      if (!selectedFile) {
        if (triggerNotification) triggerNotification('Pumili ng video file na ia-upload.', 'error');
        return;
      }
      setIsUploadingFile(true);
      try {
        finalVideoUrl = await uploadVideoFile(selectedFile);
      } catch (err: any) {
        setIsUploadingFile(false);
        if (triggerNotification) triggerNotification(err?.message || 'Bigo ang pag-upload ng video file.', 'error');
        return;
      }
      setIsUploadingFile(false);
    }

    if (!finalVideoUrl) {
      if (triggerNotification) triggerNotification('Kailangan ilagay ang Video URL o pumili ng file.', 'error');
      return;
    }

    const { embedUrl: autoEmbedUrl, platform: autoPlatform } = formatEmbedUrl(finalVideoUrl);

    setIsUploadingUserReel(true);
    try {
      const res = await fetch('/api/reels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': authToken } : {})
        },
        body: JSON.stringify({
          url: finalVideoUrl,
          embedUrl: autoEmbedUrl,
          platform: autoPlatform,
          title: uploadTitle.trim() || undefined,
          description: uploadDesc.trim() || undefined,
          thumbnailUrl: thumbnailUrl.trim() || undefined,
          communityId: selectedCommunityId || undefined,
          productRefs: selectedProducts.length > 0 ? selectedProducts : undefined,
          productRef: selectedProducts.length > 0 ? selectedProducts[0] : undefined,
          addedBy: currentUserName || 'Creator'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (triggerNotification) {
          triggerNotification(data.message || 'Matagumpay na naisumite ang iyong Reel!', 'success');
        }
        setUploadUrl('');
        setUploadTitle('');
        setUploadDesc('');
        setThumbnailUrl('');
        setSelectedFile(null);
        setFilePreviewUrl('');
        setSelectedProducts([]);
        setSelectedCommunityId('');

        if (onUploadSuccess && data.reel) {
          onUploadSuccess(data.reel);
        }
        onClose();
      } else {
        if (triggerNotification) {
          triggerNotification(data.error || 'Bigo ang pagsusumite ng Reel.', 'error');
        }
      }
    } catch (e: any) {
      if (triggerNotification) triggerNotification('Network error sa pag-upload.', 'error');
    } finally {
      setIsUploadingUserReel(false);
    }
  };

  // Submit Token Subscription
  const handleBuyTokensSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gcashRefNo.trim()) {
      if (triggerNotification) triggerNotification('Ilagay ang GCash Reference Number.', 'error');
      return;
    }

    setIsSubmittingTokenSub(true);
    try {
      const res = await fetch('/api/reels/token-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': authToken } : {})
        },
        body: JSON.stringify({
          gcashRefNo: gcashRefNo.trim(),
          userId: currentUserId,
          userName: currentUserName
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (triggerNotification) {
          triggerNotification(data.message || 'Naisumite ang Token Subscription request!', 'success');
        }
        setGcashRefNo('');
        setActiveUploadTab('activity');
        fetchUserReelsActivity();
      } else {
        if (triggerNotification) {
          triggerNotification(data.error || 'Bigo ang pag-submit.', 'error');
        }
      }
    } catch (e) {
      if (triggerNotification) triggerNotification('Network error.', 'error');
    } finally {
      setIsSubmittingTokenSub(false);
    }
  };

  // Redeem profit (min ₱300)
  const handleRedeemProfit = async (amountToRedeem: number) => {
    if (!currentUserId) {
      if (triggerNotification) triggerNotification('Kailangan mag-login muna bago makapag-redeem.', 'error');
      return;
    }
    if (amountToRedeem < 300) {
      if (triggerNotification) triggerNotification('Kailangan ng minimum ₱300.00 profit bago makapag-redeem.', 'error');
      return;
    }

    setIsRedeemingProfit(true);
    try {
      const res = await fetch('/api/reels/redeem-profit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': authToken } : {})
        },
        body: JSON.stringify({ amount: amountToRedeem })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (triggerNotification) {
          triggerNotification(data.message || 'Matagumpay na na-redeem ang profit sa iyong balance!', 'success');
        }
        fetchUserReelsActivity();
      } else {
        if (triggerNotification) {
          triggerNotification(data.error || 'Bigo ang pag-redeem.', 'error');
        }
      }
    } catch (e) {
      if (triggerNotification) triggerNotification('Network error sa pag-redeem.', 'error');
    } finally {
      setIsRedeemingProfit(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 shadow-2xl text-slate-100 space-y-4">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-rose-500 to-amber-500 rounded-2xl text-white shadow-md">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white tracking-tight">
                Upload Reels 2.0 & Shorts
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold">
                Mag-promote na may Community Tagging at Z-oneShop Products!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOKEN BALANCE & BENEFIT BANNER */}
        <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-rose-950/80 border border-indigo-500/30 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-slate-300 flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-amber-400" />
              <span>Kasalukuyang Balance:</span>
            </span>
            <span className="font-black text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30 text-xs">
              🎟️ {localTokens.toFixed(2)} Tokens ({Math.floor(localTokens / 0.5)} Reels)
            </span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-[10px] space-y-1 text-slate-300">
            <div className="font-black text-rose-400 flex items-center gap-1.5 text-[11px]">
              <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
              <span>Reels 2.0 Bagong Benepisyo:</span>
            </div>
            <ul className="space-y-0.5 list-disc list-inside text-slate-300">
              <li>Mura: 20 Reels sa <strong className="text-white">₱10.00 Pesos</strong> lamang (0.50 tokens/reel).</li>
              <li>Walang bawas kapag <strong className="text-rose-300">disapproved</strong> ng Admin.</li>
              <li>Maaaring mag-tag ng hanggang <strong className="text-amber-300">3 Z-oneShop Products</strong> para sa affiliate attribution!</li>
            </ul>
          </div>
        </div>

        {/* TAB SELECTOR */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-black gap-1">
          <button
            type="button"
            onClick={() => setActiveUploadTab('upload')}
            className={`flex-1 py-2 px-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
              activeUploadTab === 'upload'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Upload</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveUploadTab('buy_tokens')}
            className={`flex-1 py-2 px-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
              activeUploadTab === 'buy_tokens'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="truncate">Buy Tokens</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveUploadTab('activity');
              fetchUserReelsActivity();
            }}
            className={`flex-1 py-2 px-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
              activeUploadTab === 'activity'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
            <span className="truncate">Activity & Profit</span>
          </button>
        </div>

        {/* TAB 1: UPLOAD REEL */}
        {activeUploadTab === 'upload' && (
          <form onSubmit={handleSubmitReel} className="space-y-3.5 pt-1">
            {!isAdmin && localTokens < 0.50 && (
              <div className="bg-rose-950/60 border border-rose-500/40 p-3 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-black">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Kailangan ng Tokens Para Makapag-upload!</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Ang balance mo ay <strong>{localTokens.toFixed(2)} Tokens</strong>. Kailangan ng hindi bababa sa <strong>0.50 Tokens</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveUploadTab('buy_tokens')}
                  className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition shadow-md cursor-pointer"
                >
                  🪙 Bumili ng 10 Tokens (20 Reels) sa ₱10.00 GCash
                </button>
              </div>
            )}

            {/* Upload Method Selector (URL vs Direct File) */}
            <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  uploadMode === 'url' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                🔗 Video URL (TikTok, FB, YouTube)
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  uploadMode === 'file' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                📁 Direct File Upload (MP4 / WebM)
              </button>
            </div>

            {/* Video Input */}
            {uploadMode === 'url' ? (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Video URL (Facebook Reels, TikTok, YouTube Shorts, o Direct MP4) *
                </label>
                <input
                  type="url"
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/@user/video/... o https://youtube.com/shorts/..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Pumili ng Video File (MP4 o WebM, Max 50MB) *
                </label>
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-rose-600 file:text-white hover:file:bg-rose-500 cursor-pointer bg-slate-950 border border-slate-800 rounded-xl p-1"
                />
                {filePreviewUrl && (
                  <div className="mt-2 relative rounded-xl overflow-hidden bg-black border border-slate-800 aspect-video max-h-32 flex items-center justify-center">
                    <video src={filePreviewUrl} controls className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Pamagat / Caption (Pwedeng lagyan ng #hashtags)
              </label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Hal. Grabe ang sarap ng pagkain! #viral #fyp #foodie"
                maxLength={120}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>

            {/* Description (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Deskripsyon (Optional)
              </label>
              <textarea
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                placeholder="Karagdagang detalye tungkol sa video..."
                rows={2}
                maxLength={300}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none resize-none"
              />
            </div>

            {/* Community Selector (Phase 2B Integration) */}
            {communities.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>I-tag sa Community (Optional)</span>
                </label>
                <select
                  value={selectedCommunityId}
                  onChange={(e) => setSelectedCommunityId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="">-- Walang Community (Public Reel) --</option>
                  {communities.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.privacy === 'private' ? '🔒 (Private)' : '🌐 (Public)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Product Tagging (Z-oneShop Integration, Max 3) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Z-oneShop Tagged Products ({selectedProducts.length}/3)</span>
                </label>
                {selectedProducts.length < 3 && (
                  <button
                    type="button"
                    onClick={() => setShowProductPicker(prev => !prev)}
                    className="text-[11px] font-black text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Mag-tag ng Produkto
                  </button>
                )}
              </div>

              {/* Tagged Products Preview */}
              {selectedProducts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {selectedProducts.map(p => (
                    <div key={p.id} className="bg-slate-950 border border-amber-400/30 rounded-xl p-2 flex items-center gap-2 relative group">
                      <img src={p.image || '/placeholder-product.png'} alt={p.name} className="w-8 h-8 rounded-lg object-cover bg-slate-800 shrink-0" />
                      <div className="flex-1 min-w-0 text-[10px]">
                        <p className="font-bold text-white truncate">{p.name}</p>
                        <p className="font-black text-emerald-400">₱{p.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(p.id)}
                        className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                        title="Alisin ang produktong ito"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Product Picker Dropdown */}
              {showProductPicker && (
                <div className="bg-slate-950 border border-slate-700 rounded-2xl p-2.5 space-y-2 animate-fadeIn max-h-48 overflow-y-auto">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Maghanap ng produkto sa Z-oneShop..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                  <div className="space-y-1">
                    {availableProducts
                      .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
                      .slice(0, 10)
                      .map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleAddProduct(p)}
                          className="flex items-center justify-between p-1.5 hover:bg-slate-850 rounded-lg cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={p.image} alt={p.name} className="w-7 h-7 rounded object-cover" />
                            <span className="truncate text-slate-200 font-bold">{p.name}</span>
                          </div>
                          <span className="font-black text-emerald-400 shrink-0">₱{p.price}</span>
                        </div>
                      ))}
                    {availableProducts.length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center py-2">Walang produktong nahanap.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail URL (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Custom Thumbnail Image URL (Optional)
              </label>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://... image link para sa video cover"
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isUploadingFile || isUploadingUserReel || (!isAdmin && localTokens < 0.50)}
              className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl text-xs shadow-lg transition duration-150 cursor-pointer flex items-center justify-center gap-2"
            >
              {isUploadingFile ? (
                <span>⏳ Ina-upload ang video file sa Cloud Storage...</span>
              ) : isUploadingUserReel ? (
                <span>⏳ Nagsusumite ng Reel...</span>
              ) : (
                <span>🚀 Isumite ang Reel {isAdmin ? '(Admin Auto-Approved)' : '(Review ng Admin - 0.50 Tokens)'}</span>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: BUY TOKENS */}
        {activeUploadTab === 'buy_tokens' && (
          <form onSubmit={handleBuyTokensSubmit} className="space-y-3.5 pt-1">
            <div className="bg-slate-950 border border-amber-500/40 p-3.5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300">🎟️ Package: 20 Reels & Shorts</span>
                <span className="text-xs font-black text-white bg-amber-600 px-2 py-0.5 rounded-md">₱10.00 GCash</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Magpadala ng <strong>₱10.00 Pesos</strong> sa GCash number sa ibaba upang makatanggap ng <strong>10 Tokens</strong> (katumbas ng 20 Reels upload).
              </p>

              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">GCash Official Number:</span>
                  <span className="text-xs font-black text-white tracking-wider">09914089646</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('09914089646');
                    setCopiedNumber(true);
                    setTimeout(() => setCopiedNumber(false), 2000);
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  {copiedNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedNumber ? 'Kopya!' : 'Kopyahin'}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  GCash Reference Number (Pagkatapos magbayad) *
                </label>
                <input
                  type="text"
                  value={gcashRefNo}
                  onChange={(e) => setGcashRefNo(e.target.value)}
                  placeholder="Ilagay ang 13-digit Reference No. dito"
                  required
                  className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingTokenSub}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black rounded-2xl text-xs shadow-lg transition duration-150 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmittingTokenSub ? <span>⏳ Nagsusumite...</span> : <span>I-submit ang GCash Reference No.</span>}
            </button>
          </form>
        )}

        {/* TAB 3: ACTIVITY & PROFIT */}
        {activeUploadTab === 'activity' && (
          <div className="space-y-4 pt-1">
            {(() => {
              const approvedReels = myReelsList.filter(r => r.status === 'approved' || !r.status);
              const totalViews = approvedReels.reduce((acc, r) => acc + (r.watchedBy?.length || r.views || 0), 0);
              
              let totalGrossRevenue = 0;
              approvedReels.forEach(r => {
                const country = reelCountries[r.id] || r.audienceCountry || 'Philippines';
                const views = r.watchedBy?.length || r.views || 0;
                const rev = calculateReelRevenue(views, r.likes || 0, country);
                totalGrossRevenue += rev.revenue;
              });

              const totalRedeemed = myRedemptionsList
                .reduce((acc, red) => acc + (red.amount || 0), 0);
              
              const currentAvailableProfit = Math.max(0, totalGrossRevenue - totalRedeemed);
              const canRedeem = currentAvailableProfit >= 300;

              return (
                <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold">Total Approved Reels:</span>
                    <span className="font-black text-white">{approvedReels.length} Reels</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold">Kabuuang Views:</span>
                    <span className="font-black text-cyan-300">{totalViews.toLocaleString()} views</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-t border-slate-800 pt-2">
                    <span className="text-slate-300 font-bold">Available Redeemable Profit:</span>
                    <span className="text-sm font-black text-emerald-400">₱{currentAvailableProfit.toFixed(2)}</span>
                  </div>

                  {canRedeem ? (
                    <button
                      type="button"
                      disabled={isRedeemingProfit}
                      onClick={() => handleRedeemProfit(Math.floor(currentAvailableProfit))}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-xs shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isRedeemingProfit ? '⏳ Pinoproseso...' : `💰 I-redeem ang ₱${Math.floor(currentAvailableProfit).toFixed(2)} sa Balance`}
                    </button>
                  ) : (
                    <div className="text-[10px] text-amber-300/90 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 text-center">
                      Minimum ₱300.00 profit bago makapag-redeem sa Main Balance (₱{(300 - currentAvailableProfit).toFixed(2)} pa ang kailangan).
                    </div>
                  )}
                </div>
              );
            })()}

            {/* List of user's reels */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-300">Mga Naka-upload na Reels ({myReelsList.length})</h4>
              {isLoadingActivity ? (
                <p className="text-xs text-slate-500 text-center py-4">Naglo-load ng activity...</p>
              ) : myReelsList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Wala ka pang na-upload na Reels.</p>
              ) : (
                myReelsList.map(reel => (
                  <div key={reel.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-white truncate max-w-[200px]">{reel.title || 'Reel Video'}</span>
                      {reel.status === 'approved' ? (
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </span>
                      ) : reel.status === 'disapproved' ? (
                        <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Disapproved
                        </span>
                      ) : (
                        <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Under Review
                        </span>
                      )}
                    </div>
                    {reel.communityName && (
                      <div className="text-[10px] text-indigo-400 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Community: {reel.communityName}
                      </div>
                    )}
                    {reel.productRefs && reel.productRefs.length > 0 && (
                      <div className="text-[10px] text-amber-400 flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" /> {reel.productRefs.length} Tagged Products
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
