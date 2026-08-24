import React from 'react';
import { 
  Users, 
  ShoppingBag, 
  Globe, 
  Wallet, 
  Megaphone, 
  HelpCircle, 
  Shield, 
  Coins
} from 'lucide-react';
import { motion } from 'motion/react';

export type AppTabType = 'zone' | 'va_shop' | 'earn' | 'cashout' | 'negosyo' | 'guide' | 'admin';

export interface AppLauncherItem {
  id: AppTabType;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeBg?: string;
  badgeTextColor?: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  shadowColor: string;
  glowColor: string;
}

interface SmartphoneAppLauncherProps {
  activeTab: AppTabType;
  onSelectTab: (tab: AppTabType) => void;
  isAdmin?: boolean;
  language?: 'tl' | 'en';
  balance?: number;
}

export const APP_LAUNCHER_ITEMS: AppLauncherItem[] = [
  {
    id: 'zone',
    title: 'Z-one Social',
    subtitle: 'Community Feed',
    icon: Users,
    gradient: 'from-[#3b82f6] via-[#2563eb] to-[#1d4ed8]',
    shadowColor: 'shadow-blue-600/40',
    glowColor: 'bg-blue-500/20',
    badge: 'Feed',
    badgeBg: 'bg-white',
    badgeTextColor: 'text-slate-950'
  },
  {
    id: 'va_shop',
    title: 'VA & Shop',
    subtitle: '500 Goal & Shop',
    icon: ShoppingBag,
    gradient: 'from-[#ec4899] via-[#f43f5e] to-[#c026d3]',
    shadowColor: 'shadow-pink-600/40',
    glowColor: 'bg-pink-500/20',
    badge: '₱500',
    badgeBg: 'bg-white',
    badgeTextColor: 'text-slate-950'
  },
  {
    id: 'earn',
    title: 'Mag-ipon',
    subtitle: 'Web Traffic Lists',
    icon: Globe,
    gradient: 'from-[#34d399] via-[#10b981] to-[#059669]',
    shadowColor: 'shadow-emerald-600/40',
    glowColor: 'bg-emerald-500/20',
    badge: '₱0.75+',
    badgeBg: 'bg-white',
    badgeTextColor: 'text-slate-950'
  },
  {
    id: 'cashout',
    title: 'Cash-Out',
    subtitle: 'GCash Payouts',
    icon: Wallet,
    gradient: 'from-[#38bdf8] via-[#0284c7] to-[#1d4ed8]',
    shadowColor: 'shadow-sky-600/40',
    glowColor: 'bg-sky-500/20',
    badge: 'GCash',
    badgeBg: 'bg-white',
    badgeTextColor: 'text-slate-950'
  },
  {
    id: 'negosyo',
    title: 'Negosyo',
    subtitle: 'Promote Ads',
    icon: Megaphone,
    gradient: 'from-[#fbbf24] via-[#f97316] to-[#e11d48]',
    shadowColor: 'shadow-orange-600/40',
    glowColor: 'bg-orange-500/20',
    badge: 'Promote',
    badgeBg: 'bg-white',
    badgeTextColor: 'text-slate-950'
  },
  {
    id: 'guide',
    title: 'Gabay',
    subtitle: 'FAQs & Help',
    icon: HelpCircle,
    gradient: 'from-[#a855f7] via-[#8b5cf6] to-[#6d28d9]',
    shadowColor: 'shadow-purple-600/40',
    glowColor: 'bg-purple-500/20',
    badge: 'Help',
    badgeBg: 'bg-white',
    badgeTextColor: 'text-slate-950'
  }
];

const ADMIN_LAUNCHER_ITEM: AppLauncherItem = {
  id: 'admin',
  title: 'Admin Control',
  subtitle: 'Management Panel',
  icon: Shield,
  gradient: 'from-[#f43f5e] via-[#dc2626] to-[#881337]',
  shadowColor: 'shadow-red-600/40',
  glowColor: 'bg-red-500/20',
  badge: 'Root',
  badgeBg: 'bg-white',
  badgeTextColor: 'text-slate-950'
};

