import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Shield,
  Crown,
  Search,
  Plus,
  X,
  Sparkles,
  Lock,
  Globe,
  Check,
  UserPlus,
  MessageCircle,
  AlertCircle,
  LogOut,
  ChevronRight,
  Filter,
  UserCheck,
  UserX,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { CommunityPreview, CommunityRecord, CommunityRole } from '../types';

interface CommunityDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  currentUserId: string;
  language?: 'tl' | 'en';
  onOpenGroupChat?: (groupId: string) => void;
  triggerNotification?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const CATEGORIES = [
  'Lahat',
  'General',
  'Negosyo',
  'Tech',
  'Libangan',
  'Paligsahan',
  'Gaming',
  'Edukasyon'
];

const EMOJI_AVATARS = ['🌐', '👥', '💼', '🚀', '🎯', '🛍️', '💡', '🎮', '📚', '🎬', '🔥', '🏆', '💎', '🇵🇭'];

export const CommunityDiscoveryModal: React.FC<CommunityDiscoveryModalProps> = ({
  isOpen,
  onClose,
  token,
  currentUserId,
  language = 'tl',
  onOpenGroupChat,
  triggerNotification
}) => {
  const [activeTab, setActiveTab] = useState<'discover' | 'recommendations' | 'my_communities' | 'requests'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Lahat');
  const [communities, setCommunities] = useState<CommunityPreview[]>([]);
  const [recommendations, setRecommendations] = useState<CommunityPreview[]>([]);
  const [myCommunities, setMyCommunities] = useState<CommunityPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Community creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCategory, setCreateCategory] = useState('General');
  const [createDescription, setCreateDescription] = useState('');
  const [createAvatar, setCreateAvatar] = useState('🌐');
  const [createPrivacy, setCreatePrivacy] = useState<'public' | 'private'>('public');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Selected community detail view
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityRecord | null>(null);
  const [communityMembers, setCommunityMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>('all');

  // Load communities based on tab
  const fetchCommunities = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      if (activeTab === 'discover') {
        const catParam = selectedCategory !== 'Lahat' ? `&category=${encodeURIComponent(selectedCategory)}` : '';
        const searchParam = searchQuery.trim() ? `&q=${encodeURIComponent(searchQuery.trim())}` : '';
        const res = await fetch(`/api/zone/communities?discover=true${catParam}${searchParam}`, {
          headers: { 'Authorization': token }
        });
        if (res.ok) {
          const data = await res.json();
          setCommunities(data.communities || []);
        }
      } else if (activeTab === 'recommendations') {
        const res = await fetch('/api/zone/communities/recommendations?limit=12', {
          headers: { 'Authorization': token }
        });
        if (res.ok) {
          const data = await res.json();
          setRecommendations(data.recommendations || []);
        }
      } else if (activeTab === 'my_communities') {
        const res = await fetch('/api/zone/communities?scope=mine', {
          headers: { 'Authorization': token }
        });
        if (res.ok) {
          const data = await res.json();
          setMyCommunities(data.communities || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch communities', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCommunities();
    }
  }, [isOpen, activeTab, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCommunities();
  };

  // Join Public Community
  const handleJoin = async (communityId: string) => {
    setActionLoadingId(communityId);
    try {
      const res = await fetch(`/api/zone/communities/${communityId}/join`, {
        method: 'POST',
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (res.ok) {
        triggerNotification?.(
          language === 'tl' ? 'Matagumpay kang sumali sa komunidad! 🎉' : 'Successfully joined community! 🎉',
          'success'
        );
        fetchCommunities();
      } else {
        triggerNotification?.(data.error || 'Hindi makasali sa komunidad.', 'error');
      }
    } catch (err) {
      triggerNotification?.('Nagka-problema sa pagsali.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Request to Join Private Community
  const handleRequestJoin = async (communityId: string) => {
    setActionLoadingId(communityId);
    try {
      const res = await fetch(`/api/zone/communities/${communityId}/request`, {
        method: 'POST',
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (res.ok) {
        triggerNotification?.(
          language === 'tl' ? 'Napadala ang kahilingang sumali. Maghintay ng pag-apruba! ⏳' : 'Join request sent. Awaiting approval! ⏳',
          'info'
        );
        fetchCommunities();
      } else {
        triggerNotification?.(data.error || 'Hindi maipadala ang request.', 'error');
      }
    } catch (err) {
      triggerNotification?.('Nagka-problema sa pag-request.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Leave Community
  const handleLeave = async (communityId: string) => {
    if (!confirm(language === 'tl' ? 'Sigurado ka bang nais mong umalis sa komunidad na ito?' : 'Are you sure you want to leave this community?')) {
      return;
    }
    setActionLoadingId(communityId);
    try {
      const res = await fetch(`/api/zone/communities/${communityId}/leave`, {
        method: 'POST',
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (res.ok) {
        triggerNotification?.(
          language === 'tl' ? 'Nakaalis ka na sa komunidad.' : 'Left community.',
          'info'
        );
        if (selectedCommunity?.id === communityId) {
          setSelectedCommunity(null);
        }
        fetchCommunities();
      } else {
        triggerNotification?.(data.error || 'Hindi makaalis sa komunidad.', 'error');
      }
    } catch (err) {
      triggerNotification?.('Nagka-problema sa pag-alis.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Create Community
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      triggerNotification?.('Pakilagay ang pangalan ng komunidad.', 'error');
      return;
    }
    setIsSubmittingCreate(true);
    try {
      const res = await fetch('/api/zone/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          name: createName.trim(),
          category: createCategory,
          description: createDescription.trim(),
          avatar: createAvatar,
          privacy: createPrivacy
        })
      });
      const data = await res.json();
      if (res.ok && data.community) {
        triggerNotification?.(
          language === 'tl' ? 'Matagumpay na nagawa ang komunidad! 🌟' : 'Community created successfully! 🌟',
          'success'
        );
        setShowCreateModal(false);
        setCreateName('');
        setCreateDescription('');
        setActiveTab('my_communities');
        fetchCommunities();
      } else {
        triggerNotification?.(data.error || 'Nabigo sa paggawa ng komunidad.', 'error');
      }
    } catch (err) {
      triggerNotification?.('Error sa paggawa ng komunidad.', 'error');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Open Community Details & Members
  const handleOpenDetails = async (commId: string) => {
    setLoadingMembers(true);
    try {
      const [commRes, membersRes] = await Promise.all([
        fetch(`/api/zone/communities/${commId}`, { headers: { 'Authorization': token } }),
        fetch(`/api/zone/communities/${commId}/members`, { headers: { 'Authorization': token } })
      ]);
      if (commRes.ok) {
        const commData = await commRes.json();
        setSelectedCommunity(commData.community);
      }
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setCommunityMembers(membersData.members || []);
      }
    } catch (err) {
      console.error('Failed to load community details', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Promote / Demote / Remove actions
  const handleRoleAction = async (action: 'promote' | 'demote' | 'remove', targetUserId: string, role?: string) => {
    if (!selectedCommunity) return;
    try {
      let url = '';
      let body: any = undefined;
      if (action === 'promote') {
        url = `/api/zone/communities/${selectedCommunity.id}/members/${targetUserId}/promote`;
        body = { newRole: role || 'moderator' };
      } else if (action === 'demote') {
        url = `/api/zone/communities/${selectedCommunity.id}/members/${targetUserId}/demote`;
      } else if (action === 'remove') {
        if (!confirm(language === 'tl' ? 'Sigurado ka bang nais mong tanggalin ang miyembrong ito?' : 'Remove this member?')) return;
        url = `/api/zone/communities/${selectedCommunity.id}/members/${targetUserId}`;
      }

      const res = await fetch(url, {
        method: action === 'remove' ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json();
      if (res.ok) {
        triggerNotification?.(data.message || 'Tagumpay na na-update ang miyembro!', 'success');
        handleOpenDetails(selectedCommunity.id);
      } else {
        triggerNotification?.(data.error || 'Nabigo ang aksyon.', 'error');
      }
    } catch (err) {
      triggerNotification?.('Error sa pagsasagawa ng aksyon.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200/80">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                {language === 'tl' ? 'Mga Komunidad at Grupo' : 'Communities & Groups'}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  Phase 2B
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {language === 'tl'
                  ? 'Kumonekta sa kapwa Ka-Zone, sumali sa mga talakayan, at magpalago ng grupo'
                  : 'Connect with fellow members, join discussions, and grow communities'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'tl' ? 'Gumawa' : 'Create'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-450 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="px-4 pt-3 border-b border-slate-100 flex gap-2 bg-white overflow-x-auto scrollbar-none">
          <button
            onClick={() => { setActiveTab('discover'); setSelectedCommunity(null); }}
            className={`pb-3 px-3 font-black text-xs flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'discover'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'tl' ? 'Tuklasin' : 'Discover'}</span>
          </button>
          <button
            onClick={() => { setActiveTab('recommendations'); setSelectedCommunity(null); }}
            className={`pb-3 px-3 font-black text-xs flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'recommendations'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{language === 'tl' ? 'Para sa Iyo' : 'For You'}</span>
          </button>
          <button
            onClick={() => { setActiveTab('my_communities'); setSelectedCommunity(null); }}
            className={`pb-3 px-3 font-black text-xs flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'my_communities'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>{language === 'tl' ? 'Aking Mga Komunidad' : 'My Communities'}</span>
            {myCommunities.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-bold">
                {myCommunities.length}
              </span>
            )}
          </button>
        </div>

        {/* DETAIL VIEW MODAL OR MAIN CONTENT */}
        {selectedCommunity ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <button
              onClick={() => setSelectedCommunity(null)}
              className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              ← {language === 'tl' ? 'Bumalik sa listahan' : 'Back to list'}
            </button>

            {/* Community Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-50 border border-indigo-100/60 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center text-3xl border border-slate-100">
                  {selectedCommunity.avatar || '🌐'}
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                    {selectedCommunity.name}
                    {selectedCommunity.privacy === 'private' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" /> {language === 'tl' ? 'Pribado' : 'Private'}
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {language === 'tl' ? 'Publiko' : 'Public'}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {selectedCommunity.description || (language === 'tl' ? 'Walang paglalarawan' : 'No description')}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 font-bold">
                    <span>👥 {selectedCommunity.members.length} {language === 'tl' ? 'kasapi' : 'members'}</span>
                    <span>📂 {selectedCommunity.category || 'General'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {onOpenGroupChat && selectedCommunity.linkedChatGroupId && (
                  <button
                    onClick={() => {
                      onOpenGroupChat(selectedCommunity.linkedChatGroupId!);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{language === 'tl' ? 'Buksan ang Chat' : 'Open Chat'}</span>
                  </button>
                )}

                {selectedCommunity.members.includes(currentUserId) && selectedCommunity.ownerId !== currentUserId && (
                  <button
                    onClick={() => handleLeave(selectedCommunity.id)}
                    className="px-3 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>{language === 'tl' ? 'Umalis' : 'Leave'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Members Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>{language === 'tl' ? 'Mga Kasapi at Opisyal' : 'Members & Officers'}</span>
                </h5>
                <span className="text-[11px] font-bold text-slate-450">
                  {communityMembers.length} {language === 'tl' ? 'na tao' : 'people'}
                </span>
              </div>

              {loadingMembers ? (
                <div className="p-8 text-center text-xs text-slate-450 font-bold">
                  {language === 'tl' ? 'Kinakarga ang mga miyembro...' : 'Loading members...'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
                  {communityMembers.map(m => {
                    const isOwner = m.role === 'owner';
                    const isAdmin = m.role === 'admin';
                    const isMod = m.role === 'moderator';
                    const canManage = (selectedCommunity.ownerId === currentUserId || selectedCommunity.admins.includes(currentUserId)) && m.id !== currentUserId;

                    return (
                      <div key={m.id} className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-black text-xs overflow-hidden">
                            {m.avatar ? (
                              typeof m.avatar === 'string' && m.avatar.startsWith('http') ? (
                                <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{m.avatar}</span>
                              )
                            ) : (
                              <span>👤</span>
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              <span>{m.name}</span>
                              {isOwner && (
                                <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 font-extrabold flex items-center gap-0.5">
                                  <Crown className="w-2.5 h-2.5" /> Owner
                                </span>
                              )}
                              {isAdmin && (
                                <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-800 font-extrabold flex items-center gap-0.5">
                                  <Shield className="w-2.5 h-2.5" /> Admin
                                </span>
                              )}
                              {isMod && (
                                <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 font-extrabold">
                                  Mod
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-450 font-medium">@{m.handle || m.id}</span>
                          </div>
                        </div>

                        {canManage && (
                          <div className="flex items-center gap-1">
                            {!isAdmin && !isOwner && (
                              <button
                                onClick={() => handleRoleAction('promote', m.id, isMod ? 'admin' : 'moderator')}
                                className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold cursor-pointer transition"
                              >
                                {isMod ? 'Promote Admin' : 'Promote Mod'}
                              </button>
                            )}
                            {(isAdmin || isMod) && selectedCommunity.ownerId === currentUserId && (
                              <button
                                onClick={() => handleRoleAction('demote', m.id)}
                                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer transition"
                              >
                                Demote
                              </button>
                            )}
                            {!isOwner && (
                              <button
                                onClick={() => handleRoleAction('remove', m.id)}
                                className="p-1 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition cursor-pointer"
                                title="Remove member"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MAIN TAB CONTENT */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Search & Filter Bar (Discover Tab) */}
            {activeTab === 'discover' && (
              <div className="space-y-3">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <Search className="w-4 h-4 text-slate-450 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={language === 'tl' ? 'Maghanap ng komunidad o grupo...' : 'Search communities or groups...'}
                    className="w-full pl-9 pr-20 py-2.5 rounded-2xl bg-slate-100/80 border border-slate-200/60 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold cursor-pointer transition"
                  >
                    {language === 'tl' ? 'Hanapin' : 'Search'}
                  </button>
                </form>

                {/* Category Pills */}
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* LISTINGS */}
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                <span className="text-xs font-bold text-slate-500">
                  {language === 'tl' ? 'Kinakarga ang mga komunidad...' : 'Loading communities...'}
                </span>
              </div>
            ) : (
              (() => {
                const list =
                  activeTab === 'discover'
                    ? communities
                    : activeTab === 'recommendations'
                    ? recommendations
                    : myCommunities;

                if (list.length === 0) {
                  return (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-14 h-14 rounded-3xl bg-slate-100 flex items-center justify-center text-2xl">
                        👥
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800">
                          {activeTab === 'my_communities'
                            ? language === 'tl' ? 'Wala ka pang sinalihang komunidad' : 'No communities joined yet'
                            : language === 'tl' ? 'Walang nahanap na komunidad' : 'No communities found'}
                        </h4>
                        <p className="text-xs text-slate-450 font-medium max-w-xs mt-1">
                          {activeTab === 'my_communities'
                            ? language === 'tl'
                              ? 'Tuklasin ang mga grupo sa "Tuklasin" tab o gumawa ng sariling komunidad!'
                              : 'Discover groups in the "Discover" tab or create your own community!'
                            : language === 'tl'
                              ? 'Subukang magpalit ng kategorya o maghanap gamit ang ibang salita.'
                              : 'Try changing category or searching with different keywords.'}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
                      >
                        + {language === 'tl' ? 'Gumawa ng Komunidad' : 'Create Community'}
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {list.map(comm => {
                      const isMember = comm.isMember;
                      const isPending = comm.isPending;
                      const isPrivate = comm.privacy === 'private';
                      const isLoadingAction = actionLoadingId === comm.id;

                      return (
                        <div
                          key={comm.id}
                          className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-indigo-200 bg-white hover:shadow-md transition duration-150 flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-2xl shadow-xs">
                                  {comm.avatar || '🌐'}
                                </div>
                                <div className="min-w-0">
                                  <h4
                                    onClick={() => handleOpenDetails(comm.id)}
                                    className="font-black text-xs sm:text-sm text-slate-900 truncate hover:text-indigo-600 cursor-pointer"
                                  >
                                    {comm.name}
                                  </h4>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-450 font-bold">
                                    <span>{comm.category || 'General'}</span>
                                    <span>•</span>
                                    <span>{comm.memberCount} {language === 'tl' ? 'kasapi' : 'members'}</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                {isPrivate ? (
                                  <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-extrabold flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" /> {language === 'tl' ? 'Pribado' : 'Private'}
                                  </span>
                                ) : (
                                  <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-extrabold flex items-center gap-0.5">
                                    <Globe className="w-2.5 h-2.5" /> {language === 'tl' ? 'Publiko' : 'Public'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {comm.description && (
                              <p className="text-[11px] text-slate-600 font-medium line-clamp-2 leading-relaxed">
                                {comm.description}
                              </p>
                            )}

                            {/* Mutual Friends Preview */}
                            {comm.mutualMembersCount && comm.mutualMembersCount > 0 ? (
                              <div className="flex items-center gap-1.5 pt-1">
                                <div className="flex -space-x-1.5 overflow-hidden">
                                  {comm.mutualFriendsPreview?.map(f => (
                                    <div
                                      key={f.id}
                                      className="w-4 h-4 rounded-full bg-indigo-200 border border-white flex items-center justify-center text-[8px] font-bold overflow-hidden"
                                    >
                                      {typeof f.avatar === 'string' && f.avatar.startsWith('http') ? (
                                        <img src={f.avatar} alt={f.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <span>{f.avatar || '👤'}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-[10px] text-indigo-700 font-bold">
                                  {comm.mutualMembersCount} {language === 'tl' ? 'kaibigan ang kasapi' : 'friends are members'}
                                </span>
                              </div>
                            ) : null}
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <button
                              onClick={() => handleOpenDetails(comm.id)}
                              className="text-[11px] font-black text-slate-500 hover:text-slate-800 transition cursor-pointer"
                            >
                              {language === 'tl' ? 'Tingnan' : 'View Info'}
                            </button>

                            <div>
                              {isMember ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] px-2 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-black flex items-center gap-1">
                                    <Check className="w-3 h-3" /> {comm.userRole ? comm.userRole.toUpperCase() : 'MEMBER'}
                                  </span>
                                  {onOpenGroupChat && comm.linkedChatGroupId && (
                                    <button
                                      onClick={() => {
                                        onOpenGroupChat(comm.linkedChatGroupId!);
                                        onClose();
                                      }}
                                      className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer"
                                      title={language === 'tl' ? 'Buksan ang Chat' : 'Open Chat'}
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ) : isPending ? (
                                <span className="text-[10px] px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 font-black">
                                  {language === 'tl' ? 'Naka-pending' : 'Pending Request'}
                                </span>
                              ) : isPrivate ? (
                                <button
                                  disabled={isLoadingAction}
                                  onClick={() => handleRequestJoin(comm.id)}
                                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black transition active:scale-95 cursor-pointer disabled:opacity-50"
                                >
                                  {isLoadingAction
                                    ? '...'
                                    : language === 'tl' ? 'Humiling Sumali' : 'Request to Join'}
                                </button>
                              ) : (
                                <button
                                  disabled={isLoadingAction}
                                  onClick={() => handleJoin(comm.id)}
                                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black transition active:scale-95 cursor-pointer disabled:opacity-50"
                                >
                                  {isLoadingAction
                                    ? '...'
                                    : language === 'tl' ? 'Sumali' : 'Join'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>
            {language === 'tl'
              ? 'Ligtas at pinangangasiwaang komunidad ng Z-oneApp.'
              : 'Safe and moderated communities by Z-oneApp.'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-800 font-bold transition cursor-pointer"
          >
            {language === 'tl' ? 'Isara' : 'Close'}
          </button>
        </div>
      </div>

      {/* CREATE COMMUNITY SUB-MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-5 border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>{language === 'tl' ? 'Gumawa ng Bagong Komunidad' : 'Create New Community'}</span>
              </h4>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'tl' ? 'Pangalan ng Komunidad' : 'Community Name'}
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  placeholder="Hal. Negosyo at Diskarte Hub"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'tl' ? 'Kategorya' : 'Category'}
                </label>
                <select
                  value={createCategory}
                  onChange={e => setCreateCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {CATEGORIES.filter(c => c !== 'Lahat').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'tl' ? 'Icon / Avatar' : 'Avatar Emoji'}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {EMOJI_AVATARS.map(emo => (
                    <button
                      type="button"
                      key={emo}
                      onClick={() => setCreateAvatar(emo)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg transition cursor-pointer ${
                        createAvatar === emo
                          ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                          : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'tl' ? 'Privacy' : 'Privacy Settings'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreatePrivacy('public')}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      createPrivacy === 'public'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{language === 'tl' ? 'Pampubliko' : 'Public'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatePrivacy('private')}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      createPrivacy === 'private'
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{language === 'tl' ? 'Pribado (Request)' : 'Private'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'tl' ? 'Paglalarawan' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={createDescription}
                  onChange={e => setCreateDescription(e.target.value)}
                  placeholder={language === 'tl' ? 'Ano ang layunin ng komunidad na ito?' : 'What is this community about?'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  {language === 'tl' ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCreate
                    ? '...'
                    : language === 'tl' ? 'Gumawa Ngayon' : 'Create Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
