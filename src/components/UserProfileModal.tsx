import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  MessageCircle,
  FolderPlus,
  Image as ImageIcon,
  Lock,
  Globe,
  Trash2,
  Edit3,
  Camera,
  Upload,
  Calendar,
  Check,
  ChevronLeft,
  Eye,
  ShieldCheck,
  Heart,
  MessageSquare,
  Sparkles,
  Layers,
  FileText,
  AlertCircle,
  Share2,
  UserPlus,
  UserCheck,
  Play,
  Trophy,
  ShoppingBag,
  Flag,
  Copy,
  ExternalLink,
  BarChart3,
  Users,
  UserX,
  Clock
} from 'lucide-react';
import { UserAlbum, UserPhoto, UserProfileInfo } from '../types';
import { CreatorAnalyticsDashboard } from './CreatorAnalyticsDashboard';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  token?: string;
  currentUserId?: string;
  currentUserName?: string;
  onStartDM?: (targetUserId: string, targetUserName: string, targetUserAvatar?: string) => void;
  onProfileUpdated?: () => void;
  onNavigateToShop?: (productId?: string) => void;
  onPlayReel?: (reelId: string) => void;
  onViewChallenge?: (challengeId: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  token = '',
  currentUserId,
  currentUserName,
  onStartDM,
  onProfileUpdated,
  onNavigateToShop,
  onPlayReel,
  onViewChallenge
}) => {
  const authToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
  const authHeader = authToken;
  const [profile, setProfile] = useState<UserProfileInfo & { albums?: UserAlbum[]; posts?: any[]; reels?: any[]; challenges?: any[]; taggedProducts?: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'challenges' | 'products' | 'albums' | 'friends'>('posts');
  const [selectedAlbum, setSelectedAlbum] = useState<UserAlbum | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<UserPhoto | null>(null);

  // Friends State
  const [profileFriends, setProfileFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  // Follow State
  const [followingLoading, setFollowingLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Moderation / Report State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState<'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'other'>('inappropriate');
  const [reportNotes, setReportNotes] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportToast, setReportToast] = useState<string | null>(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editCover, setEditCover] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Album Create/Edit State
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [albumPrivacy, setAlbumPrivacy] = useState<'public' | 'only_me'>('public');
  const [albumCoverPhoto, setAlbumCoverPhoto] = useState('');
  const [savingAlbum, setSavingAlbum] = useState(false);

  // Photo Add State
  const [isAddPhotoModalOpen, setIsAddPhotoModalOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoPrivacy, setPhotoPrivacy] = useState<'public' | 'only_me'>('public');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const albumPhotoInputRef = useRef<HTMLInputElement>(null);

  const isOwner = currentUserId === userId;

  const fetchProfile = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/zone/profile/${userId}`, {
        headers: authHeader ? { Authorization: authHeader } : {}
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(data.profile);
        setEditBio(data.profile.bio || '');
        setEditAvatar(data.profile.avatar || '');
        setEditCover(data.profile.coverPhoto || '');
        if (selectedAlbum) {
          const updatedSelected = (data.profile.albums || []).find((a: UserAlbum) => a.id === selectedAlbum.id);
          setSelectedAlbum(updatedSelected || null);
        }
      } else {
        setError(data.error || 'Hindi ma-load ang profile.');
      }
    } catch (err: any) {
      setError('Bigo ang koneksyon sa profile server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      setSelectedAlbum(null);
      setLightboxPhoto(null);
      fetchProfile();
    }
  }, [isOpen, userId]);

  // Handle Toggle Follow
  const handleToggleFollow = async () => {
    if (!currentUserId) {
      alert('Mag-login muna upang mag-Zone o sumubaybay sa user na ito.');
      return;
    }
    if (followingLoading || !profile) return;
    setFollowingLoading(true);
    try {
      const res = await fetch(`/api/zone/users/${profile.id}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {})
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(prev => prev ? {
          ...prev,
          isFollowing: data.isFollowing,
          followerCount: data.followerCount
        } : null);
        if (onProfileUpdated) onProfileUpdated();
      } else {
        alert(data.error || 'Bigo ang pag-follow sa user.');
      }
    } catch (err) {
      alert('Error updating follow status.');
    } finally {
      setFollowingLoading(false);
    }
  };

  // Handle Friend Actions (Phase 1 Social Graph)
  const handleSendFriendRequest = async () => {
    if (!currentUserId) {
      alert('Mag-login muna upang magpadala ng friend request.');
      return;
    }
    if (friendActionLoading || !profile) return;
    setFriendActionLoading(true);
    try {
      const res = await fetch('/api/zone/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: JSON.stringify({ targetUserId: profile.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(prev => prev ? {
          ...prev,
          friendshipStatus: data.autoAccepted ? 'friends' : 'pending_sent',
          friendCount: data.autoAccepted ? (prev.friendCount || 0) + 1 : prev.friendCount,
          pendingRequestId: data.requestId
        } : null);
      } else {
        alert(data.error || 'Bigo ang pagpadala ng friend request.');
      }
    } catch (err) {
      alert('Error sending friend request.');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!currentUserId || !profile) return;
    setFriendActionLoading(true);
    try {
      const res = await fetch('/api/zone/friends/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: JSON.stringify({ targetUserId: profile.id, requestId: profile.pendingRequestId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(prev => prev ? {
          ...prev,
          friendshipStatus: 'none',
          pendingRequestId: undefined
        } : null);
      } else {
        alert(data.error || 'Bigo ang pag-cancel ng friend request.');
      }
    } catch (err) {
      alert('Error cancelling friend request.');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleRespondFriendRequest = async (action: 'accept' | 'decline') => {
    if (!currentUserId || !profile || !profile.pendingRequestId) return;
    setFriendActionLoading(true);
    try {
      const res = await fetch('/api/zone/friends/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: JSON.stringify({ requestId: profile.pendingRequestId, action })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(prev => prev ? {
          ...prev,
          friendshipStatus: action === 'accept' ? 'friends' : 'none',
          friendCount: action === 'accept' ? (prev.friendCount || 0) + 1 : prev.friendCount,
          pendingRequestId: undefined
        } : null);
      } else {
        alert(data.error || 'Bigo ang pagsagot sa request.');
      }
    } catch (err) {
      alert('Error responding to friend request.');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!currentUserId || !profile) return;
    if (!window.confirm(`Sigurado ka bang nais mong alisin si ${profile.name} sa iyong mga kaibigan?`)) return;
    setFriendActionLoading(true);
    try {
      const res = await fetch('/api/zone/friends/unfriend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: JSON.stringify({ targetUserId: profile.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(prev => prev ? {
          ...prev,
          friendshipStatus: 'none',
          friendCount: Math.max(0, (prev.friendCount || 0) - 1)
        } : null);
      } else {
        alert(data.error || 'Bigo ang pag-unfriend.');
      }
    } catch (err) {
      alert('Error unfriending.');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const loadProfileFriends = async () => {
    if (!profile?.id) return;
    setLoadingFriends(true);
    try {
      const res = await fetch(`/api/zone/friends/${profile.id}`, {
        headers: authHeader ? { Authorization: authHeader } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProfileFriends(data.friends || []);
        }
      }
    } catch (err) {
      console.error('Error fetching friends', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  // Handle Share Profile Link
  const handleShareProfile = () => {
    if (!profile) return;
    const url = `${window.location.origin}/?tab=profile&userId=${profile.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }).catch(() => {
        prompt('Kopyahin ang profile link:', url);
      });
    } else {
      prompt('Kopyahin ang profile link:', url);
    }
  };

  // Handle Report User
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      alert('Mag-login muna upang makapag-report.');
      return;
    }
    if (!profile) return;
    setSubmittingReport(true);
    try {
      const res = await fetch('/api/zone/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: JSON.stringify({
          targetType: 'user',
          targetId: profile.id,
          reason: reportReason,
          notes: reportNotes
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsReportModalOpen(false);
        setReportNotes('');
        setReportToast('Nai-submit na ang iyong report sa moderation team. Salamat!');
        setTimeout(() => setReportToast(null), 4000);
      } else {
        alert(data.error || 'Bigo ang pag-report.');
      }
    } catch (err) {
      alert('Error submitting report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;
    setSavingProfile(true);
    try {
      const res = await fetch('/api/zone/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: JSON.stringify({
          bio: editBio,
          coverPhoto: editCover,
          avatar: editAvatar
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEditingProfile(false);
        fetchProfile();
        if (onProfileUpdated) onProfileUpdated();
      } else {
        alert(data.error || 'Bigo ang pag-update ng profile.');
      }
    } catch (err) {
      alert('Error updating profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Save Album (Create or Edit)
  const handleSaveAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !albumTitle.trim()) return;
    setSavingAlbum(true);

    try {
      const endpoint = editingAlbumId ? `/api/zone/albums/${editingAlbumId}` : '/api/zone/albums';
      const method = editingAlbumId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: JSON.stringify({
          title: albumTitle,
          description: albumDescription,
          privacy: albumPrivacy,
          coverPhoto: albumCoverPhoto || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAlbumModalOpen(false);
        setEditingAlbumId(null);
        setAlbumTitle('');
        setAlbumDescription('');
        setAlbumPrivacy('public');
        setAlbumCoverPhoto('');
        await fetchProfile();
        if (editingAlbumId && selectedAlbum) {
          setSelectedAlbum(data.album);
        }
      } else {
        alert(data.error || 'Bigo ang pag-save ng album.');
      }
    } catch (err) {
      alert('Error saving album.');
    } finally {
      setSavingAlbum(false);
    }
  };

  // Handle Delete Album
  const handleDeleteAlbum = async (albumId: string) => {
    if (!currentUserId) return;
    if (!window.confirm('Sigurado ka bang nais mong burahin ang album na ito kasama ang lahat ng mga litrato nito?')) {
      return;
    }

    try {
      const res = await fetch(`/api/zone/albums/${albumId}`, {
        method: 'DELETE',
        headers: authHeader ? { Authorization: authHeader } : {}
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (selectedAlbum?.id === albumId) {
          setSelectedAlbum(null);
        }
        fetchProfile();
      } else {
        alert(data.error || 'Bigo ang pagbura ng album.');
      }
    } catch (err) {
      alert('Error deleting album.');
    }
  };

  // Handle Add Photo to Album
  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !selectedAlbum || !photoUrl) {
      setPhotoUploadError('Pakipili o mag-upload ng litrato.');
      return;
    }

    setUploadingPhoto(true);
    setPhotoUploadError(null);

    try {
      const res = await fetch(`/api/zone/albums/${selectedAlbum.id}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: JSON.stringify({
          url: photoUrl,
          caption: photoCaption,
          privacy: photoPrivacy
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddPhotoModalOpen(false);
        setPhotoUrl('');
        setPhotoCaption('');
        setPhotoPrivacy('public');
        await fetchProfile();
        if (data.album) {
          setSelectedAlbum(data.album);
        }
      } else {
        setPhotoUploadError(data.error || 'Bigo ang pag-upload ng photo.');
      }
    } catch (err) {
      setPhotoUploadError('Error uploading photo to album.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle Delete Photo
  const handleDeletePhoto = async (photoId: string) => {
    if (!currentUserId || !selectedAlbum) return;
    if (!window.confirm('Sigurado ka bang nais mong burahin ang litratong ito?')) return;

    try {
      const res = await fetch(`/api/zone/albums/${selectedAlbum.id}/photos/${photoId}`, {
        method: 'DELETE',
        headers: authHeader ? { Authorization: authHeader } : {}
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (lightboxPhoto?.id === photoId) {
          setLightboxPhoto(null);
        }
        await fetchProfile();
      } else {
        alert(data.error || 'Bigo ang pagbura ng photo.');
      }
    } catch (err) {
      alert('Error deleting photo.');
    }
  };

  // Handle Toggle Photo Privacy
  const handleTogglePhotoPrivacy = async (photo: UserPhoto) => {
    if (!currentUserId || !selectedAlbum) return;
    const newPrivacy = photo.privacy === 'only_me' ? 'public' : 'only_me';

    try {
      const res = await fetch(`/api/zone/albums/${selectedAlbum.id}/photos/${photo.id}/privacy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {})
        },
        body: JSON.stringify({ privacy: newPrivacy })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (lightboxPhoto && lightboxPhoto.id === photo.id) {
          setLightboxPhoto({ ...lightboxPhoto, privacy: newPrivacy });
        }
        await fetchProfile();
      } else {
        alert(data.error || 'Bigo ang pagbago ng privacy.');
      }
    } catch (err) {
      alert('Error changing privacy.');
    }
  };

  // Helper for reading base64 image
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        alert('Masyadong malaki ang litrato (Max: 15MB).');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setter(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="user-profile-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          <button
            id="close-profile-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all shadow-md"
            title="Isara"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Kinukuha ang profile at mga album...</p>
            </div>
          ) : error || !profile ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Hindi mahanap ang Profile</h3>
              <p className="text-sm text-slate-400 max-w-sm mb-6">{error || 'Maaaring tinanggal o hindi umiiral ang user na ito.'}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-all"
              >
                Bumalik
              </button>
            </div>
          ) : (
            <div>
              {/* Cover Photo Header */}
              <div className="relative h-44 sm:h-56 w-full bg-gradient-to-r from-slate-950 via-slate-800 to-indigo-950 overflow-hidden">
                <img
                  src={profile.coverPhoto || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80'}
                  alt="Cover"
                  className="w-full h-full object-cover opacity-80"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30" />

                {isOwner && (
                  <button
                    id="edit-cover-btn"
                    onClick={() => setIsEditingProfile(true)}
                    className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-xs font-semibold rounded-lg backdrop-blur-md border border-white/10 flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Palitan ang Cover</span>
                  </button>
                )}
              </div>

              {/* Profile Info Container */}
              <div className="px-4 sm:px-6 pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4 relative z-10">
                  {/* Avatar & Main Info */}
                  <div className="flex items-end gap-4">
                    <div className="relative">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-800 border-4 border-slate-900 shadow-xl overflow-hidden flex items-center justify-center text-3xl font-bold">
                        {profile.avatar && (profile.avatar.startsWith('http') || profile.avatar.startsWith('data:')) ? (
                          <img
                            src={profile.avatar}
                            alt={profile.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-slate-300">{profile.avatar || '👤'}</span>
                        )}
                      </div>
                      {profile.isOnline && (
                        <div
                          className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900"
                          title="Online ngayon"
                        />
                      )}
                    </div>

                    <div className="mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{profile.name}</h2>
                        {profile.isAdmin && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-md flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-cyan-400 font-mono font-medium mt-0.5">
                        {profile.handle || ('@' + (profile.name || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                      </p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>Miyembro mula {new Date(profile.createdAt || Date.now()).toLocaleDateString('fil-PH', { month: 'short', year: 'numeric' })}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions (Follow / Message / Share / Edit / Report) */}
                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    {!isOwner ? (
                      <>
                        <button
                          id="profile-follow-btn"
                          onClick={handleToggleFollow}
                          disabled={followingLoading}
                          className={`px-4 py-2 font-semibold text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md ${
                            profile.isFollowing
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
                          }`}
                        >
                          {profile.isFollowing ? (
                            <>
                              <UserCheck className="w-4 h-4 text-emerald-400" />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              <span>+ Follow</span>
                            </>
                          )}
                        </button>

                        {/* Friend Action Button */}
                        {profile.friendshipStatus === 'friends' && (
                          <button
                            id="profile-friend-status-btn"
                            onClick={handleUnfriend}
                            disabled={friendActionLoading}
                            className="px-3.5 py-2 bg-emerald-950/70 hover:bg-rose-950/60 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40 font-semibold text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm group cursor-pointer"
                            title="I-click upang mag-unfriend"
                          >
                            <UserCheck className="w-4 h-4 text-emerald-400 group-hover:hidden" />
                            <UserX className="w-4 h-4 text-rose-400 hidden group-hover:block" />
                            <span className="group-hover:hidden">Kaibigan ✓</span>
                            <span className="hidden group-hover:inline">I-unfriend</span>
                          </button>
                        )}

                        {profile.friendshipStatus === 'pending_sent' && (
                          <button
                            id="profile-cancel-req-btn"
                            onClick={handleCancelFriendRequest}
                            disabled={friendActionLoading}
                            className="px-3.5 py-2 bg-amber-950/60 hover:bg-slate-800 text-amber-300 hover:text-slate-300 border border-amber-500/40 hover:border-slate-700 font-semibold text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                            title="I-click upang i-cancel ang friend request"
                          >
                            <Clock className="w-4 h-4 text-amber-400" />
                            <span>Pending Request</span>
                          </button>
                        )}

                        {profile.friendshipStatus === 'pending_received' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              id="profile-accept-req-btn"
                              onClick={() => handleRespondFriendRequest('accept')}
                              disabled={friendActionLoading}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                              <span>Tanggapin</span>
                            </button>
                            <button
                              id="profile-decline-req-btn"
                              onClick={() => handleRespondFriendRequest('decline')}
                              disabled={friendActionLoading}
                              className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl border border-slate-700 transition-all cursor-pointer"
                            >
                              Tanggihan
                            </button>
                          </div>
                        )}

                        {profile.friendshipStatus === 'none' && (
                          <button
                            id="profile-add-friend-btn"
                            onClick={handleSendFriendRequest}
                            disabled={friendActionLoading}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>+ Add Friend</span>
                          </button>
                        )}

                        <button
                          id="profile-dm-btn"
                          onClick={() => {
                            if (onStartDM) {
                              onStartDM(profile.id, profile.name, profile.avatar);
                              onClose();
                            }
                          }}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                          title="Magpadala ng Mensahe"
                        >
                          <MessageCircle className="w-4 h-4 text-cyan-400" />
                          <span>Mensahe</span>
                        </button>

                        <button
                          id="profile-share-btn"
                          onClick={handleShareProfile}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
                          title="I-share ang Profile link"
                        >
                          <Share2 className="w-4 h-4" />
                          {copiedLink ? <span className="text-emerald-400 text-xs">Na-kopya!</span> : <span>Share</span>}
                        </button>

                        <button
                          id="profile-report-btn"
                          onClick={() => setIsReportModalOpen(true)}
                          className="p-2 bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 rounded-xl transition-all"
                          title="I-report ang Profile"
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          id="edit-profile-trigger-btn"
                          onClick={() => setIsEditingProfile(true)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4 text-cyan-400" />
                          <span>I-edit ang Profile</span>
                        </button>

                        <button
                          id="owner-analytics-trigger-btn"
                          onClick={() => setIsAnalyticsOpen(true)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                          title="Buksan ang Creator Analytics"
                        >
                          <BarChart3 className="w-4 h-4" />
                          <span>Analytics</span>
                        </button>

                        <button
                          id="owner-share-profile-btn"
                          onClick={handleShareProfile}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
                          title="I-share ang iyong Profile link"
                        >
                          <Share2 className="w-4 h-4" />
                          {copiedLink ? <span className="text-emerald-400 text-xs">Na-kopya!</span> : <span>Share</span>}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {reportToast && (
                  <div className="mb-3 p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{reportToast}</span>
                  </div>
                )}

                {/* Bio */}
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5 mb-4">
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {profile.bio || 'Wala pang bio ang user na ito.'}
                  </p>
                </div>

                {/* Mutual Friends Banner */}
                {profile.mutualFriendCount && profile.mutualFriendCount > 0 ? (
                  <div
                    onClick={() => {
                      setActiveTab('friends');
                      loadProfileFriends();
                    }}
                    className="flex items-center justify-between gap-2 mb-4 px-3.5 py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs text-slate-300 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-medium text-slate-200">
                        <strong className="text-white">{profile.mutualFriendCount}</strong> mutual friend{profile.mutualFriendCount > 1 ? 's' : ''}
                      </span>
                    </div>
                    {profile.mutualFriends && profile.mutualFriends.length > 0 && (
                      <div className="flex items-center -space-x-2">
                        {profile.mutualFriends.slice(0, 4).map((mf: any) => (
                          <div
                            key={mf.id}
                            className="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-900 overflow-hidden text-[10px] flex items-center justify-center font-bold"
                            title={mf.name}
                          >
                            {mf.avatar && mf.avatar.startsWith('http') ? (
                              <img src={mf.avatar} alt={mf.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{mf.avatar || '👤'}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                {/* 6-Column Stats Summary Bar */}
                <div className="grid grid-cols-6 gap-1 sm:gap-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center mb-5">
                  <div className="border-r border-slate-800/60 pr-1">
                    <span className="block text-base sm:text-lg font-black text-blue-400">{profile.followerCount || 0}</span>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Followers</span>
                  </div>
                  <div className="border-r border-slate-800/60 pr-1">
                    <span className="block text-base sm:text-lg font-black text-slate-200">{profile.followingCount || 0}</span>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Following</span>
                  </div>
                  <div
                    className="border-r border-slate-800/60 pr-1 cursor-pointer hover:bg-slate-900/60 rounded-lg transition"
                    onClick={() => {
                      setActiveTab('friends');
                      loadProfileFriends();
                    }}
                  >
                    <span className="block text-base sm:text-lg font-black text-emerald-400">{profile.friendCount || 0}</span>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Kaibigan</span>
                  </div>
                  <div className="border-r border-slate-800/60 pr-1">
                    <span className="block text-base sm:text-lg font-black text-white">{profile.postCount || 0}</span>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Posts</span>
                  </div>
                  <div className="border-r border-slate-800/60 pr-1">
                    <span className="block text-base sm:text-lg font-black text-rose-400">{(profile.reels || []).length}</span>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Reels</span>
                  </div>
                  <div>
                    <span className="block text-base sm:text-lg font-black text-amber-400">{(profile.taggedProducts || []).length}</span>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Products</span>
                  </div>
                </div>

                {/* 6-Tab Profile Navigation */}
                <div className="flex border-b border-slate-800 mb-4 overflow-x-auto no-scrollbar">
                  <button
                    id="tab-posts-btn"
                    onClick={() => {
                      setActiveTab('posts');
                      setSelectedAlbum(null);
                    }}
                    className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
                      activeTab === 'posts'
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Posts ({profile.postCount || 0})</span>
                  </button>

                  <button
                    id="tab-friends-btn"
                    onClick={() => {
                      setActiveTab('friends');
                      setSelectedAlbum(null);
                      loadProfileFriends();
                    }}
                    className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
                      activeTab === 'friends'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Kaibigan ({profile.friendCount || 0})</span>
                  </button>

                  <button
                    id="tab-reels-btn"
                    onClick={() => {
                      setActiveTab('reels');
                      setSelectedAlbum(null);
                    }}
                    className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
                      activeTab === 'reels'
                        ? 'border-rose-500 text-rose-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    <span>Reels ({(profile.reels || []).length})</span>
                  </button>

                  <button
                    id="tab-challenges-btn"
                    onClick={() => {
                      setActiveTab('challenges');
                      setSelectedAlbum(null);
                    }}
                    className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
                      activeTab === 'challenges'
                        ? 'border-amber-500 text-amber-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Trophy className="w-4 h-4" />
                    <span>Challenges ({(profile.challenges || []).length})</span>
                  </button>

                  <button
                    id="tab-products-btn"
                    onClick={() => {
                      setActiveTab('products');
                      setSelectedAlbum(null);
                    }}
                    className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
                      activeTab === 'products'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Products ({(profile.taggedProducts || []).length})</span>
                  </button>

                  <button
                    id="tab-albums-btn"
                    onClick={() => {
                      setActiveTab('albums');
                      setSelectedAlbum(null);
                    }}
                    className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
                      activeTab === 'albums'
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Photos & Albums ({profile.albumCount || (profile.albums ? profile.albums.length : 0)})</span>
                  </button>
                </div>

                {/* TAB CONTENT: ALBUMS */}
                {activeTab === 'albums' && (
                  <div>
                    {selectedAlbum ? (
                      /* SINGLE ALBUM DETAIL VIEW */
                      <div>
                        {/* Album Navigation & Controls */}
                        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800 flex-wrap">
                          <div className="flex items-center gap-2">
                            <button
                              id="back-to-albums-btn"
                              onClick={() => setSelectedAlbum(null)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                              title="Bumalik sa mga album"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-white">{selectedAlbum.title}</h3>
                                {selectedAlbum.privacy === 'only_me' ? (
                                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold rounded-md flex items-center gap-1">
                                    <Lock className="w-3 h-3" /> Only Me
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold rounded-md flex items-center gap-1">
                                    <Globe className="w-3 h-3" /> Pampubliko
                                  </span>
                                )}
                              </div>
                              {selectedAlbum.description && (
                                <p className="text-xs text-slate-400 mt-0.5">{selectedAlbum.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Owner Album Controls */}
                          {isOwner && (
                            <div className="flex items-center gap-2">
                              <button
                                id="add-photo-btn"
                                onClick={() => {
                                  setPhotoUrl('');
                                  setPhotoCaption('');
                                  setPhotoPrivacy('public');
                                  setPhotoUploadError(null);
                                  setIsAddPhotoModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Magdagdag ng Photo</span>
                              </button>
                              <button
                                id="edit-album-btn"
                                onClick={() => {
                                  setEditingAlbumId(selectedAlbum.id);
                                  setAlbumTitle(selectedAlbum.title);
                                  setAlbumDescription(selectedAlbum.description || '');
                                  setAlbumPrivacy(selectedAlbum.privacy);
                                  setAlbumCoverPhoto(selectedAlbum.coverPhoto || '');
                                  setIsAlbumModalOpen(true);
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                                title="I-edit ang Album"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                id="delete-album-btn"
                                onClick={() => handleDeleteAlbum(selectedAlbum.id)}
                                className="p-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/40 rounded-lg transition-all"
                                title="Burahin ang Album"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Photos Grid */}
                        {(!selectedAlbum.photos || selectedAlbum.photos.length === 0) ? (
                          <div className="text-center py-16 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl p-6">
                            <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <h4 className="text-sm font-bold text-slate-300 mb-1">Walang laman ang album na ito</h4>
                            <p className="text-xs text-slate-500 mb-4">
                              {isOwner
                                ? 'Mag-upload ng mga litrato at piliin kung gusto mong gawing Public o Only Me.'
                                : 'Wala pang pampublikong litrato sa album na ito.'}
                            </p>
                            {isOwner && (
                              <button
                                onClick={() => setIsAddPhotoModalOpen(true)}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-1.5"
                              >
                                <Upload className="w-4 h-4" />
                                <span>Mag-upload ng Unang Litrato</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                            {selectedAlbum.photos.map((photo) => (
                              <div
                                key={photo.id}
                                className="group relative aspect-square bg-slate-800 rounded-xl overflow-hidden border border-slate-700/50 shadow-md cursor-pointer"
                                onClick={() => setLightboxPhoto(photo)}
                              >
                                <img
                                  src={photo.url}
                                  alt={photo.caption || 'Photo'}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  referrerPolicy="no-referrer"
                                />

                                {/* Privacy Badge */}
                                <div className="absolute top-2 left-2 z-10">
                                  {photo.privacy === 'only_me' ? (
                                    <span className="px-1.5 py-0.5 bg-black/70 backdrop-blur-md text-rose-400 text-[10px] font-bold rounded flex items-center gap-1 border border-rose-500/30">
                                      <Lock className="w-2.5 h-2.5" /> Only Me
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 bg-black/70 backdrop-blur-md text-cyan-400 text-[10px] font-bold rounded flex items-center gap-1 border border-cyan-500/30">
                                      <Globe className="w-2.5 h-2.5" /> Public
                                    </span>
                                  )}
                                </div>

                                {/* Hover Overlay Actions */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                                  <div className="flex justify-end gap-1.5">
                                    {isOwner && (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleTogglePhotoPrivacy(photo);
                                          }}
                                          className="p-1.5 bg-black/60 hover:bg-black/90 text-white rounded-lg text-xs"
                                          title={photo.privacy === 'only_me' ? 'Gawing Public' : 'Gawing Only Me'}
                                        >
                                          {photo.privacy === 'only_me' ? <Globe className="w-3.5 h-3.5 text-cyan-400" /> : <Lock className="w-3.5 h-3.5 text-rose-400" />}
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeletePhoto(photo.id);
                                          }}
                                          className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-lg text-xs"
                                          title="Burahin ang Photo"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  {photo.caption && (
                                    <p className="text-[11px] text-white line-clamp-2 leading-tight">
                                      {photo.caption}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* ALBUMS LIST VIEW */
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-bold text-slate-200">Lahat ng Album</h3>
                          {isOwner && (
                            <button
                              id="create-album-btn"
                              onClick={() => {
                                setEditingAlbumId(null);
                                setAlbumTitle('');
                                setAlbumDescription('');
                                setAlbumPrivacy('public');
                                setAlbumCoverPhoto('');
                                setIsAlbumModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md"
                            >
                              <FolderPlus className="w-4 h-4" />
                              <span>Gumawa ng Album</span>
                            </button>
                          )}
                        </div>

                        {(!profile.albums || profile.albums.length === 0) ? (
                          <div className="text-center py-16 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl p-6">
                            <FolderPlus className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <h4 className="text-sm font-bold text-slate-300 mb-1">Walang mga album</h4>
                            <p className="text-xs text-slate-500 mb-4">
                              {isOwner
                                ? 'Gumawa ng album upang maiayos ang iyong mga larawan nang may privacy control (Public vs Only Me).'
                                : 'Walang pampublikong album ang user na ito.'}
                            </p>
                            {isOwner && (
                              <button
                                onClick={() => setIsAlbumModalOpen(true)}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-1.5"
                              >
                                <FolderPlus className="w-4 h-4" />
                                <span>Gumawa ng Unang Album</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                            {profile.albums.map((album) => {
                              const photoCount = album.photos ? album.photos.length : 0;
                              const coverImg = album.coverPhoto || (album.photos && album.photos[0]?.url) || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=60';

                              return (
                                <div
                                  key={album.id}
                                  onClick={() => setSelectedAlbum(album)}
                                  className="group bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/40 rounded-2xl overflow-hidden shadow-lg transition-all cursor-pointer flex flex-col"
                                >
                                  {/* Album Cover */}
                                  <div className="relative h-36 w-full bg-slate-900 overflow-hidden">
                                    <img
                                      src={coverImg}
                                      alt={album.title}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                                    {/* Privacy Tag */}
                                    <div className="absolute top-2.5 right-2.5">
                                      {album.privacy === 'only_me' ? (
                                        <span className="px-2 py-0.5 bg-black/75 backdrop-blur-md text-rose-400 text-[10px] font-bold rounded-md flex items-center gap-1 border border-rose-500/30">
                                          <Lock className="w-3 h-3" /> Only Me
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-black/75 backdrop-blur-md text-cyan-400 text-[10px] font-bold rounded-md flex items-center gap-1 border border-cyan-500/30">
                                          <Globe className="w-3 h-3" /> Public
                                        </span>
                                      )}
                                    </div>

                                    {/* Photos Count Badge */}
                                    <div className="absolute bottom-2 left-2.5">
                                      <span className="px-2 py-0.5 bg-slate-950/80 backdrop-blur-md text-slate-200 text-xs font-semibold rounded-md flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3 text-cyan-400" />
                                        <span>{photoCount} {photoCount === 1 ? 'litrato' : 'mga litrato'}</span>
                                      </span>
                                    </div>
                                  </div>

                                  {/* Info Body */}
                                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                                    <div>
                                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                                        {album.title}
                                      </h4>
                                      {album.description && (
                                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                                          {album.description}
                                        </p>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1">
                                      <span>Nilikha: {new Date(album.createdAt).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: POSTS */}
                {activeTab === 'posts' && (
                  <div>
                    {(!profile.posts || profile.posts.length === 0) ? (
                      <div className="text-center py-16 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl p-6">
                        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-slate-300 mb-1">Walang mga post</h4>
                        <p className="text-xs text-slate-500">Wala pang naibabahaging post ang user na ito sa Z-one Community Feed.</p>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {profile.posts.map((post: any) => (
                          <div
                            key={post.id}
                            className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-4 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-slate-700 overflow-hidden flex items-center justify-center font-bold text-slate-200">
                                  {profile.avatar && (profile.avatar.startsWith('http') || profile.avatar.startsWith('data:')) ? (
                                    <img src={profile.avatar} alt="Author" className="w-full h-full object-cover" />
                                  ) : (
                                    <span>{profile.avatar || '👤'}</span>
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-white">{profile.name}</h4>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(post.createdAt || Date.now()).toLocaleString('fil-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Text */}
                            {post.text && (
                              <p className="text-sm text-slate-200 whitespace-pre-wrap mb-3 leading-relaxed">
                                {post.text}
                              </p>
                            )}

                            {/* Media */}
                            {post.mediaUrl && (
                              <div className="rounded-xl overflow-hidden bg-slate-900 mb-3 max-h-80 flex items-center justify-center">
                                {post.mediaType === 'video' ? (
                                  <video src={post.mediaUrl} controls className="max-h-80 w-full object-contain" />
                                ) : (
                                  <img src={post.mediaUrl} alt="Media" className="max-h-80 w-full object-cover" />
                                )}
                              </div>
                            )}

                            {/* Stats */}
                            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-700/50">
                              <span className="flex items-center gap-1">
                                <Heart className="w-3.5 h-3.5 text-rose-400" />
                                <span>{(post.likes || []).length} likes</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                                <span>{(post.comments || []).length} komento</span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: REELS */}
                {activeTab === 'reels' && (
                  <div>
                    {(!profile.reels || profile.reels.length === 0) ? (
                      <div className="text-center py-16 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl p-6">
                        <Play className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-slate-300 mb-1">Walang mga Reel</h4>
                        <p className="text-xs text-slate-500">Wala pang naibabahaging video o reel ang user na ito.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {profile.reels.map((reel: any) => (
                          <div
                            key={reel.id}
                            onClick={() => {
                              if (onPlayReel) {
                                onPlayReel(reel.id);
                                onClose();
                              }
                            }}
                            className="group relative aspect-[9/16] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 hover:border-rose-500/50 cursor-pointer shadow-lg transition-all"
                          >
                            <img
                              src={reel.thumbnailUrl || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&auto=format&fit=crop&q=60'}
                              alt={reel.title || 'Reel'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                            <div className="absolute top-2.5 right-2.5 w-7 h-7 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                              <Play className="w-3.5 h-3.5 fill-white" />
                            </div>
                            <div className="absolute bottom-2.5 left-2.5 right-2.5">
                              <p className="text-xs font-bold text-white line-clamp-1 group-hover:text-rose-400 transition-colors">
                                {reel.title || 'Z-one Reel'}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-300 mt-0.5">
                                <span>{(reel.views || 0).toLocaleString()} views</span>
                                <span>•</span>
                                <span>{(reel.likes || []).length} likes</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: CHALLENGES */}
                {activeTab === 'challenges' && (
                  <div>
                    {(!profile.challenges || profile.challenges.length === 0) ? (
                      <div className="text-center py-16 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl p-6">
                        <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-slate-300 mb-1">Walang mga Challenge</h4>
                        <p className="text-xs text-slate-500">Wala pang na-host na Creator Challenge ang user na ito.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {profile.challenges.map((c: any) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              if (onViewChallenge) {
                                onViewChallenge(c.id);
                                onClose();
                              }
                            }}
                            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 rounded-2xl p-4 transition-all cursor-pointer shadow-md flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold rounded-lg uppercase tracking-wide">
                                  {c.category || 'Creator Challenge'}
                                </span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                  c.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-300'
                                }`}>
                                  {c.status === 'active' ? 'Aktibo' : c.status}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-white mb-1.5 hover:text-amber-400 transition-colors">
                                {c.title}
                              </h4>
                              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                {c.description}
                              </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 block">Prize Pool</span>
                                <span className="font-black text-amber-400">₱{(c.prizePool || 0).toLocaleString()}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block">Kalahok</span>
                                <span className="font-semibold text-slate-200">{c.maxParticipants ? `Up to ${c.maxParticipants}` : 'Open'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: PRODUCTS */}
                {activeTab === 'products' && (
                  <div>
                    {(!profile.taggedProducts || profile.taggedProducts.length === 0) ? (
                      <div className="text-center py-16 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl p-6">
                        <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-slate-300 mb-1">Walang mga Produkto</h4>
                        <p className="text-xs text-slate-500">Wala pang nakatalagang produkto sa Z-oneShop mula sa user na ito.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                        {profile.taggedProducts.map((p: any) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              if (onNavigateToShop) {
                                onNavigateToShop(p.id);
                                onClose();
                              }
                            }}
                            className="group bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/50 rounded-2xl overflow-hidden cursor-pointer shadow-md transition-all flex flex-col justify-between"
                          >
                            <div className="aspect-square bg-slate-900 overflow-hidden relative">
                              <img
                                src={p.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60'}
                                alt={p.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-950/80 backdrop-blur-md rounded-md text-emerald-400 text-xs font-black">
                                ₱{Number(p.price || 0).toLocaleString()}
                              </div>
                            </div>
                            <div className="p-3">
                              <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-emerald-400 transition-colors">
                                {p.title}
                              </h4>
                              {p.category && (
                                <span className="text-[10px] text-slate-400 block mt-0.5">{p.category}</span>
                              )}
                              <button
                                className="w-full mt-2.5 py-1.5 bg-slate-700/80 hover:bg-emerald-600 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                              >
                                <span>Tingnan sa Shop</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: FRIENDS */}
                {activeTab === 'friends' && (
                  <div>
                    {loadingFriends ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-400 font-medium">Kinukuha ang listahan ng mga kaibigan...</p>
                      </div>
                    ) : profileFriends.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 space-y-2">
                        <Users className="w-12 h-12 mx-auto text-slate-600 opacity-60" />
                        <h4 className="text-sm font-bold text-white">Wala pang mga kaibigan</h4>
                        <p className="text-xs text-slate-500">Wala pang nakatalang kaibigan si {profile.name} sa Z-one.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {profileFriends.map((fr: any) => (
                          <div
                            key={fr.id}
                            className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between gap-3 hover:border-slate-600 transition"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 overflow-hidden flex items-center justify-center text-base font-bold shrink-0">
                                  {fr.avatar && (fr.avatar.startsWith('http') || fr.avatar.startsWith('data:')) ? (
                                    <img src={fr.avatar} alt={fr.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span>{fr.avatar || '👤'}</span>
                                  )}
                                </div>
                                {fr.isOnline && (
                                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
                                )}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-white hover:text-blue-400 transition">{fr.name}</h4>
                                <p className="text-[11px] text-cyan-400 font-mono">{fr.handle}</p>
                                {fr.mutualCount > 0 && (
                                  <p className="text-[10px] text-emerald-400 font-medium mt-0.5">
                                    {fr.mutualCount} mutual friend{fr.mutualCount > 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                            {onStartDM && (
                              <button
                                onClick={() => {
                                  onStartDM(fr.id, fr.name, fr.avatar);
                                  onClose();
                                }}
                                className="p-2 bg-slate-700 hover:bg-slate-600 text-cyan-400 rounded-lg transition cursor-pointer"
                                title="Mensahe"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ========================================================= */}
      {/* REPORT USER MODAL */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div
            id="report-user-modal"
            className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsReportModalOpen(false)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <Flag className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-white">I-report ang User</h3>
                </div>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-300 mb-4">
                Tulungan kaming mapanatiling ligtas ang Z-one Community. Piliin ang dahilan ng pag-report kay <span className="font-semibold text-white">{profile?.name}</span>:
              </p>

              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Dahilan</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="inappropriate">Hindi angkop na Nilalaman / Content</option>
                    <option value="harassment">Harassment / Pambubully</option>
                    <option value="spam">Spam / Panlilinlang / Scam</option>
                    <option value="misinformation">Maling Impormasyon / Fake News</option>
                    <option value="other">Iba pa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Karagdagang Paliwanag (Opsyonal)</label>
                  <textarea
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    rows={3}
                    placeholder="Magbigay ng detalye kung bakit nilabag ang community safety..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Kanselahin
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg shadow-rose-600/20 disabled:opacity-50"
                  >
                    {submittingReport ? 'Isinusumite...' : 'I-submit ang Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* PHOTO LIGHTBOX MODAL */}
      {/* ========================================================= */}
      <AnimatePresence>
        {lightboxPhoto && (
          <div
            id="photo-lightbox-modal"
            className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6"
            onClick={() => setLightboxPhoto(null)}
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between z-10" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                {lightboxPhoto.privacy === 'only_me' ? (
                  <span className="px-2.5 py-1 bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-lg flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Only Me (Pribado)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold rounded-lg flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Public (Pampubliko)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isOwner && (
                  <>
                    <button
                      onClick={() => handleTogglePhotoPrivacy(lightboxPhoto)}
                      className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all"
                    >
                      {lightboxPhoto.privacy === 'only_me' ? (
                        <>
                          <Globe className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Gawing Public</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                          <span>Gawing Only Me</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeletePhoto(lightboxPhoto.id)}
                      className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-lg text-xs"
                      title="Burahin ang Photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setLightboxPhoto(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Center Image */}
            <div className="flex-1 flex items-center justify-center p-2 sm:p-4 min-h-0">
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.caption || 'Full Photo'}
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Lightbox Footer Caption */}
            {lightboxPhoto.caption && (
              <div
                className="max-w-xl mx-auto w-full bg-black/60 backdrop-blur-md p-3.5 rounded-xl border border-white/10 text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm text-slate-200">{lightboxPhoto.caption}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Na-upload: {new Date(lightboxPhoto.uploadedAt).toLocaleString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* EDIT PROFILE MODAL */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isEditingProfile && (
          <div
            id="edit-profile-submodal"
            className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsEditingProfile(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-cyan-400" />
                  <span>I-edit ang Profile</span>
                </h3>
                <button onClick={() => setIsEditingProfile(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Avatar Preview & Upload */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Profile Photo / Avatar</label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-xl">
                      {editAvatar && (editAvatar.startsWith('http') || editAvatar.startsWith('data:')) ? (
                        <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span>{editAvatar || '👤'}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        ref={avatarFileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, setEditAvatar)}
                      />
                      <button
                        type="button"
                        onClick={() => avatarFileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold rounded-lg text-slate-200 flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Pumili ng Litrato</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cover Photo Upload */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cover Photo</label>
                  <div className="relative h-20 w-full rounded-xl bg-slate-800 border border-slate-700 overflow-hidden mb-2">
                    <img
                      src={editCover || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80'}
                      alt="Cover Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <input
                    type="file"
                    ref={coverFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, setEditCover)}
                  />
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold rounded-lg text-slate-200 flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Mag-upload ng Bagong Cover</span>
                  </button>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Bio / Tungkol sa Iyo (Max: 300 chars)</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={3}
                    maxLength={300}
                    placeholder="Isulat ang maikling pagpapakilala o paboritong quote..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl"
                  >
                    Kanselahin
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                  >
                    {savingProfile && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    <span>I-save ang Profile</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* CREATE / EDIT ALBUM MODAL */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isAlbumModalOpen && (
          <div
            id="album-form-submodal"
            className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsAlbumModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-cyan-400" />
                  <span>{editingAlbumId ? 'I-edit ang Album' : 'Gumawa ng Bagong Album'}</span>
                </h3>
                <button onClick={() => setIsAlbumModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAlbum} className="space-y-4">
                {/* Album Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pamagat ng Album (Title) *</label>
                  <input
                    type="text"
                    required
                    value={albumTitle}
                    onChange={(e) => setAlbumTitle(e.target.value)}
                    placeholder="hal. Boracay Trip 2026, My GCash Proofs, Pamilya"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Deskripsyon (Opsyonal)</label>
                  <textarea
                    value={albumDescription}
                    onChange={(e) => setAlbumDescription(e.target.value)}
                    rows={2}
                    placeholder="Tungkol saan ang album na ito..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Privacy Choice (Public vs Only Me) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Privacy ng Album</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAlbumPrivacy('public')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                        albumPrivacy === 'public'
                          ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Globe className="w-5 h-5 shrink-0 mt-0.5 text-cyan-400" />
                      <div>
                        <span className="block text-xs font-bold text-white">Pampubliko</span>
                        <span className="text-[10px] text-slate-400">Makikita ng lahat ng users sa Z-one</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAlbumPrivacy('only_me')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                        albumPrivacy === 'only_me'
                          ? 'bg-rose-950/40 border-rose-500 text-rose-300 shadow-md shadow-rose-500/10'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Lock className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                      <div>
                        <span className="block text-xs font-bold text-white">Only Me (Pribado)</span>
                        <span className="text-[10px] text-slate-400">Ikaw lang ang may access</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Cover Photo (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cover Photo ng Album (Opsyonal)</label>
                  {albumCoverPhoto && (
                    <div className="relative h-20 w-full rounded-xl bg-slate-800 border border-slate-700 overflow-hidden mb-2">
                      <img src={albumCoverPhoto} alt="Cover Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, setAlbumCoverPhoto)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold rounded-lg text-slate-200 flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pumili ng Cover Image</span>
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAlbumModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl"
                  >
                    Kanselahin
                  </button>
                  <button
                    type="submit"
                    disabled={savingAlbum}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                  >
                    {savingAlbum && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    <span>{editingAlbumId ? 'I-save ang Pagbabago' : 'Likhain ang Album'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* ADD PHOTO TO ALBUM MODAL */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isAddPhotoModalOpen && (
          <div
            id="add-photo-submodal"
            className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsAddPhotoModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-cyan-400" />
                  <span>Magdagdag ng Photo sa "{selectedAlbum?.title}"</span>
                </h3>
                <button onClick={() => setIsAddPhotoModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {photoUploadError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-xs mb-4">
                  {photoUploadError}
                </div>
              )}

              <form onSubmit={handleAddPhoto} className="space-y-4">
                {/* Photo Preview / Upload Area */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Litrato (Photo) *</label>
                  {photoUrl ? (
                    <div className="relative h-44 w-full rounded-xl bg-slate-800 border border-slate-700 overflow-hidden mb-2">
                      <img src={photoUrl} alt="Upload Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => albumPhotoInputRef.current?.click()}
                      className="h-36 w-full border-2 border-dashed border-slate-700 hover:border-cyan-500 bg-slate-800/40 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all gap-2"
                    >
                      <Camera className="w-8 h-8 text-cyan-400" />
                      <p className="text-xs text-slate-300 font-semibold">I-click upang mag-upload ng litrato</p>
                      <p className="text-[10px] text-slate-500">PNG, JPG, WebP hanggang 15MB</p>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={albumPhotoInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, setPhotoUrl)}
                  />
                </div>

                {/* Caption */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Caption o Paglalarawan (Opsyonal)</label>
                  <input
                    type="text"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    placeholder="Maglagay ng caption..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Privacy Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Privacy ng Litrato</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPhotoPrivacy('public')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2 transition-all ${
                        photoPrivacy === 'public'
                          ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Globe className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
                      <div>
                        <span className="block text-xs font-bold text-white">Public</span>
                        <span className="text-[10px] text-slate-400">Pampubliko</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPhotoPrivacy('only_me')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2 transition-all ${
                        photoPrivacy === 'only_me'
                          ? 'bg-rose-950/40 border-rose-500 text-rose-300 shadow-md shadow-rose-500/10'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Lock className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                      <div>
                        <span className="block text-xs font-bold text-white">Only Me</span>
                        <span className="text-[10px] text-slate-400">Pribado</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddPhotoModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl"
                  >
                    Kanselahin
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingPhoto || !photoUrl}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {uploadingPhoto && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    <span>I-upload sa Album</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📊 CREATOR ANALYTICS DASHBOARD MODAL */}
      {isAnalyticsOpen && (
        <CreatorAnalyticsDashboard
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
          token={currentUserId || ''}
          currentUserId={currentUserId || ''}
          currentUserName={currentUserName || 'Creator'}
          targetUserId={userId}
          onNavigateToShop={() => {
            setIsAnalyticsOpen(false);
            onClose();
            onNavigateToShop?.();
          }}
          onNavigateToReel={(reelId) => {
            setIsAnalyticsOpen(false);
            onClose();
            onPlayReel?.(reelId);
          }}
          onNavigateToChallenge={(chId) => {
            setIsAnalyticsOpen(false);
            onClose();
            onViewChallenge?.(chId);
          }}
        />
      )}
    </div>
  );
};
