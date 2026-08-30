import React from 'react';
import { 
  Users, 
  ShoppingBag, 
  Globe, 
  Wallet, 
  Megaphone, 
  HelpCircle, 
  Shield, 
  Gift,
  Share2,
  Tv,
  Camera,
  PlayCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Coins,
  Receipt,
  Eye,
  CalendarCheck,
  TrendingUp,
  CreditCard,
  Building2,
  Bell,
  Smartphone
} from 'lucide-react';
import { motion } from 'motion/react';
import { soundEffects } from '../utils/audio';

import { WithdrawalRequest, ActivityLog } from '../types';

export type AppTabType = 'earn' | 'cashout' | 'zone' | 'guide' | 'admin' | 'negosyo' | 'va_shop' | 'kiddie';

export interface AppLauncherItem {
  id: AppTabType | 'spin' | 'referral' | 'myday' | 'commercials' | 'reels' | 'policy' | 'data_saver' | 'verify' | 'device_transfer';
  title: string;
  subtitle?: string;
  badge?: string;
  badgeBg?: string;
  badgeTextColor?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  actionType: 'tab' | 'handler';
  tabTarget?: AppTabType;
}

interface SmartphoneAppLauncherProps {
  activeTab?: AppTabType | null;
  onSelectTab: (tab: AppTabType) => void;
  isAdmin?: boolean;
  language?: 'tl' | 'en';
  balance?: number;
  isDataSaverActive?: boolean;
  user?: {
    name?: string;
    avatar?: string;
    email?: string;
    isVerified?: boolean;
    isMinor?: boolean;
    accountSafetyStatus?: string;
  } | null;
  stats?: {
    totalEarned?: number;
    totalTasksCompleted?: number;
    referralCount?: number;
    balance?: number;
    lifetimeEarnings?: number;
    completedTasksCount?: number;
    dailyCheckInDate?: string | null;
  } | null;
  activityLogs?: ActivityLog[];
  withdrawals?: WithdrawalRequest[];
  onOpenSpinWheel?: () => void;
  onOpenReferral?: () => void;
  onOpenCommercials?: () => void;
  onOpenReels?: () => void;
  onOpenPolicy?: () => void;
  onOpenProfile?: () => void;
  onOpenNotifications?: () => void;
  onOpenDataSaver?: () => void;
  onOpenVerification?: () => void;
  onOpenDeviceTransfer?: () => void;
}