export const SmartphoneAppLauncher: React.FC<SmartphoneAppLauncherProps> = ({
  activeTab,
  onSelectTab,
  isAdmin = false,
  language = 'tl',
  balance
}) => {
  const items = isAdmin ? [...APP_LAUNCHER_ITEMS, ADMIN_LAUNCHER_ITEM] : APP_LAUNCHER_ITEMS;

  return (
    <section 
      id="huawei-smartphone-launcher-section"
      className="w-full bg-[#0c1322] border-b border-slate-800/80 text-white relative overflow-hidden select-none"
    >
      {/* Background ambient circular glow orbs matching screenshot */}
      <div className="absolute -top-16 -left-16 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 right-0 w-80 h-80 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-6 relative z-10">
        
        {/* Section Header: MAIN APP LAUNCHER & FEATURES + Balance Chip */}
        <div className="flex items-center justify-between gap-3 mb-5 px-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200">
              MAIN APP LAUNCHER & FEATURES
            </h2>
          </div>

          {balance !== undefined && (
            <div className="flex items-center gap-1.5 bg-[#141d33] border border-slate-700/80 px-3 py-1 rounded-full text-xs font-black text-amber-300 shadow-md">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="font-mono tracking-tight">₱{balance.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* 📱 Smartphone 3-Column App Launcher Grid (Mobile: 3 cols, Tablet/Desktop: responsive) */}
        <div 
          id="huawei-app-grid-container"
          className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-7 gap-y-7 gap-x-3 sm:gap-x-4 md:gap-x-6 justify-items-center"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`app-tile-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                type="button"
                className="w-full flex flex-col items-center justify-start group cursor-pointer focus:outline-none transition-all duration-200"
              >
                {/* Smartphone Squircle App Tile (Huawei EMUI / HarmonyOS Icon Style) */}
                <div className="relative flex flex-col items-center">
                  <motion.div
                    whileHover={{ scale: 1.07, y: -3 }}
                    whileTap={{ scale: 0.93 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    className={`
                      w-[68px] h-[68px] sm:w-20 sm:h-20 md:w-[84px] md:h-[84px]
                      rounded-[22px] sm:rounded-[26px] md:rounded-[28px]
                      bg-gradient-to-br ${item.gradient}
                      flex items-center justify-center 
                      shadow-xl ${item.shadowColor}
                      relative overflow-hidden
                      transition-all duration-200
                      ${isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0c1322]' : 'opacity-95 group-hover:opacity-100'}
                    `}
                  >
                    {/* Glossy top-light sheen (Huawei signature icon glass finish) */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-white/10 to-transparent rounded-[inherit] pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent rounded-[inherit] pointer-events-none" />
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/35 rounded-[inherit] pointer-events-none" />

                    {/* App Icon */}
                    <Icon className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 text-white drop-shadow-md transition-transform duration-200 group-hover:scale-110" />

                    {/* Status Badge on Upper Right */}
                    {item.badge && (
                      <span 
                        className={`
                          absolute top-1.5 right-1.5 
                          ${item.badgeBg || 'bg-white'} 
                          ${item.badgeTextColor || 'text-slate-950'} 
                          font-black text-[9px] sm:text-[10px] 
                          px-1.5 py-0.2 rounded-full 
                          shadow-sm tracking-tight
                        `}
                      >
                        {item.badge}
                      </span>
                    )}
                  </motion.div>

                  {/* Active Home-Screen Indicator Pill */}
                  {isActive ? (
                    <motion.div 
                      layoutId="active-launcher-indicator"
                      className="h-1.5 w-7 bg-white rounded-full mt-2 shadow-sm shadow-white/80"
                    />
                  ) : (
                    <div className="h-1.5 w-7 bg-transparent mt-2" />
                  )}
                </div>

                {/* Feature Label Underneath the App Icon */}
                <span 
                  className={`
                    text-xs sm:text-[13px] md:text-sm font-extrabold text-center tracking-tight mt-0.5 leading-tight max-w-[95px] sm:max-w-[110px] line-clamp-2 transition-colors
                    ${isActive ? 'text-white font-black' : 'text-slate-200 group-hover:text-white'}
                  `}
                >
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
