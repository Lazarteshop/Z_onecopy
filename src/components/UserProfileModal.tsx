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
  AlertCircle
} from 'lucide-react';
import { UserAlbum, UserPhoto, UserProfileInfo } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentUserId?: string;
  currentUserName?: string;
  onStartDM?: (targetUserId: string, targetUserName: string, targetUserAvatar?: string) => void;
  onProfileUpdated?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  currentUserId,
  currentUserName,
  onStartDM,
  onProfileUpdated
}) => {
  const [profile, setProfile] = useState<UserProfileInfo & { albums?: UserAlbum[]; posts?: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'albums' | 'posts'>('albums');
  const [selectedAlbum, setSelectedAlbum] = useState<UserAlbum | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<UserPhoto | null>(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
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
        headers: currentUserId ? { Authorization: currentUserId } : {}
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
          Authorization: currentUserId
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
          Authorization: currentUserId
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
        headers: { Authorization: currentUserId }
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
          Authorization: currentUserId
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
        headers: { Authorization: currentUserId }
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
          Authorization: currentUserId
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
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Miyembro mula {new Date(profile.createdAt || Date.now()).toLocaleDateString('fil-PH', { month: 'short', year: 'numeric' })}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions (Message / Edit Profile) */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {!isOwner ? (
                      <button
                        id="profile-dm-btn"
                        onClick={() => {
                          if (onStartDM) {
                            onStartDM(profile.id, profile.name, profile.avatar);
                            onClose();
                          }
                        }}
                        className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>I-message</span>
                      </button>
                    ) : (
                      <button
                        id="edit-profile-trigger-btn"
                        onClick={() => setIsEditingProfile(true)}
                        className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>I-edit ang Profile</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5 mb-4">
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {profile.bio || 'Wala pang bio ang user na ito.'}
                  </p>
                </div>

                {/* Stats Summary Bar */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-center mb-5">
                  <div>
                    <span className="block text-lg font-black text-white">{profile.postCount || 0}</span>
                    <span className="text-xs text-slate-400 font-medium">Mga Post</span>
                  </div>
                  <div>
                    <span className="block text-lg font-black text-cyan-400">{profile.albumCount || (profile.albums ? profile.albums.length : 0)}</span>
                    <span className="text-xs text-slate-400 font-medium">Mga Album</span>
                  </div>
                  <div>
                    <span className="block text-lg font-black text-indigo-400">{(profile as any).photoCount || 0}</span>
                    <span className="text-xs text-slate-400 font-medium">Mga Litrato</span>
                  </div>
                </div>

                {/* Profile Tabs */}
                <div className="flex border-b border-slate-800 mb-4">
                  <button
                    id="tab-albums-btn"
                    onClick={() => {
                      setActiveTab('albums');
                      setSelectedAlbum(null);
                    }}
                    className={`flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                      activeTab === 'albums'
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Mga Album & Photos ({profile.albumCount || (profile.albums ? profile.albums.length : 0)})</span>
                  </button>
                  <button
                    id="tab-posts-btn"
                    onClick={() => {
                      setActiveTab('posts');
                      setSelectedAlbum(null);
                    }}
                    className={`flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                      activeTab === 'posts'
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Mga Post ({profile.postCount || 0})</span>
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
              </div>
            </div>
          )}
        </div>
      </motion.div>

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
    </div>
  );
};
