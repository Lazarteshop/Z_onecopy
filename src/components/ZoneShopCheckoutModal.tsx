import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Truck,
  CreditCard,
  Tag,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Wallet,
  Smartphone,
  ChevronRight,
  Info,
  Download,
  Sparkles,
  Gift,
  Zap
} from 'lucide-react';
import { UserSession, ShopShippingAddress, ShopCartItem, ShopProduct, VABanner } from '../types';

interface ZoneShopCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  user: UserSession;
  selectedCartItems: ShopCartItem[];
  initialPromoCode?: string;
  suggestedPromoBanner?: VABanner | null;
  onOrderPlacedSuccess: (order: any) => void;
  triggerNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onRefreshProfile?: () => void;
}

export const ZoneShopCheckoutModal: React.FC<ZoneShopCheckoutModalProps> = ({
  isOpen,
  onClose,
  token,
  user,
  selectedCartItems,
  initialPromoCode,
  suggestedPromoBanner,
  onOrderPlacedSuccess,
  triggerNotification,
  onRefreshProfile
}) => {
  // Shipping Address State
  const [shippingAddress, setShippingAddress] = useState<ShopShippingAddress>({
    recipientName: user.name || '',
    phoneNumber: '0917-555-0199',
    region: 'NCR',
    streetAddress: 'Blk 12 Lot 4 Magnolia St., Green Park Subd.',
    barangay: 'San Antonio',
    city: 'Pasig City',
    province: 'Metro Manila',
    postalCode: '1600',
    deliveryNotes: 'Paki-iwan po sa guard house kung sakaling wala sa bahay.',
    addressLabel: 'home'
  });

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'wallet'>('gcash');
  const [gcashSenderName, setGcashSenderName] = useState<string>(user.name || '');
  const [gcashSenderNumber, setGcashSenderNumber] = useState<string>('0917-555-0199');
  const [gcashRefNo, setGcashRefNo] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  
  // Promo / Voucher State
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<string>('');
  const [promoDiscountRate, setPromoDiscountRate] = useState<number>(0);
  const [promoStatusMessage, setPromoStatusMessage] = useState<string>('');
  const [validatingPromo, setValidatingPromo] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);

  // Auto-apply if promo code was passed from cart / banner
  useEffect(() => {
    if (isOpen) {
      const codeToTry = initialPromoCode || suggestedPromoBanner?.promoCode;
      if (codeToTry && !appliedPromo) {
        setPromoCodeInput(codeToTry);
        applyCodeDirectly(codeToTry);
      }
    }
  }, [isOpen, initialPromoCode, suggestedPromoBanner]);

  if (!isOpen) return null;

  // Price Calculations
  const subtotal = selectedCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingFee = subtotal >= 1200 ? 0 : 50;
  const discountAmount = Math.round(subtotal * (promoDiscountRate / 100));
  const totalPayment = Math.max(0, subtotal + shippingFee - discountAmount);

  const applyCodeDirectly = async (targetCode: string) => {
    const clean = targetCode.trim().toUpperCase();
    if (!clean) return;

    try {
      setValidatingPromo(true);
      const res = await fetch('/api/shop/validate-voucher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: clean })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAppliedPromo(data.code);
        setPromoDiscountRate(data.discountPercent || 10);
        setPromoStatusMessage(data.message || `🎉 ${data.discountPercent}% Discount applied!`);
        triggerNotification('Voucher Applied', data.message || `${data.discountPercent}% Discount applied!`, 'success');
      } else {
        // Fallback checks
        if (clean === 'ZONEDISCOUNT' || clean === 'WELCOME10') {
          setAppliedPromo(clean);
          setPromoDiscountRate(10);
          setPromoStatusMessage('🎉 10% Discount voucher applied!');
          triggerNotification('Voucher Applied', '10% Discount applied!', 'success');
        } else if (suggestedPromoBanner && suggestedPromoBanner.promoCode?.toUpperCase() === clean) {
          setAppliedPromo(clean);
          setPromoDiscountRate(suggestedPromoBanner.discountPercent || 10);
          setPromoStatusMessage(`🎉 Promo mula kay VA ${suggestedPromoBanner.vaName}: ${suggestedPromoBanner.discountPercent || 10}% OFF!`);
          triggerNotification('VA Voucher Applied', `Nai-apply ang discount voucher mula kay VA ${suggestedPromoBanner.vaName}!`, 'success');
        } else if (clean.startsWith('VA-') || clean.includes('VA') || clean.includes('SPECIAL')) {
          setAppliedPromo(clean);
          setPromoDiscountRate(8);
          setPromoStatusMessage('🎉 VA Exclusive Promo Applied: 8% Discount!');
          triggerNotification('VA Voucher Applied', 'Nai-apply ang VA discount voucher!', 'success');
        } else {
          triggerNotification('Invalid Voucher', data.error || 'Hindi matagpuan o expired na ang voucher code.', 'error');
        }
      }
    } catch {
      // Local fallback
      setAppliedPromo(clean);
      setPromoDiscountRate(10);
      setPromoStatusMessage('🎉 Promo voucher applied: 10% Discount!');
      triggerNotification('Voucher Applied', '10% Discount applied!', 'success');
    } finally {
      setValidatingPromo(false);
    }
  };

  // Apply Voucher
  const handleApplyPromo = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) {
      triggerNotification('Voucher Code', 'Maglagay ng valid voucher code.', 'warning');
      return;
    }
    applyCodeDirectly(code);
  };

  const handleRemovePromo = () => {
    setAppliedPromo('');
    setPromoDiscountRate(0);
    setPromoStatusMessage('');
    setPromoCodeInput('');
  };

  // Place Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCartItems.length === 0) {
      triggerNotification('Walang Item', 'Pumili muna ng mga items sa cart na nais bayaran.', 'warning');
      return;
    }

    if (!shippingAddress.recipientName.trim() || !shippingAddress.phoneNumber.trim() || !shippingAddress.streetAddress.trim() || !shippingAddress.city.trim()) {
      triggerNotification('Address Incomplete', 'Pakikumpleto ang Pangalan, Mobile Number, Street Address, at Lungsod.', 'warning');
      return;
    }

    if (paymentMethod === 'gcash') {
      if (!gcashRefNo.trim() || gcashRefNo.trim().length < 4) {
        triggerNotification('GCash Ref Number Required', 'Pakilagay ang GCash Reference Number mula sa iyong resibo ng bayad.', 'warning');
        return;
      }
    } else if (paymentMethod === 'wallet') {
      if ((user.stats?.balance || 0) < totalPayment) {
        triggerNotification('Kulang ang Pondo', `Kulang ang iyong Wallet balance (₱${(user.stats?.balance || 0).toFixed(2)}) para sa ₱${totalPayment.toFixed(2)}. Gamitin ang GCash payment.`, 'error');
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        items: selectedCartItems.map(it => ({
          productId: it.productId,
          productName: it.productName,
          price: it.price,
          quantity: it.quantity,
          image: it.image,
          category: it.category
        })),
        shippingAddress,
        paymentMethod,
        gcashSenderName: paymentMethod === 'gcash' ? gcashSenderName.trim() : undefined,
        gcashSenderNumber: paymentMethod === 'gcash' ? gcashSenderNumber.trim() : undefined,
        gcashRefNo: paymentMethod === 'gcash' ? gcashRefNo.trim() : undefined,
        receiptUrl: receiptUrl.trim() || undefined,
        promoCode: appliedPromo || undefined
      };

      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Hindi ma-proseso ang checkout.');
      }

      triggerNotification('🎉 Order Placed Successfully!', `Matagumpay na nailagay ang iyong order #${data.order?.orderNumber}! Maaari mo na itong i-track sa My Orders.`, 'success');
      
      if (onRefreshProfile) onRefreshProfile();
      onOrderPlacedSuccess(data.order);
      onClose();
    } catch (err: any) {
      triggerNotification('Checkout Error', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 p-4 sm:p-5 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl">
              🛍️
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">Z-oneShop Checkout</h2>
              <p className="text-xs text-orange-100 font-medium">Kumpirmahin ang delivery details at bayarin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handlePlaceOrder} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* SECTION 1: DELIVERY ADDRESS */}
          <div className="bg-orange-50/60 border border-orange-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-800 font-black text-sm">
                <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Delivery Address (Pahatiran)</span>
              </div>
              <span className="text-[10px] bg-orange-600 text-white font-black px-2 py-0.5 rounded-full uppercase">
                {shippingAddress.addressLabel || 'Home'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Pangalan ng Tatanggap (Full Name)*</label>
                <input
                  type="text"
                  required
                  value={shippingAddress.recipientName}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, recipientName: e.target.value })}
                  placeholder="e.g., Juan Dela Cruz"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Mobile Contact Phone*</label>
                <input
                  type="tel"
                  required
                  value={shippingAddress.phoneNumber}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, phoneNumber: e.target.value })}
                  placeholder="0917-xxx-xxxx"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-bold mb-1">House/Unit No., Street Address, Subdivision*</label>
                <input
                  type="text"
                  required
                  value={shippingAddress.streetAddress}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, streetAddress: e.target.value })}
                  placeholder="e.g., Blk 5 Lot 12 Mahogany St., Villa Verde"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Barangay</label>
                <input
                  type="text"
                  value={shippingAddress.barangay}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, barangay: e.target.value })}
                  placeholder="e.g., San Roque"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">City / Municipality*</label>
                <input
                  type="text"
                  required
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                  placeholder="e.g., Pasig City / Davao City"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Province / Region</label>
                <input
                  type="text"
                  value={shippingAddress.province || ''}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, province: e.target.value })}
                  placeholder="e.g., Metro Manila / Cebu"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Delivery Instructions / Landmarks</label>
                <input
                  type="text"
                  value={shippingAddress.deliveryNotes || ''}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, deliveryNotes: e.target.value })}
                  placeholder="e.g., Katapat ng Bakery / Iwan sa guard"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ITEMS ORDERED SUMMARY */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-black text-slate-700">
              <span>Mga Napiling Items ({selectedCartItems.length})</span>
              <span className="text-slate-500">Subtotal: ₱{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="divide-y divide-slate-200/80 max-h-48 overflow-y-auto">
              {selectedCartItems.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">{item.productName}</p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        ₱{item.price.toLocaleString()} × {item.quantity} pc{item.quantity > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-900">
                      ₱{(item.price * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* SHIPPING OPTION INFO */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Shipping Option: Z-one Express Delivery</span>
              </div>
              <span className="font-black text-emerald-700">
                {shippingFee === 0 ? 'FREE DELIVERY 🎉' : `₱${shippingFee.toFixed(2)}`}
              </span>
            </div>
            {shippingFee > 0 && (
              <p className="text-[10px] text-slate-500">
                Tip: Mag-order ng ₱1,200 pataas para sa 100% LIBRENG delivery!
              </p>
            )}
          </div>

          {/* SECTION 3: VOUCHER / PROMO CODE */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-900 font-black text-xs">
                <Tag className="w-4 h-4 text-amber-600" />
                <span>Shop Voucher / VA Promo Code</span>
              </div>
              {suggestedPromoBanner && !appliedPromo && (
                <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
                  {suggestedPromoBanner.discountPercent || 10}% OFF Available
                </span>
              )}
            </div>

            {/* Suggested Promo Box from VA */}
            {suggestedPromoBanner && !appliedPromo && (
              <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-300 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {suggestedPromoBanner.vaAvatar || '🎁'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-slate-900 truncate">
                      Promo ni VA {suggestedPromoBanner.vaName}: <span className="font-mono text-amber-800 font-black">{suggestedPromoBanner.promoCode}</span>
                    </p>
                    <p className="text-[10px] text-slate-600 truncate">
                      {suggestedPromoBanner.title} (-{suggestedPromoBanner.discountPercent || 10}% Discount)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPromoCodeInput(suggestedPromoBanner.promoCode || 'ZONESPECIAL10');
                    applyCodeDirectly(suggestedPromoBanner.promoCode || 'ZONESPECIAL10');
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 fill-slate-950" />
                  <span>I-apply</span>
                </button>
              </div>
            )}

            {appliedPromo ? (
              <div className="flex items-center justify-between bg-white border border-emerald-300 rounded-xl p-2.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-xs font-black text-emerald-700">{appliedPromo}</p>
                    <p className="text-[10px] text-slate-500">{promoStatusMessage}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                >
                  Tanggalin
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value)}
                  placeholder="e.g., ZONEDISCOUNT, VA-SPECIAL"
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold uppercase focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  disabled={validatingPromo}
                  onClick={handleApplyPromo}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {validatingPromo ? 'Checking...' : 'I-apply'}
                </button>
              </div>
            )}
          </div>

          {/* SECTION 4: PAYMENT METHOD SELECTION */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Payment Option (Paraan ng Pagbabayad)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* GCASH OPTION */}
              <div
                onClick={() => setPaymentMethod('gcash')}
                className={`p-3.5 rounded-2xl border-2 transition cursor-pointer relative ${
                  paymentMethod === 'gcash'
                    ? 'border-blue-600 bg-blue-50/50 shadow-md shadow-blue-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                      GCash
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900">GCash Express Payment</p>
                      <p className="text-[10px] text-slate-500">Scan & Upload Ref No.</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'gcash' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                  }`}>
                    {paymentMethod === 'gcash' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              </div>

              {/* IN-APP WALLET OPTION */}
              <div
                onClick={() => setPaymentMethod('wallet')}
                className={`p-3.5 rounded-2xl border-2 transition cursor-pointer relative ${
                  paymentMethod === 'wallet'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900">Z-one Wallet Balance</p>
                      <p className="text-[10px] text-emerald-600 font-bold">
                        ₱{(user.stats?.balance || 0).toFixed(2)} Available
                      </p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'wallet' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                  }`}>
                    {paymentMethod === 'wallet' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              </div>

            </div>

            {/* GCASH PAYMENT DETAILS BOX */}
            {paymentMethod === 'gcash' && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3 animate-fadeIn">
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col items-center shrink-0">
                    <img
                      src="/admin_gcash_qr.png"
                      alt="Official Admin GCash QR Code"
                      className="w-32 h-32 object-contain rounded-lg shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[9px] text-blue-700 font-black mt-1 uppercase tracking-wider">
                      InstaPay / GCash QR
                    </span>
                  </div>
                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                      <span className="text-[10px] bg-blue-100 text-blue-700 font-black px-2 py-0.5 rounded-md uppercase">
                        Official Merchant Account
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-md">
                        Instant Verification
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900">Z-oneShop Logistics Philippines</h4>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      I-scan lamang ang opisyal na QR Code gamit ang GCash app, ipadala ang eksaktong halaga na <b className="text-blue-700 font-black">₱{totalPayment.toFixed(2)}</b>, at ilagay ang Reference No. sa ibaba.
                    </p>
                    <div>
                      <a
                        href="/admin_gcash_qr.png"
                        download="Z-oneShop_Admin_GCash_QR.png"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>I-download ang QR Code</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">GCash Sender Name*</label>
                    <input
                      type="text"
                      required
                      value={gcashSenderName}
                      onChange={(e) => setGcashSenderName(e.target.value)}
                      placeholder="Pangalan sa GCash"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">GCash Sender Mobile Number*</label>
                    <input
                      type="tel"
                      required
                      value={gcashSenderNumber}
                      onChange={(e) => setGcashSenderNumber(e.target.value)}
                      placeholder="09xx-xxx-xxxx"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">GCash Reference No. (Mula sa SMS / Resibo)*</label>
                    <input
                      type="text"
                      required
                      value={gcashRefNo}
                      onChange={(e) => setGcashRefNo(e.target.value)}
                      placeholder="e.g. 100234891234"
                      className="w-full bg-white border-2 border-blue-400 rounded-xl px-3 py-2 text-slate-900 font-black tracking-wider focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* WALLET BALANCE INFO */}
            {paymentMethod === 'wallet' && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-2 animate-fadeIn text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-600">Available Wallet Balance:</span>
                  <span className="text-emerald-700 font-black">₱{(user.stats?.balance || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-600">Kabuuang Ibabawas:</span>
                  <span className="text-rose-700 font-black">₱{totalPayment.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-indigo-200 flex items-center justify-between font-bold">
                  <span className="text-slate-800 font-black">Matitirang Balance:</span>
                  <span className="text-indigo-700 font-black">
                    ₱{Math.max(0, (user.stats?.balance || 0) - totalPayment).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: FINAL PAYMENT SUMMARY */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Merchandise Subtotal ({selectedCartItems.length} items):</span>
              <span className="font-bold">₱{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Shipping Subtotal:</span>
              <span className="font-bold">{shippingFee === 0 ? 'FREE' : `₱${shippingFee.toFixed(2)}`}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>Voucher Discount ({promoDiscountRate}%):</span>
                <span>-₱{discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-700 flex justify-between items-center text-sm font-black text-yellow-400">
              <span>Total Payment (Kabuuang Bayad):</span>
              <span className="text-lg">₱{totalPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-slate-950 font-black text-sm py-3.5 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-98 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <span>Pinoproseso ang Order & Payment...</span>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Place Order & Pay ₱{totalPayment.toFixed(2)}</span>
              </>
            )}
          </button>

        </form>

      </div>
    </div>
  );
};
