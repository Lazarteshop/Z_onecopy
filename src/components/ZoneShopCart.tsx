import React, { useState } from 'react';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  CheckSquare,
  Square,
  ArrowRight,
  Sparkles,
  Truck,
  ShieldCheck,
  Tag,
  Copy,
  Check,
  Clock,
  Zap,
  Gift
} from 'lucide-react';
import { ShopCartItem, ShopProduct, VABanner } from '../types';

interface ZoneShopCartProps {
  cart: ShopCartItem[];
  loading: boolean;
  activeBanner?: VABanner | null;
  onUpdateQuantity: (itemId: string, newQty: number) => void;
  onToggleSelect: (itemId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: (selectedItems: ShopCartItem[], autoPromoCode?: string) => void;
  onExploreProducts: () => void;
}

export const ZoneShopCart: React.FC<ZoneShopCartProps> = ({
  cart,
  loading,
  activeBanner,
  onUpdateQuantity,
  onToggleSelect,
  onSelectAll,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
  onExploreProducts
}) => {
  const [copiedPromo, setCopiedPromo] = useState<boolean>(false);
  const selectedItems = cart.filter(it => it.selected);
  const allSelected = cart.length > 0 && cart.every(it => it.selected);
  const selectedSubtotal = selectedItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  const freeShippingThreshold = 1200;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - selectedSubtotal);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPromo(true);
    setTimeout(() => setCopiedPromo(false), 2500);
  };

  if (cart.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-sm animate-fadeIn">
        <div className="w-20 h-20 bg-orange-50 border border-orange-200 text-orange-600 rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-sm">
          🛒
        </div>
        <div className="space-y-1.5 max-w-sm mx-auto">
          <h3 className="text-lg font-black text-slate-900">Walang laman ang iyong Shopping Cart</h3>
          <p className="text-xs text-slate-500 font-medium">
            Mag-browse sa aming Z-oneShop Catalogue at i-add to cart ang iyong mga paboritong produkto at gadgets!
          </p>
        </div>
        <button
          onClick={onExploreProducts}
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black text-xs px-6 py-3 rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition cursor-pointer inline-flex items-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Mag-browse sa Z-oneShop Catalogue</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* ========================================================================= */}
      {/* VIRTUAL ASSISTANT PROMOTIONAL MARKETING BANNER (CUSTOMER VIEW) */}
      {/* ========================================================================= */}
      {activeBanner && activeBanner.status === 'active' && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400/80 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-indigo-500/10 p-4 sm:p-5 shadow-lg shadow-amber-500/10 transition-all animate-fadeIn">
          
          {/* Top Decorative Sparkle Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-3 mb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {activeBanner.vaAvatar || '👩‍💼'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-900">
                    Promo Offer mula kay VA {activeBanner.vaName}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    activeBanner.bannerType === 'paid' 
                      ? 'bg-amber-500 text-slate-950 shadow-xs' 
                      : 'bg-blue-600 text-white'
                  }`}>
                    {activeBanner.bannerType === 'paid' ? '⭐ 7-Day VIP Promo' : '🎯 Special Deal'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-semibold">
                  Personalized voucher na inihanda para sa iyong cart items
                </p>
              </div>
            </div>

            {/* Expiration Tag */}
            {activeBanner.expiresAt && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-2.5 py-1 rounded-xl">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>
                  Expires: {new Date(activeBanner.expiresAt).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' })} ({Math.max(0, Math.ceil((new Date(activeBanner.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} araw natitira)
                </span>
              </div>
            )}
          </div>

          {/* Banner Content Body */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-orange-600 shrink-0" />
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {activeBanner.title}
                </h3>
              </div>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                "{activeBanner.message}"
              </p>
              {activeBanner.imageUrl && (
                <div className="mt-2 rounded-xl overflow-hidden max-h-36 max-w-sm border border-amber-200">
                  <img
                    src={activeBanner.imageUrl}
                    alt="Promo Banner"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            {/* Voucher Box & Quick Apply Button */}
            <div className="bg-white/90 backdrop-blur-xs border-2 border-dashed border-amber-400 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-center gap-3 shrink-0 shadow-sm w-full md:w-auto">
              <div className="text-center sm:text-left space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 block">
                  Diskwento: <span className="text-emerald-700 font-black text-xs">{activeBanner.discountPercent || 10}% OFF</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-sm text-slate-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                    {activeBanner.promoCode || 'ZONESPECIAL10'}
                  </span>
                  <button
                    onClick={() => handleCopyCode(activeBanner.promoCode || 'ZONESPECIAL10')}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition cursor-pointer"
                    title="Kopyahin ang code"
                  >
                    {copiedPromo ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  const itemsToCheckout = selectedItems.length > 0 ? selectedItems : cart;
                  onProceedToCheckout(itemsToCheckout, activeBanner.promoCode || 'ZONESPECIAL10');
                }}
                className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md shadow-orange-500/20 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                <span>Gamitin sa Checkout ({activeBanner.discountPercent || 10}% OFF)</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* FREE SHIPPING PROGRESS BANNER */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-300/60 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            {remainingForFreeShipping === 0 ? (
              <p className="font-black text-emerald-800">
                🎉 Nakuha mo na ang 100% FREE Delivery sa iyong napiling items!
              </p>
            ) : (
              <p className="font-bold text-slate-700">
                Magdagdag pa ng <span className="font-black text-emerald-700">₱{remainingForFreeShipping.toFixed(2)}</span> para sa <span className="text-emerald-700 font-black">LIBRENG SHIPPING</span>!
              </p>
            )}
            <p className="text-[10px] text-slate-500 font-medium">Z-one Express Nationwide delivery service</p>
          </div>
        </div>

        <div className="w-full sm:w-36 bg-slate-200 rounded-full h-2 overflow-hidden shrink-0">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (selectedSubtotal / freeShippingThreshold) * 100)}%` }}
          />
        </div>
      </div>

      {/* CART HEADER & ACTIONS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 flex items-center justify-between shadow-xs">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-black text-slate-800 select-none">
          <button
            type="button"
            onClick={() => onSelectAll(!allSelected)}
            className="text-orange-600 focus:outline-none"
          >
            {allSelected ? (
              <CheckSquare className="w-5 h-5 fill-orange-500 text-white" />
            ) : (
              <Square className="w-5 h-5 text-slate-400" />
            )}
          </button>
          <span>Piliin Lahat ({cart.length} mga produkto)</span>
        </label>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearCart}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Alisin Lahat</span>
          </button>
        </div>
      </div>

      {/* CART ITEMS LIST */}
      <div className="space-y-3">
        {cart.map((item) => {
          const itemSubtotal = item.price * item.quantity;
          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border transition-all p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs ${
                item.selected ? 'border-orange-300 ring-1 ring-orange-200 bg-orange-50/10' : 'border-slate-200 opacity-80'
              }`}
            >
              {/* SELECT CHECKBOX & PRODUCT INFO */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onToggleSelect(item.id, !item.selected)}
                  className="text-orange-600 cursor-pointer focus:outline-none shrink-0"
                >
                  {item.selected ? (
                    <CheckSquare className="w-5 h-5 fill-orange-500 text-white" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                <img
                  src={item.image}
                  alt={item.productName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-200 shrink-0"
                />

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md uppercase">
                      {item.category || 'Shop'}
                    </span>
                    {item.originalPrice && item.originalPrice > item.price && (
                      <span className="text-[10px] bg-rose-50 text-rose-600 font-black px-1.5 py-0.5 rounded-md">
                        {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-snug line-clamp-2">
                    {item.productName}
                  </h4>

                  <div className="flex items-baseline gap-2">
                    <span className="text-sm sm:text-base font-black text-orange-600">
                      ₱{item.price.toLocaleString()}
                    </span>
                    {item.originalPrice && (
                      <span className="text-[11px] text-slate-400 line-through">
                        ₱{item.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* QUANTITY & ACTIONS */}
              <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                
                {/* QUANTITY STEPPER */}
                <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => onUpdateQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-10 sm:w-12 text-center text-xs font-black text-slate-900 bg-white py-1 focus:outline-none"
                  />
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* TOTAL FOR THIS ITEM */}
                <div className="text-right min-w-[90px]">
                  <span className="text-[10px] text-slate-400 font-bold block">Subtotal:</span>
                  <span className="text-xs sm:text-sm font-black text-slate-900">
                    ₱{itemSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* DELETE BUTTON */}
                <button
                  onClick={() => onRemoveItem(item.id)}
                  title="Tanggalin sa Cart"
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

              </div>
            </div>
          );
        })}
      </div>

      {/* STICKY BOTTOM CHECKOUT BAR (SHOPEE STYLE) */}
      <div className="sticky bottom-3 z-30 bg-slate-950 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onSelectAll(!allSelected)}
            className="text-orange-400 focus:outline-none flex items-center gap-2 text-xs font-black select-none cursor-pointer"
          >
            {allSelected ? (
              <CheckSquare className="w-5 h-5 fill-orange-500 text-slate-950" />
            ) : (
              <Square className="w-5 h-5 text-slate-500" />
            )}
            <span className="text-slate-300">Piliin Lahat ({cart.length})</span>
          </button>
          
          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="text-xs text-slate-400">
            Napili: <span className="font-black text-white">{selectedItems.length} items</span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
              Kabuuang Bayarin:
            </span>
            <div className="text-lg sm:text-2xl font-black text-amber-400">
              ₱{selectedSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <button
            onClick={() => onProceedToCheckout(selectedItems)}
            disabled={selectedItems.length === 0}
            className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-slate-950 font-black text-xs sm:text-sm px-6 sm:px-8 py-3.5 rounded-2xl shadow-lg shadow-orange-500/30 active:scale-95 transition cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <span>Check Out ({selectedItems.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
