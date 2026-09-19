import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  X,
  Search,
  Check,
  Clock,
  MessageCircle,
  AlertCircle,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { FriendRequest, Friendship } from '../types';

interface FriendsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  currentUserId: string;
  onStartDM?: (userId: string, userName: string, userAvatar?: string) => void;
  onViewProfile?: (userId: string) => void;
  language?: 'tl' | 'en';
}

interface FriendItem {
  id: string;
  name: string;
  avatar: string;
  handle: string;
  bio?: string;
  isOnline?: boolean;
  mutualCount?: number;
  reasonCode?: string;
  reasonLabel?: string;
  isFollowing?: boolean;
}

interface RequestItem {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string;
    handle: string;
    bio?: string;
  } | null;
  mutualCount: number;
}

export const FriendsManagerModal: React.FC<FriendsManagerModalProps> = ({
  isOpen,
  onClose,
  token,
  currentUserId,
  onStartDM,
  onViewProfile
}) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'suggestions' | 'friends'>('requests');
  const [requestSubTab, setRequestSubTab] = useState<'incoming' | 'outgoing'>('incoming');
  
  const [incomingRequests, setIncomingRequests] = useState<RequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<RequestItem[]>([]);
  const [suggestions, setSuggestions] = useState<FriendItem[]>([]);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const authHeader = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/zone/friends/requests', {
        headers: authHeader ? { Authorization: authHeader } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIncomingRequests(data.incoming || []);
          setOutgoingRequests(data.outgoing || []);
        }
      }
    } catch (err) {
      console.error('Failed to load friend requests', err);
    }
  };

  const loadSuggestions = async () => {
    try {
      // Phase 2A: Query intelligent discovery candidates first
      const res = await fetch('/api/zone/discovery/people-you-may-know', {
        headers: authHeader ? { Authorization: authHeader } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.candidates)) {
          setSuggestions(data.candidates);
          return;
        }
      }
      // Backward-compatible fallback
      const fallbackRes = await fetch('/api/zone/friends/suggestions', {
        headers: authHeader ? { Authorization: authHeader } : {}
      });
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        if (data.success) {
          setSuggestions(data.suggestions || []);
        }
      }
    } catch (err) {
      console.error('Failed to load suggestions', err);
    }
  };

  const handleDismissSuggestion = async (targetUserId: string) => {
    try {
      setSuggestions(prev => prev.filter(s => s.id !== targetUserId));
      await fetch(`/api/zone/discovery/dismiss/${targetUserId}`, {
        method: 'POST',
        headers: authHeader ? { Authorization: authHeader } : {}
      });
    } catch (err) {
      console.error('Failed to dismiss suggestion', err);
    }
  };

  const loadFriends = async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/zone/friends/${currentUserId}`, {
        headers: authHeader ? { Authorization: authHeader } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFriends(data.friends || []);
        }
      }
    } catch (err) {
      console.error('Failed to load friends', err);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([loadRequests(), loadSuggestions(), loadFriends()]);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      refreshAll();
    }
  }, [isOpen, currentUserId]);

  // Handle Respond (Accept / Decline)
  const handleRespond = async (requestId: string, action: 'accept' | 'decline') => {
    setActionLoadingId(requestId);
    try {
      const res = await fetch('/api/zone/friends/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: JSON.stringify({ requestId, action })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
        showToast(action === 'accept' ? '🤝 Tinanggap ang Friend Request!' : 'Tinanggihan ang request.');
        loadFriends();
        window.dispatchEvent(new Event('refresh-zone-feed'));
      } else {
        showToast(data.error || 'Hindi matagumpay ang aksyon.');
      }
    } catch (err) {
      showToast('Error sa pagsagot sa request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Cancel Outgoing Request
  const handleCancelRequest = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      const res = await fetch('/api/zone/friends/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: JSON.stringify({ requestId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOutgoingRequests(prev => prev.filter(r => r.id !== requestId));
        showToast('Na-cancel ang friend request.');
      } else {
        showToast(data.error || 'Bigo ang pag-cancel.');
      }
    } catch (err) {
      showToast('Error sa pag-cancel.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Send Friend Request from Suggestions
  const handleSendRequest = async (targetUserId: string) => {
    setActionLoadingId(targetUserId);
    try {
      const res = await fetch('/api/zone/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: JSON.stringify({ targetUserId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuggestions(prev => prev.filter(s => s.id !== targetUserId));
        showToast(data.message || 'Naipadala ang friend request!');
        loadRequests();
        if (data.autoAccepted) {
          loadFriends();
        }
      } else {
        showToast(data.error || 'Bigo ang pagpadala ng friend request.');
      }
    } catch (err) {
      showToast('Error sa pagpadala ng friend request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Unfriend
  const handleUnfriend = async (targetUserId: string, name: string) => {
    if (!window.confirm(`Sigurado ka bang nais mong alisin si ${name} sa iyong mga kaibigan?`)) {
      return;
    }
    setActionLoadingId(targetUserId);
    try {
      const res = await fetch('/api/zone/friends/unfriend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: JSON.stringify({ targetUserId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFriends(prev => prev.filter(f => f.id !== targetUserId));
        showToast(`Naalis si ${name} sa iyong mga kaibigan.`);
        loadSuggestions();
        window.dispatchEvent(new Event('refresh-zone-feed'));
      } else {
        showToast(data.error || 'Bigo ang pag-unfriend.');
      }
    } catch (err) {
      showToast('Error sa pag-unfriend.');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      id="friends-manager-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Mga Kaibigan sa Z-one</span>
                {incomingRequests.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-pulse">
                    {incomingRequests.length} bago
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Pamahalaan ang iyong social network at connections</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={refreshAll}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="I-refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button
              id="close-friends-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Isara"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-4 mt-3 p-2.5 bg-blue-600/90 text-white text-xs font-semibold rounded-xl flex items-center justify-between shadow-lg"
            >
              <span>{toastMessage}</span>
              <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-white/20 rounded-md">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-4 bg-slate-950/40">
          <button
            id="tab-friend-requests-btn"
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'requests'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Mga Request</span>
            {incomingRequests.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                {incomingRequests.length}
              </span>
            )}
          </button>
          <button
            id="tab-friend-suggestions-btn"
            onClick={() => setActiveTab('suggestions')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'suggestions'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Mungkahi ({suggestions.length})</span>
          </button>
          <button
            id="tab-all-friends-btn"
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'friends'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Aking Kaibigan ({friends.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 custom-scrollbar space-y-4">
          {/* TAB 1: REQUESTS */}
          {activeTab === 'requests' && (
            <div>
              {/* Sub tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setRequestSubTab('incoming')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    requestSubTab === 'incoming'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Natanggap ({incomingRequests.length})
                </button>
                <button
                  onClick={() => setRequestSubTab('outgoing')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    requestSubTab === 'outgoing'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Naipadala ({outgoingRequests.length})
                </button>
              </div>

              {requestSubTab === 'incoming' ? (
                incomingRequests.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <UserCheck className="w-12 h-12 mx-auto text-slate-600 opacity-60" />
                    <p className="text-sm font-medium">Walang bagong friend request sa ngayon.</p>
                    <p className="text-xs text-slate-500">Tingnan ang tab na Mungkahi upang magdagdag ng mga bagong kaibigan!</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {incomingRequests.map(req => {
                      if (!req.user) return null;
                      const isLoading = actionLoadingId === req.id;
                      return (
                        <div
                          key={req.id}
                          className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between gap-3 hover:border-slate-600 transition"
                        >
                          <div
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => onViewProfile && onViewProfile(req.user!.id)}
                          >
                            <div className="w-11 h-11 rounded-full bg-slate-700 border border-slate-600 overflow-hidden flex items-center justify-center text-lg font-bold shrink-0">
                              {req.user.avatar && (req.user.avatar.startsWith('http') || req.user.avatar.startsWith('data:')) ? (
                                <img src={req.user.avatar} alt={req.user.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{req.user.avatar || '👤'}</span>
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white hover:text-blue-400 transition">
                                {req.user.name}
                              </h4>
                              <p className="text-xs text-cyan-400 font-mono">{req.user.handle}</p>
                              {req.mutualCount > 0 && (
                                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                  <Users className="w-3 h-3 text-slate-500" />
                                  <span>{req.mutualCount} mutual friend{req.mutualCount > 1 ? 's' : ''}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleRespond(req.id, 'accept')}
                              disabled={isLoading}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Tanggapin</span>
                            </button>
                            <button
                              onClick={() => handleRespond(req.id, 'decline')}
                              disabled={isLoading}
                              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer"
                            >
                              Tanggihan
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                outgoingRequests.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Clock className="w-12 h-12 mx-auto text-slate-600 opacity-60" />
                    <p className="text-sm font-medium">Wala kang naipadalang pending friend requests.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {outgoingRequests.map(req => {
                      if (!req.user) return null;
                      const isLoading = actionLoadingId === req.id;
                      return (
                        <div
                          key={req.id}
                          className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between gap-3 hover:border-slate-600 transition"
                        >
                          <div
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => onViewProfile && onViewProfile(req.user!.id)}
                          >
                            <div className="w-11 h-11 rounded-full bg-slate-700 border border-slate-600 overflow-hidden flex items-center justify-center text-lg font-bold shrink-0">
                              {req.user.avatar && (req.user.avatar.startsWith('http') || req.user.avatar.startsWith('data:')) ? (
                                <img src={req.user.avatar} alt={req.user.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{req.user.avatar || '👤'}</span>
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white hover:text-blue-400 transition">
                                {req.user.name}
                              </h4>
                              <p className="text-xs text-cyan-400 font-mono">{req.user.handle}</p>
                              <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md font-medium mt-1 inline-block">
                                Naghihintay ng tugon...
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer"
                          >
                            I-cancel
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 2: SUGGESTIONS */}
          {activeTab === 'suggestions' && (
            <div>
              {suggestions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Sparkles className="w-12 h-12 mx-auto text-amber-500/60" />
                  <p className="text-sm font-medium">Walang karagdagang mungkahi sa kasalukuyan.</p>
                  <p className="text-xs text-slate-500">I-refresh o mag-imbita ng iba pa sa Z-one!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {suggestions.map(sug => {
                    const isLoading = actionLoadingId === sug.id;
                    return (
                      <div
                        key={sug.id}
                        className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between gap-3 hover:border-slate-600 transition"
                      >
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => onViewProfile && onViewProfile(sug.id)}
                        >
                          <div className="relative">
                            <div className="w-11 h-11 rounded-full bg-slate-700 border border-slate-600 overflow-hidden flex items-center justify-center text-lg font-bold shrink-0">
                              {sug.avatar && (sug.avatar.startsWith('http') || sug.avatar.startsWith('data:')) ? (
                                <img src={sug.avatar} alt={sug.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{sug.avatar || '👤'}</span>
                              )}
                            </div>
                            {sug.isOnline && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white hover:text-blue-400 transition">
                              {sug.name}
                            </h4>
                            <p className="text-xs text-cyan-400 font-mono">{sug.handle}</p>
                            {sug.reasonLabel ? (
                              <p className="text-[11px] text-amber-400/90 font-medium mt-0.5 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>{sug.reasonLabel}</span>
                              </p>
                            ) : (sug.mutualCount || 0) > 0 ? (
                              <p className="text-[11px] text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{sug.mutualCount} mutual friend{sug.mutualCount! > 1 ? 's' : ''}</span>
                              </p>
                            ) : sug.bio ? (
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{sug.bio}</p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleSendRequest(sug.id)}
                            disabled={isLoading}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>+ Add Friend</span>
                          </button>
                          <button
                            onClick={() => handleDismissSuggestion(sug.id)}
                            title="I-dismiss ang mungkahi"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 rounded-lg transition cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MY FRIENDS */}
          {activeTab === 'friends' && (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Maghanap sa mga kaibigan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {filteredFriends.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Users className="w-12 h-12 mx-auto text-slate-600 opacity-60" />
                  <p className="text-sm font-medium">
                    {searchQuery ? 'Walang nahanap na kaibigan sa iyong paghahanap.' : 'Wala ka pang kaibigan sa Z-one.'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setActiveTab('suggestions')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition"
                    >
                      Tumingin ng mga Mungkahi
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredFriends.map(friend => {
                    const isLoading = actionLoadingId === friend.id;
                    return (
                      <div
                        key={friend.id}
                        className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between gap-3 hover:border-slate-600 transition"
                      >
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => onViewProfile && onViewProfile(friend.id)}
                        >
                          <div className="relative">
                            <div className="w-11 h-11 rounded-full bg-slate-700 border border-slate-600 overflow-hidden flex items-center justify-center text-lg font-bold shrink-0">
                              {friend.avatar && (friend.avatar.startsWith('http') || friend.avatar.startsWith('data:')) ? (
                                <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{friend.avatar || '👤'}</span>
                              )}
                            </div>
                            {friend.isOnline && (
                              <div
                                className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"
                                title="Online"
                              />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-bold text-white hover:text-blue-400 transition">
                                {friend.name}
                              </h4>
                              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                Friend
                              </span>
                            </div>
                            <p className="text-xs text-cyan-400 font-mono">{friend.handle}</p>
                            {(friend.mutualCount || 0) > 0 && (
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {friend.mutualCount} mutual friend{friend.mutualCount! > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {onStartDM && (
                            <button
                              onClick={() => {
                                onStartDM(friend.id, friend.name, friend.avatar);
                                onClose();
                              }}
                              className="p-2 bg-slate-700/80 hover:bg-slate-700 text-cyan-400 rounded-lg transition"
                              title="Magpadala ng Mensahe"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleUnfriend(friend.id, friend.name)}
                            disabled={isLoading}
                            className="p-2 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 border border-slate-700 rounded-lg transition disabled:opacity-50"
                            title="Alisin sa mga Kaibigan"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
