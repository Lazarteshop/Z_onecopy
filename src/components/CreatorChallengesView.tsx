import React, { useState, useEffect, useRef } from 'react';
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
  ChevronRight,
  Edit3,
  Wallet,
  AlertCircle,
  QrCode,
  Lock,
  Loader2,
  Camera,
  Film,
  FolderOpen,
  FileVideo,
  Image as ImageIcon
} from 'lucide-react';
import { CreatorChallenge, ChallengeEntry, SponsoredMission, UserSession, UserChallengeVotingStats, calculateMaxVotesPerUser } from '../types';
import { DepositModal } from './DepositModal';
import { ParticipantShareModal } from './ParticipantShareModal';
import { ChallengeVideoPlayer } from './ChallengeVideoPlayer';

interface CreatorChallengesViewProps {
  token: string | null;
  user: UserSession | null;
  language?: 'tl' | 'en';
  onBackToLauncher?: () => void;
  triggerNotification?: (message: string, type: 'success' | 'info' | 'error') => void;
  onRefreshProfile?: () => void;
}

// Fallback image constants
const DEFAULT_CHALLENGE_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60';
const DEFAULT_ENTRY_PLACEHOLDER = 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&auto=format&fit=crop&q=60';

// Safe image URL helper - ensures image URLs or data:image values are strictly used as image source, never normal text
const getSafeImageUrl = (url?: string, fallback: string = DEFAULT_CHALLENGE_COVER): string => {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  return fallback;
};

// Check if a media value is an image (including base64 data URLs)
const isImageMedia = (url?: string, type?: string): boolean => {
  if (type === 'image') return true;
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.includes(';base64,')) return true;
  if (
    trimmed.endsWith('.jpg') ||
    trimmed.endsWith('.jpeg') ||
    trimmed.endsWith('.png') ||
    trimmed.endsWith('.gif') ||
    trimmed.endsWith('.webp') ||
    trimmed.endsWith('.svg') ||
    trimmed.endsWith('.avif') ||
    trimmed.includes('images.unsplash.com')
  ) {
    return true;
  }
  return false;
};

// Safe display name helper - guarantees base64 data, raw media URLs, or raw media fields never leak into name
const getSafeDisplayName = (name?: string, fallback: string = 'Kalahok'): string => {
  if (!name || typeof name !== 'string') return fallback;
  const trimmed = name.trim();
  if (
    trimmed.startsWith('data:') ||
    trimmed.includes(';base64,') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.length > 50
  ) {
    return fallback;
  }
  return trimmed;
};

// Safe caption helper - prevents raw base64 or media URLs from displaying as text caption
const getSafeCaption = (caption?: string): string | null => {
  if (!caption || typeof caption !== 'string') return null;
  const trimmed = caption.trim();
  if (
    trimmed.startsWith('data:') ||
    trimmed.includes(';base64,') ||
    trimmed.startsWith('blob:') ||
    trimmed.length > 400
  ) {
    return null;
  }
  return trimmed;
};

// Safe text helper for title/description/rules
const getSafeText = (text?: string, maxLen: number = 300): string => {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (trimmed.startsWith('data:') || trimmed.includes(';base64,')) {
    return '';
  }
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) + '...' : trimmed;
};

