import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  Users,
  Tv,
  Trophy,
  ShoppingBag,
  Wallet,
  Globe,
  ArrowRight,
  Play,
  Heart,
  MessageSquare,
  Share2,
  CheckCircle2,
  Lock,
  Mail,
  User,
  UserPlus,
  AlertCircle,
  RefreshCw,
  Search,
  Download,
  Shield,
  ChevronRight,
  Eye
} from 'lucide-react';
import { ReelVideo, ShopProduct, CreatorChallenge } from '../types';
import { INITIAL_CAMPAIGNS } from '../data/campaigns';
import ZoneAppBanner from './ZoneAppBanner';

interface ZoneLandingExperienceProps {
  language: 'en' | 'tl';
  onToggleLanguage: (lang: 'en' | 'tl') => void;
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
  emailInput: string;
  setEmailInput: (val: string) => void;
  passwordInput: string;
  setPasswordInput: (val: string) => void;
  nameInput: string;
  setNameInput: (val: string) => void;
  referralInput: string;
  setReferralInput: (val: string) => void;
  authError: string | null;
  setAuthError: (val: string | null) => void;
  authLoading: boolean;
  onAuthSubmit: (e: React.FormEvent) => void;
  onExploreDemo: (targetTab?: 'earn' | 'cashout' | 'zone' | 'guide' | 'negosyo' | 'va_shop' | 'kiddie' | 'challenges' | null) => void;
  onOpenReels: () => void;
  onOpenSearch: () => void;
  onSelectShopProduct: (product: ShopProduct) => void;
  reels: ReelVideo[];
  triggerNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

type PreviewFeatureKey = 'feed' | 'reels' | 'communities' | 'challenges' | 'shop' | 'wallet';

export const ZoneLandingExperience: React.FC<ZoneLandingExperienceProps> = ({
  language,
  onToggleLanguage,
  authMode,
  setAuthMode,
  emailInput,
  setEmailInput,
  passwordInput,
  setPasswordInput,
  nameInput,
  setNameInput,
  referralInput,
  setReferralInput,
  authError,
  setAuthError,
  authLoading,
  onAuthSubmit,
  onExploreDemo,
  onOpenReels,
  onOpenSearch,
  onSelectShopProduct,
  reels,
  triggerNotification
}) => {
  const isTl = language === 'tl';
  const [activePreview, setActivePreview] = useState<PreviewFeatureKey>('feed');
  const [publicProducts, setPublicProducts] = useState<ShopProduct[]>([]);
  const [publicChallenges, setPublicChallenges] = useState<CreatorChallenge[]>([]);
  const [exploringDemo, setExploringDemo] = useState(false);

  // Fetch real read-only public items for the live preview cards (Shop & Challenges)
  useEffect(() => {
    let mounted = true;
    fetch('/api/shop/products')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (mounted && data?.products && Array.isArray(data.products)) {
          setPublicProducts(data.products.slice(0, 3));
        }
      })
      .catch(() => {});

    fetch('/api/challenges')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (mounted && data?.challenges && Array.isArray(data.challenges)) {
          setPublicChallenges(data.challenges.slice(0, 3));
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  // Subtle auto-rotation for the live platform preview unless user interacts
  const [userInteractedPreview, setUserInteractedPreview] = useState(false);
  useEffect(() => {
    if (userInteractedPreview) return;
    const keys: PreviewFeatureKey[] = ['feed', 'reels', 'communities', 'challenges', 'shop', 'wallet'];
    const timer = setInterval(() => {
      if (document.hidden) return;
      setActivePreview((curr) => {
        const nextIdx = (keys.indexOf(curr) + 1) % keys.length;
        return keys[nextIdx];
      });
    }, 5500);
    return () => clearInterval(timer);
  }, [userInteractedPreview]);

  const scrollToAuth = (mode?: 'login' | 'register') => {
    if (mode) {
      setAuthMode(mode);
      setAuthError(null);
    }
    const el = document.getElementById('zone-auth-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleTriggerExplore = async (targetTab: 'earn' | 'cashout' | 'zone' | 'guide' | 'negosyo' | 'va_shop' | 'kiddie' | 'challenges' | null = null) => {
    if (exploringDemo) return;
    setExploringDemo(true);
    try {
      await onExploreDemo(targetTab);
    } finally {
      setExploringDemo(false);
    }
  };

  const previewCards: Array<{
    key: PreviewFeatureKey;
    title: string;
    kicker: string;
    summary: string;
    icon: React.ComponentType<{ className?: string }>;
    accentClass: string;
    actionLabel: string;
    onAction: () => void;
  }> = [
    {
      key: 'feed',
      title: 'Social Feed',
      kicker: isTl ? 'Komunidad · Kwento · Koneksyon' : 'Stories · Posts · Connections',
      summary: isTl
        ? 'Mag-bahagi ng larawan, My Day stories, at makipag-usap sa iyong mga kaibigan sa Z-one Social.'
        : 'Share updates, post My Day stories, react to creators, and message friends in real time.',
      icon: Users,
      accentClass: 'text-blue-400',
      actionLabel: isTl ? 'Buksan ang Social Feed' : 'Explore Social Feed',
      onAction: () => handleTriggerExplore('zone')
    },
    {
      key: 'reels',
      title: 'Reels',
      kicker: isTl ? 'Maiikling Video · Red Pocket' : 'Short Videos · Interactive Watch',
      summary: isTl
        ? 'Manood ng mga vertical videos mula sa mga creators at tuklasin ang trending content.'
        : 'Watch vertical short-form videos from creators across entertainment, lifestyle, and local stories.',
      icon: Tv,
      accentClass: 'text-rose-400',
      actionLabel: isTl ? 'Manood ng Reels' : 'Watch Reels',
      onAction: onOpenReels
    },
    {
      key: 'communities',
      title: 'Communities',
      kicker: isTl ? 'Mga Grupo · Talakayan' : 'Topic Hubs · Group Channels',
      summary: isTl
        ? 'Sumali sa mga public at private communities base sa iyong interes, negosyo, o lugar.'
        : 'Join public and private groups built around shared interests, local creators, and digital commerce.',
      icon: Globe,
      accentClass: 'text-indigo-400',
      actionLabel: isTl ? 'Tingnan ang Communities' : 'Explore Communities',
      onAction: () => handleTriggerExplore('zone')
    },
    {
      key: 'challenges',
      title: 'Creator Challenges',
      kicker: isTl ? 'Paligsahan · Botohan · Leaderboard' : 'Missions · Community Voting',
      summary: isTl
        ? 'Sumali sa mga video at photo challenges, bumoto sa paboritong entries, at umakyat sa leaderboard.'
        : 'Participate in creative video and photo challenges, vote for standout entries, and climb the leaderboard.',
      icon: Trophy,
      accentClass: 'text-amber-400',
      actionLabel: isTl ? 'Tingnan ang Challenges' : 'View Challenges',
      onAction: () => handleTriggerExplore('challenges')
    },
    {
      key: 'shop',
      title: 'Z-oneShop',
      kicker: isTl ? 'Marketplace · VA Affiliate Hub' : 'Social Commerce · VA Hub',
      summary: isTl
        ? 'Tuklasin ang mga produkto sa Z-oneShop at gamitin ang Virtual Assistant Hub sa pag-promote.'
        : 'Browse curated products, inspect item details, and share affiliate links through the VA Marketing Hub.',
      icon: ShoppingBag,
      accentClass: 'text-emerald-400',
      actionLabel: isTl ? 'Buksan ang Z-oneShop' : 'Browse Z-oneShop',
      onAction: () => {
        if (publicProducts.length > 0) {
          onSelectShopProduct(publicProducts[0]);
        } else {
          handleTriggerExplore('va_shop');
        }
      }
    },
    {
      key: 'wallet',
      title: 'Rewards / Wallet',
      kicker: isTl ? 'Website Viewer · Daily Check-In' : 'Web Campaigns · Wallet Portal',
      summary: isTl
        ? 'Bisitahin ang mga partner websites, mag-daily check-in, at pamahalaan ang iyong Z-oneApp Wallet.'
        : 'Visit verified partner websites, complete daily check-ins, spin the reward wheel, and track your wallet.',
      icon: Wallet,
      accentClass: 'text-sky-400',
      actionLabel: isTl ? 'Subukan ang Rewards Portal' : 'Explore Rewards Portal',
      onAction: () => handleTriggerExplore('earn')
    }
  ];

  const capabilitiesList = [
    {
      num: '01.',
      title: isTl ? 'Makipag-konekta at Mag-bahagi sa Social Feed' : 'Connect & Share in the Social Feed',
      meta: isTl ? 'Z-one Social · My Day Stories · Direct Messaging' : 'Z-one Social · My Day Stories · Direct Messaging',
      description: isTl
        ? 'Mag-publish ng mga larawan at updates, mag-upload ng 24-hour My Day stories, mag-react sa posts ng kaibigan, at makipag-chat nang real-time.'
        : 'Publish photo updates, share 24-hour My Day stories, react to community posts, and connect with friends through direct and group messaging.',
      cta: isTl ? 'Buksan ang Social Feed' : 'Explore Social Feed',
      onClick: () => handleTriggerExplore('zone')
    },
    {
      num: '02.',
      title: isTl ? 'Manood at Gumawa ng Maiikling Reels' : 'Watch & Create Short-Form Reels',
      meta: isTl ? 'Vertical Video Feed · Creator Discovery · Red Pocket' : 'Vertical Video Feed · Creator Discovery · Watch Rewards',
      description: isTl
        ? 'Mag-scroll sa mga nakakaaliw na short videos mula sa komunidad o i-share ang sarili mong video links para mapanood ng ibang miyembro.'
        : 'Stream short-form vertical videos directly in the floating Reels player, interact with creators, and earn rewards while watching eligible content.',
      cta: isTl ? 'Buksan ang Reels Player' : 'Open Reels Player',
      onClick: onOpenReels
    },
    {
      num: '03.',
      title: isTl ? 'Sumali sa mga Komunidad at Grupo' : 'Discover & Join Topic Communities',
      meta: isTl ? 'Public & Private Hubs · Community Moderation' : 'Public & Private Hubs · Community Discussions',
      description: isTl
        ? 'Maghanap ng mga grupo na akma sa iyong hilig, negosyo, o komunidad at makilahok sa mga talakayan.'
        : 'Find curated communities tailored to creators, local entrepreneurs, and shared interests with dedicated group feeds and member directories.',
      cta: isTl ? 'Tuklasin ang Communities' : 'Discover Communities',
      onClick: () => handleTriggerExplore('zone')
    },
    {
      num: '04.',
      title: isTl ? 'Sumali at Bumoto sa Creator Challenges' : 'Participate in Creator Challenges',
      meta: isTl ? 'Video & Photo Entries · Live Leaderboard' : 'Video & Photo Entries · Live Leaderboard',
      description: isTl
        ? 'Mag-submit ng iyong entry sa mga opisyal na challenges, suportahan ang mga kalahok sa pamamagitan ng pagboto, at subaybayan ang ranggo.'
        : 'Submit original video or photo entries to themed platform challenges, rally community votes, and track real-time leaderboard standings.',
      cta: isTl ? 'Tingnan ang Challenges' : 'Explore Challenges',
      onClick: () => handleTriggerExplore('challenges')
    },
    {
      num: '05.',
      title: isTl ? 'Mamili at Mag-promote sa Z-oneShop' : 'Shop & Promote with Z-oneShop',
      meta: isTl ? 'Product Catalogue · Virtual Assistant Hub' : 'Product Catalogue · Virtual Assistant Hub',
      description: isTl
        ? 'Tingnan ang mga tampok na produkto sa Z-oneShop o gamitin ang VA Marketing Hub para magbahagi ng affiliate product links.'
        : 'Explore verified products in Z-oneShop, track orders, or activate the Virtual Assistant Marketing Hub to share product links with your network.',
      cta: isTl ? 'Tingnan ang Z-oneShop' : 'Open Z-oneShop',
      onClick: () => handleTriggerExplore('va_shop')
    },
    {
      num: '06.',
      title: isTl ? 'Bisitahin ang Websites at Kumita ng Rewards' : 'Explore Web Campaigns & Earn Rewards',
      meta: isTl ? 'Website Viewer · Daily Check-In · GCash Wallet' : 'Website Viewer · Daily Check-In · GCash Wallet',
      description: isTl
        ? 'Buksan ang mga partner websites sa built-in Browser Simulator, kumpletuhin ang daily check-in, at subaybayan ang iyong balanse sa Wallet.'
        : 'Visit partner websites through the interactive Browser Simulator, claim daily check-in bonuses, and manage your balance and payouts in one wallet.',
      cta: isTl ? 'Tingnan ang Campaigns' : 'View Web Campaigns',
      onClick: () => handleTriggerExplore('earn')
    }
  ];

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      {/* Subtle Ambient Background Motion (Compositor-only opacity/transform) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
            opacity: [0.22, 0.3, 0.22]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[380px] rounded-full bg-gradient-to-tr from-blue-600/30 via-indigo-500/20 to-sky-400/10 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.14, 0.22, 0.14]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-[420px] -right-32 w-[460px] h-[460px] rounded-full bg-gradient-to-bl from-indigo-600/20 via-blue-500/15 to-transparent blur-3xl"
        />
      </div>

      {/* 3-ZONE TOP NAVIGATION BAR CONTRACT */}
      <header className="sticky top-0 z-40 bg-[#070B14]/85 backdrop-blur-md border-b border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            className="text-xl sm:text-2xl font-black tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            Z<span className="text-amber-400">-one</span>App
          </a>

          {/* Zone 2: 4-5 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <button
              type="button"
              onClick={() => scrollToSection('platform-preview')}
              className="hover:text-white hover:underline underline-offset-8 transition-colors whitespace-nowrap cursor-pointer"
            >
              {isTl ? 'Preview ng Platform' : 'Platform Preview'}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('what-you-can-do')}
              className="hover:text-white hover:underline underline-offset-8 transition-colors whitespace-nowrap cursor-pointer"
            >
              {isTl ? 'Ano ang Magagawa' : 'What You Can Do'}
            </button>
            <button
              type="button"
              onClick={onOpenReels}
              className="hover:text-white hover:underline underline-offset-8 transition-colors whitespace-nowrap cursor-pointer"
            >
              Reels
            </button>
            <button
              type="button"
              onClick={onOpenSearch}
              className="hover:text-white hover:underline underline-offset-8 transition-colors whitespace-nowrap cursor-pointer"
            >
              {isTl ? 'Tuklasin' : 'Discover'}
            </button>
            <button
              type="button"
              onClick={() => scrollToAuth('login')}
              className="hover:text-white hover:underline underline-offset-8 transition-colors whitespace-nowrap cursor-pointer"
            >
              {isTl ? 'Account' : 'Account'}
            </button>
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onToggleLanguage(isTl ? 'en' : 'tl')}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-colors whitespace-nowrap cursor-pointer"
              title="Switch Language"
            >
              {isTl ? 'EN' : 'TL'}
            </button>
            <button
              type="button"
              onClick={() => scrollToAuth('login')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white border border-white/15 rounded-xl hover:bg-white/5 transition-colors whitespace-nowrap cursor-pointer"
            >
              {isTl ? 'Mag-login' : 'Login'}
            </button>
            <button
              type="button"
              onClick={() => handleTriggerExplore(null)}
              disabled={exploringDemo}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors whitespace-nowrap cursor-pointer shadow-sm disabled:opacity-60"
            >
              <span>{exploringDemo ? (isTl ? 'Binubuksan...' : 'Opening...') : 'Explore Z-oneApp'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION */}
      <section id="top" className="relative z-10 pt-10 pb-12 sm:pt-16 sm:pb-16 lg:pt-20 lg:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          {/* Quiet unboxed kicker metadata */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-blue-300/90 tracking-wide"
          >
            <span>Z-oneApp</span>
            <span aria-hidden="true">·</span>
            <span>{isTl ? 'Social Platform, Creator Hub at Digital Rewards' : 'Social Platform, Creator Hub & Digital Rewards'}</span>
          </motion.div>

          {/* Primary Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.06] max-w-4xl mx-auto"
            style={{ textWrap: 'balance' } as React.CSSProperties}
          >
            Connect. Create.{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-amber-300 bg-clip-text text-transparent">
              Discover. Earn.
            </span>
          </motion.h1>

          {/* Supporting Text */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-lg sm:text-xl md:text-2xl font-bold text-slate-200 tracking-tight max-w-2xl mx-auto"
          >
            Your Zone. Your Community. Your Experience.
          </motion.p>

          {/* Platform Explanation */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.14 }}
            className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal"
          >
            {isTl
              ? 'Isang modernong social platform kung saan maaari kang makipag-ugnayan sa komunidad, manood at gumawa ng Reels, sumali sa Creator Challenges, mamili sa Z-oneShop, at kumita ng rewards.'
              : 'Join an interactive social ecosystem where members share stories, watch short-form Reels, collaborate in communities, compete in creator challenges, shop curated products, and earn daily rewards.'}
          </motion.p>

          {/* 2. PRIMARY & SECONDARY ACTIONS */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.18 }}
            className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 max-w-md sm:max-w-none mx-auto"
          >
            {/* PRIMARY CTA: Explore Z-oneApp */}
            <button
              type="button"
              id="hero-explore-zoneapp-btn"
              onClick={() => handleTriggerExplore(null)}
              disabled={exploringDemo}
              className="px-7 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm sm:text-base shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.99] whitespace-nowrap disabled:opacity-60"
            >
              <Compass className="w-5 h-5 text-amber-300 shrink-0" />
              <span>{exploringDemo ? (isTl ? 'Binubuksan ang Z-oneApp...' : 'Launching Z-oneApp...') : 'Explore Z-oneApp'}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>

            {/* SECONDARY CTA: Login / Create Account */}
            <button
              type="button"
              id="hero-login-create-account-btn"
              onClick={() => scrollToAuth('login')}
              className="px-7 py-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.11] border border-white/15 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] whitespace-nowrap"
            >
              <User className="w-4 h-4 text-blue-300 shrink-0" />
              <span>Login / Create Account</span>
            </button>
          </motion.div>

          {/* Subtle quick-access links below CTAs */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-400">
            <button
              type="button"
              onClick={onOpenReels}
              className="hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 text-rose-400" />
              <span>{isTl ? 'Manood ng Live Reels' : 'Watch Live Reels'}</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={onOpenSearch}
              className="hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5 text-blue-400" />
              <span>{isTl ? 'Mag-search sa Z-oneApp' : 'Search Creators & Topics'}</span>
            </button>
            <span aria-hidden="true">·</span>
            <a
              href="/appstore.html"
              className="hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isTl ? 'I-install ang Web App' : 'Install Mobile Web App'}</span>
            </a>
          </div>
        </div>
      </section>

      {/* 3. PLATFORM PREVIEW SECTION */}
      <section id="platform-preview" className="relative z-10 py-10 sm:py-14 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-blue-400">
                {isTl ? 'Interactive Platform Preview · 6 Core Modules' : 'Interactive Platform Preview · 6 Core Modules'}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {isTl ? 'Silipin ang Loob ng Z-oneApp Ecosystem' : 'Inside the Z-oneApp Ecosystem'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md">
              {isTl
                ? 'Pumili ng kahit anong feature sa ibaba upang makita ang aktwal na karanasan sa loob ng Z-oneApp.'
                : 'Select any feature card below to preview the live experience or jump straight into interactive exploration.'}
            </p>
          </div>

          {/* 6 Feature Preview Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {previewCards.map((item) => {
              const Icon = item.icon;
              const isSelected = activePreview === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setUserInteractedPreview(true);
                    setActivePreview(item.key);
                  }}
                  className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-900/95 border-blue-500/80 shadow-lg shadow-blue-950/50'
                      : 'bg-slate-900/45 border-white/[0.07] hover:border-white/20 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center">
                      <Icon className={`w-4 h-4 ${item.accentClass}`} />
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-blue-400">
                        {isTl ? 'Aktibo' : 'Active'}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {item.kicker}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Live Animated Stage for the Selected Feature Preview */}
          <div className="rounded-3xl bg-slate-900/75 border border-white/10 p-5 sm:p-7 lg:p-8 shadow-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePreview}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center"
              >
                {/* Left Column: Feature Context & Direct Action */}
                <div className="lg:col-span-5 space-y-4">
                  {(() => {
                    const current = previewCards.find((c) => c.key === activePreview) || previewCards[0];
                    const Icon = current.icon;
                    return (
                      <>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                          <Icon className={`w-4 h-4 ${current.accentClass}`} />
                          <span>{current.title}</span>
                          <span aria-hidden="true">·</span>
                          <span>{current.kicker}</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                          {current.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                          {current.summary}
                        </p>
                        <div className="pt-2 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={current.onAction}
                            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <span>{current.actionLabel}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => scrollToAuth('register')}
                            className="px-4 py-2.5 rounded-xl border border-white/15 hover:bg-white/5 text-slate-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {isTl ? 'Gumawa ng Account' : 'Create Free Account'}
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Right Column: Authentic Component Visual Preview */}
                <div className="lg:col-span-7 bg-[#090E1A] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
                  {activePreview === 'feed' && (
                    <div className="space-y-4">
                      {/* My Day Stories Preview Row */}
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                        <div className="text-xs font-bold text-slate-200">
                          {isTl ? 'Z-one Social Feed & My Day Stories' : 'Z-one Social Feed & My Day Stories'}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {isTl ? 'Posts · Reactions · Comments' : 'Posts · Reactions · Comments'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/[0.06] space-y-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-xs font-black text-blue-300">
                              Z
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white">Z-one Community Hub</div>
                              <div className="text-[10px] text-slate-400">Smart Feed · Public Post</div>
                            </div>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {isTl
                              ? 'Mag-post ng iyong kwento, larawan, at hashtags upang makita ng iyong mga kaibigan sa Smart Feed.'
                              : 'Share photo updates, tag #hashtags, and connect with creators across the Smart Feed.'}
                          </p>
                          <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-400">
                            <span className="inline-flex items-center gap-1 text-rose-400">
                              <Heart className="w-3.5 h-3.5" /> Like & React
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5" /> Comment
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Share2 className="w-3.5 h-3.5" /> Share
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/[0.06] flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-white">
                              {isTl ? 'My Day Stories at Direct Chat' : 'My Day Stories & Direct Chat'}
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              {isTl
                                ? 'Mag-upload ng 24-oras na My Day story at makipag-usap sa Friends at Group Chats.'
                                : 'Post 24-hour visual stories and chat directly with friends or community groups.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleTriggerExplore('zone')}
                            className="w-full py-2 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-blue-300 flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span>{isTl ? 'Buksan ang Z-one Social' : 'Open Z-one Social'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activePreview === 'reels' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                        <div className="text-xs font-bold text-white">
                          {isTl ? 'Mga Aktibong Reels sa Platform' : 'Featured Short-Form Reels'}
                        </div>
                        <button
                          type="button"
                          onClick={onOpenReels}
                          className="text-xs font-semibold text-rose-400 hover:underline cursor-pointer"
                        >
                          {isTl ? 'Buksan ang Full Player →' : 'Launch Full Player →'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {(reels || []).slice(0, 3).map((reel) => (
                          <div
                            key={reel.id}
                            onClick={onOpenReels}
                            className="p-3 rounded-xl bg-slate-900 border border-white/[0.07] hover:border-rose-500/40 transition-colors cursor-pointer flex flex-col justify-between gap-2.5"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="uppercase font-semibold text-rose-400">{reel.platform}</span>
                              <span>Reel</span>
                            </div>
                            <p className="text-xs font-bold text-white line-clamp-2 leading-snug">
                              {reel.title}
                            </p>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/[0.05]">
                              <span className="inline-flex items-center gap-1 text-rose-300">
                                <Play className="w-3 h-3" /> {isTl ? 'Panoorin' : 'Watch'}
                              </span>
                              <span>{reel.addedBy || 'Creator'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activePreview === 'communities' && (
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                        <div className="text-xs font-bold text-white">
                          {isTl ? 'Z-one Communities & Groups' : 'Z-one Communities & Groups'}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {isTl ? 'Public · Private · Creator Hubs' : 'Public · Private · Creator Hubs'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-900 border border-white/[0.06] space-y-1.5">
                          <div className="text-xs font-bold text-indigo-300">
                            {isTl ? 'Creator & Digital Negosyo Hubs' : 'Creator & Digital Commerce Hubs'}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {isTl
                              ? 'Makipag-tulungan sa mga kapwa creators, magbahagi ng tips, at lumahok sa mga group discussions.'
                              : 'Collaborate with fellow creators, share community posts, and participate in moderated topic channels.'}
                          </p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-900 border border-white/[0.06] space-y-1.5">
                          <div className="text-xs font-bold text-emerald-300">
                            {isTl ? 'Gumawa ng Sariling Community' : 'Build Your Own Community'}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {isTl
                              ? 'Mag-set up ng public o private group para sa iyong team, followers, o negosyo.'
                              : 'Create public or private communities with member management, custom categories, and shared feeds.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activePreview === 'challenges' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                        <div className="text-xs font-bold text-white">
                          {isTl ? 'Creator Challenges & Missions' : 'Creator Challenges & Community Voting'}
                        </div>
                        <span className="text-[11px] text-amber-300 font-semibold">
                          {isTl ? 'Opisyal na Paligsahan' : 'Live Platform Challenges'}
                        </span>
                      </div>
                      {publicChallenges.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {publicChallenges.slice(0, 2).map((ch) => (
                            <div
                              key={ch.id}
                              onClick={() => handleTriggerExplore('challenges')}
                              className="p-3.5 rounded-xl bg-slate-900 border border-white/[0.07] hover:border-amber-400/40 transition-colors cursor-pointer space-y-2"
                            >
                              <div className="flex items-center justify-between text-[11px] text-amber-300">
                                <span className="font-semibold">{ch.category || 'Challenge'}</span>
                                <span className="font-mono font-bold">
                                  ₱{Number(ch.prizePool || 0).toLocaleString()} Prize Pool
                                </span>
                              </div>
                              <div className="text-xs font-bold text-white line-clamp-1">{ch.title}</div>
                              <p className="text-[11px] text-slate-400 line-clamp-2">{ch.description}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-900 border border-white/[0.06] text-xs text-slate-300">
                          {isTl
                            ? 'Mag-upload ng iyong video o photo entry sa mga aktibong Creator Challenges at makakuha ng boto mula sa komunidad.'
                            : 'Submit video or photo entries to active Creator Challenges and rally votes from the community leaderboard.'}
                        </div>
                      )}
                    </div>
                  )}

                  {activePreview === 'shop' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                        <div className="text-xs font-bold text-white">
                          {isTl ? 'Z-oneShop Featured Catalogue' : 'Z-oneShop Featured Catalogue'}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTriggerExplore('va_shop')}
                          className="text-xs font-semibold text-emerald-400 hover:underline cursor-pointer"
                        >
                          {isTl ? 'Tingnan ang Buong Shop →' : 'Open Full Shop →'}
                        </button>
                      </div>
                      {publicProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {publicProducts.slice(0, 3).map((prod) => (
                            <div
                              key={prod.id}
                              onClick={() => onSelectShopProduct(prod)}
                              className="p-3 rounded-xl bg-slate-900 border border-white/[0.07] hover:border-emerald-400/40 transition-colors cursor-pointer flex flex-col justify-between gap-2"
                            >
                              <div className="text-[10px] text-slate-400 truncate">
                                {prod.category || 'Z-oneShop'}
                              </div>
                              <div className="text-xs font-bold text-white line-clamp-2 leading-snug">
                                {prod.name}
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-white/[0.05] text-xs">
                                <span className="font-mono font-bold text-emerald-400">
                                  ₱{Number(prod.price || 0).toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {isTl ? 'Tingnan' : 'Inspect'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-900 border border-white/[0.06] text-xs text-slate-300">
                          {isTl
                            ? 'Tuklasin ang mga produkto sa Z-oneShop at gamitin ang VA Marketing Hub upang kumita sa pag-share.'
                            : 'Browse curated items in Z-oneShop and share affiliate product links through the VA Marketing Hub.'}
                        </div>
                      )}
                    </div>
                  )}

                  {activePreview === 'wallet' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                        <div className="text-xs font-bold text-white">
                          {isTl ? 'Website Viewer Campaigns & Rewards Wallet' : 'Website Viewer Campaigns & Rewards Wallet'}
                        </div>
                        <span className="text-[11px] text-sky-300 font-semibold">
                          {isTl ? 'Verified Campaigns' : 'Verified Campaigns'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {INITIAL_CAMPAIGNS.slice(0, 2).map((camp) => (
                          <div
                            key={camp.id}
                            onClick={() => handleTriggerExplore('earn')}
                            className="p-3.5 rounded-xl bg-slate-900 border border-white/[0.07] hover:border-sky-400/40 transition-colors cursor-pointer space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>{camp.category}</span>
                              <span className="font-mono font-bold text-emerald-400">
                                +₱{camp.reward.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-white line-clamp-1">{camp.title}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                              <Eye className="w-3.5 h-3.5 text-sky-400" />
                              <span>{camp.timer}s interactive homepage view</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* 4. "WHAT CAN YOU DO ON Z-ONEAPP?" SECTION */}
      <section id="what-you-can-do" className="relative z-10 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="max-w-2xl space-y-2">
            <div className="text-xs font-semibold text-amber-400">
              {isTl ? 'Kompletong Karanasan sa Platform' : 'Platform Capabilities'}
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              What can you do on Z-oneApp?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {isTl
                ? 'Lahat ng kailangan mo para makipag-kaibigan, mag-express ng sarili, tumuklas ng produkto, at makilahok ay nasa iisang platform.'
                : 'Everything you need to connect with friends, publish creative content, discover local commerce, and earn rewards in one unified platform.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilitiesList.map((cap) => (
              <div
                key={cap.num}
                className="p-6 rounded-2xl bg-slate-900/55 border border-white/[0.08] hover:border-white/20 transition-colors flex flex-col justify-between gap-5"
              >
                <div className="space-y-2.5">
                  <div className="text-xs font-mono font-bold text-blue-400">
                    {cap.num} <span className="font-sans font-normal text-slate-400">· {cap.meta}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                    {cap.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {cap.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={cap.onClick}
                  className="pt-3 border-t border-white/[0.06] text-xs font-bold text-blue-300 hover:text-white inline-flex items-center justify-between w-full transition-colors cursor-pointer"
                >
                  <span>{cap.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. EXISTING AUTHENTICATION & ACCOUNT ACCESS SECTION */}
      <section id="zone-auth-section" className="relative z-10 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] bg-[#050811]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Account Benefits & Official Platform Overview Banner */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-blue-400">
                {isTl ? 'Simulan ang Iyong Karanasan' : 'Get Started on Z-oneApp'}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {isTl
                  ? 'Mag-login o Gumawa ng Libreng Account'
                  : 'Sign In or Create Your Z-oneApp Account'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {isTl
                  ? 'Mag-sign in upang ma-save ang iyong profile, makapag-post sa Social Feed, makasali sa Creator Challenges, at ma-access ang iyong Wallet.'
                  : 'Sign in to save your profile, post in the Social Feed, join Creator Challenges, shop in Z-oneShop, and manage your personal Wallet.'}
              </p>
            </div>

            {/* Key Account Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/[0.07] space-y-1">
                <div className="font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isTl ? 'Welcome Bonus sa Bagong Account' : 'Instant Welcome Starter Balance'}</span>
                </div>
                <p className="text-slate-400 leading-relaxed pl-6">
                  {isTl
                    ? 'May kasamang panimulang bonus sa iyong unang pag-register.'
                    : 'New members receive a starter welcome bonus upon registration.'}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/[0.07] space-y-1">
                <div className="font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>{isTl ? '1-Device Safety & Kiddie Mode' : 'Account Safety & Z-oneKiddie'}</span>
                </div>
                <p className="text-slate-400 leading-relaxed pl-6">
                  {isTl
                    ? 'May proteksyon sa account at ligtas na portal para sa kabataan.'
                    : 'Protected with device security binding and a dedicated safe portal.'}
                </p>
              </div>
            </div>

            {/* Existing Official Promo Banner Component (Preserved Intact) */}
            <ZoneAppBanner
              language={language}
              triggerNotification={triggerNotification}
              compact={true}
            />
          </div>

          {/* Right Column: Existing Authentication Form Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 relative">
              {/* Form Tab Toggles */}
              <div className="flex border-b border-slate-800 gap-2 text-xs font-black">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                  }}
                  className={`flex-1 py-2.5 transition rounded-t-xl cursor-pointer text-center whitespace-nowrap ${
                    authMode === 'login'
                      ? 'border-b-2 border-blue-500 text-blue-400 bg-slate-800/40'
                      : 'text-slate-500 hover:text-slate-400'
                  }`}
                >
                  Naka-rehistro (Login)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError(null);
                  }}
                  className={`flex-1 py-2.5 transition rounded-t-xl cursor-pointer text-center whitespace-nowrap ${
                    authMode === 'register'
                      ? 'border-b-2 border-blue-500 text-blue-400 bg-slate-800/40'
                      : 'text-slate-500 hover:text-slate-400'
                  }`}
                >
                  Gawa ng Account (Register)
                </button>
              </div>

              {/* AUTH FORM (Connected 100% to existing handleAuthSubmit) */}
              <form onSubmit={onAuthSubmit} className="space-y-3.5 text-xs text-slate-300">
                {/* Name - Register only */}
                {authMode === 'register' && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-400 flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      <span>Buong Pangalan (Profile Name-Admin Visibility)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Hal. Juan Dela Cruz"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 hover:border-slate-700 p-3 rounded-xl outline-none font-bold text-white transition placeholder:font-normal placeholder:text-slate-600"
                    />
                  </div>
                )}

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-4 h-4" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Hal. juan.delacruz@gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 hover:border-slate-700 p-3 rounded-xl outline-none font-bold text-white transition placeholder:font-normal placeholder:text-slate-600"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-400 flex items-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    <span>Password</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Wag kalimutan"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 hover:border-slate-700 p-3 rounded-xl outline-none font-bold text-white transition placeholder:font-normal placeholder:text-slate-600"
                  />
                </div>

                {/* Optional Referral Code - Register only */}
                {authMode === 'register' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-emerald-400" />
                      <span>Referral Code (Opsyonal - pwedeng maiwan na blangko)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Hal. REF-123456"
                      value={referralInput}
                      onChange={(e) => setReferralInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 hover:border-slate-700 p-3 rounded-xl outline-none font-bold text-white transition placeholder:font-normal placeholder:text-slate-600 truncate uppercase"
                    />
                  </div>
                )}

                {/* Feedbacks */}
                {authError && (
                  <div className="p-3 bg-red-950/85 border border-red-900 rounded-xl flex items-start gap-2 text-[11px] text-red-300 leading-normal">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span className="font-bold text-rose-300">{authError}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full zone-btn zone-btn-primary zone-btn-lg text-xs uppercase tracking-wider cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  {authLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : authMode === 'login' ? (
                    'I-verify at Mag-login'
                  ) : (
                    'Gumawa ng Account at Simulan'
                  )}
                </button>
              </form>

              {/* Quick Demo Exploration Option inside Auth Card */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">
                  {isTl ? 'Gusto mo munang subukan?' : 'Want to look around first?'}
                </span>
                <button
                  type="button"
                  onClick={() => handleTriggerExplore(null)}
                  disabled={exploringDemo}
                  className="font-bold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Explore Z-oneApp</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-center text-[11px] text-slate-500 leading-normal max-w-sm mx-auto mt-4">
              {isTl
                ? 'Sa pamamagitan ng pag-sign in, sumasang-ayon ka sa aming Community Guidelines at Terms of Use.'
                : 'By signing in, you agree to our Community Guidelines and Terms of Use.'}
            </p>
          </div>
        </div>
      </section>

      {/* QUIET FOOTER */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-[#04070E] py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-white">
              Z<span className="text-amber-400">-one</span>App
            </span>
            <span aria-hidden="true">·</span>
            <span>Connect. Create. Discover. Earn.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => scrollToSection('platform-preview')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              {isTl ? 'Preview' : 'Preview'}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('what-you-can-do')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              {isTl ? 'Mga Tampok' : 'Features'}
            </button>
            <button
              type="button"
              onClick={onOpenReels}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Reels
            </button>
            <button
              type="button"
              onClick={() => scrollToAuth('login')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              {isTl ? 'Mag-login' : 'Login'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ZoneLandingExperience;
