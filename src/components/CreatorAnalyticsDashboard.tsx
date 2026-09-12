import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Users,
  Award,
  ShoppingBag,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  X,
  ChevronRight,
  ShieldCheck,
  Video,
  FileText,
  Trophy,
  ExternalLink,
  Info,
  HelpCircle
} from 'lucide-react';
import {
  AnalyticsTimeframe,
  CreatorAnalyticsResponse,
  TopPerformingItem
} from '../types/analytics';

interface CreatorAnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  currentUserId: string;
  currentUserName: string;
  targetUserId?: string;
  language?: 'tl' | 'en';
  onNavigateToPost?: (postId: string) => void;
  onNavigateToReel?: (reelId: string) => void;
  onNavigateToChallenge?: (challengeId: string) => void;
  onNavigateToShop?: () => void;
}

export const CreatorAnalyticsDashboard: React.FC<CreatorAnalyticsDashboardProps> = ({
  isOpen,
  onClose,
  token,
  currentUserId,
  currentUserName,
  targetUserId,
  language = 'tl',
  onNavigateToPost,
  onNavigateToReel,
  onNavigateToChallenge,
  onNavigateToShop
}) => {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('7d');
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'reels' | 'challenges' | 'products'>('overview');
  const [trendMetric, setTrendMetric] = useState<'views' | 'engagements' | 'followersGained' | 'clicks'>('views');
  const [topContentFilter, setTopContentFilter] = useState<'all' | 'post' | 'reel' | 'challenge' | 'product'>('all');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const [data, setData] = useState<CreatorAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isTl = language === 'tl';
  const effectiveUserId = targetUserId || currentUserId;

  const fetchAnalytics = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await fetch(`/api/zone/creator/analytics?period=${timeframe}&userId=${effectiveUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Hindi ma-load ang creator analytics.');
      }

      const resData = await res.json();
      setData(resData);
    } catch (err: any) {
      console.error('Creator analytics fetch error:', err);
      setError(err.message || 'May naganap na problema sa pag-load ng analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen, timeframe, effectiveUserId]);

  // Filtered Top Performing Content
  const filteredTopPerforming = useMemo(() => {
    if (!data?.topPerforming) return [];
    if (topContentFilter === 'all') return data.topPerforming;
    return data.topPerforming.filter(item => item.type === topContentFilter);
  }, [data?.topPerforming, topContentFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-[#090d16] border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-slate-100">
        
        {/* TOP HEADER */}
        <div className="px-5 py-4 sm:px-8 sm:py-5 border-b border-slate-800/80 bg-slate-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0 border border-blue-400/30">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {isTl ? 'Creator Analytics Studio' : 'Creator Analytics Studio'}
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Live Local-First
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isTl 
                  ? `Pagsubaybay ng pagganap at impluwensya ni ${data?.creator?.name || currentUserName}` 
                  : `Performance metrics & engagement for ${data?.creator?.name || currentUserName}`}
              </p>
            </div>
          </div>

          {/* TIME FILTERS & ACTIONS */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTimeframe('today')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  timeframe === 'today'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isTl ? 'Ngayon' : 'Today'}
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('7d')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  timeframe === '7d'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('30d')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  timeframe === '30d'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('all')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  timeframe === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isTl ? 'Lahat' : 'All Time'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing || loading}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer disabled:opacity-50"
              title={isTl ? 'I-refresh ang analytics' : 'Refresh analytics'}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SUB NAVIGATION TABS */}
        <div className="px-5 sm:px-8 border-b border-slate-800 bg-slate-900/30 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 py-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{isTl ? 'Pangkalahatang Buod' : 'Overview Summary'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('posts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'posts'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isTl ? 'Mga Posts' : 'Posts Breakdown'}</span>
            {data?.posts?.totalPosts !== undefined && (
              <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full">
                {data.posts.totalPosts}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reels')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'reels'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>{isTl ? 'Mga Reels' : 'Reels Breakdown'}</span>
            {data?.reels?.totalReels !== undefined && (
              <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full">
                {data.reels.totalReels}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('challenges')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'challenges'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>{isTl ? 'Paligsahan (Challenges)' : 'Challenges'}</span>
            {data?.challenges?.totalHosted !== undefined && (
              <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full">
                {data.challenges.totalHosted}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'products'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{isTl ? 'Produkto at Affiliate' : 'Products & Affiliate'}</span>
            {data?.products?.totalTaggedProducts !== undefined && (
              <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full">
                {data.products.totalTaggedProducts}
              </span>
            )}
          </button>
        </div>

        {/* SCROLLABLE DASHBOARD BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">

          {/* LOADING STATE */}
          {loading && !data && (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
              <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
              <div className="space-y-1">
                <h3 className="font-black text-white text-base">
                  {isTl ? 'Kino-compute ang Creator Analytics...' : 'Aggregating Creator Analytics...'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  {isTl 
                    ? 'Binibilang ang views, likes, comments, shares, at conversion rates mula sa local-first cache.'
                    : 'Summing real-time views, likes, comments, shares, and conversions from local-first cache.'}
                </p>
              </div>
            </div>
          )}

          {/* ERROR STATE */}
          {error && !data && (
            <div className="py-16 flex flex-col items-center justify-center gap-4 text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                <Info className="w-7 h-7" />
              </div>
              <h3 className="font-black text-white text-base">{error}</h3>
              <button
                type="button"
                onClick={() => fetchAnalytics()}
                className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-6 py-2.5 rounded-xl cursor-pointer transition shadow-md"
              >
                {isTl ? 'Subukan Muli' : 'Retry'}
              </button>
            </div>
          )}

          {/* MAIN CONTENT WHEN LOADED */}
          {data && (
            <>
              {/* ZERO-QUOTA INTEGRITY BADGE */}
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Anti-Cheat & Local-First:</strong> {isTl ? 'Ang sariling page refresh ay hindi binibilang bilang view. Zero Firestore quota consumption sa analytics.' : 'Creator self-views excluded. Zero Firestore quota used.'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 shrink-0 font-mono">
                  {isTl ? 'Na-update: ' : 'Updated: '}
                  {new Date(data.generatedAt).toLocaleTimeString()}
                </div>
              </div>

              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* TOP 4 KEY METRIC CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* TOTAL VIEWS */}
                    <div className="bg-slate-900/70 border border-slate-800/90 hover:border-blue-500/40 rounded-3xl p-5 transition space-y-3 relative overflow-hidden">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-wider">{isTl ? 'Kabuuang Views' : 'Total Views'}</span>
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                          {data.summary.totalViews.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>Posts: {data.posts.totalViews.toLocaleString()}</span>
                          <span>•</span>
                          <span>Reels: {data.reels.totalViews.toLocaleString()}</span>
                        </div>
                      </div>
                      {data.summary.viewsGrowth !== null && (
                        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>+{data.summary.viewsGrowth}% kumpara sa nakaraang yugto</span>
                        </div>
                      )}
                    </div>

                    {/* TOTAL ENGAGEMENTS */}
                    <div className="bg-slate-900/70 border border-slate-800/90 hover:border-indigo-500/40 rounded-3xl p-5 transition space-y-3 relative overflow-hidden">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-wider">{isTl ? 'Kabuuang Engagement' : 'Total Engagements'}</span>
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <Heart className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                          {data.summary.totalEngagements.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>❤️ {data.summary.totalLikes.toLocaleString()}</span>
                          <span>💬 {data.summary.totalComments.toLocaleString()}</span>
                          <span>🔁 {data.summary.totalShares.toLocaleString()}</span>
                        </div>
                      </div>
                      {data.summary.engagementsGrowth !== null && (
                        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>+{data.summary.engagementsGrowth}% kumpara sa nakaraang yugto</span>
                        </div>
                      )}
                    </div>

                    {/* ENGAGEMENT RATE */}
                    <div className="bg-slate-900/70 border border-slate-800/90 hover:border-amber-500/40 rounded-3xl p-5 transition space-y-3 relative overflow-hidden">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-wider">{isTl ? 'Engagement Rate' : 'Engagement Rate'}</span>
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                          {data.summary.engagementRate}%
                        </div>
                        <div className="text-[11px] text-slate-400">
                          (Likes + Comments + Shares) ÷ Views
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-xs font-bold">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                          data.summary.engagementRate >= 5 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {data.summary.engagementRate >= 5 ? '🌟 Mataas na Interaksyon' : '🌱 Patuloy na Umuunlad'}
                        </span>
                      </div>
                    </div>

                    {/* FOLLOWERS / ZONES GAINED */}
                    <div className="bg-slate-900/70 border border-slate-800/90 hover:border-purple-500/40 rounded-3xl p-5 transition space-y-3 relative overflow-hidden">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-wider">{isTl ? 'Followers / Zoned' : 'Followers / Zoned'}</span>
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <Users className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                          {data.summary.followersCount.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-emerald-400 font-bold">
                          +{data.summary.followersGained} sa piniling timeframe
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <span>Komunidad</span>
                        <span className="text-slate-200 font-bold">Z-one Clickers</span>
                      </div>
                    </div>

                  </div>

                  {/* COMMERCE & CHALLENGES SECONDARY STATS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* PALIGSAHAN (CHALLENGES) CARD */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Trophy className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">{isTl ? 'Pagganap sa Paligsahan' : 'Challenge Performance'}</h4>
                            <p className="text-[11px] text-slate-400">{isTl ? 'Creator Challenges & Prize Pools' : 'Hosted challenges'}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('challenges')}
                          className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isTl ? 'Tingnan' : 'View'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                          <div className="text-lg font-black text-white">{data.challenges.totalHosted}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">{isTl ? 'Inilunsad' : 'Hosted'}</div>
                        </div>
                        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                          <div className="text-lg font-black text-white">{data.challenges.totalParticipants}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">{isTl ? 'Kalahok' : 'Participants'}</div>
                        </div>
                        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                          <div className="text-lg font-black text-amber-400">₱{data.challenges.totalPrizePool.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">{isTl ? 'Prize Pool' : 'Prize Pool'}</div>
                        </div>
                      </div>
                    </div>

                    {/* PRODUCT & AFFILIATE CARD */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">{isTl ? 'Z-oneShop & Affiliate' : 'Shop & Affiliate Commerce'}</h4>
                            <p className="text-[11px] text-slate-400">{isTl ? 'Mga Tagged Products at Orders' : 'Tagged product performance'}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('products')}
                          className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isTl ? 'Tingnan' : 'View'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                          <div className="text-lg font-black text-white">{data.products.totalClicks}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">{isTl ? 'Clicks' : 'Clicks'}</div>
                        </div>
                        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                          <div className="text-lg font-black text-white">{data.products.totalOrders}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">{isTl ? 'Conversions' : 'Orders'}</div>
                        </div>
                        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                          <div className="text-lg font-black text-emerald-400">₱{data.products.totalEarnings.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">{isTl ? 'Kinita' : 'Earnings'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GROWTH TRENDS VISUALIZATION SECTION */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-white flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-400" />
                          <span>{isTl ? 'Trend ng Paglago (Growth Trends)' : 'Growth Trends'}</span>
                        </h3>
                        <p className="text-xs text-slate-400">
                          {isTl 
                            ? 'Araw-araw na daloy ng interaksyon at sumusubaybay' 
                            : 'Daily trajectory of views, engagement, and follower acquisition'}
                        </p>
                      </div>

                      {/* TREND METRIC SWITCHER */}
                      <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setTrendMetric('views')}
                          className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                            trendMetric === 'views'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Views
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrendMetric('engagements')}
                          className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                            trendMetric === 'engagements'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Engagement
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrendMetric('followersGained')}
                          className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                            trendMetric === 'followersGained'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Followers
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrendMetric('clicks')}
                          className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                            trendMetric === 'clicks'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Clicks
                        </button>
                      </div>
                    </div>

                    {/* INTERACTIVE SVG CHART */}
                    {data.trends && data.trends.length > 0 ? (
                      <div className="relative pt-4">
                        {/* Tooltip Overlay */}
                        {hoveredPointIndex !== null && data.trends[hoveredPointIndex] && (
                          <div className="absolute top-0 right-4 bg-slate-800/95 border border-slate-700 px-3 py-1.5 rounded-xl text-xs shadow-lg flex items-center gap-2">
                            <span className="font-bold text-slate-300">{data.trends[hoveredPointIndex].label}:</span>
                            <span className="font-black text-white">
                              {data.trends[hoveredPointIndex][trendMetric].toLocaleString()} {trendMetric}
                            </span>
                          </div>
                        )}

                        {/* Custom Smooth Responsive SVG Canvas */}
                        <div className="w-full h-48 sm:h-56">
                          {(() => {
                            const points = data.trends;
                            const maxVal = Math.max(...points.map(p => p[trendMetric]), 10);
                            const width = 800;
                            const height = 200;
                            const padX = 40;
                            const padY = 20;
                            const chartW = width - (padX * 2);
                            const chartH = height - (padY * 2);

                            const coords = points.map((p, idx) => {
                              const x = padX + (idx / (points.length - 1 || 1)) * chartW;
                              const y = padY + chartH - ((p[trendMetric] / maxVal) * chartH);
                              return { x, y, p, idx };
                            });

                            // Build SVG smooth path
                            const pathD = coords.reduce((acc, pt, i, arr) => {
                              if (i === 0) return `M ${pt.x},${pt.y}`;
                              const prev = arr[i - 1];
                              const cx1 = prev.x + (pt.x - prev.x) / 2;
                              const cy1 = prev.y;
                              const cx2 = prev.x + (pt.x - prev.x) / 2;
                              const cy2 = pt.y;
                              return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${pt.x},${pt.y}`;
                            }, '');

                            const areaD = `${pathD} L ${coords[coords.length - 1].x},${padY + chartH} L ${coords[0].x},${padY + chartH} Z`;

                            const strokeColor = 
                              trendMetric === 'views' ? '#3b82f6' :
                              trendMetric === 'engagements' ? '#6366f1' :
                              trendMetric === 'followersGained' ? '#a855f7' : '#10b981';

                            const fillGradId = `grad-${trendMetric}`;

                            return (
                              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                                <defs>
                                  <linearGradient id={fillGradId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={strokeColor} stopOpacity="0.4" />
                                    <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                                  </linearGradient>
                                </defs>

                                {/* Gridlines */}
                                <line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke="#1e293b" strokeDasharray="4" />
                                <line x1={padX} y1={padY + chartH / 2} x2={width - padX} y2={padY + chartH / 2} stroke="#1e293b" strokeDasharray="4" />
                                <line x1={padX} y1={padY + chartH} x2={width - padX} y2={padY + chartH} stroke="#334155" />

                                {/* Area fill */}
                                <path d={areaD} fill={`url(#${fillGradId})`} />

                                {/* Stroke line */}
                                <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="3.5" strokeLinecap="round" />

                                {/* Data points */}
                                {coords.map((c) => (
                                  <g 
                                    key={c.idx}
                                    onMouseEnter={() => setHoveredPointIndex(c.idx)}
                                    onMouseLeave={() => setHoveredPointIndex(null)}
                                    className="cursor-pointer"
                                  >
                                    <circle
                                      cx={c.x}
                                      cy={c.y}
                                      r={hoveredPointIndex === c.idx ? '6' : '3.5'}
                                      fill={strokeColor}
                                      stroke="#090d16"
                                      strokeWidth="2"
                                      className="transition-all duration-150"
                                    />
                                    {/* Transparent hit target for touch devices */}
                                    <circle cx={c.x} cy={c.y} r="16" fill="transparent" />
                                  </g>
                                ))}
                              </svg>
                            );
                          })()}
                        </div>

                        {/* X-AXIS LABELS */}
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 pt-2 px-2">
                          {data.trends.map((t, idx) => {
                            if (data.trends.length > 8 && idx % 2 !== 0) return null;
                            return <span key={idx}>{t.label}</span>;
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-500">
                        {isTl ? 'Wala pang sapat na trend data sa napiling panahon.' : 'Insufficient data points for trend charting.'}
                      </div>
                    )}
                  </div>

                  {/* TOP PERFORMING CONTENT SECTION */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-white flex items-center gap-2">
                          <Award className="w-4 h-4 text-yellow-400" />
                          <span>{isTl ? 'Pinakamahusay na Content (Top Performing)' : 'Top Performing Content'}</span>
                        </h3>
                        <p className="text-xs text-slate-400">
                          {isTl ? 'Ranggo ng iyong pinakapumatok na posts, reels, at paligsahan' : 'Highest engagement & reach items'}
                        </p>
                      </div>

                      {/* FILTER BUTTONS */}
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setTopContentFilter('all')}
                          className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                            topContentFilter === 'all'
                              ? 'bg-slate-800 text-white border border-slate-700'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Lahat
                        </button>
                        <button
                          type="button"
                          onClick={() => setTopContentFilter('post')}
                          className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                            topContentFilter === 'post'
                              ? 'bg-slate-800 text-white border border-slate-700'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Posts
                        </button>
                        <button
                          type="button"
                          onClick={() => setTopContentFilter('reel')}
                          className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                            topContentFilter === 'reel'
                              ? 'bg-slate-800 text-white border border-slate-700'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Reels
                        </button>
                        <button
                          type="button"
                          onClick={() => setTopContentFilter('challenge')}
                          className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                            topContentFilter === 'challenge'
                              ? 'bg-slate-800 text-white border border-slate-700'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Challenges
                        </button>
                      </div>
                    </div>

                    {/* TOP PERFORMING LIST */}
                    {filteredTopPerforming.length > 0 ? (
                      <div className="divide-y divide-slate-800/80">
                        {filteredTopPerforming.map((item, index) => (
                          <div 
                            key={`${item.type}-${item.id}`}
                            className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-800/30 px-3 rounded-2xl transition"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              {/* RANK MEDAL */}
                              <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-black text-xs shrink-0">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                              </div>

                              {/* THUMBNAIL / ICON */}
                              {item.thumbnailUrl ? (
                                <img
                                  src={item.thumbnailUrl}
                                  alt={item.title}
                                  className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-800 bg-slate-900"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 text-slate-500">
                                  {item.type === 'reel' ? <Video className="w-5 h-5 text-indigo-400" /> :
                                   item.type === 'challenge' ? <Trophy className="w-5 h-5 text-amber-400" /> :
                                   item.type === 'product' ? <ShoppingBag className="w-5 h-5 text-emerald-400" /> :
                                   <FileText className="w-5 h-5 text-blue-400" />}
                                </div>
                              )}

                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.2 rounded-full border ${
                                    item.type === 'reel' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                                    item.type === 'challenge' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                                    item.type === 'product' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                                    'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                  }`}>
                                    {item.type}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    {new Date(item.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <h4 className="text-xs sm:text-sm font-bold text-white truncate max-w-md">
                                  {item.title}
                                </h4>
                              </div>
                            </div>

                            {/* METRIC NUMBERS */}
                            <div className="flex items-center gap-4 shrink-0 text-right">
                              <div>
                                <div className="text-xs sm:text-sm font-black text-white">
                                  {item.views.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase font-bold">views</div>
                              </div>
                              <div className="hidden sm:block">
                                <div className="text-xs sm:text-sm font-black text-indigo-400">
                                  {(item.likes + item.comments + item.shares).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase font-bold">engagements</div>
                              </div>
                              <div className="hidden md:block">
                                <div className="text-xs sm:text-sm font-black text-amber-400">
                                  {item.engagementRate}%
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase font-bold">rate</div>
                              </div>

                              {/* ACTION BUTTON */}
                              {item.type === 'post' && onNavigateToPost && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onNavigateToPost(item.id);
                                  }}
                                  className="p-2 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition cursor-pointer"
                                  title="Tingnan ang Post"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              )}
                              {item.type === 'reel' && onNavigateToReel && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onNavigateToReel(item.id);
                                  }}
                                  className="p-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition cursor-pointer"
                                  title="Panoorin ang Reel"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              )}
                              {item.type === 'challenge' && onNavigateToChallenge && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onNavigateToChallenge(item.id);
                                  }}
                                  className="p-2 rounded-xl bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white transition cursor-pointer"
                                  title="Buksan ang Challenge"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-500">
                        {isTl ? 'Walang content na pumasok sa pamantayan sa yugtong ito.' : 'No items match this filter in the chosen period.'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* POSTS TAB BREAKDOWN */}
              {activeTab === 'posts' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-white">{data.posts.totalPosts}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase">{isTl ? 'Kabuuang Posts' : 'Total Posts'}</div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-blue-400">{data.posts.totalViews.toLocaleString()}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase">{isTl ? 'Post Views' : 'Post Views'}</div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-indigo-400">{data.posts.totalLikes.toLocaleString()}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase">Likes</div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-purple-400">{data.posts.avgEngagementPerPost}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase">{isTl ? 'Avg Engagement' : 'Avg Engagement'}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-black text-white">{isTl ? 'Listahan ng mga Posts' : 'Posts History & Metrics'}</h4>
                    {data.posts.items.length > 0 ? (
                      <div className="space-y-2.5">
                        {data.posts.items.map(post => (
                          <div key={post.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <p className="text-xs sm:text-sm text-white font-semibold line-clamp-2">
                                {post.text}
                              </p>
                              <div className="text-[11px] text-slate-500">
                                {new Date(post.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-bold shrink-0 self-end sm:self-auto">
                              <div className="text-slate-300">👁️ {post.views.toLocaleString()}</div>
                              <div className="text-rose-400">❤️ {post.likes}</div>
                              <div className="text-blue-400">💬 {post.comments}</div>
                              <div className="text-emerald-400">🔁 {post.shares}</div>
                              <div className="bg-slate-800 px-2.5 py-1 rounded-lg text-white font-black text-[11px]">
                                {post.engagementRate}% rate
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center text-xs text-slate-500">
                        {isTl ? 'Wala ka pang na-publish na posts sa panahong ito.' : 'No posts published in this timeframe.'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* REELS TAB BREAKDOWN */}
              {activeTab === 'reels' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-white">{data.reels.totalReels}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase">{isTl ? 'Kabuuang Reels' : 'Total Reels'}</div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-indigo-400">{data.reels.totalViews.toLocaleString()}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase">{isTl ? 'Video Views' : 'Video Views'}</div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-rose-400">{data.reels.totalLikes.toLocaleString()}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase">Reel Likes</div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-amber-400">{data.reels.avgEngagementPerReel}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase">{isTl ? 'Avg Engagement' : 'Avg Engagement'}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-black text-white">{isTl ? 'Listahan ng mga Reels' : 'Reels Performance'}</h4>
                    {data.reels.items.length > 0 ? (
                      <div className="space-y-2.5">
                        {data.reels.items.map(reel => (
                          <div key={reel.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {reel.thumbnailUrl ? (
                                <img src={reel.thumbnailUrl} alt={reel.title} className="w-12 h-12 rounded-xl object-cover bg-slate-950 border border-slate-800 shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                                  <Video className="w-5 h-5 text-indigo-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <h5 className="text-xs sm:text-sm font-bold text-white truncate">{reel.title}</h5>
                                <div className="text-[11px] text-slate-500">{new Date(reel.createdAt).toLocaleDateString()}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-bold shrink-0 self-end sm:self-auto">
                              <div className="text-slate-300">👁️ {reel.views.toLocaleString()}</div>
                              <div className="text-rose-400">❤️ {reel.likes}</div>
                              <div className="text-blue-400">💬 {reel.comments}</div>
                              <div className="bg-slate-800 px-2.5 py-1 rounded-lg text-white font-black text-[11px]">
                                {reel.engagementRate}% rate
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center text-xs text-slate-500">
                        {isTl ? 'Wala ka pang na-upload na video reel sa panahong ito.' : 'No reels uploaded in this timeframe.'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CHALLENGES TAB BREAKDOWN */}
              {activeTab === 'challenges' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-white">{data.challenges.totalHosted}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase">{isTl ? 'Inilunsad' : 'Hosted'}</div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-amber-400">{data.challenges.totalParticipants}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase">{isTl ? 'Mga Kalahok' : 'Participants'}</div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-blue-400">{data.challenges.totalEntries}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase">{isTl ? 'Mga Entry' : 'Entries'}</div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-emerald-400">₱{data.challenges.totalPrizePool.toLocaleString()}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase">{isTl ? 'Prize Pool' : 'Prize Pool'}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-black text-white">{isTl ? 'Iyong mga Inilunsad na Paligsahan' : 'Hosted Challenges'}</h4>
                    {data.challenges.items.length > 0 ? (
                      <div className="space-y-2.5">
                        {data.challenges.items.map(ch => (
                          <div key={ch.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  {ch.category}
                                </span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  ch.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {ch.status}
                                </span>
                              </div>
                              <h5 className="text-sm font-bold text-white">{ch.title}</h5>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-bold shrink-0 self-end sm:self-auto">
                              <div className="text-slate-300">👥 {ch.participantsCount} kalahok</div>
                              <div className="text-blue-400">📥 {ch.entriesCount} entries</div>
                              <div className="text-amber-400">₱{ch.prizePool.toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center text-xs text-slate-500">
                        {isTl ? 'Wala ka pang inilunsad na creator challenge sa panahong ito.' : 'No challenges hosted in this timeframe.'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PRODUCTS & AFFILIATE TAB BREAKDOWN */}
              {activeTab === 'products' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-white">{data.products.totalTaggedProducts}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase">{isTl ? 'Tagged Products' : 'Tagged Products'}</div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-emerald-400">{data.products.totalClicks}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase">{isTl ? 'Product Clicks' : 'Product Clicks'}</div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-blue-400">{data.products.totalOrders}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase">{isTl ? 'Conversions' : 'Conversions'}</div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-amber-400">₱{data.products.totalEarnings.toLocaleString()}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase">{isTl ? 'Est. Commission' : 'Est. Earnings'}</div>
                    </div>
                  </div>

                  {/* DATA AVAILABILITY NOTE */}
                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-300 flex items-start gap-3">
                    <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <strong className="font-black">{isTl ? 'Paunawa sa Affiliate Tracking:' : 'Affiliate Tracking Note:'}</strong>{' '}
                      {isTl 
                        ? 'Ang mga direct in-app clicks ay awtomatikong sinusubaybayan. Para sa external affiliate networks (Shopee/TikTok off-site checkouts), ang actual external conversions ay nagpapakita ng "Data not available" hangga\'t hindi nakakabit ang third-party merchant postback webhook.'
                        : 'Direct in-app clicks are tracked automatically. External affiliate network off-site conversions report "Data not available" until external postback webhooks are enabled.'}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-black text-white">{isTl ? 'Mga Tagged Products sa Iyong Content' : 'Tagged Products Performance'}</h4>
                    {data.products.items.length > 0 ? (
                      <div className="space-y-2.5">
                        {data.products.items.map(prod => (
                          <div key={prod.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {prod.image ? (
                                <img src={prod.image} alt={prod.name} className="w-12 h-12 rounded-xl object-cover bg-slate-950 border border-slate-800 shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                                  <ShoppingBag className="w-5 h-5 text-emerald-400" />
                                </div>
                              )}
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    {prod.platform}
                                  </span>
                                  <span className="text-xs font-bold text-emerald-400">
                                    ₱{prod.price.toLocaleString()}
                                  </span>
                                </div>
                                <h5 className="text-xs sm:text-sm font-bold text-white truncate">{prod.name}</h5>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-bold shrink-0 self-end sm:self-auto">
                              <div className="text-slate-300">👆 {prod.clicks} clicks</div>
                              <div className="text-blue-400">
                                {prod.ordersCount > 0 ? `${prod.ordersCount} orders` : (
                                  <span className="text-slate-500 italic">Data not available (Pending external sync)</span>
                                )}
                              </div>
                              <div className="text-emerald-400">₱{prod.estimatedEarnings.toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center text-xs text-slate-500">
                        {isTl ? 'Wala ka pang na-tag na produkto sa iyong mga posts o reels.' : 'No tagged products found in your content.'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* BOTTOM FOOTER */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{isTl ? 'Z-one Local-First Architecture: Mabilis, Ligtas, Matipid sa Quota' : 'Z-one Local-First Architecture: Fast, Safe, Zero-Quota'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition cursor-pointer"
          >
            {isTl ? 'Isara' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
