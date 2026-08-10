import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { formatEmbedUrl } from '../utils/reels';
import { SuccessStoryModal } from './SuccessStoryModal';
import { RedemptionBannerModal, RedemptionRecordItem } from './RedemptionBannerModal';
import { 
  Shield, 
  Users, 
  Wallet, 
  CheckCircle, 
  XCircle, 
  Activity, 
  Clock, 
  Search, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CornerDownRight,
  Sparkles,
  RefreshCw,
  Award,
  Megaphone,
  Settings,
  Upload,
  QrCode,
  Ban,
  Trash2,
  UserX,
  ShieldAlert,
  X,
  Video,
  Play,
  Coins,
  Ticket,
  ExternalLink,
  Eye,
  Download,
  Trophy,
  Globe,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { ActivityLog, UserStats, WithdrawalRequest, Subscription, MerchantAd } from '../types';

interface AdminDashboardData {
  users: {
    id: string;
    email: string;
    name: string;
    avatar: string;
    isAdmin: boolean;
    stats: UserStats;
    withdrawalsCount: number;
    withdrawals?: WithdrawalRequest[];
    referralCode: string;
    referredFriendsCount: number;
    lastActivities: ActivityLog[];
    createdAt?: string | null;
    subscription?: Subscription | null;
  }[];
  withdrawals: {
    userId: string;
    userName: string;
    userAvatar: string;
    request: WithdrawalRequest;
  }[];
  reelSubscriptions?: any[];
}

interface AdminPanelProps {
  token: string;
  triggerNotification: (message: string, type: 'success' | 'info' | 'error') => void;
}

export default function AdminPanel({
  token,
  triggerNotification
}: AdminPanelProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [merchantAds, setMerchantAds] = useState<MerchantAd[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'subscriptions' | 'users' | 'merchant_ads' | 'reels' | 'settings'>('overview');
  const [reelsData, setReelsData] = useState<{ reels: any[]; reelSubscriptions: any[]; reelRedemptions: any[] }>({ reels: [], reelSubscriptions: [], reelRedemptions: [] });
  const [playingReelId, setPlayingReelId] = useState<string | null>(null);
  const [disapproveReasons, setDisapproveReasons] = useState<{ [id: string]: string }>({});
  const [showSuccessStoryModal, setShowSuccessStoryModal] = useState<boolean>(false);
  const [showRedemptionModal, setShowRedemptionModal] = useState<boolean>(false);
  const [activeRedemptionRecord, setActiveRedemptionRecord] = useState<RedemptionRecordItem | null>(null);

  const fetchAdminReels = async () => {
    try {
      const res = await fetch('/api/admin/reels', {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const result = await res.json();
        setReelsData({
          reels: result.reels || [],
          reelSubscriptions: result.reelSubscriptions || [],
          reelRedemptions: result.reelRedemptions || []
        });
      }
    } catch (e) {
      console.error('Error fetching admin reels:', e);
    }
  };

  useEffect(() => {
    fetchAdminReels();
  }, [token]);

  const handleApproveReel = async (reelId: string) => {
    setProcessingId(reelId);
    try {
      const res = await fetch(`/api/admin/reels/${reelId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': token }
      });
      const result = await res.json();
      if (res.ok) {
        triggerNotification(`🟢 ${result.message}`, 'success');
        fetchAdminReels();
      } else {
        triggerNotification(`⚠️ ${result.error || 'Hindi ma-approve ang Reel.'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerNotification('⚠️ Error communicating with server.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDisapproveReel = async (reelId: string) => {
    const reason = disapproveReasons[reelId] || 'Community guidelines violation';
    setProcessingId(reelId);
    try {
      const res = await fetch(`/api/admin/reels/${reelId}/disapprove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ reason })
      });
      const result = await res.json();
      if (res.ok) {
        triggerNotification(`🔴 ${result.message}`, 'info');
        fetchAdminReels();
      } else {
        triggerNotification(`⚠️ ${result.error || 'Hindi ma-disapprove ang Reel.'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerNotification('⚠️ Error communicating with server.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveReelSub = async (subId: string) => {
    setProcessingId(subId);
    try {
      const res = await fetch(`/api/admin/reels/subscriptions/${subId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': token }
      });
      const result = await res.json();
      if (res.ok) {
        triggerNotification(`🟢 ${result.message}`, 'success');
        fetchAdminReels();
        fetchAdminData();
        window.dispatchEvent(new Event('refresh-user-profile'));
      } else {
        triggerNotification(`⚠️ ${result.error || 'Hindi ma-approve ang Token Subscription.'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerNotification('⚠️ Error communicating with server.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineReelSub = async (subId: string) => {
    setProcessingId(subId);
    try {
      const res = await fetch(`/api/admin/reels/subscriptions/${subId}/decline`, {
        method: 'POST',
        headers: { 'Authorization': token }
      });
      const result = await res.json();
      if (res.ok) {
        triggerNotification(`🔴 ${result.message}`, 'info');
        fetchAdminReels();
      } else {
        triggerNotification(`⚠️ ${result.error || 'Hindi ma-decline ang Token Subscription.'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerNotification('⚠️ Error communicating with server.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // QR Code upload states
  const [qrUploading, setQrUploading] = useState(false);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());

  const handleQrUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      triggerNotification('Masyadong malaki ang file. Dapat mas maliit sa 10MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setQrPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveQrCode = async () => {
    if (!qrPreview) {
      triggerNotification('Mangyaring pumili muna ng bagong QR Code image.', 'error');
      return;
    }

    setQrUploading(true);
    try {
      const res = await fetch('/api/admin/update-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ dataUrl: qrPreview })
      });

      if (res.ok) {
        await res.json();
        triggerNotification('🎉 Tagumpay na na-update ang iyong GCash QR Code!', 'success');
        setQrPreview(null);
        setQrTimestamp(Date.now()); // force image reload
      } else {
        const err = await res.json();
        triggerNotification(`❌ Error: ${err.error || 'Hindi ma-save ang QR code.'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('❌ Hindi makakonekta sa server.', 'error');
    } finally {
      setQrUploading(false);
    }
  };

  const fetchMerchantAds = async () => {
    try {
      const res = await fetch('/api/admin/merchant/ads', {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const result = await res.json();
        setMerchantAds(result.ads || []);
      }
    } catch (e) {
      console.error('Error fetching merchant ads:', e);
    }
  };

  // Helper function to render avatar gracefully regardless of type (emoji or base64 or URL)
  const renderAvatar = (avatar: string | undefined, sizeClass: string = "w-6 h-6") => {
    const avatarStr = avatar || '👤';
    if (avatarStr.startsWith('http') || avatarStr.startsWith('data:') || avatarStr.startsWith('blob:')) {
      return (
        <img 
          src={avatarStr} 
          alt="Avatar" 
          className={`${sizeClass} rounded-full object-cover border border-slate-200/60 shadow-xs shrink-0`} 
          referrerPolicy="no-referrer" 
        />
      );
    }
    if (avatarStr.length > 100) {
      return <span className="text-sm shrink-0">👤</span>;
    }
    return <span className="shrink-0">{avatarStr}</span>;
  };

  // Load dashboard data
  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': token
        }
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
        if (result.reelSubscriptions) {
          setReelsData(prev => ({ ...prev, reelSubscriptions: result.reelSubscriptions }));
        }
      } else {
        const errorData = await res.json();
        triggerNotification(`⚠️ ${errorData.error || 'Hindi ma-load ang Admin Dashboard.'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerNotification('⚠️ Error connecting to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAdminData();
      fetchMerchantAds();
      fetchAdminReels();
    }
  }, [token, activeSubTab]);

  // Approve or decline withdrawal request
  const handleWithdrawalAction = async (withdrawId: string, action: 'approve' | 'decline') => {
    setProcessingId(withdrawId);
    try {
      const res = await fetch(`/api/admin/withdrawals/${withdrawId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ action })
      });

      const result = await res.json();
      if (res.ok) {
        triggerNotification(
          action === 'approve' 
            ? `🟢 Tagumpay na Inaprubahan ang Cashout (ID: ${withdrawId})!`
            : `🔴 Tinanggihan at Ni-refund ang Cashout (ID: ${withdrawId})!`,
          action === 'approve' ? 'success' : 'info'
        );
        // Refresh dashboard data
        await fetchAdminData();
      } else {
        triggerNotification(`⚠️ ${result.error || 'Hindi maipatupad ang aksyon.'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerNotification('⚠️ Error communicating with server.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSubscriptionAction = async (userId: string, action: 'approve' | 'decline') => {
    setProcessingId(userId);
    try {
      const res = await fetch(`/api/admin/subscription/${userId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': token
        }
      });
      const result = await res.json();
      if (res.ok) {
        triggerNotification(
          action === 'approve' 
            ? `🟢 Subscription ay Matagumpay na Inaprubahan!`
            : `🔴 Subscription ay Tinanggihan!`,
          action === 'approve' ? 'success' : 'info'
        );
        // Refresh dashboard data
        await fetchAdminData();
      } else {
        triggerNotification(`⚠️ ${result.error || 'Hindi maipatupad ang aksyon.'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerNotification('⚠️ Error communicating with server.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMerchantAdAction = async (adId: string, action: 'approve' | 'decline') => {
    setProcessingId(adId);
    try {
      const res = await fetch(`/api/admin/merchant/ads/${adId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ action })
      });
      const result = await res.json();
      if (res.ok) {
        triggerNotification(
          action === 'approve' 
            ? `🟢 Promosyon ng Negosyo ay Inaprubahan! Aktibo na ito sa Z-one.`
            : `🔴 Promosyon ay Tinanggihan!`,
          action === 'approve' ? 'success' : 'info'
        );
        fetchMerchantAds();
        fetchAdminData();
      } else {
        triggerNotification(`⚠️ ${result.error || 'Hindi maipatupad ang aksyon.'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerNotification('⚠️ Error communicating with server.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBanUser = async (userId: string, currentBannedState?: boolean) => {
    if (!confirm(`Sigurado ka bang gusto mong ${currentBannedState ? 'i-UNBAN' : 'i-BAN'} ang user na ito?`)) return;
    setProcessingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Authorization': token
        }
      });
      const result = await res.json();
      if (res.ok) {
        triggerNotification(
          result.isBanned ? '🔴 Matagumpay na na-BAN ang user!' : '🟢 Matagumpay na na-UNBAN ang user!',
          result.isBanned ? 'error' : 'success'
        );
        setSelectedUser(null);
        await fetchAdminData();
      } else {
        triggerNotification(`⚠️ ${result.error || 'Hindi maipatupad ang aksyon.'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerNotification('⚠️ Error communicating with server.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`⚠️ PERMANENT DELETE WARNING:\n\nSigurado ka bang gusto mong burahin at tanggalin nang tuluyan si ${userName} sa sistema? Hindi na ito mababawi!`)) return;
    setProcessingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token
        }
      });
      const result = await res.json();
      if (res.ok) {
        triggerNotification(`🗑️ Matagumpay na na-DELETE si ${userName}!`, 'info');
        setSelectedUser(null);
        await fetchAdminData();
      } else {
        triggerNotification(`⚠️ ${result.error || 'Hindi maipatupad ang aksyon.'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerNotification('⚠️ Error communicating with server.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const getSubscriptionBadgeAndRemaining = (user: any) => {
    if (user.isAdmin) return { text: 'Admin', className: 'bg-purple-100 text-purple-700 font-extrabold px-2 py-0.5 rounded-full text-[10px]' };
    
    // Check trial first
    const regDate = user.createdAt ? new Date(user.createdAt) : new Date();
    const passedMs = Date.now() - regDate.getTime();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    
    if (passedMs < oneDayInMs) {
      const remainingHours = Math.max(0, Math.ceil((oneDayInMs - passedMs) / (60 * 60 * 1005)));
      return { 
        text: `Free Trial (${remainingHours} oras natira)`, 
        className: 'bg-indigo-50 border border-indigo-250 text-indigo-700 font-bold px-2 py-0.5 rounded-full text-[10px]' 
      };
    }
    
    const sub = user.subscription;
    if (!sub || sub.status === 'none') {
      return { 
        text: 'Expired Trial (Walang Sub)', 
        className: 'bg-rose-50 border border-rose-200 text-rose-600 font-bold px-2 py-0.5 rounded-full text-[10px]' 
      };
    }
    
    if (sub.status === 'pending') {
      return { 
        text: `Nakabinbin: ${sub.requestedPlanName || 'Subscription'}`, 
        className: 'bg-amber-50 border border-amber-200 text-amber-700 font-bold px-2 py-0.5 rounded-full text-[10px] animate-pulse' 
      };
    }
    
    if (sub.status === 'expired') {
      return { 
        text: 'Expired Subscription access', 
        className: 'bg-rose-50 border border-rose-200 text-rose-600 font-bold px-2 py-0.5 rounded-full text-[10px]' 
      };
    }
    
    if (sub.status === 'active' && sub.expiresAt) {
      const timeLeftMs = new Date(sub.expiresAt).getTime() - Date.now();
      const leftDays = Math.max(0, Math.ceil(timeLeftMs / (24 * 60 * 60 * 1000)));
      return { 
        text: `Active Premium (${leftDays} araw natira)`, 
        className: 'bg-emerald-50 border border-emerald-250 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full text-[10px]' 
      };
    }
    
    return { 
      text: 'Hindi Aktibo', 
      className: 'bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px]' 
    };
  };

  if (loading && !data) {
    return (
      <div id="admin-panel" className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
        <p className="text-slate-500 font-bold text-xs select-none">Nag-iimbento ng mga tala at ulat sa server...</p>
      </div>
    );
  }

  const users = data?.users || [];
  const withdrawals = data?.withdrawals || [];
  const pendingRequests = withdrawals.filter(w => w.request.status === 'pending' || w.request.status === 'processing');

  // Compute stats metrics
  const totalUsers = users.length;
  const totalSystemBalance = users.reduce((sum, u) => sum + u.stats.balance, 0);
  const totalLifetimeEarnings = users.reduce((sum, u) => sum + u.stats.lifetimeEarnings, 0);
  const pendingVolume = pendingRequests.reduce((sum, w) => sum + w.request.amount, 0);
  const approvedVolume = withdrawals.filter(w => w.request.status === 'success').reduce((sum, w) => sum + w.request.amount, 0);

  // Filtered users for search
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.referralCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUserInfo = users.find(u => u.id === selectedUser);

  return (
    <div id="admin-panel" className="bg-slate-50 rounded-2xl border border-slate-200 p-5 shadow-sm space-y-6">
      
      {/* ADMIN HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-4">
        <div>
          <span className="bg-indigo-600 text-white text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full flex items-center gap-1 w-max mb-1">
            <Shield className="w-3 h-3 text-yellow-300" />
            <span>SECURE CENTRAL HOST</span>
          </span>
          <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
            Admin Workspace & User Audit Panel
          </h2>
          <p className="text-xs text-slate-500 font-semibold">
            Subaybayan ang live balance at aprubahan ang withdrawals ng mga users real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              // Pick first real successful withdrawal if available
              const firstSuccess = data?.withdrawals?.find(w => w.request.status === 'success');
              if (firstSuccess) {
                setActiveRedemptionRecord({
                  userName: firstSuccess.userName,
                  userAvatar: firstSuccess.userAvatar,
                  amount: firstSuccess.request.amount,
                  createdAt: firstSuccess.request.createdAt,
                  referenceNo: firstSuccess.request.referenceNo
                });
              } else {
                setActiveRedemptionRecord({
                  userName: 'Jonard Belleza',
                  amount: 126.00,
                  createdAt: '8/2/2026, 7:30:33 AM',
                  referenceNo: 'REF1136831562'
                });
              }
              setShowRedemptionModal(true);
            }}
            className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition cursor-pointer border border-emerald-400 shrink-0"
          >
            <Download className="w-4 h-4 text-white shrink-0" />
            <span className="whitespace-nowrap">🎟️ Redemption Banners</span>
          </button>

          <button
            onClick={() => setShowSuccessStoryModal(true)}
            className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition cursor-pointer border border-amber-300 shrink-0"
          >
            <Trophy className="w-4 h-4 text-slate-950 shrink-0" />
            <span className="whitespace-nowrap">🏆 Success Story Window</span>
          </button>

          <button 
            onClick={fetchAdminData}
            id="refresh-admin-btn"
            className="bg-white border border-slate-200 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-extrabold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="hidden sm:inline">I-refresh Server</span>
          </button>
        </div>
      </div>

      {/* PROMINENT SUCCESS STORY BANNER CARD */}
      {data && (() => {
        const nonAdminList = data.users.filter(u => !u.isAdmin);
        const topUser = [...nonAdminList].sort((a, b) => (b.stats?.balance || 0) - (a.stats?.balance || 0))[0];
        return (
          <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-3 sm:gap-4 relative z-10 w-full md:w-auto">
              <div className="relative shrink-0">
                {topUser?.avatar ? (
                  <img
                    src={topUser.avatar}
                    alt={topUser.name}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-amber-400 object-cover shadow-lg"
                  />
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black flex items-center justify-center text-xl shadow-lg">
                    🏆
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-slate-950">
                  #1
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  <Trophy className="w-3 h-3 shrink-0" />
                  <span>Live Database Top Earner</span>
                </div>
                <h3 className="text-sm sm:text-lg font-black text-white truncate">
                  {topUser ? (topUser.name || topUser.email) : 'Walang Data'}
                </h3>
                <p className="text-xs text-amber-300 font-extrabold">
                  Wallet Balance: ₱{(topUser?.stats?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowSuccessStoryModal(true)}
              className="relative z-10 w-full md:w-auto px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 border border-amber-200 shrink-0 whitespace-nowrap"
            >
              <Trophy className="w-4 h-4 text-slate-950" />
              <span>Buksan ang Success Story Popup</span>
            </button>
          </div>
        );
      })()}

      {/* LIVE DATABASE SUCCESS STORY POPUP MODAL (ADMIN ONLY) */}
      {data && (
        <SuccessStoryModal
          isOpen={showSuccessStoryModal}
          onClose={() => setShowSuccessStoryModal(false)}
          users={data.users}
        />
      )}

      {/* REDEMPTION BANNER MODAL FOR REAL WITHDRAWALS */}
      <RedemptionBannerModal
        isOpen={showRedemptionModal}
        onClose={() => setShowRedemptionModal(false)}
        redemption={activeRedemptionRecord}
      />

      {/* METRICS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* TOTAL REGISTERED */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-450">Regular Users</span>
            <Users className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 leading-tight">
            {totalUsers - 1} <span className="text-xs font-bold text-slate-400">mga account</span>
          </div>
          <p className="text-[9px] text-slate-550 font-bold">Lahat ng devices ay synchronized.</p>
        </div>

        {/* ACTIVE COMBINED BALANCE */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-450">Hawak na Pera ngayon</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 leading-tight">
            ₱{totalSystemBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[9px] text-slate-550 font-bold">Kabuuang active balances sa system.</p>
        </div>

        {/* PENDING CASH OUTS */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-450">Pending Cashouts</span>
            <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-500 leading-tight">
            {pendingRequests.length} <span className="text-xs font-black text-slate-450">(₱{pendingVolume.toFixed(0)})</span>
          </div>
          <p className="text-[9px] text-slate-550 font-bold">Naghihintay ng iyong pag-approve.</p>
        </div>

        {/* TOTAL APPROVED VOLUME */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-450">Naipadalang Pera</span>
            <CheckCircle className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 leading-tight">
            ₱{approvedVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[9px] text-slate-550 font-bold">Kabuuang approved GCash Cashout volume.</p>
        </div>

      </div>

      {/* NAVIGATION TABS FOR SUB SECTIONS */}
      <div className="flex border-b border-slate-200 gap-1.5 text-xs overflow-x-auto whitespace-nowrap pb-1 scrollbar-thin scrollbar-thumb-indigo-200 touch-pan-x">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-3.5 py-2 font-black transition-all border-b-2 rounded-t-xl cursor-pointer shrink-0 whitespace-nowrap ${
            activeSubTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 bg-white/70'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Overview & Queue
        </button>
        <button
          onClick={() => { setActiveSubTab('subscriptions'); }}
          className={`px-3.5 py-2 font-black transition-all border-b-2 rounded-t-xl cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeSubTab === 'subscriptions'
              ? 'border-indigo-600 text-indigo-600 bg-white/70'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Subscription Requests</span>
          {(users.filter(u => u.subscription?.status === 'pending').length + (reelsData.reelSubscriptions || []).filter((s: any) => s.status === 'pending').length) > 0 && (
            <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
              {users.filter(u => u.subscription?.status === 'pending').length + (reelsData.reelSubscriptions || []).filter((s: any) => s.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveSubTab('users'); setSelectedUser(null); }}
          className={`px-3.5 py-2 font-black transition-all border-b-2 rounded-t-xl cursor-pointer shrink-0 whitespace-nowrap ${
            activeSubTab === 'users'
              ? 'border-indigo-600 text-indigo-600 bg-white/70'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Users Registry
        </button>
        <button
          onClick={() => { setActiveSubTab('merchant_ads'); }}
          className={`px-3.5 py-2 font-black transition-all border-b-2 rounded-t-xl cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeSubTab === 'merchant_ads'
              ? 'border-indigo-600 text-indigo-600 bg-white/70'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Merchant Promos</span>
          {merchantAds.filter(a => a.status === 'pending').length > 0 && (
            <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
              {merchantAds.filter(a => a.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveSubTab('reels'); fetchAdminReels(); }}
          className={`px-3.5 py-2 font-black transition-all border-b-2 rounded-t-xl cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeSubTab === 'reels'
              ? 'border-indigo-600 text-indigo-600 bg-white/70'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Video className="w-3.5 h-3.5 text-rose-500" />
          <span>Reels & Tokens</span>
          {(reelsData.reels.filter((r: any) => r.status === 'pending').length > 0 || reelsData.reelSubscriptions.filter((s: any) => s.status === 'pending').length > 0) && (
            <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
              {reelsData.reels.filter((r: any) => r.status === 'pending').length + reelsData.reelSubscriptions.filter((s: any) => s.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveSubTab('settings'); }}
          className={`px-3.5 py-2 font-black transition-all border-b-2 rounded-t-xl cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeSubTab === 'settings'
              ? 'border-indigo-600 text-indigo-600 bg-white/70'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>App Settings</span>
        </button>
      </div>

      {/* SECTION 1: OVERVIEW & QUEUE */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">

          {/* 🌐 SYSTEM CLONE & UNIQUE DEMO TESTING URL CARD (ADMIN EXCLUSIVE) */}
          <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border-2 border-amber-400 rounded-3xl p-5 shadow-xl text-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 rounded-2xl border border-amber-400/40 text-amber-300">
                  <Globe className="w-5 h-5 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm uppercase tracking-wider flex items-center gap-2">
                    <span>🌐 System Testing Clone URL</span>
                    <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase">Admin Exclusive</span>
                  </h3>
                  <p className="text-[11px] text-slate-300 font-semibold">
                    I-share ang unique link na ito sa mga gustong mag-testing ng system nang WALANG Monetag Ads.
                  </p>
                </div>
              </div>
            </div>

            {/* URL INPUT & COPY CONTROLS */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
                Unique Demo / Testing Clone URL:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/?mode=demo`}
                  className="flex-1 bg-slate-950/90 border border-amber-400/50 rounded-xl px-3 py-2 text-xs font-mono text-yellow-300 select-all focus:outline-hidden"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/?mode=demo`);
                    triggerNotification('📋 Na-copy na ang Unique Demo Testing URL!', 'success');
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Kopyahin Link</span>
                </button>
                <a
                  href={`${window.location.origin}/?mode=demo`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Subukan (Demo)</span>
                </a>
              </div>
            </div>

            {/* FEATURES SUMMARY */}
            <div className="bg-slate-950/70 rounded-2xl p-3 border border-slate-800 text-[11px] text-slate-300 space-y-1">
              <div className="font-extrabold text-amber-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mga Katangian ng Testing Clone Link na ito:</span>
              </div>
              <ul className="list-disc list-inside text-[10px] space-y-0.5 text-slate-400 pl-1">
                <li><strong className="text-emerald-300">Walang Monetag Ads:</strong> Automatic na binabara at pinipigilan ang Monetag ad scripts.</li>
                <li><strong className="text-yellow-300">Floating Demo Banner:</strong> Naka-sticky overlay ang babala at impormasyon para sa mga nagte-testing.</li>
                <li><strong className="text-indigo-300">ECHOZONEPH Direction:</strong> Malinaw na itinuturo ang totoong platform sa Google Chrome.</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* QUEUE OF CASH OUT REQUESTS */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>GCash Cashout Queue ({pendingRequests.length} Pending)</span>
              </h3>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
                🎉 Mahusay! Walang nakabinbing Cashout request ngayon. Lahat ng hiling ay naproseso na!
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((item) => (
                  <div 
                    key={item.request.id} 
                    id={`with-request-${item.request.id}`}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row justify-between gap-4"
                  >
                    <div className="space-y-3 flex-1">
                      {/* USER INFO & AMOUNT */}
                      <div className="flex items-center gap-2">
                        <div className="bg-indigo-50 border border-indigo-100 p-1 rounded-full shrink-0 flex items-center justify-center w-9 h-9">
                          {renderAvatar(item.userAvatar, "w-7 h-7")}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-xs leading-none">{item.userName}</h4>
                          <p className="text-[10px] text-slate-450 font-bold">{item.request.createdAt}</p>
                        </div>
                        <span className="ml-auto bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold px-2.5 py-1 rounded-xl text-sm">
                          ₱{item.request.amount.toFixed(2)}
                        </span>
                      </div>

                      {/* GCASH DETAILS */}
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-150 grid grid-cols-2 gap-2 text-[11px] leading-tight font-semibold text-slate-700">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">GCash Name</span>
                          <span className="text-slate-900 font-extrabold truncate">{item.request.accountName}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">GCash Number</span>
                          <span className="text-slate-900 font-extrabold font-mono text-xs">{item.request.gcashNumber}</span>
                        </div>
                        <div className="col-span-2 border-t border-slate-200/50 pt-1.5 flex justify-between items-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase">System Reference</span>
                          <span className="text-slate-500 font-mono text-[10px] font-bold">{item.request.referenceNo}</span>
                        </div>
                      </div>
                    </div>

                    {/* DECISION ACTION BUTTONS */}
                    <div className="flex md:flex-col justify-end gap-2 shrink-0 md:w-[150px]">
                      <button
                        onClick={() => handleWithdrawalAction(item.request.id, 'approve')}
                        disabled={processingId !== null}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-extrabold text-[11px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>I-Approve</span>
                      </button>
                      <button
                        onClick={() => handleWithdrawalAction(item.request.id, 'decline')}
                        disabled={processingId !== null}
                        className="flex-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 text-rose-600 font-extrabold text-[11px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>I-Decline (Refund)</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* RECENT SETTLED DEPOSITS/TRANSFERS */}
            <div className="space-y-2 pt-2">
              <h4 className="text-[10px] uppercase font-black text-slate-450 tracking-wider">Settled & Completed Transactions</h4>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {withdrawals.filter(w => w.request.status !== 'pending' && w.request.status !== 'processing').slice(0, 5).map((item) => (
                  <div key={item.request.id} className="p-3.5 flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-50 border border-slate-100 p-0.5 rounded-full shrink-0 flex items-center justify-center w-7 h-7">
                        {renderAvatar(item.userAvatar, "w-6 h-6")}
                      </div>
                      <div>
                        <h5 className="font-extrabold text-slate-800 leading-tight">{item.userName}</h5>
                        <p className="text-[10px] text-slate-400">{item.request.createdAt}</p>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="font-black text-slate-900 block">₱{item.request.amount.toFixed(2)}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        item.request.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                      }`}>
                        {item.request.status === 'success' ? 'SENT SUCCESSFULLY' : 'DECLINED / REFUNDED'}
                      </span>
                      {item.request.status === 'success' && (
                        <button
                          onClick={() => {
                            setActiveRedemptionRecord({
                              userName: item.userName,
                              userAvatar: item.userAvatar,
                              amount: item.request.amount,
                              createdAt: item.request.createdAt,
                              referenceNo: item.request.referenceNo
                            });
                            setShowRedemptionModal(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black px-2 py-0.5 rounded transition shadow-xs flex items-center gap-0.5 cursor-pointer mt-0.5"
                        >
                          <Download className="w-2.5 h-2.5" />
                          <span>Download Banner</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {withdrawals.filter(w => w.request.status !== 'pending' && w.request.status !== 'processing').length === 0 && (
                  <div className="text-center py-4 text-slate-400 text-[11px]">Wala pang settled transactions.</div>
                )}
              </div>
            </div>

          </div>

          {/* SERVER LOGS & CONTROLS */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>General System Activity Logs</span>
            </h3>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4 max-h-[500px] overflow-y-auto">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Live logs from everyone ({users.reduce((sum, u) => sum + u.lastActivities.length, 0)} items)</p>
              
              <div className="space-y-3.5">
                {users.flatMap(u => u.lastActivities.map(log => ({ ...log, userName: u.name, userAvatar: u.avatar, userEmail: u.email })))
                  .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                  .slice(0, 15)
                  .map((log) => (
                    <div key={log.id} className="text-[11px] leading-relaxed border-l-2 border-slate-200 pl-2.5 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <div className="shrink-0 flex items-center justify-center w-5 h-5">
                          {renderAvatar(log.userAvatar, "w-4 h-4")}
                        </div>
                        <span className="font-black text-slate-800">{log.userName}</span>
                        <span className="text-[9px] text-slate-400 ml-auto font-mono">{log.timestamp.split(',')[1] || log.timestamp}</span>
                      </div>
                      <h5 className="font-extrabold text-indigo-700 flex items-center gap-1 leading-snug">
                        {log.type === 'reward' && '💎'}
                        {log.type === 'bonus' && '⭐'}
                        {log.type === 'withdraw' && '💳'}
                        <span>{log.title}</span>
                      </h5>
                      <p className="text-slate-550 font-bold text-[10px] leading-tight">{log.details}</p>
                      {log.amount > 0 && (
                        <span className="inline-block bg-slate-100 text-slate-700 font-black text-[9px] px-1 py-0.2 rounded mt-0.5">
                          Amount: ₱{log.amount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>

        </div>
        </div>
      )}

      {/* SECTION ATTACHMENT: SUBSCRIPTIONS */}
      {activeSubTab === 'subscriptions' && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <span>Subscription Management Hub</span>
            </h3>
            <p className="text-xs text-slate-500 font-bold mt-1">
              Dito pinoproseso ang mga kahilingan ng mga user upang makagamit ng system base sa kanilang binayarang subscription plan.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* PENDING REQUESTS COLUMN */}
            <div className="lg:col-span-2 space-y-6">

              {/* SECTION A: TOKEN SUBSCRIPTION GCASH PAYMENT REQUESTS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase font-extrabold text-rose-600 tracking-wider flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-rose-500" />
                    <span>Token Subscription GCash Payments ({(reelsData.reelSubscriptions || []).filter((s: any) => s.status === 'pending').length} Pending)</span>
                  </h4>
                  <span className="text-[10px] bg-rose-50 border border-rose-200 text-rose-700 font-bold px-2 py-0.5 rounded-full">
                    ₱10 = 10 Tokens (20 Reels)
                  </span>
                </div>

                {(reelsData.reelSubscriptions || []).filter((s: any) => s.status === 'pending').length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center text-slate-400 text-xs font-bold">
                    ✨ Walang nakabinbing Token Subscription GCash payment request sa ngayon.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(reelsData.reelSubscriptions || []).filter((s: any) => s.status === 'pending').map((s: any) => (
                      <div 
                        key={s.id}
                        className="bg-white border-2 border-rose-100 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row justify-between gap-4 items-center"
                      >
                        <div className="space-y-3 flex-1 w-full">
                          <div className="flex items-center gap-2.5">
                            <div className="bg-rose-50 border border-rose-100 p-2 rounded-full shrink-0 flex items-center justify-center w-10 h-10">
                              <Coins className="w-5 h-5 text-rose-600" />
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 text-xs leading-none">{s.userName}</h4>
                              <p className="text-[10px] text-slate-400 font-bold mt-1 font-mono">ID: {s.userId}</p>
                            </div>
                            
                            <span className="ml-auto bg-emerald-50 border border-emerald-200 text-emerald-800 font-black px-2.5 py-1 rounded-xl text-xs shrink-0 text-right">
                              {s.packageName || '10 Tokens (20 Reels)'} <span className="block text-[10px] font-black text-emerald-600">₱{s.amount || 10}</span>
                            </span>
                          </div>

                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-150 text-[10px] space-y-1.5 text-slate-700 font-bold">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">GCash Mobile No:</span>
                              <span className="text-slate-900 font-mono font-black text-xs bg-white px-2 py-0.5 rounded border border-slate-200">{s.gcashNumber}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">GCash Ref No:</span>
                              <span className="text-indigo-600 font-mono font-black text-xs bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{s.gcashRefNo}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1 border-t border-slate-200/60">
                              <span>Petsa ng Bayad:</span>
                              <span className="font-mono">{s.createdAt ? new Date(s.createdAt).toLocaleString('fil-PH') : 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* ACTIONS FOR REEL TOKEN SUB */}
                        <div className="flex md:flex-col justify-end gap-2 shrink-0 w-full md:w-[150px]">
                          <button
                            onClick={() => handleApproveReelSub(s.id)}
                            disabled={processingId !== null}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-extrabold text-[11px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>I-Approve (+10 Tokens)</span>
                          </button>
                          <button
                            onClick={() => handleDeclineReelSub(s.id)}
                            disabled={processingId !== null}
                            className="flex-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 text-rose-600 font-extrabold text-[11px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>I-Decline</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION B: APP VIP SUBSCRIPTIONS */}
              <div className="space-y-4 pt-2 border-t border-slate-200/80">
                <h4 className="text-xs uppercase font-extrabold text-slate-550 tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>VIP App Access Subscriptions ({users.filter(u => u.subscription?.status === 'pending').length} Pending)</span>
                </h4>

                {users.filter(u => u.subscription?.status === 'pending').length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs font-bold leading-relaxed">
                    🎉 Walang nakabinbing VIP App Subscription Request.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.filter(u => u.subscription?.status === 'pending').map((u) => (
                      <div 
                        key={u.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row justify-between gap-4 items-center"
                      >
                        <div className="space-y-3 flex-1 w-full">
                          <div className="flex items-center gap-2.5">
                            <div className="bg-orange-50 border border-orange-100 p-1 rounded-full shrink-0 flex items-center justify-center w-10 h-10">
                              {renderAvatar(u.avatar, "w-8 h-8")}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 text-xs leading-none">{u.name}</h4>
                              <p className="text-[10px] text-slate-450 font-bold mt-1.5 font-mono">{u.email}</p>
                            </div>
                            
                            <span className="ml-auto bg-amber-50 border border-amber-200 text-amber-700 font-extrabold px-2.5 py-1 rounded-xl text-xs shrink-0 text-right">
                              {u.subscription?.requestedPlanName} <span className="block text-[10px] font-black text-amber-600">₱{u.subscription?.requestedAmount}</span>
                            </span>
                          </div>

                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-150 text-[10px] space-y-1 text-slate-600 font-bold">
                            <div className="flex justify-between">
                              <span>Petsa ng Hiling:</span>
                              <span className="text-slate-900 font-mono">
                                {u.subscription?.requestedAt ? new Date(u.subscription.requestedAt).toLocaleString('fil-PH') : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Trial Activation:</span>
                              <span className="text-slate-900 font-mono">
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fil-PH') : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex md:flex-col justify-end gap-2 shrink-0 w-full md:w-[150px]">
                          <button
                            onClick={() => handleSubscriptionAction(u.id, 'approve')}
                            disabled={processingId !== null}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-extrabold text-[11px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>I-Approve</span>
                          </button>
                          <button
                            onClick={() => handleSubscriptionAction(u.id, 'decline')}
                            disabled={processingId !== null}
                            className="flex-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 text-rose-600 font-extrabold text-[11px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>I-Decline</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* LIST OF CURRENT ACCESSIBLE USERS */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-extrabold text-slate-550 tracking-wider">
                System Access Registry
              </h4>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-[480px] overflow-y-auto shadow-xs">
                {users.map((u) => {
                  const badge = getSubscriptionBadgeAndRemaining(u);
                  return (
                    <div key={u.id} className="p-3.5 flex items-center justify-between text-xs gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="bg-slate-50 border border-slate-100 p-0.5 rounded-full shrink-0 flex items-center justify-center w-7 h-7">
                          {renderAvatar(u.avatar, "w-6 h-6")}
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-slate-800 leading-tight truncate">{u.name}</h5>
                          <p className="text-[9px] text-slate-450 font-bold mt-0.5 truncate">{u.email}</p>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span className={badge.className}>
                          {badge.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SECTION 2: USERS REGISTRY */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          
          {/* USER DIRECTORY SEARCH & LIST */}
          <div className="space-y-4">
            
            {/* SEARCH */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input 
                type="text" 
                placeholder="I-search ang pangalan, email, o referral code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2 text-xs font-bold rounded-2xl outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>

            {/* USERS CARD CONTAINER GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.filter(u => !u.isAdmin).map((u) => (
                <div 
                  key={u.id}
                  onClick={() => setSelectedUser(u.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs space-y-3 relative overflow-hidden ${
                    u.isBanned
                      ? 'bg-rose-50/40 border-rose-200'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="bg-indigo-50 border border-indigo-100 p-1 rounded-full shrink-0 flex items-center justify-center w-11 h-11">
                        {renderAvatar(u.avatar, "w-9 h-9")}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-950 leading-tight truncate flex items-center gap-1.5">
                          <span>{u.name}</span>
                        </h4>
                        <p className="text-[10px] text-slate-400 font-semibold truncate">{u.email}</p>
                      </div>
                    </div>
                    {u.isBanned && (
                      <span className="bg-rose-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-0.5">
                        <Ban className="w-2.5 h-2.5" /> BANNED
                      </span>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-2 grid grid-cols-3 gap-1 text-center font-bold">
                    <div>
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-black">Hold Balance</span>
                      <span className="text-slate-900 font-black text-xs">₱{u.stats.balance.toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-black">Lifetime Earn</span>
                      <span className="text-emerald-600 font-black text-xs">₱{u.stats.lifetimeEarnings.toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-black">Completes</span>
                      <span className="text-indigo-600 font-black text-xs">{u.stats.completedTasksCount} Views</span>
                    </div>
                  </div>

                  {u.withdrawals && u.withdrawals.some(w => w.status === 'pending' || w.status === 'processing') && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-[10px] flex items-center justify-between text-amber-800 font-extrabold animate-pulse">
                      <span>May {u.withdrawals.filter(w => w.status === 'pending' || w.status === 'processing').length} pending cashout:</span>
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-lg text-xs font-black">
                        ₱{u.withdrawals.filter(w => w.status === 'pending' || w.status === 'processing').reduce((sum, w) => sum + w.amount, 0).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="text-[9px] font-bold text-slate-455 flex items-center justify-between pt-1 border-t border-slate-50">
                    <span>Code: <strong className="font-mono text-slate-800">{u.referralCode}</strong></span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(u.id);
                      }}
                      className="flex items-center gap-1 font-extrabold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition"
                    >
                      <span>View Profile Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}

              {filteredUsers.filter(u => !u.isAdmin).length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-3xl border border-slate-200">
                  ⚠️ Walang tugmang non-admin user para sa iyong search query.
                </div>
              )}
            </div>

          </div>

          {/* USER SPECIFIC DETAIL POPUP MODAL */}
          {selectedUserInfo && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-5 relative">
                
                {/* Close Button */}
                <button
                  onClick={() => setSelectedUser(null)}
                  className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-full p-2 transition cursor-pointer"
                  title="Isara"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header Profile Summary */}
                <div className="text-center space-y-2 border-b border-slate-100 pb-4 pr-8">
                  <div className="inline-flex bg-slate-50 p-2 rounded-full shadow-inner justify-center items-center w-20 h-20 border border-slate-100 relative">
                    {renderAvatar(selectedUserInfo.avatar, "w-16 h-16")}
                    {selectedUserInfo.isBanned && (
                      <span className="absolute -bottom-1 -right-1 bg-rose-600 text-white p-1 rounded-full border-2 border-white" title="Banned User">
                        <Ban className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2">
                      <h4 className="text-lg font-black text-slate-950 leading-tight">{selectedUserInfo.name}</h4>
                      {selectedUserInfo.isBanned && (
                        <span className="bg-rose-100 border border-rose-200 text-rose-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                          BANNED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">{selectedUserInfo.email}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full select-all">
                        UID: {selectedUserInfo.id}
                      </span>
                      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full select-all">
                        Ref Code: {selectedUserInfo.referralCode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ADMIN ACTION CONTROLS: BAN AND DELETE */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Admin Moderation Tools</span>
                  <div className="flex gap-3">
                    {/* BAN / UNBAN BUTTON */}
                    <button
                      type="button"
                      disabled={processingId === selectedUserInfo.id}
                      onClick={() => handleBanUser(selectedUserInfo.id, selectedUserInfo.isBanned)}
                      className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                        selectedUserInfo.isBanned
                          ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
                          : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white'
                      }`}
                    >
                      <Ban className="w-4 h-4" />
                      <span>{selectedUserInfo.isBanned ? '🟢 Unban User' : '🚫 Ban User'}</span>
                    </button>

                    {/* DELETE USER BUTTON */}
                    <button
                      type="button"
                      disabled={processingId === selectedUserInfo.id}
                      onClick={() => handleDeleteUser(selectedUserInfo.id, selectedUserInfo.name)}
                      className="flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>🗑️ Delete User</span>
                    </button>
                  </div>
                </div>

                {/* USER PROGRESS SUMMARY */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Performance</h5>
                  
                  <div className="space-y-2 text-xs font-semibold text-slate-700">
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span>Balanse sa Wallet</span>
                      <strong className="text-slate-900 text-sm">₱{selectedUserInfo.stats.balance.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span>Kabuuang Kinita (Lifetime)</span>
                      <strong className="text-emerald-600">₱{selectedUserInfo.stats.lifetimeEarnings.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span>Natapos na Tasks</span>
                      <strong className="text-indigo-600">{selectedUserInfo.stats.completedTasksCount} websites viewed</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span>Mga Na-invite (Referrals)</span>
                      <strong className="text-rose-600">{selectedUserInfo.referredFriendsCount} na kaibigan</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span>Daily Check-In Date</span>
                      <span className="text-slate-500">{selectedUserInfo.stats.dailyCheckInDate || 'Hindi pa nag-checheck-In'}</span>
                    </div>
                  </div>
                </div>

                {/* WITHDRAWAL HISTORY OF THE INDIVIDUAL */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    <span>Mga Withdrawal Request ({selectedUserInfo.withdrawals?.length || 0})</span>
                  </h5>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {selectedUserInfo.withdrawals && selectedUserInfo.withdrawals.length > 0 ? (
                      selectedUserInfo.withdrawals.map((w) => (
                        <div key={w.id} className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-[10px] font-semibold space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-slate-500 font-bold">{w.createdAt}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                              w.status === 'success' ? 'bg-emerald-100 text-emerald-800' :
                              w.status === 'failed' || w.status === 'declined' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800 animate-pulse'
                            }`}>
                              {w.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-slate-700">
                            <span>Amount:</span>
                            <span className="font-extrabold text-slate-950 text-xs">₱{w.amount.toFixed(2)}</span>
                          </div>
                          <div className="text-[9px] text-slate-500 font-medium">
                            <div>GCash: <strong className="text-slate-700 font-bold">{w.accountName}</strong> ({w.gcashNumber})</div>
                            <div className="font-mono mt-0.5">Ref: {w.referenceNo}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-2 text-slate-400 text-[10px]">Walang nahanap na withdrawal request.</p>
                    )}
                  </div>
                </div>

                {/* LOGS OF THE INDIVIDUAL */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">History Log ({selectedUserInfo.lastActivities.length})</h5>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                    {selectedUserInfo.lastActivities.map(log => (
                      <div key={log.id} className="text-[10px] leading-relaxed border-l-2 border-slate-200 pl-2">
                        <div className="flex justify-between font-bold text-slate-500">
                          <span>{log.title}</span>
                          <span className="font-mono font-medium text-[8px] text-slate-400">{log.timestamp.includes(',') ? log.timestamp.split(',')[1] : log.timestamp}</span>
                        </div>
                        <p className="text-slate-400 font-semibold">{log.details}</p>
                        {log.amount > 0 && <span className="font-extrabold text-emerald-600">₱{log.amount.toFixed(2)}</span>}
                      </div>
                    ))}
                    {selectedUserInfo.lastActivities.length === 0 && (
                      <p className="text-center py-4 text-slate-400 text-[10px]">Wala pang na-record na aktibidad.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* SECTION 4: MERCHANT ADS MANAGEMENT */}
      {activeSubTab === 'merchant_ads' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-950 text-base flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-indigo-600" />
                  <span>Merchant Promotions Registry & Verification</span>
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  Suriin ang mga GCash payment reference number at pamahalaan ang mga sponsored advertisements.
                </p>
              </div>
              <span className="bg-indigo-100 text-indigo-800 text-xs font-black px-3 py-1 rounded-xl">
                Pending Requests: {merchantAds.filter(a => a.status === 'pending').length}
              </span>
            </div>

            {/* PENDING QUEUE */}
            <div className="mt-6 space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">⏳ Pending Verification Queue</h4>
              {merchantAds.filter(a => a.status === 'pending').length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-450 font-bold text-xs select-none">
                  🎉 Magaling! Walang nakabinbing merchant promotion requests na kailangang suriin.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {merchantAds.filter(a => a.status === 'pending').map(ad => (
                    <div key={ad.id} className="border border-amber-200 bg-amber-50/20 rounded-2xl p-4.5 space-y-4">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-10 w-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-lg shadow-xs shrink-0">
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
                            <h4 className="font-black text-slate-950 text-xs leading-snug">{ad.title}</h4>
                            <span className="text-[10px] text-amber-800 font-black tracking-wide uppercase bg-amber-100 px-1.5 py-0.5 rounded-md">
                              {ad.planName} (₱{ad.price})
                            </span>
                          </div>
                        </div>

                        <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase animate-pulse">
                          Pending GCash Pay
                        </span>
                      </div>

                      <div className="text-xs space-y-1.5 font-semibold text-slate-700 bg-white/60 rounded-xl p-3 border border-slate-150">
                        <div className="flex justify-between text-[10px] text-slate-400 border-b border-slate-100 pb-1.5 mb-1.5">
                          <span>SENDER DETALYE:</span>
                          <span className="font-bold text-indigo-700">User ID: {ad.userId}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          👤 <span>Merchant:</span> 
                          <strong className="text-slate-900 font-bold">{ad.userName}</strong>
                        </div>
                        <div className="flex items-center gap-1.5">
                          📱 <span>GCash Number:</span> 
                          <strong className="text-slate-950 font-black">{ad.gcashSenderNumber}</strong>
                        </div>
                        <div className="flex items-center gap-1.5">
                          🔑 <span>Reference No:</span> 
                          <strong className="text-emerald-700 font-black select-all bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{ad.gcashReferenceNo}</strong>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ad Content & Target Link:</h5>
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-white p-2 rounded-lg border border-slate-150 line-clamp-3">
                          {ad.description}
                        </p>
                        <a 
                          href={ad.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] text-blue-600 hover:underline font-bold truncate block"
                        >
                          🔗 Link: {ad.url}
                        </a>
                      </div>

                      <div className="flex gap-2.5 pt-2 border-t border-slate-150 justify-end">
                        <button
                          disabled={processingId !== null}
                          onClick={() => handleMerchantAdAction(ad.id, 'decline')}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-[10px] px-3.5 py-2 rounded-xl transition cursor-pointer"
                        >
                          Decline Request
                        </button>
                        <button
                          disabled={processingId !== null}
                          onClick={() => handleMerchantAdAction(ad.id, 'approve')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] px-4.5 py-2 rounded-xl transition cursor-pointer shadow-md shadow-emerald-600/10"
                        >
                          Approve & Go Live ✔️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PROCESSED HISTORY */}
            <div className="mt-8 space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">📋 Verified Ads Registry & History</h4>
              {merchantAds.filter(a => a.status !== 'pending').length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                  Walang nakaraang natapos na promosyon request.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold text-slate-700 border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-wider border-b border-slate-200">
                        <th className="p-3">Ad Title / Merchant</th>
                        <th className="p-3">Plan Details</th>
                        <th className="p-3">GCash Verification</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {merchantAds.filter(a => a.status !== 'pending').map(ad => (
                        <tr key={ad.id} className="hover:bg-slate-50/50">
                          <td className="p-3 space-y-0.5">
                            <div className="font-black text-slate-950">{ad.title}</div>
                            <div className="text-[10px] text-slate-400 font-medium">Merchant: {ad.userName} (ID: {ad.userId})</div>
                          </td>
                          <td className="p-3">
                            <div className="font-extrabold text-indigo-700">{ad.planName}</div>
                            <div className="text-[10px] text-slate-550 font-bold">Paid ₱{ad.price} for {ad.durationDays} Days</div>
                          </td>
                          <td className="p-3 text-[10px] font-mono leading-relaxed">
                            <div>From: <strong className="text-slate-800">{ad.gcashSenderNumber}</strong></div>
                            <div>Ref: <strong className="text-slate-800">{ad.gcashReferenceNo}</strong></div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              ad.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                              ad.status === 'declined' ? 'bg-rose-100 text-rose-800' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {ad.status}
                            </span>
                          </td>
                          <td className="p-3 text-[10px] text-slate-400 font-mono">
                            {new Date(ad.createdAt).toLocaleString('fil-PH', { hour12: true })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* SECTION: REELS & TOKENS MODERATION */}
      {activeSubTab === 'reels' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-950 text-base flex items-center gap-2">
                  <Video className="w-5 h-5 text-rose-600" />
                  <span>Reels Moderation & Token Subscriptions</span>
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  Approve o i-disapprove ang Reels uploads ng users. (Approved reels lang ang mababawasan ng 0.50 tokens!)
                </p>
              </div>
              <button
                onClick={fetchAdminReels}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>I-refresh Data</span>
              </button>
            </div>

            {/* QUEUE 1: PENDING USER REELS FOR APPROVAL */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span>📹 Pending Reels Upload Queue</span>
                  <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                    {reelsData.reels.filter((r: any) => r.status === 'pending').length}
                  </span>
                </h4>
              </div>

              {reelsData.reels.filter((r: any) => r.status === 'pending').length === 0 ? (
                <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 text-xs font-bold">
                  ✨ Walang nakapila na pending Reels para sa approval.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reelsData.reels.filter((r: any) => r.status === 'pending').map((reel: any) => (
                    <div key={reel.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900 truncate max-w-[200px]">
                          {reel.title || 'Untitled Reel'}
                        </span>
                        <span className="bg-rose-100 text-rose-800 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                          {reel.platform || 'video'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 font-semibold space-y-1">
                        <div>👤 Submitted by: <strong className="text-slate-800">{reel.addedBy || 'User'}</strong></div>
                        <div className="text-[10px] text-slate-400 font-mono">📅 Date: {new Date(reel.createdAt).toLocaleString('fil-PH')}</div>
                      </div>

                      {/* PLAY PREVIEW IN EMBED */}
                      <div className="space-y-2">
                        {playingReelId === reel.id ? (
                          <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[320px] flex items-center justify-center border border-slate-800">
                            {(() => {
                              const formatted = formatEmbedUrl(reel.embedUrl || reel.url || '');
                              const isDirect = formatted.platform === 'direct' && (
                                formatted.embedUrl.match(/\.(mp4|webm|mov)($|\?)/i) || 
                                reel.url?.match(/\.(mp4|webm|mov)($|\?)/i)
                              );

                              if (isDirect) {
                                return (
                                  <video
                                    src={formatted.embedUrl || reel.url}
                                    controls
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-contain bg-black"
                                  />
                                );
                              }

                              return (
                                <iframe
                                  src={formatted.embedUrl || reel.embedUrl || reel.url}
                                  title={reel.title || 'Reel Preview'}
                                  className="w-full h-full border-0 bg-black"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              );
                            })()}
                            <button
                              onClick={() => setPlayingReelId(null)}
                              className="absolute top-2 right-2 bg-slate-900/90 text-white text-[10px] font-black px-2.5 py-1 rounded-lg border border-slate-700 shadow-md cursor-pointer z-10"
                            >
                              ✕ Isara Preview
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPlayingReelId(reel.id)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>i-Preview Video</span>
                            </button>
                            <a
                              href={reel.url || reel.originalUrl || reel.embedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-500 hover:text-indigo-600 font-bold text-[11px] flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Buksan sa New Tab</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* DISAPPROVE REASON INPUT & ACTIONS */}
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <input
                          type="text"
                          placeholder="Dahilan kung disapproving (hal. Inappropriate content)"
                          value={disapproveReasons[reel.id] || ''}
                          onChange={(e) => setDisapproveReasons({ ...disapproveReasons, [reel.id]: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-rose-500"
                        />
                        <div className="flex gap-2">
                          <button
                            disabled={processingId === reel.id}
                            onClick={() => handleDisapproveReel(reel.id)}
                            className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs py-2 rounded-xl transition cursor-pointer"
                          >
                            Disapprove (0 Tokens Deducted)
                          </button>
                          <button
                            disabled={processingId === reel.id}
                            onClick={() => handleApproveReel(reel.id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2 rounded-xl transition cursor-pointer shadow-md"
                          >
                            Approve (-0.50 Tokens)
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* QUEUE 2: TOKEN SUBSCRIPTION REQUESTS (₱10 = 20 REELS) */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span>🎟️ Token Subscription GCash Payment Requests</span>
                  <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                    {reelsData.reelSubscriptions.filter((s: any) => s.status === 'pending').length}
                  </span>
                </h4>
              </div>

              {reelsData.reelSubscriptions.filter((s: any) => s.status === 'pending').length === 0 ? (
                <div className="text-center py-6 bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 text-xs font-bold">
                  ✨ Walang nakapila na pending token payment request.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reelsData.reelSubscriptions.filter((s: any) => s.status === 'pending').map((sub: any) => (
                    <div key={sub.id} className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-slate-900">
                          {sub.userName || 'User'}
                        </span>
                        <span className="bg-emerald-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full">
                          ₱{sub.amount}.00 (10 Tokens / 20 Reels)
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 font-semibold space-y-1 bg-white p-2.5 rounded-xl border border-amber-100">
                        <div>📱 GCash Mobile Number: <strong className="text-slate-900">{sub.gcashNumber}</strong></div>
                        <div>🔑 GCash Ref No: <strong className="text-emerald-700 font-mono tracking-wider">{sub.gcashRefNo}</strong></div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1">📅 Date: {new Date(sub.createdAt).toLocaleString('fil-PH')}</div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          disabled={processingId === sub.id}
                          onClick={() => handleDeclineReelSub(sub.id)}
                          className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs py-2 rounded-xl transition cursor-pointer"
                        >
                          Decline Request
                        </button>
                        <button
                          disabled={processingId === sub.id}
                          onClick={() => handleApproveReelSub(sub.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2 rounded-xl transition cursor-pointer shadow-md"
                        >
                          Approve (+10 Tokens)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* VERIFIED REELS HISTORY */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                📋 Verified Approved / Disapproved Reels History ({reelsData.reels.filter((r: any) => r.status !== 'pending').length})
              </h4>
              
              {reelsData.reels.filter((r: any) => r.status !== 'pending').length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold text-slate-700 border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase text-[9px]">
                        <th className="p-2.5">Title</th>
                        <th className="p-2.5">Platform</th>
                        <th className="p-2.5">User</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reelsData.reels.filter((r: any) => r.status !== 'pending').map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{r.title || 'Reel'}</td>
                          <td className="p-2.5 text-[10px] font-mono uppercase">{r.platform}</td>
                          <td className="p-2.5 text-[11px]">{r.addedBy || 'User'}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-[10px] text-slate-400 font-mono">
                            {new Date(r.createdAt).toLocaleDateString('fil-PH')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* USER REELS PROFIT REDEMPTIONS (PAYOUTS) */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span>💰 User Reels Profit Redemptions History ({reelsData.reelRedemptions?.length || 0})</span>
                </h4>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full font-mono">
                  Total Redeemed Payouts: ₱{(reelsData.reelRedemptions || []).reduce((sum: number, r: any) => sum + (r.amount || 0), 0).toFixed(2)}
                </span>
              </div>

              {!reelsData.reelRedemptions || reelsData.reelRedemptions.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 text-xs font-bold">
                  ✨ Walang pang naitalang reel profit redemptions mula sa mga users.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold text-slate-700 border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase text-[9px]">
                        <th className="p-2.5">User</th>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5">Amount Redeemed</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reelsData.reelRedemptions.map((red: any) => (
                        <tr key={red.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{red.userName || 'User'}</td>
                          <td className="p-2.5 text-[11px] text-slate-500 font-mono">{red.userEmail || 'N/A'}</td>
                          <td className="p-2.5 font-black text-emerald-600 font-mono text-xs">
                            ₱{Number(red.amount).toFixed(2)}
                          </td>
                          <td className="p-2.5">
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                              {red.status || 'completed'} (Credited to Balance)
                            </span>
                          </td>
                          <td className="p-2.5 text-[10px] text-slate-400 font-mono">
                            {new Date(red.createdAt).toLocaleString('fil-PH')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* SECTION 5: APP SETTINGS (GCASH QR UPDATE) */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-950 text-base flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  <span>App System Configuration</span>
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  Pamahalaan ang mga dynamic configuration at resources ng iyong application.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
              {/* CURRENT QR PREVIEW & INFO */}
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl space-y-4 flex flex-col items-center justify-between">
                <div className="text-center space-y-1.5 w-full">
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <QrCode className="w-4 h-4 text-indigo-600" />
                    <span>Kasalukuyang GCash QR Code</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-normal font-semibold">
                    Ito ang QR Code na kasalukuyang nakikita at dina-download ng mga user sa website.
                  </p>
                </div>

                <div className="bg-white p-3.5 border border-slate-200 rounded-2xl shadow-xs max-w-[240px] w-full flex items-center justify-center overflow-hidden">
                  <img
                    src={`/admin_gcash_qr.png?t=${qrTimestamp}`}
                    alt="Current Admin GCash QR"
                    className="max-h-[220px] object-contain rounded-lg shadow-xs"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://placehold.co/300x400/f1f5f9/64748b?text=Walang+QR+Code";
                    }}
                  />
                </div>

                <div className="text-center text-[10px] text-slate-400 font-mono">
                  Route: /admin_gcash_qr.png
                </div>
              </div>

              {/* UPLOAD NEW QR */}
              <div className="bg-white border border-slate-200/80 p-6 rounded-2xl space-y-5">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-950 text-sm">
                    Mag-upload ng Bagong GCash QR Code
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-normal font-semibold">
                    Pumili ng malinaw na larawan ng iyong GCash QR Code (InstaPay Merchant QR o personal GCash QR) para mapalitan ang luma.
                  </p>
                </div>

                {/* DRAG AND DROP / FILE SELECTOR */}
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl p-6 transition text-center space-y-3 bg-slate-50/50 relative">
                  <input
                    type="file"
                    id="new-gcash-qr-upload"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={handleQrUploadChange}
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="bg-indigo-50 p-2.5 rounded-full text-indigo-600">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-black text-slate-700 block">
                        {qrPreview ? 'May napili nang bagong larawan!' : 'I-click o i-drag ang larawan dito'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Dapat ay PNG, JPG, o JPEG format (Max 10MB)
                      </span>
                    </div>
                  </div>
                </div>

                {/* SELECTED PREVIEW */}
                {qrPreview && (
                  <div className="space-y-2 animate-fadeIn border border-indigo-100 bg-indigo-50/20 p-4 rounded-xl flex items-center gap-4">
                    <img
                      src={qrPreview}
                      alt="Selected QR Preview"
                      className="w-14 h-18 object-contain rounded border border-indigo-200"
                    />
                    <div className="flex-1 space-y-1">
                      <span className="text-[11px] font-extrabold text-indigo-950 block">Preview ng Bagong Larawan</span>
                      <p className="text-[9px] text-slate-500 font-semibold leading-tight">
                        Ito ang bagong GCash QR na ipapalit sa kasalukuyang imahe. Siguraduhing malinaw ang QR details.
                      </p>
                    </div>
                  </div>
                )}

                {/* ACTION BUTTON */}
                <button
                  type="button"
                  onClick={handleSaveQrCode}
                  disabled={qrUploading || !qrPreview}
                  className={`w-full py-3 rounded-xl font-black text-xs transition duration-200 flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                    qrUploading
                      ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                      : !qrPreview
                        ? 'bg-slate-100 border border-slate-150 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                  }`}
                >
                  {qrUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Inia-update ang QR Code...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>I-save at Ilapat ang Bagong QR Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