// Safe Avatar Component - renders image tag if data:image or URL, emoji if short text, fallback if invalid/empty
const SafeAvatar: React.FC<{
  avatar?: string;
  fallbackEmoji?: string;
  className?: string;
  alt?: string;
}> = ({ avatar, fallbackEmoji = '👤', className = 'w-10 h-10 rounded-full', alt = 'Avatar' }) => {
  const [hasError, setHasError] = useState(false);

  if (!avatar || typeof avatar !== 'string' || hasError) {
    return (
      <span className="text-base select-none leading-none flex items-center justify-center">
        {fallbackEmoji}
      </span>
    );
  }

  const trimmed = avatar.trim();
  const isImage = 
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/') ||
    trimmed.includes(';base64,');

  if (isImage) {
    return (
      <img
        src={trimmed}
        alt={alt}
        className={`${className} object-cover shrink-0 select-none`}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
      />
    );
  }

  // If it's some other long string or data scheme, never render as raw text
  if (trimmed.startsWith('data:') || trimmed.length > 20) {
    return (
      <span className="text-base select-none leading-none flex items-center justify-center">
        {fallbackEmoji}
      </span>
    );
  }

  // Standard short emoji or initials
  return (
    <span className="text-base select-none leading-none flex items-center justify-center">
      {trimmed}
    </span>
  );
};

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
  const [votingEntryId, setVotingEntryId] = useState<string | null>(null);
  const [viewingMedia, setViewingMedia] = useState<{ url: string; type: 'image' | 'video'; title: string } | null>(null);

  // Submit / Edit Entry Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryMediaUrl, setEntryMediaUrl] = useState('');
  const [entryMediaType, setEntryMediaType] = useState<'video' | 'image'>('video');
  const [entryCaption, setEntryCaption] = useState('');
  const [submittingEntry, setSubmittingEntry] = useState(false);

  // Gallery / File Upload states
  const [submissionTab, setSubmissionTab] = useState<'upload' | 'url'>('upload');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileDetails, setUploadedFileDetails] = useState<{ name: string; size: string } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic voting stats
  const [userVotingStats, setUserVotingStats] = useState<UserChallengeVotingStats | null>(null);

  // Helper to open submit or edit modal with prefilled data
  const openSubmitOrEditModal = (chal: CreatorChallenge, existingEntry?: ChallengeEntry | null) => {
    setSelectedChallenge(chal);
    setUploadedFileDetails(null);
    if (existingEntry) {
      setEditingEntryId(existingEntry.id);
      setEntryMediaUrl(existingEntry.mediaUrl || '');
      setEntryMediaType(existingEntry.mediaType === 'image' ? 'image' : 'video');
      setEntryCaption(existingEntry.caption || '');
      if (existingEntry.mediaUrl && (existingEntry.mediaUrl.startsWith('http://') || existingEntry.mediaUrl.startsWith('https://')) && !existingEntry.mediaUrl.includes('cloudflare') && !existingEntry.mediaUrl.includes('r2')) {
        setSubmissionTab('url');
      } else {
        setSubmissionTab('upload');
      }
    } else {
      setEditingEntryId(null);
      setEntryMediaUrl('');
      setEntryMediaType('video');
      setEntryCaption('');
      setSubmissionTab('upload');
    }
    setShowSubmitModal(true);
  };

  // Gallery / File selection & upload handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, preferredType?: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the user can re-select the same file if needed
    e.target.value = '';

    if (!token) {
      triggerNotification?.(isTl ? 'Mag-login muna bago mag-upload ng media.' : 'Please login before uploading media.', 'error');
      return;
    }

    // MIME type check
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      triggerNotification?.(
        isTl 
          ? 'Hindi suportadong uri ng file. Tanging mga larawan (JPG, PNG, WebP) o video (MP4, WebM, MOV) lamang ang pinapayagan.' 
          : 'Unsupported file type. Only images (JPG, PNG, WebP) and videos (MP4, WebM, MOV) are allowed.',
        'error'
      );
      return;
    }

    // Size limit check: max 15MB for photo, max 60MB for video
    const maxSizeBytes = isImage ? 15 * 1024 * 1024 : 60 * 1024 * 1024;
    const maxSizeMB = isImage ? 15 : 60;
    if (file.size > maxSizeBytes) {
      triggerNotification?.(
        isTl 
          ? `Masyadong malaki ang file (${(file.size / (1024 * 1024)).toFixed(1)}MB). Ang limitasyon ay ${maxSizeMB}MB.` 
          : `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Limit is ${maxSizeMB}MB.`,
        'error'
      );
      return;
    }

    setUploadingMedia(true);
    setUploadProgress(15);

    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      setUploadProgress(50);

      const res = await fetch('/api/challenges/upload-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dataUrl,
          filename: file.name,
          mediaType: isVideo ? 'video' : 'image'
        })
      });

      const data = await res.json();
      setUploadProgress(100);

      if (res.ok && data.success) {
        setEntryMediaUrl(data.url);
        setEntryMediaType(data.mediaType === 'video' ? 'video' : 'image');
        setUploadedFileDetails({
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        });
        triggerNotification?.(
          isTl ? '✅ Matagumpay na nai-upload ang media!' : '✅ Media uploaded successfully!',
          'success'
        );
      } else {
        triggerNotification?.(data.error || (isTl ? 'Bigo ang pag-upload ng media.' : 'Upload failed.'), 'error');
      }
    } catch (err) {
      triggerNotification?.(isTl ? 'May error sa pag-upload ng media.' : 'Error uploading media.', 'error');
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
    }
  };

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

  // Deposit Modal State (Wallet Funding & Budget Reservation)
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositModalConfig, setDepositModalConfig] = useState<{
    requiredBudget: number;
    currentAvailableBalance?: number;
    targetPurpose: 'challenge_budget' | 'mission_budget' | 'wallet';
    targetEntityId?: string;
  }>({
    requiredBudget: 0,
    targetPurpose: 'wallet'
  });

  // Participant Viral Sharing State
  const [sharingEntry, setSharingEntry] = useState<ChallengeEntry | null>(null);

  // Wallet Breakdown
  const [walletBreakdown, setWalletBreakdown] = useState<any>(null);

  const fetchWalletBreakdown = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/wallet-breakdown', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWalletBreakdown(data);
      }
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    fetchWalletBreakdown();
  }, [token]);

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
      const res = await fetch(`/api/challenges/${challenge.id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedChallenge(data.challenge);
        setChallengeEntries(data.entries || []);
        setChallengeLeaderboard(data.leaderboard || []);
        if (data.userVotingStats) {
          setUserVotingStats(data.userVotingStats);
        }
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

  // Authoritative Permanent / Final Vote for an Entry (Strict One User = One Final Vote & Dynamic Limit)
  const handleVoteEntry = async (entryId: string) => {
    if (!token) {
      triggerNotification?.(isTl ? 'Mag-login muna para makaboto.' : 'Please login to vote.', 'info');
      return;
    }

    if (!selectedChallenge) return;

    // Check if challenge is ended or voting is closed
    const isEnded = selectedChallenge.status === 'completed' || 
                    selectedChallenge.status === 'archived' || 
                    selectedChallenge.status === 'cancelled' ||
                    (selectedChallenge.endDate && new Date(selectedChallenge.endDate).getTime() <= Date.now());
    if (isEnded) {
      triggerNotification?.(isTl ? 'Tapos na ang challenge na ito. Sarado na ang botohan.' : 'This challenge has ended. Voting is closed.', 'error');
      return;
    }

    // Find the target entry for client-side pre-flight checks
    const targetEntry = challengeEntries.find(e => e.id === entryId);

    // Strict self-voting prevention check
    if (targetEntry && targetEntry.participantId === user?.id) {
      triggerNotification?.(isTl ? 'Bawal bumoto sa sariling entry.' : 'You cannot vote for your own entry.', 'error');
      return;
    }

    // Strict Permanent Check: if already voted, vote cannot be unvoted or withdrawn
    if (targetEntry && Array.isArray(targetEntry.likes) && targetEntry.likes.includes(user?.id || '')) {
      triggerNotification?.(
        isTl 
          ? 'Nakaboto ka na sa entry na ito. Final na ang vote at hindi na ito maaaring bawiin.' 
          : 'You have already voted on this entry. Your vote is final and cannot be withdrawn.', 
        'info'
      );
      return;
    }

    // Client-side voting limit pre-flight check
    const validCount = challengeEntries.filter(e => e.status !== 'rejected').length;
    const maxVotes = userVotingStats?.maxAllowedVotes ?? calculateMaxVotesPerUser(validCount);
    const votesUsed = userVotingStats?.votesUsed ?? challengeEntries.filter(e => Array.isArray(e.likes) && e.likes.includes(user?.id || '')).length;
    if (votesUsed >= maxVotes && maxVotes > 0) {
      triggerNotification?.(
        isTl 
          ? `Naabot mo na ang maximum voting limit (${maxVotes} ${maxVotes === 1 ? 'entry' : 'entries'}) para sa challenge na ito.`
          : `You have reached the maximum voting limit (${maxVotes} ${maxVotes === 1 ? 'entry' : 'entries'}) for this challenge.`,
        'error'
      );
      return;
    }

    setVotingEntryId(entryId);

    try {
      const res = await fetch(`/api/challenges/${selectedChallenge.id}/entries/${entryId}/vote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.status === 409 || data.alreadyVoted) {
        // Vote already recorded and locked
        triggerNotification?.(
          data.message || (isTl ? 'Nakaboto ka na sa entry na ito. Final na ang vote.' : 'You have already voted. Your vote is final.'),
          'info'
        );

        // Synchronize local likes state so button locks immediately
        setChallengeEntries(prev => prev.map(e => {
          if (e.id === entryId) {
            const currentLikes = e.likes || [];
            const newLikes = currentLikes.includes(user?.id || '') ? currentLikes : [...currentLikes, user?.id || ''];
            return {
              ...e,
              likes: newLikes,
              votesCount: data.votesCount || currentLikes.length,
              score: data.score || (data.votesCount ? data.votesCount * 10 : e.score)
            };
          }
          return e;
        }));
        if (data.votesRemaining !== undefined) {
          setUserVotingStats(prev => prev ? {
            ...prev,
            votesUsed: data.votesUsed,
            votesRemaining: data.votesRemaining,
            canVoteMore: data.votesRemaining > 0
          } : null);
        }
        return;
      }

      if (res.status === 403 || data.code === 'VOTE_LIMIT_REACHED') {
        triggerNotification?.(
          data.error || (isTl ? 'Naabot mo na ang maximum voting limit para sa challenge na ito.' : 'Maximum voting limit reached for this challenge.'),
          'error'
        );
        if (data.maxAllowedVotes !== undefined) {
          setUserVotingStats(prev => prev ? {
            ...prev,
            maxAllowedVotes: data.maxAllowedVotes,
            votesUsed: data.votesUsed,
            votesRemaining: 0,
            canVoteMore: false
          } : null);
        }
        return;
      }

      if (!res.ok || !data.success) {
        triggerNotification?.(data.error || (isTl ? 'Hindi naitala ang boto.' : 'Failed to record vote.'), 'error');
        return;
      }

      // Update entry locally with permanent locked vote
      setChallengeEntries(prev => prev.map(e => {
        if (e.id === entryId) {
          const currentLikes = e.likes || [];
          const newLikes = currentLikes.includes(user?.id || '') ? currentLikes : [...currentLikes, user?.id || ''];
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
            const newLikes = currentLikes.includes(user?.id || '') ? currentLikes : [...currentLikes, user?.id || ''];
            return { ...e, likes: newLikes, votesCount: data.votesCount, score: data.score };
          }
          return e;
        });
        return updated.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.votesCount || 0) - (a.votesCount || 0));
      });

      // Update voting stats
      setUserVotingStats(prev => prev ? {
        ...prev,
        votesUsed: data.votesUsed ?? (prev.votesUsed + 1),
        votesRemaining: data.votesRemaining ?? Math.max(0, prev.votesRemaining - 1),
        canVoteMore: (data.votesRemaining ?? Math.max(0, prev.votesRemaining - 1)) > 0,
        votedEntryIds: [...(prev.votedEntryIds || []), entryId]
      } : null);

      triggerNotification?.(
        isTl ? '✅ Matagumpay na naitala ang iyong boto! (Final Vote • Bawal Bawiin)' : '✅ Vote successfully recorded! (Final Vote • Permanent)',
        'success'
      );
    } catch (e) {
      triggerNotification?.(isTl ? 'May error sa pag-vote. Pakisubukan muli.' : 'Error updating vote. Please try again.', 'error');
    } finally {
      setVotingEntryId(null);
    }
  };

  // Submit or Edit an Entry (One User = One Entry Per Challenge)
  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedChallenge) return;

    if (!entryMediaUrl.trim()) {
      triggerNotification?.(isTl ? 'Maglagay ng video o image link.' : 'Please provide media link.', 'error');
      return;
    }

    setSubmittingEntry(true);
    try {
      if (editingEntryId) {
        // Edit / Replace existing entry
        const res = await fetch(`/api/challenges/${selectedChallenge.id}/entries/${editingEntryId}`, {
          method: 'PUT',
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
          triggerNotification?.(isTl ? '🎉 Tagumpay! Na-update ang iyong challenge entry nang walang duplicate record.' : 'Entry updated successfully without duplicate record!', 'success');
          setShowSubmitModal(false);
          setEditingEntryId(null);
          setEntryMediaUrl('');
          setEntryCaption('');
          handleOpenChallenge(selectedChallenge);
          fetchChallenges();
        } else {
          triggerNotification?.(data.error || (isTl ? 'Bigo sa pag-update ng entry.' : 'Failed to update entry.'), 'error');
        }
      } else {
        // Submit new entry (Enforces 1 user = 1 entry server-side)
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
          setEditingEntryId(null);
          setEntryMediaUrl('');
          setEntryCaption('');
          handleOpenChallenge(selectedChallenge);
          fetchChallenges();
        } else if (data.hasExistingEntry) {
          // Explicit message required by prompt
          triggerNotification?.(data.error || (isTl ? 'May existing entry ka na sa challenge na ito. Maaari mo itong i-edit o palitan habang hindi pa tapos ang challenge.' : 'You already have an existing entry in this challenge. You may edit or replace it.'), 'info');
          if (data.existingEntry) {
            setEditingEntryId(data.existingEntry.id);
            setEntryMediaUrl(data.existingEntry.mediaUrl || '');
            setEntryMediaType(data.existingEntry.mediaType === 'image' ? 'image' : 'video');
            setEntryCaption(data.existingEntry.caption || '');
          }
        } else {
          triggerNotification?.(data.error || (isTl ? 'Bigo sa pag-submit ng entry.' : 'Failed to submit entry.'), 'error');
        }
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

    const requiredBudget = Number(hostPrizePool) || 1000;
    const currentAvailable = walletBreakdown?.availableBalance !== undefined
      ? walletBreakdown.availableBalance
      : (user?.availableBalance !== undefined ? user.availableBalance : (user?.stats?.balance || 0));

    // Pre-flight check: If balance is less than required budget, show deposit modal immediately!
    if (currentAvailable < requiredBudget) {
      setDepositModalConfig({
        requiredBudget,
        currentAvailableBalance: currentAvailable,
        targetPurpose: 'challenge_budget'
      });
      setShowDepositModal(true);
      triggerNotification?.(
        isTl 
          ? `Kulang ang iyong available balance (₱${currentAvailable.toFixed(2)}) para sa prize pool na ₱${requiredBudget.toFixed(2)}. Mag-deposit muna via GCash QR.`
          : `Insufficient balance (₱${currentAvailable.toFixed(2)}) for required budget of ₱${requiredBudget.toFixed(2)}. Please deposit via GCash QR.`,
        'error'
      );
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
          prizePool: requiredBudget,
          maxParticipants: Number(hostMaxParticipants) || 100,
          endDate,
          coverImage: hostCoverImage.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        triggerNotification?.(isTl ? '🎉 Tagumpay! Na-publish at na-lock ang budget para sa iyong bagong challenge.' : 'Challenge published and budget reserved!', 'success');
        setHostTitle('');
        setHostDescription('');
        setHostRules('');
        setActiveTab('browse');
        fetchChallenges();
        fetchWalletBreakdown();
        onRefreshProfile?.();
      } else {
        if (data.code === 'INSUFFICIENT_BALANCE') {
          setDepositModalConfig({
            requiredBudget: data.requiredAmount || requiredBudget,
            currentAvailableBalance: data.availableBalance !== undefined ? data.availableBalance : currentAvailable,
            targetPurpose: 'challenge_budget'
          });
          setShowDepositModal(true);
        }
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

    const requiredBudget = Number(missionBudget) || 5000;
    const currentAvailable = walletBreakdown?.availableBalance !== undefined
      ? walletBreakdown.availableBalance
      : (user?.availableBalance !== undefined ? user.availableBalance : (user?.stats?.balance || 0));

    // Pre-flight check: If balance is less than required budget, show deposit modal immediately!
    if (currentAvailable < requiredBudget) {
      setDepositModalConfig({
        requiredBudget,
        currentAvailableBalance: currentAvailable,
        targetPurpose: 'mission_budget'
      });
      setShowDepositModal(true);
      triggerNotification?.(
        isTl 
          ? `Kulang ang iyong available balance (₱${currentAvailable.toFixed(2)}) para sa mission budget na ₱${requiredBudget.toFixed(2)}. Mag-deposit muna via GCash QR.`
          : `Insufficient balance (₱${currentAvailable.toFixed(2)}) for mission budget of ₱${requiredBudget.toFixed(2)}. Please deposit via GCash QR.`,
        'error'
      );
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
          budget: requiredBudget,
          challengeId: missionChallengeId || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        triggerNotification?.(isTl ? '💎 Tagumpay na naitatag at na-lock ang pondo para sa Sponsored Mission!' : 'Sponsored mission created and budget reserved!', 'success');
        setMissionTitle('');
        setMissionDescription('');
        fetchMissions();
        fetchChallenges();
        fetchWalletBreakdown();
        onRefreshProfile?.();
        setActiveTab('missions');
      } else {
        if (data.code === 'INSUFFICIENT_BALANCE') {
          setDepositModalConfig({
            requiredBudget: data.requiredAmount || requiredBudget,
            currentAvailableBalance: data.availableBalance !== undefined ? data.availableBalance : currentAvailable,
            targetPurpose: 'mission_budget'
          });
          setShowDepositModal(true);
        }
        triggerNotification?.(data.error || 'Failed to create mission', 'error');
      }
    } catch (err) {
      triggerNotification?.('Error creating mission', 'error');
    } finally {
      setCreatingMission(false);
    }
  };

  // Filtered challenges (excludes safely archived challenges from active feed)
  const filteredChallenges = challenges.filter(c => {
    if (c.status === 'archived' || c.isArchived) return false;
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
                    className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition duration-300 flex flex-col justify-between group max-w-full"
                  >
                    {/* Top Cover Image & Badges */}
                    <div className="relative h-44 bg-slate-900 overflow-hidden">
                      <img
                        src={getSafeImageUrl(chal.coverImage, DEFAULT_CHALLENGE_COVER)}
                        alt={getSafeText(chal.title, 40) || 'Challenge'}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_CHALLENGE_COVER;
                        }}
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
                    <div className="p-5 space-y-4 flex-1 flex flex-col justify-between overflow-hidden min-w-0 max-w-full">
                      <div className="space-y-2 overflow-hidden min-w-0">
                        {/* Host info */}
                        <div className="flex items-center gap-2 text-xs min-w-0 max-w-full overflow-hidden">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                            <SafeAvatar avatar={chal.hostAvatar} fallbackEmoji="👤" className="w-6 h-6 rounded-full" alt="Host" />
                          </div>
                          <span className="font-black text-slate-800 truncate max-w-[170px] sm:max-w-[210px]">
                            {getSafeDisplayName(chal.hostName, 'Challenge Host')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold shrink-0">• Host</span>
                        </div>

                        <h3 className="font-extrabold text-base text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition break-words">
                          {getSafeText(chal.title, 80) || (isTl ? 'Walang Pamagat' : 'Untitled Challenge')}
                        </h3>
                        <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed break-words">
                          {getSafeText(chal.description || chal.rules, 200)}
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
                                onClick={() => openSubmitOrEditModal(chal, null)}
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
                <div key={m.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 max-w-full overflow-hidden">
                  <div className="flex items-start justify-between gap-3 min-w-0 max-w-full">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-150 flex items-center justify-center overflow-hidden shrink-0">
                        <SafeAvatar avatar={m.sponsorAvatar} fallbackEmoji="🏢" className="w-10 h-10 rounded-2xl" alt="Sponsor" />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <h4 className="font-extrabold text-sm text-slate-900 truncate max-w-[200px]">{getSafeText(m.title, 60)}</h4>
                        <span className="text-xs text-indigo-600 font-black truncate block max-w-[200px]">{getSafeDisplayName(m.sponsorName, 'Sponsor')}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200 shrink-0">
                      ₱{m.budget.toLocaleString()} Budget
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-relaxed break-words line-clamp-3">
                    {getSafeText(m.description, 300)}
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

              {/* Sponsor Wallet & Mission Budget Breakdown */}
              {(() => {
                const reqBudget = Number(missionBudget) || 5000;
                const currentAvail = walletBreakdown?.availableBalance !== undefined
                  ? walletBreakdown.availableBalance
                  : (user?.availableBalance !== undefined ? user.availableBalance : (user?.stats?.balance || 0));
                const isShort = currentAvail < reqBudget;
                const shortfall = Math.max(0, reqBudget - currentAvail);

                return (
                  <div className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                    isShort ? 'bg-amber-50/80 border-amber-300 text-amber-950' : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-black flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-slate-700" />
                        <span>{isTl ? 'Sponsor Wallet & Budget Reservation' : 'Sponsor Wallet & Budget Reservation'}</span>
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isShort ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
                      }`}>
                        {isShort ? (isTl ? 'Kulang ang Pondo' : 'Insufficient') : (isTl ? 'Sapat ang Pondo' : 'Sufficient')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Available Balance</span>
                        <span className="font-black text-slate-800 font-mono">₱{currentAvail.toFixed(2)}</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Mission Budget</span>
                        <span className="font-black text-emerald-700 font-mono">₱{reqBudget.toFixed(2)}</span>
                      </div>
                      <div className={`p-2 rounded-xl border ${isShort ? 'bg-amber-100/90 border-amber-300' : 'bg-white/80 border-slate-200/60'}`}>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">{isShort ? 'Kulang (Shortfall)' : 'Matitira'}</span>
                        <span className={`font-black font-mono ${isShort ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {isShort ? `₱${shortfall.toFixed(2)}` : `₱${(currentAvail - reqBudget).toFixed(2)}`}
                        </span>
                      </div>
                    </div>

                    {isShort && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                        <p className="text-[11px] text-amber-800 font-medium">
                          {isTl ? 'Kailangan munang mag-deposit bago maitatag ang mission.' : 'Deposit required before creating mission.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setDepositModalConfig({
                              requiredBudget: reqBudget,
                              currentAvailableBalance: currentAvail,
                              targetPurpose: 'mission_budget'
                            });
                            setShowDepositModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Mag-deposit via GCash QR</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

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

            {/* Host Wallet & Challenge Budget Breakdown */}
            {(() => {
              const reqBudget = Number(hostPrizePool) || 1000;
              const currentAvail = walletBreakdown?.availableBalance !== undefined
                ? walletBreakdown.availableBalance
                : (user?.availableBalance !== undefined ? user.availableBalance : (user?.stats?.balance || 0));
              const isShort = currentAvail < reqBudget;
              const shortfall = Math.max(0, reqBudget - currentAvail);

              return (
                <div className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                  isShort ? 'bg-amber-50/80 border-amber-300 text-amber-950' : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-black flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-slate-700" />
                      <span>{isTl ? 'Host Wallet & Prize Pool Reservation' : 'Host Wallet & Prize Pool Reservation'}</span>
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      isShort ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
                    }`}>
                      {isShort ? (isTl ? 'Kulang ang Pondo' : 'Insufficient') : (isTl ? 'Sapat ang Pondo' : 'Sufficient')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Available Balance</span>
                      <span className="font-black text-slate-800 font-mono">₱{currentAvail.toFixed(2)}</span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Required Prize Pool</span>
                      <span className="font-black text-indigo-700 font-mono">₱{reqBudget.toFixed(2)}</span>
                    </div>
                    <div className={`p-2 rounded-xl border ${isShort ? 'bg-amber-100/90 border-amber-300' : 'bg-white/80 border-slate-200/60'}`}>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">{isShort ? 'Kulang (Shortfall)' : 'Matitira'}</span>
                      <span className={`font-black font-mono ${isShort ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {isShort ? `₱${shortfall.toFixed(2)}` : `₱${(currentAvail - reqBudget).toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  {isShort && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      <p className="text-[11px] text-amber-800 font-medium">
                        {isTl ? 'Kailangan munang mag-deposit bago mai-publish ang challenge.' : 'Deposit required before publishing challenge.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setDepositModalConfig({
                            requiredBudget: reqBudget,
                            currentAvailableBalance: currentAvail,
                            targetPurpose: 'challenge_budget'
                          });
                          setShowDepositModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Mag-deposit via GCash QR</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

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
            <div className="relative h-44 bg-slate-950 shrink-0 overflow-hidden">
              <img
                src={getSafeImageUrl(selectedChallenge.coverImage, DEFAULT_CHALLENGE_COVER)}
                alt={getSafeText(selectedChallenge.title, 40) || 'Challenge'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_CHALLENGE_COVER;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

              <button
                onClick={() => setSelectedChallenge(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center transition cursor-pointer border border-white/20"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute bottom-3 left-4 right-4 text-white overflow-hidden">
                <div className="flex items-center gap-2 mb-1 overflow-hidden">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500 text-white text-[9px] font-black uppercase shrink-0">
                    {selectedChallenge.category}
                  </span>
                  {selectedChallenge.sponsorName && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase truncate max-w-[200px]">
                      💎 {getSafeDisplayName(selectedChallenge.sponsorName, 'Sponsor')}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-white truncate max-w-full break-words">
                  {getSafeText(selectedChallenge.title, 80)}
                </h2>
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
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-1.5 overflow-hidden">
                <h4 className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>{isTl ? 'Mga Panuntunan at Mechanics' : 'Rules & Guidelines'}</span>
                </h4>
                <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed font-medium break-words overflow-hidden">
                  {getSafeText(selectedChallenge.rules || selectedChallenge.description, 2000)}
                </p>
              </div>

              {/* LEADERBOARD & VOTING SECTION */}
              {(() => {
                const myActiveEntry = challengeEntries.find(e => e.participantId === user?.id);
                const isChallengeEnded = selectedChallenge.status !== 'active' || (selectedChallenge.endDate && new Date(selectedChallenge.endDate).getTime() < Date.now());

                const validApprovedEntriesCount = challengeEntries.filter(e => e.status !== 'rejected').length;
                const dynamicMaxVotes = userVotingStats?.maxAllowedVotes ?? calculateMaxVotesPerUser(validApprovedEntriesCount);
                const myVotedEntriesCount = challengeEntries.filter(e => Array.isArray(e.likes) && e.likes.includes(user?.id || '')).length;
                const votesUsedCount = userVotingStats?.votesUsed ?? myVotedEntriesCount;
                const votesRemainingCount = userVotingStats !== null ? userVotingStats.votesRemaining : Math.max(0, dynamicMaxVotes - votesUsedCount);
                const isVoteLimitReached = votesRemainingCount <= 0 && dynamicMaxVotes > 0 && votesUsedCount >= dynamicMaxVotes;

                return (
                  <div className="space-y-4">
                    {/* User Existing Entry Notice Banner */}
                    {myActiveEntry && (
                      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs max-w-full overflow-hidden">
                        <div className="flex items-center gap-3 min-w-0 max-w-full overflow-hidden">
                          <div className="w-10 h-10 rounded-xl bg-amber-200 border border-amber-300 flex items-center justify-center text-amber-900 shrink-0 font-black">
                            <CheckCircle2 className="w-5 h-5 text-amber-700" />
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-black text-amber-950 truncate max-w-[200px] sm:max-w-sm">
                                {isTl ? 'May Active Entry Ka Na sa Challenge na Ito' : 'You Have an Active Entry'}
                              </h4>
                              <span className="text-[10px] bg-amber-200/80 text-amber-900 font-black px-2 py-0.5 rounded-full shrink-0">
                                {myActiveEntry.votesCount || 0} Votes • {myActiveEntry.score || 0} pts
                              </span>
                            </div>
                            <p className="text-[11px] text-amber-800 font-medium truncate mt-0.5 max-w-md">
                              {isTl 
                                ? 'One User = One Entry rule: Maaari mo itong i-edit o palitan anumang oras bago matapos ang palugit.'
                                : 'One User = One Entry: You can edit or replace this entry before the deadline.'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <button
                            type="button"
                            onClick={() => setSharingEntry(myActiveEntry)}
                            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                            title={isTl ? 'I-share ang iyong entry sa mga kaibigan' : 'Share your entry'}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>{isTl ? 'I-share ang Entry 🚀' : 'Share Entry 🚀'}</span>
                          </button>
                          {!isChallengeEnded && (
                            <button
                              onClick={() => openSubmitOrEditModal(selectedChallenge, myActiveEntry)}
                              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{isTl ? 'I-edit / Palitan ang Entry' : 'Edit / Replace Entry'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* DYNAMIC VOTING LIMIT INDICATOR */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                            🗳️
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                              <span>{isTl ? 'Dynamic Voting Limit' : 'Dynamic Voting Limit'}</span>
                              <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                                {validApprovedEntriesCount} {validApprovedEntriesCount === 1 ? 'Valid Entry' : 'Valid Entries'}
                              </span>
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {isTl 
                                ? 'Awtomatikong umaakma ang limitasyon sa dami ng entries sa challenge (1 boto kada 25-50 entries).' 
                                : 'Allowed voteable entries scale dynamically based on total entries in this challenge.'}
                            </p>
                          </div>
                        </div>

                        {/* Metric Badges */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700 shadow-2xs">
                            <span className="text-slate-400 mr-1.5">{isTl ? 'Voting Limit:' : 'Voting Limit:'}</span>
                            <span className="font-black text-indigo-700">{dynamicMaxVotes} {dynamicMaxVotes === 1 ? 'entry' : 'entries'}</span>
                          </div>
                          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700 shadow-2xs">
                            <span className="text-slate-400 mr-1.5">{isTl ? 'Votes Used:' : 'Votes Used:'}</span>
                            <span className="font-black text-slate-900">{votesUsedCount}/{dynamicMaxVotes}</span>
                          </div>
                          <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-2xs ${
                            votesRemainingCount > 0 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}>
                            <span className="mr-1.5">{isTl ? 'Votes Remaining:' : 'Votes Remaining:'}</span>
                            <span className="font-black">{votesRemainingCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Alert banner when maximum voting limit is reached */}
                      {isVoteLimitReached && (
                        <div className="bg-amber-50 border border-amber-300 rounded-xl px-3.5 py-2.5 text-xs text-amber-900 font-bold flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>
                            {isTl 
                              ? '🔒 Naabot mo na ang maximum voting limit para sa challenge na ito.' 
                              : '🔒 You have reached the maximum voting limit for this challenge.'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span>{isTl ? 'Live Leaderboard at Entries' : 'Live Leaderboard & Entries'}</span>
                      </h3>
                      {!isChallengeEnded && (
                        myActiveEntry ? (
                          <button
                            onClick={() => openSubmitOrEditModal(selectedChallenge, myActiveEntry)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{isTl ? 'I-edit ang Aking Entry' : 'Edit My Entry'}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => openSubmitOrEditModal(selectedChallenge, null)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{isTl ? 'Mag-submit ng Entry' : 'Submit Entry'}</span>
                          </button>
                        )
                      )}
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
                        {!isChallengeEnded && (
                          <button
                            onClick={() => openSubmitOrEditModal(selectedChallenge, null)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs cursor-pointer hover:bg-emerald-500 transition"
                          >
                            {isTl ? 'Maging Unang Kalahok 📹' : 'Be First to Submit 📹'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {challengeLeaderboard.map((entry, idx) => {
                          const isVoted = Array.isArray(entry.likes) && entry.likes.includes(user?.id || '');
                          const isMyOwnEntry = entry.participantId === user?.id;

                          return (
                            <div
                              key={entry.id}
                              className={`rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition max-w-full overflow-hidden ${
                                isMyOwnEntry 
                                  ? 'bg-amber-50/60 border-2 border-amber-300 shadow-xs' 
                                  : 'bg-slate-50 border border-slate-200 hover:border-indigo-200'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 max-w-full flex-1 overflow-hidden">
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
                                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                  <SafeAvatar
                                    avatar={entry.participantAvatar}
                                    fallbackEmoji="👤"
                                    className="w-10 h-10 rounded-full"
                                    alt={getSafeDisplayName(entry.participantName)}
                                  />
                                </div>

                                {/* Info */}
                                <div className="min-w-0 flex-1 overflow-hidden">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className="font-extrabold text-xs text-slate-900 truncate max-w-[150px] sm:max-w-[200px]"
                                      title={getSafeDisplayName(entry.participantName)}
                                    >
                                      {getSafeDisplayName(entry.participantName, isTl ? 'Kalahok' : 'Participant')}
                                    </span>
                                    {isMyOwnEntry && (
                                      <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full shrink-0">
                                        👤 {isTl ? 'Iyong Entry' : 'Your Entry'}
                                      </span>
                                    )}
                                    {idx === 0 && (
                                      <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.2 rounded-md shrink-0">
                                        👑 Rank #1
                                      </span>
                                    )}
                                  </div>
                                  {getSafeCaption(entry.caption) && (
                                    <p className="text-[11px] text-slate-600 truncate max-w-[240px] sm:max-w-md mt-0.5 break-words">
                                      {getSafeCaption(entry.caption)}
                                    </p>
                                  )}
                                  {(entry.updatedAt || entry.createdAt) && (
                                    <span className="text-[9px] text-slate-400 font-bold block mt-0.5 truncate">
                                      {entry.updatedAt 
                                        ? (isTl ? 'Na-edit noong: ' : 'Updated: ') + new Date(entry.updatedAt).toLocaleDateString()
                                        : (isTl ? 'Ipinasa: ' : 'Submitted: ') + new Date(entry.createdAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Media Preview & Vote CTA */}
                              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                                {/* Score & Votes */}
                                <div className="text-right shrink-0">
                                  <span className="text-[10px] text-slate-400 font-black uppercase block">Score</span>
                                  <span className="font-black text-indigo-600 font-mono text-sm">{entry.score || 0} pts</span>
                                </div>

                                {/* Media Preview (Thumbnail if image, Play link if video) */}
                                {entry.mediaUrl && (
                                  isImageMedia(entry.mediaUrl, entry.mediaType) ? (
                                    <button
                                      type="button"
                                      onClick={() => setViewingMedia({
                                        url: entry.mediaUrl,
                                        type: 'image',
                                        title: getSafeDisplayName(entry.participantName, isTl ? 'Kalahok' : 'Participant')
                                      })}
                                      className="relative w-11 h-11 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 group/media cursor-pointer hover:border-indigo-400 transition shadow-2xs"
                                      title={isTl ? 'Tingnan ang Larawan' : 'View Image'}
                                    >
                                      <img
                                        src={entry.mediaUrl}
                                        alt="Entry media"
                                        className="w-full h-full object-cover group-hover/media:scale-110 transition duration-300"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                          e.currentTarget.src = DEFAULT_ENTRY_PLACEHOLDER;
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/media:opacity-100 transition flex items-center justify-center">
                                        <Eye className="w-4 h-4 text-white drop-shadow" />
                                      </div>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setViewingMedia({
                                        url: entry.mediaUrl,
                                        type: 'video',
                                        title: getSafeDisplayName(entry.participantName, isTl ? 'Kalahok' : 'Participant')
                                      })}
                                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-black flex items-center gap-1 shrink-0 transition cursor-pointer shadow-2xs"
                                    >
                                      <Play className="w-3 h-3 text-indigo-600" />
                                      <span>{isTl ? 'Panoorin' : 'Watch'}</span>
                                    </button>
                                  )
                                )}

                                {/* Share & Invite Entry */}
                                <button
                                  type="button"
                                  onClick={() => setSharingEntry(entry)}
                                  className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-black transition cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                                  title={isTl ? 'I-share ang entry na ito' : 'Share this entry'}
                                >
                                  <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>{isTl ? 'I-share' : 'Share'}</span>
                                </button>

                                {/* If own entry and challenge is active, allow quick edit */}
                                {isMyOwnEntry && !isChallengeEnded && (
                                  <button
                                    onClick={() => openSubmitOrEditModal(selectedChallenge, entry)}
                                    className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-black transition cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>{isTl ? 'I-edit' : 'Edit'}</span>
                                  </button>
                                )}

                                {/* Permanent / Final Vote Button */}
                                {isMyOwnEntry ? (
                                  <div className="flex flex-col items-end shrink-0" title={isTl ? 'Bawal bumoto sa sariling entry.' : 'Cannot vote for your own entry.'}>
                                    <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 flex items-center gap-1.5 cursor-not-allowed select-none">
                                      <Heart className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{isTl ? 'Sarili' : 'Own'}</span>
                                      <span className="bg-slate-200/80 px-1.5 py-0.5 rounded-md text-[10px] text-slate-500 font-bold">{entry.votesCount || 0}</span>
                                    </div>
                                  </div>
                                ) : isChallengeEnded ? (
                                  <div className="flex flex-col items-end shrink-0" title={isTl ? 'Ended na ang challenge. Sarado na ang botohan.' : 'Challenge ended. Voting closed.'}>
                                    <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 flex items-center gap-1.5 cursor-not-allowed select-none">
                                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{isTl ? 'Sarado' : 'Closed'}</span>
                                      <span className="bg-slate-200/80 px-1.5 py-0.5 rounded-md text-[10px] text-slate-500 font-bold">{entry.votesCount || 0}</span>
                                    </div>
                                  </div>
                                ) : isVoted ? (
                                  <div className="flex flex-col items-end shrink-0">
                                    <div
                                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 shadow-2xs select-none"
                                      title={isTl ? 'Bumoto ka na. Final na ang iyong boto at hindi na maaaring bawiin.' : 'You have voted. Your vote is final and cannot be withdrawn.'}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-100" />
                                      <span>{isTl ? 'BUMOTO KA NA' : 'VOTED'}</span>
                                      <span className="bg-emerald-700/80 px-1.5 py-0.5 rounded-md text-[10px]">{entry.votesCount || 0}</span>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-bold mt-0.5 flex items-center gap-0.5">
                                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                                      {isTl ? 'Final Vote • Bawal Bawiin' : 'Final Vote • Permanent'}
                                    </span>
                                  </div>
                                ) : isVoteLimitReached ? (
                                  <div className="flex flex-col items-end shrink-0" title={isTl ? 'Naabot mo na ang maximum voting limit para sa challenge na ito.' : 'Maximum voting limit reached.'}>
                                    <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 flex items-center gap-1.5 cursor-not-allowed select-none">
                                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{isTl ? 'Limit Naabot' : 'Limit Reached'}</span>
                                      <span className="bg-slate-200/80 px-1.5 py-0.5 rounded-md text-[10px] text-slate-500 font-bold">{entry.votesCount || 0}</span>
                                    </div>
                                    <span className="text-[9px] text-amber-600 font-bold mt-0.5 flex items-center gap-0.5">
                                      <Lock className="w-2.5 h-2.5 text-amber-600" />
                                      {isTl ? 'Max votes naabot' : 'Max votes reached'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-end shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleVoteEntry(entry.id)}
                                      disabled={votingEntryId === entry.id}
                                      className="px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 shadow-2xs active:scale-95 disabled:opacity-50"
                                      title={isTl ? 'Bumoto sa entry na ito (Permanent at Final)' : 'Vote for this entry (Permanent & Final)'}
                                    >
                                      {votingEntryId === entry.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                                      ) : (
                                        <Heart className="w-3.5 h-3.5" />
                                      )}
                                      <span>{isTl ? 'BUMOTO' : 'VOTE'}</span>
                                      <span className="bg-rose-200/60 text-rose-700 px-1.5 py-0.5 rounded-md text-[10px] font-bold">{entry.votesCount || 0}</span>
                                    </button>
                                    <span className="text-[9px] text-slate-400 font-semibold mt-0.5">
                                      {isTl ? '1 vote lang • Final' : '1 vote only • Final'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
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

      {/* MODAL 2: SUBMIT / EDIT CHALLENGE ENTRY */}
      {showSubmitModal && selectedChallenge && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <div className="flex items-center gap-2">
                {editingEntryId ? (
                  <Edit3 className="w-5 h-5 text-amber-600" />
                ) : (
                  <Video className="w-5 h-5 text-indigo-600" />
                )}
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    {editingEntryId 
                      ? (isTl ? 'I-edit o Palitan ang Iyong Entry' : 'Edit or Replace Your Entry') 
                      : (isTl ? 'I-submit ang Iyong Entry' : 'Submit Entry')}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold block">
                    {selectedChallenge.title}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  setEditingEntryId(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanatory Rule Banner */}
            {editingEntryId ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-1 text-amber-900">
                <span className="font-black text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>{isTl ? 'One User = One Entry (Update Mode)' : 'One User = One Entry (Update Mode)'}</span>
                </span>
                <p className="text-[11px] font-medium leading-relaxed">
                  {isTl 
                    ? 'I-a-update lamang ang iyong kasalukuyang entry. Walang duplicate record na gagawin at mananatili ang iyong mga naipong score at boto.'
                    : 'Your existing entry will be updated in place without creating duplicate records. Your votes and score remain intact.'}
                </p>
              </div>
            ) : (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 space-y-1 text-indigo-900">
                <span className="font-black text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>{isTl ? 'Patakaran: Isang Entry Bawat User' : 'Policy: One Entry Per User'}</span>
                </span>
                <p className="text-[11px] font-medium leading-relaxed">
                  {isTl 
                    ? 'Isang active entry lamang bawat user ang pinapayagan. Maaari mo itong i-edit o palitan anumang oras bago matapos ang deadline ng challenge.'
                    : 'Only one active entry is allowed per user. You may edit or replace your submission anytime before the challenge ends.'}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmitEntry} className="space-y-4">
              {/* Media Submission Mode Tabs */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 block">
                  {isTl ? 'Paraan ng Pag-submit ng Media *' : 'Media Submission Method *'}
                </label>
                <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSubmissionTab('upload')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      submissionTab === 'upload'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isTl ? 'Upload Media (Gallery / Files)' : 'Upload Media (Gallery / Files)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionTab('url')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      submissionTab === 'url'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{isTl ? 'Media URL (TikTok / Links)' : 'Media URL (TikTok / Links)'}</span>
                  </button>
                </div>
              </div>

              {/* Hidden File Inputs */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'image')}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'video')}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e)}
              />

              {/* TAB 1: UPLOAD FROM DEVICE GALLERY / FILES */}
              {submissionTab === 'upload' ? (
                <div className="space-y-3">
                  {/* Upload Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingMedia}
                      className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-5 h-5 text-indigo-600" />
                      <span className="text-xs font-black">{isTl ? 'Photo Gallery' : 'Photo Gallery'}</span>
                      <span className="text-[10px] text-indigo-600 font-medium">JPEG, PNG (Max 15MB)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploadingMedia}
                      className="p-3 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-900 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <Film className="w-5 h-5 text-purple-600" />
                      <span className="text-xs font-black">{isTl ? 'Video Gallery' : 'Video Gallery'}</span>
                      <span className="text-[10px] text-purple-600 font-medium">MP4, MOV (Max 60MB)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingMedia}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <FolderOpen className="w-5 h-5 text-slate-600" />
                      <span className="text-xs font-black">{isTl ? 'Choose Files' : 'Choose Files'}</span>
                      <span className="text-[10px] text-slate-500 font-medium">{isTl ? 'Lahat ng Media' : 'Any Media'}</span>
                    </button>
                  </div>

                  {/* Uploading In-Progress State */}
                  {uploadingMedia && (
                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 text-center">
                      <div className="flex items-center justify-center gap-2 text-indigo-800 font-black text-xs">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        <span>{isTl ? 'Ligtas na ini-a-upload ang media...' : 'Safely uploading media...'}</span>
                      </div>
                      <div className="w-full bg-indigo-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-indigo-600 font-bold block">{uploadProgress}% Complete</span>
                    </div>
                  )}

                  {/* Uploaded Media Live Preview */}
                  {entryMediaUrl && !uploadingMedia && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{isTl ? 'Nai-attach na Media:' : 'Attached Media:'}</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-extrabold uppercase">
                            {entryMediaType}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEntryMediaUrl('');
                            setUploadedFileDetails(null);
                          }}
                          className="text-[11px] text-rose-600 hover:text-rose-700 font-black cursor-pointer"
                        >
                          {isTl ? 'Palitan / Alisin' : 'Replace / Remove'}
                        </button>
                      </div>

                      {entryMediaType === 'image' ? (
                        <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            <img
                              src={entryMediaUrl}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => { e.currentTarget.src = DEFAULT_ENTRY_PLACEHOLDER; }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-900 truncate block">
                              {uploadedFileDetails?.name || 'Uploaded Photo Entry'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              {uploadedFileDetails?.size || 'Secure Media Storage'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-black">
                          <video
                            src={entryMediaUrl}
                            controls
                            className="w-full max-h-48 object-contain mx-auto"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* TAB 2: SUBMIT MEDIA URL */
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-800">
                      {isTl ? 'Video o Media URL (YouTube, TikTok, direct link) *' : 'Video / Media URL *'}
                    </label>
                    <input
                      type="text"
                      required={submissionTab === 'url'}
                      value={entryMediaUrl}
                      onChange={e => setEntryMediaUrl(e.target.value)}
                      placeholder="https://... (TikTok, YouTube, MP4, etc.)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-indigo-600 truncate"
                    />
                    {entryMediaUrl && isImageMedia(entryMediaUrl, entryMediaType) && (
                      <div className="mt-2 flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                          <img
                            src={entryMediaUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => { e.currentTarget.src = DEFAULT_ENTRY_PLACEHOLDER; }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-black text-slate-700 block uppercase">
                            {isTl ? 'Image Preview' : 'Image Preview'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium truncate block">
                            {entryMediaUrl}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-800">{isTl ? 'Uri ng Media' : 'Media Type'}</label>
                    <select
                      value={entryMediaType}
                      onChange={e => setEntryMediaType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-indigo-600"
                    >
                      <option value="video">Video Performance (MP4, YouTube, TikTok)</option>
                      <option value="image">Photo / Artwork Entry</option>
                    </select>
                  </div>
                </div>
              )}

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
                  onClick={() => {
                    setShowSubmitModal(false);
                    setEditingEntryId(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition cursor-pointer"
                >
                  {isTl ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submittingEntry}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                    editingEntryId 
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {submittingEntry 
                      ? (isTl ? 'Ipinapadala...' : 'Sending...') 
                      : editingEntryId 
                        ? (isTl ? 'I-save ang Pagbabago' : 'Save Changes') 
                        : (isTl ? 'I-submit Entry' : 'Submit Entry')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX MEDIA VIEWER MODAL */}
      {viewingMedia && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setViewingMedia(null)}
        >
          <div 
            className="relative max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/20 p-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 mb-1 border-b border-white/10">
              <span className="text-white text-xs font-black truncate max-w-[80%]">
                {viewingMedia.title} • {viewingMedia.type === 'video' ? (isTl ? 'Video ng Entry' : 'Entry Video') : (isTl ? 'Larawan ng Entry' : 'Entry Photo')}
              </span>
              <button
                type="button"
                onClick={() => setViewingMedia(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-center max-h-[80vh] overflow-hidden rounded-2xl bg-black">
              {viewingMedia.type === 'video' ? (
                <ChallengeVideoPlayer
                  mediaUrl={viewingMedia.url}
                  caption={viewingMedia.title}
                  isTl={isTl}
                  autoPlay={true}
                />
              ) : (
                <img
                  src={viewingMedia.url}
                  alt={viewingMedia.title || 'Entry Preview'}
                  className="max-w-full max-h-[75vh] object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_ENTRY_PLACEHOLDER;
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {/* DEPOSIT MODAL (GCASH QR FUNDING) */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        token={token}
        user={user}
        requiredBudget={depositModalConfig.requiredBudget}
        currentAvailableBalance={depositModalConfig.currentAvailableBalance}
        targetPurpose={depositModalConfig.targetPurpose}
        targetEntityId={depositModalConfig.targetEntityId}
        language={language}
        onSuccess={() => {
          fetchWalletBreakdown();
          onRefreshProfile?.();
        }}
      />

      {/* PARTICIPANT VIRAL SHARING MODAL */}
      <ParticipantShareModal
        isOpen={!!sharingEntry}
        onClose={() => setSharingEntry(null)}
        entry={sharingEntry}
        challenge={selectedChallenge || challenges.find(c => c.id === sharingEntry?.challengeId) || null}
        currentUser={user}
        language={language}
      />
    </div>
  );
};
