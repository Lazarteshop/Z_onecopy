import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Zap, 
  Crown, 
  Flame, 
  CheckCircle2, 
  Rocket, 
  Gift, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  Coins 
} from 'lucide-react';

interface PromoAdBannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planId: string) => void;
  onNavigateToPlans: () => void;
  submittingSubscription?: boolean;
  userBalance?: number;
}

export const PromoAdBannerModal: React.FC<PromoAdBannerModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan,
  onNavigateToPlans,
  submittingSubscription = false,
  userBalance = 0
}) => {
  const [timeLeft, setTimeLeft] = useState({ minutes: 14, seconds: 59 });

  // Countdown timer effect for urgency
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        }
        return { minutes: 15, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const basePlans = [
    { 
      id: '1month', 
      name: '1 Month Access', 
      price: 200, 
      popular: true,
      badge: '🔥 PINAKA-POPULAR',
      desc: '30 araw na unlimited clicks, videos & GCash cashout access.' 
    },
    { 
      id: '2months', 
      name: '2 Months Access', 
      price: 500, 
      popular: false,
      badge: '⚡ SAVE ₱100',
      desc: '60 araw na pinalawak na earning portal access.' 
    },
    { 
      id: '3months', 
      name: '3 Months VIP Access', 
      price: 1000, 
      popular: false,
      badge: '👑 VIP BEST VALUE',
      desc: '90 araw na VIP priority cashouts & double rewards.' 
    }
  ];

  const plansToDisplay = userBalance < 50
    ? [
        { 
          id: '7days', 
          name: '7-Days Special Trial', 
          price: 20, 
          popular: false,
          badge: '⚡ MURA & MABILIS',
          desc: '₱20 lang para sa 7 araw na pang-simula habang nag-iipon!' 
        },
        ...basePlans
      ]
    : basePlans;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border-2 border-amber-400/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh] text-white animate-scaleUp">
        
        {/* FLASHY AD BANNER HEADER */}
        <div className="relative bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 p-5 text-white overflow-hidden shrink-0">
          
          {/* Glowing Animated Background Effects */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-yellow-300/30 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-rose-400/30 rounded-full blur-2xl pointer-events-none" />
          
          {/* Top Urgent Promo Badge & Close Button */}
          <div className="flex items-center justify-between gap-2 relative z-10 mb-2">
            <div className="inline-flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md text-amber-300 text-[10px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border border-amber-400/50 shadow-md">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span>SPECIAL PROMO UNLIMITED EARNING OFFER</span>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-950/60 hover:bg-slate-950 text-white/80 hover:text-white flex items-center justify-center transition cursor-pointer border border-white/20 active:scale-95 shrink-0"
              title="Isara"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Ad Headline */}
          <div className="space-y-1 relative z-10">
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight uppercase drop-shadow-md tracking-tight">
              🔥 WAG PAHUULI! KUMITA NG <span className="text-yellow-300 underline underline-offset-4">₱500 - ₱1,500 ARAW-ARAW</span> DIRECT SA GCASH!
            </h2>
            <p className="text-xs sm:text-sm text-amber-100 font-bold leading-snug">
              I-unlock ang VIP Subscription ngayon para sa 100% Unlimited Clicks, Videos, Spin Wheel & Priority Fast Cashouts!
            </p>
          </div>

          {/* Countdown Urgent Banner */}
          <div className="mt-3 bg-slate-950/90 rounded-2xl p-2.5 border border-amber-400/40 flex items-center justify-between text-xs font-bold text-amber-300 relative z-10">
            <span className="flex items-center gap-1.5 text-[11px] sm:text-xs">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Matatapos na ang Special Promo Offer:</span>
            </span>
            <span className="font-mono text-sm sm:text-base font-black text-yellow-300 bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-400/30">
              {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
            </span>
          </div>

        </div>

        {/* MODAL BODY / HYPE FEATURES & PLANS */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[60vh] custom-scrollbar">
          
          {/* WHY SUBSCRIBE / HYPE BULLET POINTS */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Ano ang makukuha mo kapag naka-Subscribe ka?</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/90 border border-emerald-500/30 p-2.5 rounded-xl flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-emerald-300 block">Unlimited Earning Tasks</span>
                  <span className="text-[10px] text-slate-400 leading-tight block">Walang limit sa pag-click ng websites at panonood ng Reels/Shorts.</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-emerald-500/30 p-2.5 rounded-xl flex items-start gap-2">
                <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-yellow-300 block">Fast-Track GCash Cashout</span>
                  <span className="text-[10px] text-slate-400 leading-tight block">Mabilisang approval at direktang pagsend ng kita sa iyong GCash!</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-emerald-500/30 p-2.5 rounded-xl flex items-start gap-2">
                <Coins className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-amber-300 block">Double Reward Boost</span>
                  <span className="text-[10px] text-slate-400 leading-tight block">Mas mataas na kita kada-click at mas maraming Spin Wheel tokens.</span>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-emerald-500/30 p-2.5 rounded-xl flex items-start gap-2">
                <Gift className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-indigo-300 block">VIP Referral Commission</span>
                  <span className="text-[10px] text-slate-400 leading-tight block">Kumita ng ₱10 up to ₱50 direct commission bawat kaibigang ma-invite!</span>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN CALL TO ACTION BUTTON (REDIRECT TO SUBSCRIPTION PLANS) */}
          <div className="space-y-2">
            <button
              onClick={() => {
                onClose();
                onNavigateToPlans();
              }}
              className="w-full py-4 px-4 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 rounded-2xl font-black text-sm sm:text-base transition shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer border border-emerald-300 active:scale-98 animate-pulse"
            >
              <Rocket className="w-5 h-5 text-slate-950 fill-current" />
              <span>🚀 MAG-SUBSCRIBE NA NGAYON AT UNLOCK ALL FEATURES!</span>
              <ArrowRight className="w-5 h-5 text-slate-950" />
            </button>
            <p className="text-[10px] text-center text-slate-400 font-medium">
              ⚡ Safe & Verified Transaction via GCash Direct
            </p>
          </div>

          {/* QUICK DIRECT SUBSCRIPTION PLAN SELECTOR */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
                Mabilisang Pagpili ng Plan (Select Directly):
              </span>
              <span className="text-[10px] text-amber-400 font-bold">
                Instant Admin Approval
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {plansToDisplay.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative p-3 rounded-2xl border transition duration-200 flex items-center justify-between gap-3 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-amber-400 shadow-md shadow-amber-500/10'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-2.5 right-3 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-xs">
                      {plan.badge}
                    </span>
                  )}

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-white text-xs sm:text-sm truncate">{plan.name}</h4>
                      <span className="text-emerald-400 font-black text-xs sm:text-sm font-mono">₱{plan.price}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-tight">{plan.desc}</p>
                  </div>

                  <button
                    onClick={() => {
                      onSelectPlan(plan.id);
                      onClose();
                    }}
                    disabled={submittingSubscription}
                    className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl cursor-pointer shadow-sm shrink-0 transition active:scale-95 whitespace-nowrap"
                  >
                    Bilhin
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* FOOTER DISMISS / DISCLAIMER */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span className="flex items-center gap-1 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified GCash Earning App</span>
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold underline cursor-pointer"
          >
            Pag-isipan muna (Close)
          </button>
        </div>

      </div>
    </div>
  );
};
