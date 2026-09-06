import React, { useState } from 'react';
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
  triggerNotification,
  sharedByUserId
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* TOP HEADER */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <ShoppingBag className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {product.isAffiliate ? `Affiliate Partner • ${product.platform || 'Partner'}` : 'Z-oneShop Catalogue'}
              </span>
              <h3 className="text-sm font-black truncate max-w-[240px] sm:max-w-md">
                {product.name}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Ibahagi ang Produkto"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">I-share</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
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
                <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-700">
                  ₱{product.price.toFixed(2)}
                </span>
                {product.originalPrice && (
                  <span className="text-sm font-mono text-slate-400 line-through">
                    ₱{product.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
              {discountPercent > 0 && (
                <span className="bg-rose-500 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-xs">
                  -{discountPercent}% OFF
                </span>
              )}
            </div>
          </div>

          {/* COMPLETE PRODUCT DESCRIPTION (UNTRUNCATED, PRESERVES LINE BREAKS) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Buong Deskripsyon ng Produkto (Full Description)
            </h4>
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-700 font-normal leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
              {product.description && product.description.trim() ? (
                product.description
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
          {product.isAffiliate ? (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="text-[11px] text-slate-500 text-center sm:text-left flex-1 font-medium">
                Pindutin ang <strong>View Product</strong> para mabili ito nang diretso sa aming partner platform ({product.platform || 'Partner Store'}).
              </div>
              <button
                type="button"
                onClick={handleOpenAffiliateLink}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs py-3 px-6 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <span>🛒 TINGNAN ANG PRODUKTO (VIEW PRODUCT)</span>
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
                      {currentUser
                        ? `Ilagay sa Cart (${quantity}) • ₱${(product.price * quantity).toFixed(2)}`
                        : 'Mag-login para Ma-order (Login to Order)'}
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
