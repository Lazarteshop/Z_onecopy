import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Sparkles, 
  Video, 
  Users, 
  Play, 
  Heart, 
  Award, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Eye, 
  Share2, 
  Search, 
  DollarSign, 
  ShieldCheck, 
  Building2, 
  Layers, 
  Flame, 
  X,
  Send,
  Upload,
  Filter,
  Check,
  ChevronRight
} from 'lucide-react';
import { CreatorChallenge, ChallengeEntry, SponsoredMission, UserSession } from '../types';

interface CreatorChallengesViewProps {
  token: string | null;
  user: UserSession | null;
  language?: 'tl' | 'en';
  onBackToLauncher?: () => void;
  triggerNotification?: (message: string, type: 'success' | 'info' | 'error') => void;
  onRefreshProfile?: () => void;
}

export const CreatorChallengesView: React.FC<CreatorChallengesViewProps> = ({
  token,
  user,
  language = 'tl',
  onBackToLauncher,
  triggerNotification,
  onRefreshProfile
}) => {
  const isTl = language === 'tl';

  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState<'browse' | 'missions' | 'host'>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data States
  const [challenges, setChallenges] = useState<CreatorChallenge[]>([]);
  const [sponsoredMissions, setSponsoredMissions] = useState<SponsoredMission[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Challenge Detail / Leaderboard Modal
  const [selectedChallenge, setSelectedChallenge] = useState<CreatorChallenge | null>(null);
  const [challengeEntries, setChallengeEntries] = useState<ChallengeEntry[]>([]);
  const [challengeLeaderboard, setChallengeLeaderboard] = useState<ChallengeEntry[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Submit Entry Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [entryMediaUrl, setEntryMediaUrl] = useState('');
  const [entryMediaType, setEntryMediaType] = useState<'video' | 'image'>('video');
  const [entryCaption, setEntryCaption] = useState('');
  const [submittingEntry, setSubmittingEntry] = useState(false);

  // Host Challenge Form
  const [hostTitle, setHostTitle] = useState('');
  const [hostDescription, setHostDescription] = useState('');
  const [hostCategory, setHostCategory] = useState('Singing');
  const [hostRules, setHostRules] = useState('');
  const [hostPrizePool, setHostPrizePool] = useState('1000');
  const [hostMaxParticipants, setHostMaxParticipants] = useState('100');
  const [hostDays, setHostDays] = useState('14');
  const [hostCoverImage, setHostCoverImage] = useState('');
  const [hostingLoading, setHostingLoading] = useState(false);

  // Sponsor Mission Form
  const [missionTitle, setMissionTitle] = useState('');
  const [missionDescription, setMissionDescription] = useState('');
  const [missionBudget, setMissionBudget] = useState('5000');
  const [missionChallengeId, setMissionChallengeId] = useState('');
  const [creatingMission, setCreatingMission] = useState(false);

  // Load Challenges
  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/challenges');
      const data = await res.json();
      if (res.ok && data.success) {
        setChallenges(data.challenges || []);
      }
    } catch (e) {
      console.error('Error fetching challenges:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load Sponsored Missions
  const fetchMissions = async () => {
    try {
      const res = await fetch('/api/sponsored-missions');
      const data = await res.json();
      if (res.ok && data.success) {
        setSponsoredMissions(data.missions || []);
      }
    } catch (e) {
      console.error('Error fetching missions:', e);
    }
  };

  useEffect(() => {
    fetchChallenges();
    fetchMissions();
  }, []);

  // Open Challenge details
  const handleOpenChallenge = async (challenge: CreatorChallenge) => {
    setSelectedChallenge(challenge);
    setLoadingDetails(true);
    // Quota-safe view hit (in-memory only, no per-view cloud write)
    fetch(`/api/challenges/${challenge.id}/view`, { method: 'POST' }).catch(() => {});

    try {
      const res = await fetch(`/api/challenges/${challenge.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedChallenge(data.challenge);
        setChallengeEntries(data.entries || []);
        setChallengeLeaderboard(data.leaderboard || []);
      }
    } catch (e) {
      console.error('Error loading challenge details:', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Join Challenge
  const handleJoinChallenge = async (challengeId: string) => {
    if (!token) {
      triggerNotification?.(isTl ? 'Mag-login muna para makasali sa challenge.' : 'Please login to join the challenge.', 'info');
      return;
    }

    try {
      const res = await fetch(`/api/challenges/${challengeId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerNotification?.(data.message || (isTl ? 'Nakasali ka na sa challenge!' : 'Joined challenge successfully!'), 'success');
        fetchChallenges();
        if (selectedChallenge && selectedChallenge.id === challengeId) {
          handleOpenChallenge(selectedChallenge);
        }
      } else {
        triggerNotification?.(data.error || (isTl ? 'Bigo sa pagsali.' : 'Failed to join.'), 'error');
      }
    } catch (e) {
      triggerNotification?.('Error connecting to server', 'error');
    }
  };

  // Vote for an Entry
  const handleVoteEntry = async (entryId: string) => {
    if (!token) {
      triggerNotification?.(isTl ? 'Mag-login muna para makaboto.' : 'Please login to vote.', 'info');
      return;
    }

    if (!selectedChallenge) return;

    try {
      const res = await fetch(`/api/challenges/${selectedChallenge.id}/entries/${entryId}/vote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Update entry locally
        setChallengeEntries(prev => prev.map(e => {
          if (e.id === entryId) {
            const currentLikes = e.likes || [];
            const newLikes = data.voted 
              ? (currentLikes.includes(user?.id || '') ? currentLikes : [...currentLikes, user?.id || ''])
              : currentLikes.filter(id => id !== user?.id);
            return {
              ...e,
              likes: newLikes,
              votesCount: data.votesCount,
              score: data.score
            };
          }
          return e;
        }));

        setChallengeLeaderboard(prev => {
          const updated = prev.map(e => {
            if (e.id === entryId) {
              const currentLikes = e.likes || [];
              const newLikes = data.voted 
                ? (currentLikes.includes(user?.id || '') ? currentLikes : [...currentLikes, user?.id || ''])
                : currentLikes.filter(id => id !== user?.id);
              return { ...e, likes: newLikes, votesCount: data.votesCount, score: data.score };
            }
            return e;
          });
          return updated.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.votesCount || 0) - (a.votesCount || 0));
        });

        triggerNotification?.(data.voted ? (isTl ? '❤️ Naitala ang iyong boto!' : 'Vote recorded!') : (isTl ? 'Tinanggal ang boto.' : 'Vote removed.'), 'success');
      }
    } catch (e) {
      triggerNotification?.('Error updating vote', 'error');
    }
  };

  // Submit an Entry
  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedChallenge) return;

    if (!entryMediaUrl.trim()) {
      triggerNotification?.(isTl ? 'Maglagay ng video o image link.' : 'Please provide media link.', 'error');
      return;
    }

    setSubmittingEntry(true);
    try {
      const res = await fetch(`/api/challenges/${selectedChallenge.id}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mediaUrl: entryMediaUrl.trim(),
          mediaType: entryMediaType,
          caption: entryCaption.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        triggerNotification?.(isTl ? '🎉 Tagumpay! Nai-submit ang iyong challenge entry.' : 'Entry submitted successfully!', 'success');
        setShowSubmitModal(false);
        setEntryMediaUrl('');
        setEntryCaption('');
        handleOpenChallenge(selectedChallenge);
        fetchChallenges();
      } else {
        triggerNotification?.(data.error || (isTl ? 'Bigo sa pag-submit ng entry.' : 'Failed to submit entry.'), 'error');
      }
    } catch (err) {
      triggerNotification?.('Error submitting entry', 'error');
    } finally {
      setSubmittingEntry(false);
    }
  };

  // Host Challenge Submit
  const handleHostChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      triggerNotification?.(isTl ? 'Mag-login muna para mag-host.' : 'Please login to host a challenge.', 'error');
      return;
    }

    if (!hostTitle.trim() || !hostRules.trim()) {
      triggerNotification?.(isTl ? 'Punan ang title at rules ng challenge.' : 'Please fill title and rules.', 'error');
      return;
    }

    setHostingLoading(true);
    try {
      const endDate = new Date(Date.now() + (Number(hostDays) || 14) * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: hostTitle.trim(),
          description: hostDescription.trim(),
          category: hostCategory,
          rules: hostRules.trim(),
          prizePool: Number(hostPrizePool) || 1000,
          maxParticipants: Number(hostMaxParticipants) || 100,
          endDate,
          coverImage: hostCoverImage.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        triggerNotification?.(isTl ? '🎉 Tagumpay! Na-publish ang iyong bagong challenge.' : 'Challenge published successfully!', 'success');
        setHostTitle('');
        setHostDescription('');
        setHostRules('');
        setActiveTab('browse');
        fetchChallenges();
      } else {
        triggerNotification?.(data.error || 'Failed to publish challenge', 'error');
      }
    } catch (err) {
      triggerNotification?.('Error creating challenge', 'error');
    } finally {
      setHostingLoading(false);
    }
  };

  // Create Sponsored Mission Submit
  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      triggerNotification?.(isTl ? 'Mag-login muna para mag-sponsor.' : 'Please login to sponsor.', 'error');
      return;
    }

    setCreatingMission(true);
    try {
      const res = await fetch('/api/sponsored-missions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: missionTitle.trim(),
          description: missionDescription.trim(),
          budget: Number(missionBudget) || 5000,
          challengeId: missionChallengeId || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        triggerNotification?.(isTl ? '💎 Tagumpay na naitatag ang Sponsored Mission!' : 'Sponsored mission created successfully!', 'success');
        setMissionTitle('');
        setMissionDescription('');
        fetchMissions();
        fetchChallenges();
        setActiveTab('missions');
      } else {
        triggerNotification?.(data.error || 'Failed to create mission', 'error');
      }
    } catch (err) {
      triggerNotification?.('Error creating mission', 'error');
    } finally {
      setCreatingMission(false);
    }
  };

  // Filtered challenges
  const filteredChallenges = challenges.filter(c => {
    const matchesCat = selectedCategory === 'all' || c.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesQuery = !searchQuery.trim() || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.hostName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const totalPrizePoolAvailable = challenges
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + (c.prizePool || 0), 0);

  const categoriesList = [
    { id: 'all', label: isTl ? '🔥 Lahat' : '🔥 All' },
    { id: 'singing', label: '🎤 Singing' },
    { id: 'dancing', label: '💃 Dancing' },
    { id: 'gaming', label: '🎮 Gaming' },
    { id: 'creative', label: '✨ Creative' },
    { id: 'viral', label: '📱 Viral Reels' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* HEADER HERO BANNER */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 rounded-3xl p-6 sm:p-8 text-white border border-indigo-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Z-One Creator Challenges + Sponsored Missions</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              {isTl ? 'Ipakita ang Talento, Manalo ng Premyo & Sponsorships' : 'Showcase Talent, Win Prizes & Brand Sponsorships'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              {isTl 
                ? 'Sumali sa pinakamaiinit na singing, dance, at gaming challenges. Makakuha ng suporta mula sa verified brand sponsors na may totoong budget!'
                : 'Join top creator challenges, submit your video entries, climb the live community leaderboard, and claim authoritative cash payouts.'}
            </p>

            {/* Quick Metrics */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="text-[10px] text-slate-300 uppercase font-black block">Active Prize Pool</span>
                  <span className="text-amber-400 font-black text-sm">₱{totalPrizePoolAvailable.toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-2.5">
                <Users className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-[10px] text-slate-300 uppercase font-black block">Active Challenges</span>
                  <span className="text-emerald-400 font-black text-sm">{challenges.filter(c => c.status === 'active').length}</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-purple-400" />
                <div>
                  <span className="text-[10px] text-slate-300 uppercase font-black block">Brand Missions</span>
                  <span className="text-purple-400 font-black text-sm">{sponsoredMissions.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            {onBackToLauncher && (
              <button
                onClick={onBackToLauncher}
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xs transition border border-white/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>⬅️ {isTl ? 'Bumalik sa Home' : 'Back to Home'}</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('host')}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isTl ? '🚀 Mag-host ng Challenge' : '🚀 Host a Challenge'}</span>
            </button>
            <button
              onClick={() => setActiveTab('missions')}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-indigo-200" />
              <span>{isTl ? '💎 Sponsored Missions' : '💎 Brand Sponsorships'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOP NAVIGATION SUBTABS */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'browse'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>{isTl ? '🏆 Mga Challenges' : '🏆 Challenges'}</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">{challenges.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('missions')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'missions'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{isTl ? '💎 Sponsored Missions' : '💎 Brand Missions'}</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">{sponsoredMissions.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('host')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'host'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isTl ? '🚀 Mag-host' : '🚀 Host'}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: BROWSE CHALLENGES */}
      {activeTab === 'browse' && (
        <div className="space-y-6">
          {/* SEARCH & CATEGORY FILTER */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {categoriesList.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isTl ? 'Maghanap ng challenge o creator...' : 'Search challenges...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-indigo-600 transition"
              />
            </div>
          </div>

          {/* CHALLENGES GRID */}
          {loading ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
              <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-black text-slate-500">{isTl ? 'Kinakarga ang mga challenges...' : 'Loading challenges...'}</p>
            </div>
          ) : filteredChallenges.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
              <Trophy className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-black text-slate-800">{isTl ? 'Walang nahanap na challenge' : 'No challenges found'}</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isTl ? 'Subukang pumili ng ibang category o maging unang creator na mag-host ng bagong challenge!' : 'Try a different category or be the first to host one!'}
              </p>
              <button
                onClick={() => setActiveTab('host')}
                className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-xs hover:bg-indigo-500 transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isTl ? 'Gumawa ng Challenge' : 'Create Challenge'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredChallenges.map(chal => {
                const isJoined = Array.isArray(chal.participants) && chal.participants.includes(user?.id || '');
                const isEnded = chal.status === 'completed' || new Date(chal.endDate).getTime() < Date.now();

                return (
                  <div
                    key={chal.id}
                    className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition duration-300 flex flex-col justify-between group"
                  >
                    {/* Top Cover Image & Badges */}
                    <div className="relative h-44 bg-slate-900 overflow-hidden">
                      <img
                        src={chal.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60'}
                        alt={chal.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-white/20">
                          {chal.category}
                        </span>
                        {chal.sponsorName && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
                            💎 Sponsored
                          </span>
                        )}
                      </div>

                      <div className="absolute top-3 right-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isEnded 
                            ? 'bg-slate-700 text-slate-300' 
                            : 'bg-emerald-500 text-white shadow'
                        }`}>
                          {isEnded ? (isTl ? 'Natapos' : 'Ended') : (isTl ? 'Aktibo' : 'Active')}
                        </span>
                      </div>

                      {/* Prize Pool Overlay */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-wider text-amber-300 block">
                            🏆 Grand Prize Pool
                          </span>
                          <span className="text-xl font-black text-white font-mono">
                            ₱{(chal.prizePool || 0).toLocaleString()}
                          </span>
                        </div>
                        {chal.hostEarnings && chal.hostEarnings > 0 && (
                          <div className="text-right">
                            <span className="text-[9px] uppercase font-bold text-slate-300 block">Host Partner</span>
                            <span className="text-xs font-black text-emerald-400 font-mono">+₱{chal.hostEarnings}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        {/* Host info */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-base">{chal.hostAvatar || '👤'}</span>
                          <span className="font-black text-slate-800">{chal.hostName}</span>
                          <span className="text-[10px] text-slate-400 font-bold">• Host</span>
                        </div>

                        <h3 className="font-extrabold text-base text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition">
                          {chal.title}
                        </h3>
                        <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                          {chal.description || chal.rules}
                        </p>
                      </div>

                      {/* Progress Stats */}
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{chal.participantsCount || chal.participants?.length || 0} / {chal.maxParticipants} Kalahok</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Video className="w-3.5 h-3.5 text-rose-500" />
                            <span>{chal.entriesCount || 0} Video Entries</span>
                          </span>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenChallenge(chal)}
                            className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            <span>{isTl ? 'Leaderboard & Entries' : 'Leaderboard & Entries'}</span>
                          </button>

                          {!isEnded && (
                            isJoined ? (
                              <button
                                onClick={() => {
                                  setSelectedChallenge(chal);
                                  setShowSubmitModal(true);
                                }}
                                className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1 shrink-0 shadow-sm"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>{isTl ? 'I-submit Entry' : 'Submit Entry'}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleJoinChallenge(chal.id)}
                                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1 shrink-0 shadow-sm"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>{isTl ? 'Sumali' : 'Join'}</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SPONSORED MISSIONS */}
      {activeTab === 'missions' && (
        <div className="space-y-6">
          {/* Mission Explanation Banner */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-purple-500/30 shadow-lg space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/20 border border-purple-400/30 rounded-2xl text-purple-300 shrink-0">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">
                  {isTl ? '💎 Legitimate Brand Sponsorship & Server-Side Host Earnings' : '💎 Legitimate Brand Sponsorship & Host Earnings'}
                </h3>
                <p className="text-xs text-purple-200/90 font-medium leading-relaxed max-w-3xl">
                  {isTl 
                    ? 'Ang Host Partner Earnings sa Z-OneApp ay maaari lamang magmula sa totoong authorized sponsor partnership budget. Walang unbacked points o financial balance distortion. Ang lahat ng payout distributions ay server-side computed at pinapatakbo ng aming secure administrative ledger.'
                    : 'Host Earnings strictly originate from authorized brand sponsorships. No direct Firestore per-view strain and zero unbacked payouts.'}
                </p>
              </div>
            </div>

            {/* Split Distribution Formula Graphic */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10 space-y-1">
                <span className="text-amber-400 font-black uppercase text-[10px] tracking-wider block">50% Winner Prize Pool</span>
                <p className="text-slate-300 text-[11px]">Diretsong napupunta sa Top Challenge Winners batay sa community votes at scores.</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10 space-y-1">
                <span className="text-emerald-400 font-black uppercase text-[10px] tracking-wider block">25% Creator Host Partner</span>
                <p className="text-slate-300 text-[11px]">Gantimpala sa creator para sa pamamahala at promotion ng official challenge.</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10 space-y-1">
                <span className="text-indigo-300 font-black uppercase text-[10px] tracking-wider block">25% Platform & Ledger Fee</span>
                <p className="text-slate-300 text-[11px]">Para sa bandwidth, persistent cloud verification, at administrative support.</p>
              </div>
            </div>
          </div>

          {/* Missions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span>{isTl ? 'Aktibong Brand Sponsored Missions' : 'Active Sponsored Missions'}</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sponsoredMissions.map(m => (
                <div key={m.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-150 flex items-center justify-center text-lg">
                        {m.sponsorAvatar || '🏢'}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{m.title}</h4>
                        <span className="text-xs text-indigo-600 font-black">{m.sponsorName}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                      ₱{m.budget.toLocaleString()} Budget
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {m.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl text-center text-xs">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Prizes</span>
                      <span className="font-black text-amber-600 font-mono">₱{m.prizePool}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Host Share</span>
                      <span className="font-black text-emerald-600 font-mono">₱{m.hostEarnings}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Platform</span>
                      <span className="font-black text-slate-600 font-mono">₱{m.platformFee}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Create a Brand Sponsor Proposal Form */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-150 pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>{isTl ? 'Maging Sponsor: Maglaan ng Mission Budget' : 'Become a Sponsor: Fund a Mission'}</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isTl 
                  ? 'I-sponsor ang mga creator challenges para itaguyod ang iyong brand sa libu-libong aktibong users.' 
                  : 'Fund creator challenges to promote your brand across thousands of active users.'}
              </p>
            </div>

            <form onSubmit={handleCreateMission} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">{isTl ? 'Brand o Mission Title' : 'Mission Title'}</label>
                  <input
                    type="text"
                    required
                    value={missionTitle}
                    onChange={e => setMissionTitle(e.target.value)}
                    placeholder={isTl ? 'Hal: Jollibee Crispy Sound Challenge' : 'e.g. Brand Acoustic Challenge'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">{isTl ? 'Kabuuang Budget (₱ Min: 500)' : 'Total Budget (Min: 500)'}</label>
                  <input
                    type="number"
                    min="500"
                    step="100"
                    required
                    value={missionBudget}
                    onChange={e => setMissionBudget(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700">{isTl ? 'Mensahe at Mechanics' : 'Details & Guidelines'}</label>
                <textarea
                  rows={3}
                  value={missionDescription}
                  onChange={e => setMissionDescription(e.target.value)}
                  placeholder={isTl ? 'Ilarawan ang requirements at paano makakasali ang mga creators...' : 'Describe requirements...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700">{isTl ? 'I-link sa Umiiral na Challenge (Optional)' : 'Link to Challenge (Optional)'}</label>
                <select
                  value={missionChallengeId}
                  onChange={e => setMissionChallengeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
                >
                  <option value="">{isTl ? '-- Pumili ng Challenge na i-sponsor --' : '-- Select Challenge to Sponsor --'}</option>
                  {challenges.map(c => (
                    <option key={c.id} value={c.id}>{c.title} (₱{c.prizePool})</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={creatingMission}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{creatingMission ? (isTl ? 'Pino-proseso...' : 'Processing...') : (isTl ? 'Itatag ang Sponsored Mission 💎' : 'Create Sponsored Mission 💎')}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: HOST A CHALLENGE */}
      {activeTab === 'host' && (
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-150 pb-4">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              <span>{isTl ? 'Mag-host ng Sarili Mong Challenge' : 'Host Your Own Challenge'}</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {isTl 
                ? 'Bilang isang creator, maaari kang magsimula ng sarili mong paligsahan para sa iyong mga tagahanga at kapwa creators.' 
                : 'Host your own talent, dance, gaming, or viral challenge.'}
            </p>
          </div>

          <form onSubmit={handleHostChallenge} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-800">{isTl ? 'Challenge Title *' : 'Challenge Title *'}</label>
              <input
                type="text"
                required
                value={hostTitle}
                onChange={e => setHostTitle(e.target.value)}
                placeholder={isTl ? 'Hal: Pinoy Acoustic Cover Fest 2026' : 'e.g. Acoustic Cover Fest 2026'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800">{isTl ? 'Category *' : 'Category *'}</label>
                <select
                  value={hostCategory}
                  onChange={e => setHostCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
                >
                  <option value="Singing">Singing</option>
                  <option value="Dancing">Dancing</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Creative">Creative / Talent</option>
                  <option value="Viral">TikTok / Reels Viral</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800">{isTl ? 'Prize Pool (₱) *' : 'Prize Pool (₱) *'}</label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  required
                  value={hostPrizePool}
                  onChange={e => setHostPrizePool(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800">{isTl ? 'Max Kalahok' : 'Max Participants'}</label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={hostMaxParticipants}
                  onChange={e => setHostMaxParticipants(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800">{isTl ? 'Tagal ng Paligsahan (Araw)' : 'Duration (Days)'}</label>
                <select
                  value={hostDays}
                  onChange={e => setHostDays(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
                >
                  <option value="7">7 Araw (1 Linggo)</option>
                  <option value="14">14 Araw (2 Linggo)</option>
                  <option value="30">30 Araw (1 Buwan)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-800">{isTl ? 'Cover Image URL' : 'Cover Image URL'}</label>
              <input
                type="url"
                value={hostCoverImage}
                onChange={e => setHostCoverImage(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-800">{isTl ? 'Maikling Deskripsyon' : 'Short Description'}</label>
              <input
                type="text"
                value={hostDescription}
                onChange={e => setHostDescription(e.target.value)}
                placeholder={isTl ? 'Maikling overview ng challenge...' : 'Brief overview...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-800">{isTl ? 'Mga Panuntunan (Rules & Mechanics) *' : 'Rules & Mechanics *'}</label>
              <textarea
                rows={4}
                required
                value={hostRules}
                onChange={e => setHostRules(e.target.value)}
                placeholder={isTl ? '1. Mag-upload ng orihinal na video...\n2. Bawal ang copyrighted audio...\n3. Ang may pinakamaraming boto ang mananalo!' : '1. Upload original video...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
              />
            </div>

            <button
              type="submit"
              disabled={hostingLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{hostingLoading ? (isTl ? 'Inilalathala...' : 'Publishing...') : (isTl ? 'I-publish ang Challenge 🚀' : 'Publish Challenge 🚀')}</span>
            </button>
          </form>
        </div>
      )}

      {/* MODAL 1: CHALLENGE DETAIL & LIVE LEADERBOARD */}
      {selectedChallenge && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="relative h-44 bg-slate-950 shrink-0">
              <img
                src={selectedChallenge.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60'}
                alt={selectedChallenge.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

              <button
                onClick={() => setSelectedChallenge(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center transition cursor-pointer border border-white/20"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute bottom-3 left-4 right-4 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500 text-white text-[9px] font-black uppercase">
                    {selectedChallenge.category}
                  </span>
                  {selectedChallenge.sponsorName && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase">
                      💎 {selectedChallenge.sponsorName}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-white truncate">{selectedChallenge.title}</h2>
              </div>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Prize & Rules Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">Grand Prize Pool</span>
                  <span className="text-2xl font-black text-amber-800 font-mono">₱{(selectedChallenge.prizePool || 0).toLocaleString()}</span>
                  <span className="text-[10px] text-amber-600 block mt-0.5">Top 3 Winners Share</span>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Kalahok</span>
                  <span className="text-2xl font-black text-indigo-800 font-mono">
                    {selectedChallenge.participantsCount || selectedChallenge.participants?.length || 0}
                  </span>
                  <span className="text-[10px] text-indigo-600 block mt-0.5">Slots: {selectedChallenge.maxParticipants}</span>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider block">Video Entries</span>
                  <span className="text-2xl font-black text-purple-800 font-mono">{challengeEntries.length}</span>
                  <span className="text-[10px] text-purple-600 block mt-0.5">Submitted Entries</span>
                </div>
              </div>

              {/* Rules */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-1.5">
                <h4 className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>{isTl ? 'Mga Panuntunan at Mechanics' : 'Rules & Guidelines'}</span>
                </h4>
                <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed font-medium">
                  {selectedChallenge.rules || selectedChallenge.description}
                </p>
              </div>

              {/* LEADERBOARD & VOTING SECTION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>{isTl ? 'Live Leaderboard at Entries' : 'Live Leaderboard & Entries'}</span>
                  </h3>
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isTl ? 'Mag-submit ng Entry' : 'Submit Entry'}</span>
                  </button>
                </div>

                {loadingDetails ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-bold">{isTl ? 'Kinakarga ang leaderboard...' : 'Loading leaderboard...'}</p>
                  </div>
                ) : challengeLeaderboard.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <Video className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">{isTl ? 'Wala pang nagsu-submit ng entry!' : 'No entries submitted yet!'}</p>
                    <button
                      onClick={() => setShowSubmitModal(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs cursor-pointer hover:bg-emerald-500 transition"
                    >
                      {isTl ? 'Maging Unang Kalahok 📹' : 'Be First to Submit 📹'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {challengeLeaderboard.map((entry, idx) => {
                      const isVoted = Array.isArray(entry.likes) && entry.likes.includes(user?.id || '');

                      return (
                        <div
                          key={entry.id}
                          className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-200 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Rank Badge */}
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
                              idx === 0 
                                ? 'bg-amber-400 text-slate-950 font-black' 
                                : idx === 1 
                                  ? 'bg-slate-300 text-slate-900 font-black' 
                                  : idx === 2 
                                    ? 'bg-amber-700 text-white font-black' 
                                    : 'bg-white border border-slate-200 text-slate-600'
                            }`}>
                              #{idx + 1}
                            </div>

                            {/* Participant Avatar */}
                            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-lg shrink-0">
                              {entry.participantAvatar || '👤'}
                            </div>

                            {/* Info */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-slate-900 truncate">{entry.participantName}</span>
                                {idx === 0 && (
                                  <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.2 rounded-md">
                                    👑 Rank #1
                                  </span>
                                )}
                              </div>
                              {entry.caption && (
                                <p className="text-[11px] text-slate-600 truncate max-w-sm mt-0.5">
                                  {entry.caption}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Media Preview & Vote CTA */}
                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            {/* Score & Votes */}
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-black uppercase block">Score</span>
                              <span className="font-black text-indigo-600 font-mono text-sm">{entry.score || 0} pts</span>
                            </div>

                            {/* Media Link */}
                            {entry.mediaUrl && (
                              <a
                                href={entry.mediaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-black flex items-center gap-1 shrink-0"
                              >
                                <Play className="w-3 h-3 text-indigo-600" />
                                <span>Panoorin</span>
                              </a>
                            )}

                            {/* Vote Button */}
                            <button
                              onClick={() => handleVoteEntry(entry.id)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                                isVoted
                                  ? 'bg-rose-500 text-white shadow-sm'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                              }`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${isVoted ? 'fill-white' : ''}`} />
                              <span>{entry.votesCount || 0}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-bold">
                {isTl ? 'Autorisadong Ledger Distribution' : 'Authoritative Ledger Distribution'}
              </span>
              <button
                onClick={() => setSelectedChallenge(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs transition cursor-pointer"
              >
                {isTl ? 'Isara' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SUBMIT CHALLENGE ENTRY */}
      {showSubmitModal && selectedChallenge && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-base text-slate-900">{isTl ? 'I-submit ang Iyong Entry' : 'Submit Entry'}</h3>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEntry} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800">
                  {isTl ? 'Video o Media URL (YouTube, TikTok, o direct link) *' : 'Video / Media URL *'}
                </label>
                <input
                  type="url"
                  required
                  value={entryMediaUrl}
                  onChange={e => setEntryMediaUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800">{isTl ? 'Media Type' : 'Media Type'}</label>
                <select
                  value={entryMediaType}
                  onChange={e => setEntryMediaType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
                >
                  <option value="video">Video Performance (MP4, YouTube, TikTok)</option>
                  <option value="image">Photo / Artwork Entry</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800">{isTl ? 'Caption o Mensahe' : 'Caption'}</label>
                <textarea
                  rows={3}
                  value={entryCaption}
                  onChange={e => setEntryCaption(e.target.value)}
                  placeholder={isTl ? 'Sabihin kung bakit karapat-dapat manalo ang iyong entry...' : 'Why your entry should win...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition cursor-pointer"
                >
                  {isTl ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submittingEntry}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition cursor-pointer shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingEntry ? (isTl ? 'Ipinapadala...' : 'Sending...') : (isTl ? 'I-submit Entry' : 'Submit Entry')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
