import React, { useState, useEffect } from 'react';
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
  Award
} from 'lucide-react';
import { ActivityLog, UserStats, WithdrawalRequest, Subscription } from '../types';

interface AdminDashboardData {
  users: {
    id: string;
    email: string;
    name: string;
    avatar: string;
    isAdmin: boolean;
    stats: UserStats;
    withdrawalsCount: number;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'subscriptions' | 'users'>('overview');

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
    }
  }, [token]);

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

        <button 
          onClick={fetchAdminData}
          id="refresh-admin-btn"
          className="bg-white border border-slate-200 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-extrabold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          <span>I-refresh Server</span>
        </button>
      </div>

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
      <div className="flex border-b border-slate-200 gap-1 text-xs">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 font-black transition-all border-b-2 rounded-t-xl cursor-pointer ${
            activeSubTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 bg-white/70'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Overview & Queue
        </button>
        <button
          onClick={() => { setActiveSubTab('subscriptions'); }}
          className={`px-4 py-2 font-black transition-all border-b-2 rounded-t-xl cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'subscriptions'
              ? 'border-indigo-600 text-indigo-600 bg-white/70'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Subscription Requests</span>
          {users.filter(u => u.subscription?.status === 'pending').length > 0 && (
            <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
              {users.filter(u => u.subscription?.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveSubTab('users'); setSelectedUser(null); }}
          className={`px-4 py-2 font-black transition-all border-b-2 rounded-t-xl cursor-pointer ${
            activeSubTab === 'users'
              ? 'border-indigo-600 text-indigo-600 bg-white/70'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Users Registry
        </button>
      </div>

      {/* SECTION 1: OVERVIEW & QUEUE */}
      {activeSubTab === 'overview' && (
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
                        <span className="text-xl bg-indigo-50 p-1.5 rounded-full shrink-0">{item.userAvatar}</span>
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
                      <span className="text-base">{item.userAvatar}</span>
                      <div>
                        <h5 className="font-extrabold text-slate-800 leading-tight">{item.userName}</h5>
                        <p className="text-[10px] text-slate-400">{item.request.createdAt}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-slate-900 block">₱{item.request.amount.toFixed(2)}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        item.request.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                      }`}>
                        {item.request.status === 'success' ? 'SENT SUCCESSFULLY' : 'DECLINED / REFUNDED'}
                      </span>
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
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-slate-500">{log.userAvatar}</span>
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
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs uppercase font-extrabold text-slate-550 tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Pending Requests ({users.filter(u => u.subscription?.status === 'pending').length})</span>
              </h4>

              {users.filter(u => u.subscription?.status === 'pending').length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs font-bold leading-relaxed">
                  🎉 Walang nakabinbing Subscription Request sa ngayon. Lahat ng hiling ay naproseso na!
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
                          <span className="text-xl bg-orange-50 border border-orange-100 p-2 rounded-full shrink-0">{u.avatar || '👤'}</span>
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
                        <span className="text-base shrink-0">{u.avatar || '👤'}</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* USER DIRECTORY SEARCH & LIST */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* SEARCH */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input 
                type="text" 
                placeholder="I-search ang pangalan, email, o referral code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2 text-xs font-bold rounded-2xl outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>

            {/* USERS CARD CONTAINER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredUsers.filter(u => !u.isAdmin).map((u) => (
                <div 
                  key={u.id}
                  onClick={() => setSelectedUser(u.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs space-y-3 ${
                    selectedUser === u.id 
                      ? 'bg-indigo-50/50 border-indigo-300' 
                      : 'bg-white border-slate-200 hover:border-slate-350 hover:shadow-xs'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl bg-indigo-50 p-1.5 rounded-full">{u.avatar}</span>
                      <div>
                        <h4 className="font-extrabold text-slate-950 leading-tight flex items-center gap-1.5">
                          <span>{u.name}</span>
                        </h4>
                        <p className="text-[10px] text-slate-400 font-semibold">{u.email}</p>
                      </div>
                    </div>
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

                  <div className="text-[9px] font-bold text-slate-450 flex items-center justify-between pt-0.5 border-t border-slate-50">
                    <span>Code: <strong className="font-mono text-slate-800">{u.referralCode}</strong></span>
                    <span className="flex items-center gap-0.5 font-black text-indigo-600">
                      View Profile Details <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}

              {filteredUsers.filter(u => !u.isAdmin).length === 0 && (
                <div className="col-span-2 py-8 text-center text-slate-400 text-xs">
                  ⚠️ Walang tugmang non-admin user para sa iyong search query.
                </div>
              )}
            </div>

          </div>

          {/* USER SPECIFIC DETAIL DIALOG */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Award className="w-4 h-4 text-yellow-500 animate-bounce" />
              <span>Active Auditor / User Activities</span>
            </h3>

            {selectedUserInfo ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
                <div className="text-center space-y-2 border-b border-slate-100 pb-4">
                  <span className="text-4xl inline-block bg-slate-50 p-3 rounded-full shadow-inner">{selectedUserInfo.avatar}</span>
                  <div>
                    <h4 className="text-base font-black text-slate-950 leading-tight">{selectedUserInfo.name}</h4>
                    <p className="text-xs text-slate-400 font-semibold">{selectedUserInfo.email}</p>
                    <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full mt-1.5 select-all">
                      UID: {selectedUserInfo.id}
                    </span>
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

                {/* LOGS OF THE INDIVIDUAL */}
                <div className="space-y-2">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">History Log ({selectedUserInfo.lastActivities.length})</h5>
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {selectedUserInfo.lastActivities.map(log => (
                      <div key={log.id} className="text-[10px] leading-relaxed border-l border-slate-200 pl-2">
                        <div className="flex justify-between font-bold text-slate-500">
                          <span>{log.title}</span>
                          <span className="font-mono font-medium text-[8px] text-slate-400">{log.timestamp.split(',')[1] || log.timestamp}</span>
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
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">
                💡 Mag-click ng kahit sinong user sa registry para suriin ang kanilang live dashboard, balances, at timestamped log files.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
