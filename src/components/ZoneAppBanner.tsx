import React, { useState } from 'react';
import { 
  Sparkles, 
  Globe, 
  Tv, 
  Coins, 
  Users, 
  Megaphone, 
  Wallet, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Share2, 
  Award,
  Zap
} from 'lucide-react';

interface ZoneAppBannerProps {
  language?: 'tl' | 'en';
  referralCode?: string;
  triggerNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
  compact?: boolean;
}

export const ZoneAppBanner: React.FC<ZoneAppBannerProps> = ({
  language = 'tl',
  referralCode = '',
  triggerNotification,
  compact = false
}) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  const appUrl = window.location.origin || 'http://z-oneapp.onrender.com';
  const inviteLink = referralCode ? `${appUrl}?ref=${referralCode}` : appUrl;

  const fullBannerText = `🚀 **ANO ANG Z-ONEAPP? (WHAT IS Z-ONEAPP?)**

Ang **Z-oneApp** ay ang #1 All-in-One Digital Community, Website Viewer, at Rewards Platform sa Pilipinas kung saan maaari kang mag-explore ng mga negosyo at kumita habang ginagamit ang app!

✨ **ANG MGA PANGUNAHING FEATURE NG Z-ONEAPP:**

1️⃣ 🌐 **Website Viewer & PPV Earning**:
- Bisitahin ang mga verified websites, online shops, at landing pages.
- Kumita ng ₱0.01 hanggang ₱50.00 sa bawat awtomatikong pagbisita!

2️⃣ 🎬 **Watch Video Reels & TikTok Content**:
- Manood ng maiikling trending videos at reels sa floating widget.
- Makakuha ng instant **Red Pocket (🧧) Rewards** at cash bonus!

3️⃣ 🎰 **Daily Lucky Spin Wheel & ₱1.00 Daily Bonus**:
- Libreng ₱1.00 daily check-in bonus araw-araw.
- Paikutin ang Spin Wheel para manalo ng dagdag na wallet rewards.

4️⃣ 👥 **Z-one Social Feed**:
- Mag-post ng mga larawan, kwento, at update.
- Makipag-connect, mag-like, at mag-comment kasama ang libu-libong miyembro.

5️⃣ 📣 **Merchant Ads & Negosyo Portal**:
- I-promote ang iyong sariling negosyo, Facebook page, o online store sa libu-libong totoong visitors!

6️⃣ 💰 **Mabilis na GCash Cashout**:
- Direkta at ligtas na payout papunta sa iyong GCash account kapag naabot ang minimum limit.

👉 **Magsimula at Sumali Na Dito:** ${inviteLink}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullBannerText);
    setCopied(true);
    if (triggerNotification) {
      triggerNotification('📋 Na-copy na ang Z-oneApp Banner text! Pwedeng i-paste sa FB / Messenger!', 'success');
    }
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Z-oneApp - Digital Community & Earning Portal',
          text: 'Magsimula at kumita sa Z-oneApp! Ang #1 Website Viewer & Rewards Platform sa Pinas!',
          url: inviteLink,
        });
      } catch (err) {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="w-full bg-black border-2 border-amber-400 rounded-3xl p-5 sm:p-6 shadow-2xl text-white relative overflow-hidden transition-all duration-300">
      
      {/* Decorative Background Glow Effect */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER BADGE & CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 relative z-10">
        <div className="flex items-center gap-2">
          <span className="bg-amber-400 text-slate-950 font-black text-[10px] sm:text-xs uppercase px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md tracking-wider">
            <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
            <span>OFFICIAL PROMO BANNER</span>
          </span>
          <span className="text-slate-300 text-[10px] sm:text-xs font-bold hidden xs:inline-block">
            ● Z-oneApp Overview
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer hover:scale-105 active:scale-95"
            title="Kopyahin ang buong banner text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-950" /> : <Copy className="w-3.5 h-3.5 text-slate-950" />}
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer hover:scale-105 active:scale-95"
            title="I-share ang link"
          >
            <Share2 className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl transition cursor-pointer"
            title={expanded ? 'I-collapse' : 'Palakihin'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* BANNER CONTENT HERO */}
      <div className="mt-4 space-y-4 relative z-10">
        
        {/* MAIN HEADLINE */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-amber-300 tracking-tight leading-tight flex items-center gap-2">
            <span>🚀 Ano ang Z-oneApp?</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-100 font-bold leading-relaxed max-w-2xl bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
            Ang <span className="text-amber-300 font-black">Z-oneApp</span> ay ang #1 All-in-One Digital Community, Website Viewer, at Micro-Earning Platform sa Pilipinas na nagbibigay ng tunay na pagkakataon upang mag-explore ng mga negosyo at kumita araw-araw sa pamamagitan ng GCash!
          </p>
        </div>

        {/* EXPANDABLE FEATURES GRID */}
        {expanded && (
          <div className="pt-2 space-y-4 animate-fadeIn">
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5 border-t border-slate-800 pt-3">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>LAHAT NG KATANGIAN AT FEATURE NG SYSTEM:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              
              {/* Feature 1 */}
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-1.5 hover:border-amber-400/50 transition">
                <div className="flex items-center gap-2 text-amber-300 font-black text-xs">
                  <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400 shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span>1. Website Viewer (PPV)</span>
                </div>
                <p className="text-[11px] text-slate-200 font-semibold leading-relaxed">
                  Bisitahin ang mga verified websites, online shops, at landing pages upang makakuha ng <span className="text-emerald-400 font-bold">₱0.01 - ₱50.00</span> kada automatic visit!
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-1.5 hover:border-amber-400/50 transition">
                <div className="flex items-center gap-2 text-rose-300 font-black text-xs">
                  <div className="p-1.5 bg-rose-500/20 rounded-lg text-rose-400 shrink-0">
                    <Tv className="w-4 h-4" />
                  </div>
                  <span>2. Watch Video Reels</span>
                </div>
                <p className="text-[11px] text-slate-200 font-semibold leading-relaxed">
                  Manood ng trending reels, TikTok, at short videos habang nakakatanggap ng <span className="text-amber-300 font-bold">Red Pocket (🧧) Rewards</span>.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-1.5 hover:border-amber-400/50 transition">
                <div className="flex items-center gap-2 text-yellow-300 font-black text-xs">
                  <div className="p-1.5 bg-yellow-500/20 rounded-lg text-yellow-400 shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <span>3. Spin Wheel & Daily Bonus</span>
                </div>
                <p className="text-[11px] text-slate-200 font-semibold leading-relaxed">
                  Makakuha ng libreng <span className="text-yellow-300 font-bold">₱1.00 daily bonus</span> at instant cash prizes sa pagpaikot ng Gulong ng Kapalaran!
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-1.5 hover:border-amber-400/50 transition">
                <div className="flex items-center gap-2 text-blue-300 font-black text-xs">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <span>4. Z-one Social Feed</span>
                </div>
                <p className="text-[11px] text-slate-200 font-semibold leading-relaxed">
                  Mag-post ng larawan at kwento mula sa gallery. Makipag-interact, mag-like, at mag-comment kasama ang komunidad.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-1.5 hover:border-amber-400/50 transition">
                <div className="flex items-center gap-2 text-indigo-300 font-black text-xs">
                  <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <span>5. Merchant Ads & Negosyo</span>
                </div>
                <p className="text-[11px] text-slate-200 font-semibold leading-relaxed">
                  Mag-post at mag-promote ng iyong sariling online shop o FB Page para makakuha ng libu-libong totoong visitors.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-1.5 hover:border-amber-400/50 transition">
                <div className="flex items-center gap-2 text-emerald-300 font-black text-xs">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400 shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span>6. GCash Cashout System</span>
                </div>
                <p className="text-[11px] text-slate-200 font-semibold leading-relaxed">
                  Mabilis at ligtas na payout diretso sa iyong GCash account kapag naabot ang cashout limit!
                </p>
              </div>

            </div>

            {/* QUICK ACTIONS FOOTER */}
            <div className="bg-slate-900 border border-amber-500/40 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-200 font-bold">
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Gusto mong i-share ang Z-oneApp at kumita ng referral bonus?</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 shadow-md cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-950" />
                <span>Kopyahin ang Promo Banner Text</span>
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default ZoneAppBanner;
