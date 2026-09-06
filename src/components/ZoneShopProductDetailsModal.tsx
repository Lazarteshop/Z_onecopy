import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  ShoppingCart,
  PlusCircle,
  MinusCircle,
  ExternalLink,
  ShieldCheck,
  Truck,
  Star,
  Sparkles,
  ShoppingBag,
  Tag,
  CheckCircle2
} from 'lucide-react';
import { ShopProduct, UserSession } from '../types';
import { ZoneShopProductGallery } from './ZoneShopProductGallery';
import { ZoneShopSocialShareModal } from './ZoneShopSocialShareModal';

interface ZoneShopProductDetailsModalProps {
  product: ShopProduct | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserSession | null;
  onAddToCart?: (product: ShopProduct, quantity: number) => void;
  onRequestLogin?: () => void;
  onRequestRegister?: () => void;
  triggerNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
  sharedByUserId?: string;
}

export const ZoneShopProductDetailsModal: React.FC<ZoneShopProductDetailsModalProps> = ({
  product,
  isOpen,
  onClose,
  currentUser,
  onAddToCart,
  onRequestLogin,
  onRequestRegister,
  triggerNotification,
  sharedByUserId
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);
  const [showFullDesc, setShowFullDesc] = useState<boolean>(false);

  // Support Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleAdd = () => {
    if (!currentUser && onRequestLogin) {
      onRequestLogin();
      return;
    }
    if (onAddToCart) {
      onAddToCart(product, quantity);
      setAddedSuccess(true);
      triggerNotification(`✓ Naidagdag ang (${quantity}) "${product.name}" sa iyong shopping cart!`, 'success');
      setTimeout(() => setAddedSuccess(false), 2500);
    }
  };

  const handleOpenAffiliateLink = () => {
    if (!product.affiliateUrl) {
      triggerNotification('Walang available na affiliate link.', 'error');
      return;
    }
    // Strict URL validation: must start with http:// or https://
    const url = product.affiliateUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      triggerNotification('Invalid affiliate destination URL.', 'error');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      id="zone-shop-product-details-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs overflow-y-auto animate-fadeIn"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* TOP HEADER */}
        <div className="p-3.5 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0 gap-2 border-b border-slate-800">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <span className="p-1.5 sm:p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
              <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-slate-400 block truncate">
                {product.isAffiliate ? `Affiliate Partner • ${product.platform || 'Partner'}` : 'Z-oneShop Catalogue'}
              </span>
              <h3 className="text-xs sm:text-sm font-black truncate text-white leading-tight">
                {product.name}
              </h3>
            </div>
          </div>
          
          {/* HEADER CONTROLS (SHARE + PROMINENT CLOSE) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* SHARE BUTTON */}
            <button
              id="btn-share-product"
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-white/10"
              title="Ibahagi ang Produkto"
              aria-label="Ibahagi ang Produkto"
            >
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-300" />
              <span className="hidden sm:inline">I-share</span>
            </button>

            {/* PROMINENT ✕ CLOSE BUTTON */}
            <button
              id="btn-close-product-details"
              type="button"
              onClick={onClose}
              className="w-10 h-10 sm:w-10 sm:h-10 min-w-[40px] min-h-[40px] rounded-xl bg-white/10 hover:bg-rose-600 active:bg-rose-700 text-white border border-white/20 hover:border-rose-500 transition-all duration-150 flex items-center justify-center shrink-0 shadow-sm cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-rose-400"
              aria-label="Close product details"
              title="Close product details"
            >
              <X className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.5]" />
              <span className="sr-only">Close product details</span>
            </button>
          </div>
        </div>

        {/* SCROLLABLE CONTENT BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800">
          {/* ATTRIBUTION BANNER (IF SHARED BY FRIEND) */}
          {sharedByUserId && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-semibold text-indigo-900">
                  Ibinahagi sa iyo ng isang kasamahan sa Z-oneApp!
                </span>
              </div>
              <span className="text-[10px] font-mono text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md font-bold">
                Ref: {sharedByUserId.slice(0, 8)}
              </span>
            </div>
          )}

          {/* SHOPEE-STYLE MULTI-IMAGE GALLERY */}
          <ZoneShopProductGallery
            mainImage={product.image}
            images={product.images}
            productName={product.name}
            category={product.category}
          />

          {/* PRODUCT META & PRICE */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            {product.isAffiliate ? (
              <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-800 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-extrabold">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>🛍️ Affiliate Product ({product.platform || 'Partner Store'})</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                  {product.category}
                </span>
                {Array.isArray(product.tags) && product.tags.map((tag, idx) => (
                  <span key={idx} className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <h1 className="text-base sm:text-lg font-black text-slate-950 leading-snug">
              {product.name}
            </h1>

            {/* RATINGS & SALES */}
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1 text-amber-500 font-extrabold">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{product.rating || 5.0}</span>
              </div>
              <span>•</span>
              <span className="font-semibold">{product.salesCount || 0} naibenta</span>
              {!product.isAffiliate && (
                <>
                  <span>•</span>
                  <span className={`font-semibold ${product.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {product.stock > 0 ? `${product.stock} available stock` : 'Out of Stock'}
                  </span>
                </>
              )}
            </div>

            {/* PRICE BLOCK */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2.5">
                {typeof product.price === 'number' && product.price > 0 ? (
                  <>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-700">
                      ₱{product.price.toFixed(2)}
                    </span>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="text-sm font-mono text-slate-400 line-through">
                        ₱{product.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                    Presyo: I-check sa Partner Store
                  </span>
                )}
              </div>
              {discountPercent > 0 && typeof product.price === 'number' && product.price > 0 && (
                <span className="bg-rose-500 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-xs">
                  -{discountPercent}% OFF
                </span>
              )}
            </div>
          </div>

          {/* KEY FEATURES (IF AVAILABLE) */}
          {Array.isArray(product.keyFeatures) && product.keyFeatures.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Mga Pangunahing Katangian (Key Features)
              </h4>
              <ul className="space-y-1.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-700">
                {product.keyFeatures.map((feat, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold shrink-0">✓</span>
                    <span className="leading-snug">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* SPECIFICATIONS (IF AVAILABLE) */}
          {Array.isArray(product.specifications) && product.specifications.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Mga Espesipikasyon (Specifications)
              </h4>
              <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 bg-white">
                {product.specifications.map((sp, sIdx) => (
                  <div key={sIdx} className="flex text-xs p-2.5 hover:bg-slate-50">
                    <span className="w-1/3 font-bold text-slate-600">{sp.label}</span>
                    <span className="w-2/3 text-slate-800">{sp.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COMPLETE PRODUCT DESCRIPTION (UNTRUNCATED, PRESERVES LINE BREAKS) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Buong Deskripsyon ng Produkto (Full Description)
            </h4>
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-700 font-normal leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
              {product.description && product.description.trim() ? (
                <div>
                  <p>
                    {showFullDesc || product.description.length <= 300
                      ? product.description
                      : `${product.description.slice(0, 300)}...`}
                  </p>
                  {product.description.length > 300 && (
                    <button
                      type="button"
                      onClick={() => setShowFullDesc(!showFullDesc)}
                      className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer block"
                    >
                      {showFullDesc ? 'Ipakita nang Mas Maikli (Read Less ▲)' : 'Basahin ang Buo (Read More ▼)'}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 italic">Walang detalyadong deskripsyon na inilagay para sa produktong ito.</p>
              )}
            </div>
          </div>

          {/* FEATURES / BADGES */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 text-[11px] text-slate-600 font-semibold">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/70">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>100% Legit & Verified</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/70">
              <Truck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Fast Doorstep Delivery</span>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 shrink-0">
          {!currentUser ? (
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
              <button
                type="button"
                onClick={onRequestRegister || onRequestLogin}
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>CREATE ACCOUNT TO VIEW PRODUCT</span>
              </button>
              <button
                type="button"
                onClick={onRequestLogin}
                className="w-full sm:w-auto min-w-[130px] py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer whitespace-nowrap"
              >
                <ExternalLink className="w-4 h-4" />
                <span>LOGIN</span>
              </button>
            </div>
          ) : product.isAffiliate ? (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="text-[11px] text-slate-500 text-center sm:text-left flex-1 font-medium">
                Pindutin para mabili ito nang diretso sa aming partner platform ({product.platform || 'Partner Store'}).
              </div>
              <button
                type="button"
                onClick={handleOpenAffiliateLink}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs py-3 px-6 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <span>
                  BUMILI SA {product.platform ? product.platform.toUpperCase() : 'STORE'}
                  {typeof product.price === 'number' && product.price > 0 ? ` (₱${product.price.toFixed(2)})` : ''}
                </span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* QUANTITY PICKER */}
              <div className="flex items-center border border-slate-300 rounded-xl bg-white p-1">
                <button
                  type="button"
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer disabled:opacity-40"
                  disabled={quantity <= 1}
                >
                  <MinusCircle className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-xs font-black font-mono">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(prev => Math.min(product.stock || 50, prev + 1))}
                  className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer disabled:opacity-40"
                  disabled={quantity >= (product.stock || 50)}
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              </div>

              {/* ACTION BUTTON */}
              <button
                type="button"
                onClick={handleAdd}
                disabled={product.stock <= 0}
                className={`flex-1 w-full text-xs font-black py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 ${
                  product.stock <= 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : addedSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-indigo-600 text-white shadow-slate-900/20'
                }`}
              >
                {addedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Naidagdag na sa Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>
                      {`Ilagay sa Cart (${quantity}) • ₱${(product.price * quantity).toFixed(2)}`}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SOCIAL SHARE MODAL */}
      <ZoneShopSocialShareModal
        product={product}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        currentUserId={currentUser?.referralCode || currentUser?.id}
        triggerNotification={triggerNotification}
      />
    </div>
  );
};
