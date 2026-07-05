import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  ShoppingBag, 
  Globe, 
  Wallet, 
  Shield, 
  Clock, 
  Plus, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Eye, 
  Megaphone,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Award
} from 'lucide-react';
import { MerchantAd } from '../types';
import AICommercialPlayer from './AICommercialPlayer';

interface MerchantPortalProps {
  token: string | null;
  language: 'tl' | 'en';
  triggerNotification: (message: string, type: 'success' | 'info' | 'error') => void;
}

const PRESET_COLORS = [
  { name: 'Shopee Orange', value: '#EE4D2D' },
  { name: 'GCash Blue', value: '#1E40AF' },
  { name: 'Grab Green', value: '#10B981' },
  { name: 'FoodPanda Pink', value: '#EC4899' },
  { name: 'Elegant Charcoal', value: '#0F172A' },
  { name: 'Golden Amber', value: '#D97706' },
  { name: 'Ocean Cyan', value: '#06B6D4' },
  { name: 'Royal Purple', value: '#7C3AED' }
];

const ICONS_LIST = [
  { name: 'ShoppingBag', label: '🛍️ Tindahan / Shop' },
  { name: 'Utensils', label: '🍽️ Kainan / Food' },
  { name: 'Laptop', label: '💻 Trabaho / Tech' },
  { name: 'Compass', label: '✈️ Biyahe / Travel' },
  { name: 'Activity', label: '🏥 Kalusugan / Health' },
  { name: 'Newspaper', label: '📰 Balita / News' },
  { name: 'Wifi', label: '📶 Internet / WiFi' },
  { name: 'PiggyBank', label: '💰 Negosyo / Savings' },
  { name: 'Sparkles', label: '⭐ Serbisyo / Others' }
];

const PLANS = [
  { id: 'bronze', name: 'Bronze Plan', price: 299, days: 7, reward: 1.50, desc: 'Perpekto para sa mabilisang promosyon at anunsyo.' },
  { id: 'silver', name: 'Silver Plan', price: 999, days: 30, reward: 2.50, desc: 'Pinakasikat para sa mga lumalagong lokal na tindahan.' },
  { id: 'gold', name: 'Gold Plan', price: 2499, days: 90, reward: 3.50, desc: 'Mahabang exposure na may mas mataas na prayoridad sa feed.' },
  { id: 'platinum', name: 'Platinum Plan', price: 7999, days: 365, reward: 5.00, desc: 'Isang buong taon na sponsored listing para sa maximum branding.' }
];