export const SmartphoneAppLauncher: React.FC<SmartphoneAppLauncherProps> = ({
  activeTab,
  onSelectTab,
  isAdmin = false,
  language = 'tl',
  balance = 0,
  isDataSaverActive = false,
  user,
  stats,
  activityLogs = [],
  withdrawals = [],
  onOpenSpinWheel,
  onOpenReferral,
  onOpenCommercials,
  onOpenReels,
  onOpenPolicy,
  onOpenProfile,
  onOpenNotifications,
  onOpenDataSaver,
  onOpenVerification,
  onOpenDeviceTransfer
}) => {
  const isTl = language === 'tl';

  // Real existing features mapped to clean 4-column modern cards
  const coreLauncherGrid: AppLauncherItem[] = [
    {
      id: 'earn',
      title: isTl ? 'Website Viewer' : 'Website Viewer',
      subtitle: 'Browse & Earn',
      icon: Globe,
      iconBg: 'bg-blue-50 text-blue-600',
      iconColor: 'text-blue-600',
      badge: '₱0.75+',
      badgeBg: 'bg-emerald-100',
      badgeTextColor: 'text-emerald-800',
      actionType: 'tab',
      tabTarget: 'earn'
    },
    {
      id: 'spin',
      title: isTl ? 'Daily Rewards' : 'Daily Rewards',
      subtitle: 'Spin & Win',
      icon: CalendarCheck,
      iconBg: 'bg-indigo-50 text-indigo-600',
      iconColor: 'text-indigo-600',
      badge: 'Daily',
      badgeBg: 'bg-indigo-100',
      badgeTextColor: 'text-indigo-800',
      actionType: 'handler'
    },
    {
      id: 'kiddie',
      title: isTl ? 'Z-oneKiddie' : 'Z-oneKiddie',
      subtitle: isTl ? 'Safe for Kids' : 'Safe for Kids',
      icon: Sparkles,
      iconBg: 'bg-purple-50 text-purple-600',
      iconColor: 'text-purple-600',
      badge: 'Kids ⭐',
      badgeBg: 'bg-purple-100',
      badgeTextColor: 'text-purple-800',
      actionType: 'tab',
      tabTarget: 'kiddie'
    },
    {
      id: 'cashout',
      title: isTl ? 'Cash-Out' : 'Withdraw',
      subtitle: 'GCash Payout',
      icon: Wallet,
      iconBg: 'bg-blue-50 text-blue-600',
      iconColor: 'text-blue-600',
      badge: 'GCash',
      badgeBg: 'bg-blue-100',
      badgeTextColor: 'text-blue-800',
      actionType: 'tab',
      tabTarget: 'cashout'
    },
    {
      id: 'zone',
      title: isTl ? 'Z-one Social' : 'Z-one Social',
      subtitle: 'Community Feed',
      icon: Users,
      iconBg: 'bg-blue-50 text-blue-600',
      iconColor: 'text-blue-600',
      badge: 'Feed',
      badgeBg: 'bg-blue-100',
      badgeTextColor: 'text-blue-800',
      actionType: 'tab',
      tabTarget: 'zone'
    },
    {
      id: 'referral',
      title: isTl ? 'Referral' : 'Referral',
      subtitle: 'Invite Friends',
      icon: Share2,
      iconBg: 'bg-sky-50 text-sky-600',
      iconColor: 'text-sky-600',
      badge: '+₱20',
      badgeBg: 'bg-sky-100',
      badgeTextColor: 'text-sky-800',
      actionType: 'handler'
    },
    {
      id: 'va_shop',
      title: isTl ? 'VA & Store' : 'VA & Store',
      subtitle: '₱500 Goal & Shop',
      icon: ShoppingBag,
      iconBg: 'bg-pink-50 text-pink-600',
      iconColor: 'text-pink-600',
      badge: 'Store',
      badgeBg: 'bg-pink-100',
      badgeTextColor: 'text-pink-800',
      actionType: 'tab',
      tabTarget: 'va_shop'
    },
    {
      id: 'negosyo',
      title: isTl ? 'Negosyo' : 'Business Ads',
      subtitle: 'Promote Traffic',
      icon: Megaphone,
      iconBg: 'bg-amber-50 text-amber-600',
      iconColor: 'text-amber-600',
      badge: 'Ads',
      badgeBg: 'bg-amber-100',
      badgeTextColor: 'text-amber-800',
      actionType: 'tab',
      tabTarget: 'negosyo'
    },
    {
      id: 'guide',
      title: isTl ? 'Support & Help' : 'Support & Help',
      subtitle: 'FAQs & Guide',
      icon: HelpCircle,
      iconBg: 'bg-purple-50 text-purple-600',
      iconColor: 'text-purple-600',
      badge: 'Help',
      badgeBg: 'bg-purple-100',
      badgeTextColor: 'text-purple-800',
      actionType: 'tab',
      tabTarget: 'guide'
    },
    {
      id: 'reels',
      title: isTl ? 'Watch Reels' : 'Watch Reels',
      subtitle: isTl ? 'Panoorin & Kumita' : 'Watch & Earn',
      icon: Tv,
      iconBg: 'bg-rose-50 text-rose-600',
      iconColor: 'text-rose-600',
      badge: 'Reels',
      badgeBg: 'bg-rose-100',
      badgeTextColor: 'text-rose-800',
      actionType: 'handler'
    },
    {
      id: 'myday',
      title: isTl ? 'My Day' : 'My Day',
      subtitle: 'Stories & Moments',
      icon: Camera,
      iconBg: 'bg-emerald-50 text-emerald-600',
      iconColor: 'text-emerald-600',
      badge: 'Live',
      badgeBg: 'bg-emerald-100',
      badgeTextColor: 'text-emerald-800',
      actionType: 'tab',
      tabTarget: 'zone'
    },
    {
      id: 'verify',
      title: isTl ? 'Safety ID' : 'Age & ID',
      subtitle: isTl ? 'Community Safety' : 'Verification',
      icon: Shield,
      iconBg: user?.accountSafetyStatus === 'verified_adult' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
      iconColor: user?.accountSafetyStatus === 'verified_adult' ? 'text-emerald-600' : 'text-amber-600',
      badge: user?.accountSafetyStatus === 'verified_adult' ? '18+ ✅' : 'Verify',
      badgeBg: user?.accountSafetyStatus === 'verified_adult' ? 'bg-emerald-100' : 'bg-amber-100',
      badgeTextColor: user?.accountSafetyStatus === 'verified_adult' ? 'text-emerald-800' : 'text-amber-800',
      actionType: 'handler'
    },
    {
      id: 'device_transfer',
      title: isTl ? 'Lipat Phone' : 'Device Switch',
      subtitle: isTl ? '1-Account Safety' : 'Transfer Binding',
      icon: Smartphone,
      iconBg: 'bg-indigo-50 text-indigo-600',
      iconColor: 'text-indigo-600',
      badge: 'OTP',
      badgeBg: 'bg-indigo-100',
      badgeTextColor: 'text-indigo-800',
      actionType: 'handler'
    },
    {
      id: 'policy',
      title: isTl ? 'Payout Policy' : 'Payout Policy',
      subtitle: 'Rules & Schedule',
      icon: Receipt,
      iconBg: 'bg-slate-100 text-slate-700',
      iconColor: 'text-slate-700',
      badge: '5th & 20th',
      badgeBg: 'bg-slate-200',
      badgeTextColor: 'text-slate-800',
      actionType: 'handler'
    },
    {
      id: 'data_saver',
      title: isTl ? 'Data Saver' : 'Data Saver',
      subtitle: isDataSaverActive ? 'Active' : 'Off',
      icon: Smartphone,
      iconBg: isDataSaverActive ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700',
      iconColor: isDataSaverActive ? 'text-amber-700' : 'text-slate-700',
      badge: isDataSaverActive ? 'ON' : 'OFF',
      badgeBg: isDataSaverActive ? 'bg-amber-200' : 'bg-slate-200',
      badgeTextColor: isDataSaverActive ? 'text-amber-900' : 'text-slate-700',
      actionType: 'handler'
    }
  ];

  if (isAdmin) {
    coreLauncherGrid.push({
      id: 'admin',
      title: isTl ? 'Admin Control' : 'Admin Control',
      subtitle: 'Management Panel',
      icon: Shield,
      iconBg: 'bg-red-50 text-red-600',
      iconColor: 'text-red-600',
      badge: 'Root',
      badgeBg: 'bg-red-100',
      badgeTextColor: 'text-red-800',
      actionType: 'tab',
      tabTarget: 'admin'
    });
  }

  const handleTileClick = (item: AppLauncherItem) => {
    try { soundEffects.playClick(); } catch (e) {}

    if (item.actionType === 'tab' && item.tabTarget) {
      onSelectTab(item.tabTarget);
    } else if (item.id === 'spin' && onOpenSpinWheel) {
      onOpenSpinWheel();
    } else if (item.id === 'referral' && onOpenReferral) {
      onOpenReferral();
    } else if (item.id === 'verify' && onOpenVerification) {
      onOpenVerification();
    } else if (item.id === 'device_transfer' && onOpenDeviceTransfer) {
      onOpenDeviceTransfer();
    } else if ((item.id === 'reels' || item.id === 'commercials')) {
      if (onOpenReels) {
        onOpenReels();
      } else if (onOpenCommercials) {
        onOpenCommercials();
      } else {
        window.dispatchEvent(new Event('open-reels-widget'));
        const openBtn = document.getElementById('reels-widget-open-btn');
        if (openBtn) openBtn.click();
      }
    } else if (item.id === 'policy' && onOpenPolicy) {
      onOpenPolicy();
    } else if (item.id === 'data_saver' && onOpenDataSaver) {
      onOpenDataSaver();
    } else if (item.id === 'myday') {
      onSelectTab('zone');
    }
  };

  return (
    <div id="z-one-mobile-dashboard-container" className="w-full max-w-md mx-auto bg-slate-100 min-h-screen text-slate-900 pb-28 shadow-2xl sm:rounded-3xl overflow-hidden sm:border sm:border-slate-200 select-none">
      
      {/* 👑 ROYAL BLUE HEADER (Matching Reference Image - Phone 1) */}
      <header className="bg-gradient-to-b from-[#0b3b7c] via-[#0d4a9b] to-[#0f54b0] text-white pt-4 sm:pt-6 pb-4 sm:pb-5 px-3.5 sm:px-5 rounded-b-[24px] sm:rounded-b-[32px] shadow-lg relative overflow-hidden">
        {/* Subtle background ambient rings */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-1/2 -left-12 w-40 h-40 bg-blue-400/15 rounded-full blur-2xl pointer-events-none" />

        {/* Top Brand Bar */}
        <div className="flex items-center justify-between relative z-10 mb-3 sm:mb-4">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-xl sm:text-2xl tracking-tight text-white">
              <span className="text-white">Z</span>
              <span className="text-yellow-400">-one</span>
              <span className="text-white">App</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNotifications}
              type="button"
              className="relative p-2 sm:p-2.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition text-white cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-yellow-400 rounded-full ring-2 ring-[#0d4a9b]" />
            </button>
          </div>
        </div>

        {/* User Greeting & Profile Row */}
        <div className="flex items-center justify-between gap-2.5 relative z-10">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* User Avatar */}
            <div 
              onClick={onOpenProfile}
              className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white/20 p-0.5 ring-2 ring-white/40 overflow-hidden cursor-pointer hover:scale-105 transition shrink-0"
            >
              {user?.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:') || user.avatar.startsWith('blob:')) ? (
                <img 
                  src={user.avatar} 
                  alt={user.name || 'User'} 
                  className="w-full h-full rounded-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center text-slate-950 font-black text-base sm:text-lg">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>

            <div className="space-y-0.5 min-w-0">
              <p className="text-[10.5px] sm:text-xs text-blue-100 font-medium">{isTl ? 'Magandang araw!' : 'Good day!'}</p>
              <h2 className="text-xs sm:text-base font-extrabold text-white leading-tight truncate max-w-[160px] sm:max-w-[200px]">
                {user?.name ? `${isTl ? 'Maligayang pagbalik,' : 'Welcome back,'} ${user.name}` : (isTl ? 'Maligayang Pagdating!' : 'Welcome back!')}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-xs text-blue-50 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                  <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-300" />
                  <span>{isTl ? 'Beripikadong Clicker' : 'Verified User'}</span>
                </div>

                {user?.accountSafetyStatus === 'verified_adult' ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                    🛡️ 18+ Adult
                  </span>
                ) : user?.accountSafetyStatus === 'minor_restricted' || user?.isMinor ? (
                  <span className="inline-flex items-center gap-1 bg-purple-500/30 text-purple-200 border border-purple-400/40 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                    🧒 Z-oneKiddie Safe
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenVerification}
                    className="inline-flex items-center gap-1 bg-yellow-400/30 hover:bg-yellow-400/50 text-yellow-200 border border-yellow-300/40 text-[9px] font-black px-2 py-0.5 rounded-full cursor-pointer transition animate-pulse"
                  >
                    ⚠️ {isTl ? 'I-verify ang ID' : 'Verify Age/ID'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 💳 AVAILABLE BALANCE CARD (Inside Header) */}
        <div className="mt-3 sm:mt-4 bg-gradient-to-r from-[#082958] via-[#093574] to-[#0a408e] border border-white/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xl flex items-center justify-between gap-3 relative z-10">
          <div>
            <span className="text-[9.5px] sm:text-[11px] font-bold text-blue-200 uppercase tracking-wider block">
              {isTl ? 'Kasalukuyang Pondo (Available Balance)' : 'Available Balance'}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
                ₱ {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              try { soundEffects.playClick(); } catch (e) {}
              onSelectTab('cashout');
            }}
            type="button"
            className="bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-extrabold text-[11px] sm:text-xs px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer border border-blue-300/30 shrink-0"
          >
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span>{isTl ? 'Wallet' : 'Wallet'}</span>
          </button>
        </div>
      </header>

      {/* 📱 4-COLUMN FEATURE GRID (White Rounded Cards) */}
      <main className="px-2.5 sm:px-4 pt-3 sm:pt-4 space-y-3 sm:space-y-4">
        
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
          {coreLauncherGrid.map((item) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                id={`feature-tile-${item.id}`}
                onClick={() => handleTileClick(item)}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                type="button"
                className="bg-white rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md border border-slate-100 hover:border-blue-100 transition cursor-pointer relative group min-h-[78px] sm:min-h-[92px]"
              >
                {/* Icon Container */}
                <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center ${item.iconBg} mb-1 sm:mb-1.5 shadow-xs transition group-hover:scale-110`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
                </div>

                {/* Title */}
                <span className="text-[9.5px] sm:text-[11px] font-bold text-slate-800 leading-tight line-clamp-2 px-0.5">
                  {item.title}
                </span>

                {/* Tiny Badge */}
                {item.badge && (
                  <span className={`absolute top-1 right-1 ${item.badgeBg} ${item.badgeTextColor} text-[6.5px] sm:text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-xs`}>
                    {item.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* 📢 PROMOTIONAL BANNER CARD (Website Viewer CTA) */}
        <div 
          onClick={() => {
            try { soundEffects.playClick(); } catch (e) {}
            onSelectTab('earn');
          }}
          className="bg-gradient-to-r from-[#0b284e] via-[#0d3b6f] to-[#124b8d] rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white shadow-md flex items-center justify-between gap-3 cursor-pointer hover:opacity-95 active:scale-[0.99] transition border border-blue-900/40 relative overflow-hidden"
        >
          <div className="space-y-1.5 relative z-10">
            <h3 className="text-[11px] sm:text-sm font-black text-white leading-tight max-w-[190px] sm:max-w-[200px]">
              {isTl ? 'Kumita nang higit pa sa panonood ng websites at pag-click!' : 'Earn more by viewing websites and completing tasks!'}
            </h3>
            <button
              type="button"
              className="bg-blue-500 hover:bg-blue-400 text-white font-extrabold text-[10px] sm:text-[11px] px-3 py-1 sm:py-1.5 rounded-lg shadow-sm inline-flex items-center gap-1 cursor-pointer transition"
            >
              <span>{isTl ? 'Tingnan Ngayon' : 'View Now'}</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>

          <div className="relative shrink-0 pr-1 sm:pr-2">
            <div className="w-13 h-12 sm:w-16 sm:h-14 bg-blue-400/20 rounded-xl flex items-center justify-center border border-blue-300/30">
              <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-300 animate-pulse" />
            </div>
          </div>
        </div>

        {/* 📋 RECENT TRANSACTIONS / ACTIVITY CARD */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200 space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
              <span>{isTl ? 'Kamakailang Transaksyon' : 'Recent Transactions'}</span>
            </h4>
            <button
              onClick={() => {
                try { soundEffects.playClick(); } catch (e) {}
                onSelectTab('cashout');
              }}
              type="button"
              className="text-[10px] sm:text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              {isTl ? 'Tingnan lahat' : 'View all'}
            </button>
          </div>

          {(() => {
            // Real recent logs from user's actual account activity
            const recentLogs = Array.isArray(activityLogs) && activityLogs.length > 0
              ? activityLogs.slice(0, 4)
              : [];

            const getActivityLogVisual = (log: ActivityLog) => {
              const titleLower = (log.title || '').toLowerCase();
              const type = log.type;

              if (type === 'withdraw' || titleLower.includes('withdraw') || titleLower.includes('cashout') || titleLower.includes('cash-out')) {
                return {
                  icon: Wallet,
                  iconBg: 'bg-rose-50 text-rose-600',
                  amountClass: 'text-rose-600',
                  isNegative: true,
                  badge: isTl ? 'GCash Cash-Out' : 'Cashout'
                };
              }
              if (titleLower.includes('daily') || titleLower.includes('check-in') || titleLower.includes('login') || titleLower.includes('araw')) {
                return {
                  icon: CalendarCheck,
                  iconBg: 'bg-indigo-50 text-indigo-600',
                  amountClass: 'text-emerald-600',
                  isNegative: false,
                  badge: isTl ? 'Daily Login Reward' : 'Daily Check-in'
                };
              }
              if (titleLower.includes('referral') || titleLower.includes('invite') || titleLower.includes('ref') || titleLower.includes('sumali')) {
                return {
                  icon: Share2,
                  iconBg: 'bg-sky-50 text-sky-600',
                  amountClass: 'text-emerald-600',
                  isNegative: false,
                  badge: isTl ? 'Affiliate Referral' : 'Referral Bonus'
                };
              }
              if (titleLower.includes('spin') || titleLower.includes('wheel') || titleLower.includes('gulong') || titleLower.includes('jackpot')) {
                return {
                  icon: Gift,
                  iconBg: 'bg-amber-50 text-amber-600',
                  amountClass: 'text-emerald-600',
                  isNegative: false,
                  badge: isTl ? 'Lucky Spin Wheel' : 'Spin Reward'
                };
              }
              if (titleLower.includes('reel') || titleLower.includes('pocket') || titleLower.includes('video') || titleLower.includes('commercial') || titleLower.includes('reels')) {
                return {
                  icon: Tv,
                  iconBg: 'bg-purple-50 text-purple-600',
                  amountClass: 'text-emerald-600',
                  isNegative: false,
                  badge: isTl ? 'Watch & Earn Video' : 'Reels Reward'
                };
              }
              if (titleLower.includes('welcome') || titleLower.includes('bonus') || titleLower.includes('sign-up') || titleLower.includes('regalo')) {
                return {
                  icon: Sparkles,
                  iconBg: 'bg-amber-50 text-amber-600',
                  amountClass: 'text-emerald-600',
                  isNegative: false,
                  badge: isTl ? 'Welcome Bonus' : 'Welcome Bonus'
                };
              }
              // Default Website viewer reward
              return {
                icon: Globe,
                iconBg: 'bg-blue-50 text-blue-600',
                amountClass: 'text-emerald-600',
                isNegative: false,
                badge: isTl ? 'Website Viewer Reward' : 'Website Viewer Reward'
              };
            };

            if (recentLogs.length === 0) {
              return (
                <div className="py-3 text-center space-y-1.5">
                  <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-100">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] font-bold text-slate-700">
                    {isTl ? 'Wala pang kamakailang transaksyon' : 'No recent transactions yet'}
                  </p>
                  <p className="text-[9px] text-slate-400 max-w-[240px] mx-auto leading-tight">
                    {isTl ? 'Magsimulang mag-view ng website o mag-check-in para maitala ang iyong tunay na kita!' : 'Start viewing websites or check in daily to record your real earnings!'}
                  </p>
                </div>
              );
            }

            return (
              <div className="divide-y divide-slate-100">
                {recentLogs.map((log) => {
                  const visual = getActivityLogVisual(log);
                  const IconComp = visual.icon;
                  return (
                    <div key={log.id} className="py-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl ${visual.iconBg} flex items-center justify-center shrink-0`}>
                          <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] sm:text-xs font-bold text-slate-800 truncate">{log.title}</p>
                          <p className="text-[9px] sm:text-[10px] text-slate-400 truncate">
                            {log.timestamp || log.details || visual.badge}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[11px] sm:text-xs font-black font-mono shrink-0 ${visual.amountClass}`}>
                        {visual.isNegative ? '-' : '+'} ₱{Math.abs(Number(log.amount) || 0).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

      </main>

    </div>
  );
};