export default function MerchantPortal({
  token,
  language,
  triggerNotification
}: MerchantPortalProps) {
  const [ads, setAds] = useState<MerchantAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState('ShoppingBag');
  const [category, setCategory] = useState<'Shopping' | 'Balita' | 'Teknolohiya' | 'E-Services' | 'Kultura'>('Shopping');
  const [primaryColor, setPrimaryColor] = useState('#EE4D2D');
  const [accentColor, setAccentColor] = useState('#10B981');
  const [planId, setPlanId] = useState('bronze');
  const [gcashSenderNumber, setGcashSenderNumber] = useState('');
  const [gcashReferenceNo, setGcashReferenceNo] = useState('');

  // Preview State
  const [previewAd, setPreviewAd] = useState<MerchantAd | null>(null);
  const [activeCommercialAd, setActiveCommercialAd] = useState<MerchantAd | null>(null);

  const fetchMyAds = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/merchant/ads', {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const data = await res.json();
        setAds(data.ads || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAds();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!title.trim() || !url.trim() || !description.trim() || !gcashSenderNumber.trim() || !gcashReferenceNo.trim()) {
      triggerNotification(
        language === 'tl' 
          ? 'Mangyaring punan ang lahat ng kinakailangang impormasyon.' 
          : 'Please fill in all required fields.', 
        'error'
      );
      return;
    }

    if (gcashSenderNumber.length < 10) {
      triggerNotification(
        language === 'tl'
          ? 'Ang GCash sender number ay dapat mayroong hindi bababa sa 10 digits.'
          : 'GCash sender number must be at least 10 digits.',
        'error'
      );
      return;
    }

    if (gcashReferenceNo.length < 10) {
      triggerNotification(
        language === 'tl'
          ? 'Ang GCash reference number ay dapat mayroong hindi bababa sa 10 digits.'
          : 'GCash reference number must be at least 10 digits.',
        'error'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/merchant/ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          title,
          url,
          description,
          logo,
          category,
          primaryColor,
          accentColor,
          planId,
          gcashSenderNumber,
          gcashReferenceNo
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerNotification(
          language === 'tl'
            ? '🟢 Matagumpay na naisumite ang iyong negosyo! Hintayin ang pagsusuri ng admin.'
            : '🟢 Successfully submitted your business promotion! Waiting for admin review.',
          'success'
        );
        // Reset states
        setTitle('');
        setUrl('');
        setDescription('');
        setGcashSenderNumber('');
        setGcashReferenceNo('');
        setShowForm(false);
        // Refresh list
        fetchMyAds();
      } else {
        triggerNotification(data.error || 'Failed to submit promotion request.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('Connection error submitting promotion.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="bg-amber-100 border border-amber-250 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
            <Clock className="w-3 h-3 animate-pulse" />
            <span>{language === 'tl' ? 'Pagsusuri' : 'Under Review'}</span>
          </span>
        );
      case 'active':
        return (
          <span className="bg-emerald-100 border border-emerald-250 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
            <CheckCircle className="w-3 h-3" />
            <span>{language === 'tl' ? 'Aktibo' : 'Active'}</span>
          </span>
        );
      case 'declined':
        return (
          <span className="bg-rose-100 border border-rose-250 text-rose-800 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
            <XCircle className="w-3 h-3" />
            <span>{language === 'tl' ? 'Tinanggihan' : 'Declined'}</span>
          </span>
        );
      case 'expired':
        return (
          <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
            <AlertCircle className="w-3 h-3" />
            <span>{language === 'tl' ? 'Tapos na' : 'Expired'}</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 🚀 PROMOTION MAIN BANNER */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="max-w-2xl space-y-4 relative z-10">
          <span className="bg-emerald-500 text-emerald-950 font-black text-[10px] tracking-widest px-3 py-1 rounded-full uppercase flex items-center gap-1 w-max">
            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
            <span>{language === 'tl' ? 'NEGOSYO PROMOTION HUB' : 'BUSINESS PROMOTION HUB'}</span>
          </span>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
            {language === 'tl' 
              ? 'I-promote ang Iyong Negosyo sa Libo-libong Miyembro ng Z-one!' 
              : 'Promote Your Business to Thousands of Z-one Members!'}
          </h1>
          <p className="text-xs md:text-sm text-slate-300 font-semibold leading-relaxed">
            {language === 'tl'
              ? 'Palaguin ang iyong Facebook page, Shopee shop, website, o produkto. Ang aming mga miyembro ay bibisita at babasahin ang iyong negosyo kapalit ng maliit na gantimpala!'
              : 'Grow your Facebook page, Shopee store, website, or product. Our active members will visit and view your business page in exchange for small completion rewards!'}
          </p>
          
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => { setShowForm(!showForm); setPreviewAd(null); }}
              id="toggle-ad-form-btn"
              className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              {showForm ? (
                <span>{language === 'tl' ? 'Tingnan ang Aking Ads' : 'View My Ads'}</span>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-slate-950 font-black" />
                  <span>{language === 'tl' ? 'I-promote ang Aking Negosyo' : 'Promote My Business Now'}</span>
                </>
              )}
            </button>
            
            <button
              onClick={fetchMyAds}
              id="refresh-merchant-ads-btn"
              className="bg-slate-800 border border-slate-700 hover:bg-slate-750 text-white font-extrabold text-xs px-4 py-3 rounded-2xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{language === 'tl' ? 'I-refresh' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🔮 INTERACTIVE PREVIEW PANEL */}
      {previewAd && (
        <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="font-extrabold text-sm text-emerald-400 flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              <span>{language === 'tl' ? 'Mock-up Preview ng Iyong Ad' : 'Ad Mock-up Live Preview'}</span>
            </h3>
            <button 
              onClick={() => setPreviewAd(null)}
              className="text-slate-400 hover:text-white font-bold text-xs"
            >
              ✕ {language === 'tl' ? 'Isara' : 'Close'}
            </button>
          </div>

          <div className="border border-slate-700 rounded-2xl overflow-hidden shadow-xl" style={{ backgroundColor: '#ffffff' }}>
            <div className="p-6 text-slate-900 text-center space-y-4" style={{ backgroundColor: previewAd.primaryColor, color: '#ffffff' }}>
              <span className="bg-white/20 text-white text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase">
                📢 SPONSORED PROMOTION
              </span>
              <h2 className="text-2xl font-black tracking-tight">{previewAd.title}</h2>
              <p className="text-xs text-white/90 font-medium max-w-xl mx-auto">{previewAd.description}</p>
            </div>

            <div className="p-6 text-slate-800 space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                <h4 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">🌟 Negosyo Features</h4>
                <ul className="text-xs space-y-2 text-slate-700 font-semibold">
                  <li className="flex items-center gap-1.5">🔗 Link ng Negosyo: <span className="text-blue-600 underline font-black truncate max-w-xs">{previewAd.url}</span></li>
                  <li className="flex items-center gap-1.5">💰 Gantimpala sa Pag-view: <span className="text-emerald-600 font-extrabold">₱{(previewAd.planId === 'bronze' ? 1.50 : previewAd.planId === 'silver' ? 2.50 : previewAd.planId === 'gold' ? 3.50 : 5.00).toFixed(2)}</span></li>
                  <li className="flex items-center gap-1.5">⏱️ Timer: <span className="font-black">10 Segundo</span></li>
                </ul>
              </div>
              <p className="text-[11px] text-center text-slate-400 font-bold">
                *Ganito eksakto ang makikita ng ibang mga user upang sila ay maengganyong bumisita sa iyong negosyo!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 🎬 AI COMMERCIAL POPUP PLAYER */}
      {activeCommercialAd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-1 max-w-4xl w-full relative shadow-2xl">
            <button
              onClick={() => setActiveCommercialAd(null)}
              className="absolute -top-12 right-0 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-2 rounded-full border border-slate-700 cursor-pointer select-none transition z-50 flex items-center gap-1"
            >
              ✕ {language === 'tl' ? 'Isara' : 'Close'}
            </button>
            {activeCommercialAd.aiCommercial ? (
              <AICommercialPlayer
                commercial={activeCommercialAd.aiCommercial}
                businessUrl={activeCommercialAd.url}
                businessTitle={activeCommercialAd.title}
                onClose={() => setActiveCommercialAd(null)}
              />
            ) : (
              <div className="p-8 text-center space-y-4">
                <p className="text-slate-400 font-bold text-sm">Walang nahanap na AI Commercial para sa promotion na ito.</p>
                <button 
                  onClick={() => setActiveCommercialAd(null)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold cursor-pointer"
                >
                  Isara
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📝 FORM FOR NEW AD SUBMISSION */}
      {showForm ? (
        <form onSubmit={handleSubmit} id="merchant-ad-form" className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6 animate-fadeIn">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-black text-slate-950 text-base flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              <span>{language === 'tl' ? 'Gumawa ng Bagong Promosyon' : 'Create New Business Promotion'}</span>
            </h3>
            <p className="text-xs text-slate-500 font-bold">
              {language === 'tl' ? 'Punan ang mga detalye ng iyong negosyo at isumite ang bayad.' : 'Enter your business details and submit your reference payment.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* LEFT INPUTS */}
            <div className="space-y-4">
              
              {/* TITLE */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 tracking-wide uppercase">
                  {language === 'tl' ? 'Pangalan ng Negosyo o Pamagat' : 'Business Name or Title'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Hal: Lola Maria's Pancit & Bakery"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* URL */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 tracking-wide uppercase">
                  {language === 'tl' ? 'Target Link o Website URL' : 'Target Link or Website URL'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="Hal: https://facebook.com/lolamariabakery"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* DESCRIPTION */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 tracking-wide uppercase">
                  {language === 'tl' ? 'Maikling Deskripsyon / Anunsyo' : 'Short Description / Announcement'} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Hal: Masarap at sariwang pandesal, pancit, at kakanin! Bukas kami mula 5 AM hanggang 8 PM. Bisitahin ang aming Facebook page ngayon!"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* CATEGORY & ICON */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 tracking-wide uppercase">Kategorya</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold"
                  >
                    <option value="Shopping">Shopping</option>
                    <option value="Kultura">Kultura (Pagkain/Travel)</option>
                    <option value="Teknolohiya">Teknolohiya</option>
                    <option value="E-Services">E-Services</option>
                    <option value="Balita">Balita</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 tracking-wide uppercase">Icon</label>
                  <select
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold"
                  >
                    {ICONS_LIST.map(ic => (
                      <option key={ic.name} value={ic.name}>{ic.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* COLOR PRESETS */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 tracking-wide uppercase">Pangunahing Kulay ng Ad</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setPrimaryColor(color.value)}
                      className={`h-7 px-3 rounded-lg text-[10px] font-bold text-white transition flex items-center justify-center border ${
                        primaryColor === color.value ? 'border-black ring-2 ring-indigo-500/30 font-black scale-105' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.value }}
                    >
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT PAYMENT INTERACTION */}
            <div className="space-y-6">
              
              {/* SELECT PRICE PLANS */}
              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-700 tracking-wide uppercase">Pumili ng Promosyon Package</label>
                <div className="grid grid-cols-1 gap-2.5">
                  {PLANS.map(p => {
                    const isSelected = planId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setPlanId(p.id)}
                        className={`border rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600/50' 
                            : 'border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-950 text-xs">{p.name} ({p.days} Araw)</h4>
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                              +{p.days} Days
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{p.desc}</p>
                          <p className="text-[9px] text-emerald-600 font-black">
                            User Reward: ₱{p.reward.toFixed(2)} kada view!
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-indigo-700 block">₱{p.price}</span>
                          <span className="text-[9px] font-bold text-slate-400">GCash Pay</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* GCASH PAYMENT GUIDE */}
              <div className="bg-indigo-50/70 border border-indigo-150 rounded-2xl p-4.5 space-y-3">
                <h4 className="font-extrabold text-xs text-indigo-950 flex items-center gap-1.5 uppercase tracking-wide">
                  <Wallet className="w-4 h-4 text-indigo-600" />
                  <span>Gabay sa Pagbabayad (GCash)</span>
                </h4>
                <div className="text-[11px] text-indigo-900 font-semibold leading-relaxed space-y-2">
                  <p>
                    1. Magpadala ng <span className="font-black text-indigo-950">₱{PLANS.find(p => p.id === planId)?.price}</span> sa opisyal na GCash number ng admin:
                  </p>
                  <div className="bg-white border border-indigo-100 rounded-xl px-3 py-2 text-center text-xs font-black tracking-wider text-indigo-750">
                    📱 0991-408-9646 (System Admin)
                  </div>
                  <p>
                    2. Piliin ang <span className="font-black">"Send Money"</span> o <span className="font-black">"Express Send"</span>.
                  </p>
                  <p>
                    3. Matapos maproseso ang bayad, ilagay ang saktong detalye sa ibaba upang ma-verify ang transaksyon.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-indigo-950 uppercase tracking-wide">Iyong GCash Mobile No.</label>
                    <input
                      type="text"
                      required
                      placeholder="Hal: 09171234567"
                      value={gcashSenderNumber}
                      onChange={(e) => setGcashSenderNumber(e.target.value)}
                      className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-[11px] font-bold tracking-wider"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-indigo-950 uppercase tracking-wide">GCash Reference Number</label>
                    <input
                      type="text"
                      required
                      placeholder="13-digit code"
                      value={gcashReferenceNo}
                      onChange={(e) => setGcashReferenceNo(e.target.value)}
                      className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-[11px] font-bold tracking-wider"
                    />
                  </div>
                </div>
              </div>

            </div>

          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                // Instantly generate mock preview
                setPreviewAd({
                  id: 'preview',
                  userId: 'preview',
                  userName: 'Preview User',
                  userAvatar: '👤',
                  title: title || 'Pangalan ng Aking Negosyo',
                  url: url || 'https://facebook.com',
                  description: description || 'Maikling deskripsyon ng aking negosyo at mga serbisyo...',
                  logo,
                  category,
                  primaryColor,
                  accentColor,
                  planId: planId as any,
                  planName: PLANS.find(p => p.id === planId)?.name || 'Bronze Plan',
                  price: PLANS.find(p => p.id === planId)?.price || 0,
                  durationDays: PLANS.find(p => p.id === planId)?.days || 0,
                  gcashSenderNumber,
                  gcashReferenceNo,
                  status: 'pending',
                  createdAt: new Date().toISOString()
                });
                triggerNotification('🔎 Preview generated at the top of the page!', 'info');
              }}
              className="bg-slate-100 hover:bg-slate-250 text-slate-700 font-extrabold text-xs px-4.5 py-3 rounded-2xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Eye className="w-4 h-4 text-slate-600" />
              <span>I-preview ang Ad</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              id="submit-ad-btn"
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-black text-xs px-6 py-3 rounded-2xl flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-blue-600/15"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Isinusumite...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>I-submit ang Aking Ad (₱{PLANS.find(p => p.id === planId)?.price})</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* 📋 MERCHANTS OWN ADS LIST VIEW */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-600" />
              <span>{language === 'tl' ? 'Aking mga Negosyo Promosyon' : 'My Active & Submitted Promotions'} ({ads.length})</span>
            </h3>
          </div>

          {loading ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
              <p className="text-slate-500 text-xs font-bold select-none">Kumukuha ng mga promotions sa server...</p>
            </div>
          ) : ads.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4">
              <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <Megaphone className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 text-sm">{language === 'tl' ? 'Walang Aktibong Promosyon' : 'No Promotions Yet'}</h4>
                <p className="text-slate-500 font-bold text-xs select-none max-w-sm mx-auto">
                  {language === 'tl' 
                    ? 'Mag-click sa button sa itaas para magsimulang mag-promote ng iyong negosyo sa libo-libong users ngayon!'
                    : 'Click the button above to start promoting your business to thousands of active users today!'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ads.map((ad) => (
                <div key={ad.id} id={`merchant-ad-item-${ad.id}`} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 bg-slate-100 rounded-xl flex items-center justify-center text-lg shadow-inner shrink-0">
                          {ad.logo === 'ShoppingBag' ? '🛍️' : 
                           ad.logo === 'Utensils' ? '🍽️' :
                           ad.logo === 'Laptop' ? '💻' :
                           ad.logo === 'Compass' ? '✈️' :
                           ad.logo === 'Activity' ? '🏥' :
                           ad.logo === 'Newspaper' ? '📰' :
                           ad.logo === 'Wifi' ? '📶' :
                           ad.logo === 'PiggyBank' ? '💰' : '⭐'}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-950 text-xs truncate max-w-[150px] sm:max-w-xs">{ad.title}</h4>
                          <span className="text-[10px] text-indigo-700 font-black">{ad.planName} ({ad.durationDays} Araw)</span>
                        </div>
                      </div>
                      {getStatusBadge(ad.status)}
                    </div>

                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed line-clamp-2">{ad.description}</p>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-bold font-mono">
                      <div>GCash Sender: <span className="font-black text-slate-800">{ad.gcashSenderNumber}</span></div>
                      <div>Ref: <span className="font-black text-slate-800">{ad.gcashReferenceNo}</span></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 font-extrabold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(ad.createdAt).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {ad.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => { setActiveCommercialAd(ad); }}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-black text-[10px] px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer select-none animate-pulse"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{language === 'tl' ? 'AI Commercial' : 'AI Commercial'}</span>
                        </button>
                      )}
                      <button
                        onClick={() => { setPreviewAd(ad); }}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-black text-[10px] px-3 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>{language === 'tl' ? 'I-preview' : 'Preview'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
