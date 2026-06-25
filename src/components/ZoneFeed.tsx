import React, { useState, useEffect } from 'react';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  PlusCircle, 
  Camera, 
  Tv, 
  Users, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Ban, 
  ThumbsUp, 
  Send,
  Flag,
  UserCheck,
  Upload
} from 'lucide-react';
import { ZonePost } from '../types';

interface ZoneFeedProps {
  token: string;
  user: {
    id: string;
    name: string;
    avatar: string;
    isAdmin: boolean;
    zonedUsers?: string[];
  };
  triggerNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshProfile: () => void;
  language: 'en' | 'tl';
}

const PRESET_PHOTOS = [
  { url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=60', label: '💻 Work & Earning' },
  { url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&auto=format&fit=crop&q=60', label: '💰 GCash Cash & Coins' },
  { url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=60', label: '🎮 Gaming Vibes' },
  { url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=60', label: '🔥 Success & Growth' },
  { url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=60', label: '🎉 Celebration Feed' },
];

const PRESET_VIDEOS = [
  { url: 'https://assets.mixkit.co/videos/preview/mixkit-holding-a-smartphone-with-a-green-screen-34440-large.mp4', label: '📱 GCash Clicking Loop' },
  { url: 'https://assets.mixkit.co/videos/preview/mixkit-hand-holding-smartphone-with-charts-on-screen-34442-large.mp4', label: '📊 Earnings Dashboard' }
];

export default function ZoneFeed({ token, user, triggerNotification, onRefreshProfile, language }: ZoneFeedProps) {
  const [posts, setPosts] = useState<ZonePost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // New Post state
  const [postText, setPostText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [customMediaUrl, setCustomMediaUrl] = useState('');
  const [showMediaSelect, setShowMediaSelect] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [isUploadingLocalFile, setIsUploadingLocalFile] = useState(false);

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (e.g., 25MB)
    if (file.size > 25 * 1024 * 1024) {
      triggerNotification(
        language === 'tl' 
          ? 'Ang file ay masyadong malaki. Mangyaring gumamit ng file na mas maliit sa 25MB.' 
          : 'File is too large. Please use a file smaller than 25MB.',
        'error'
      );
      return;
    }

    setIsUploadingLocalFile(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      if (file.type.startsWith('image/')) {
        setSelectedPhoto(dataUrl);
        setSelectedVideo(null);
        setCustomMediaUrl('');
      } else if (file.type.startsWith('video/')) {
        setSelectedVideo(dataUrl);
        setSelectedPhoto(null);
        setCustomMediaUrl('');
      } else {
        triggerNotification(
          language === 'tl' 
            ? 'Format ng file ay hindi suportado. Larawan o video lamang.' 
            : 'Unsupported file format. Images and videos only.',
          'error'
        );
      }
      setIsUploadingLocalFile(false);
    };
    reader.onerror = () => {
      triggerNotification(
        language === 'tl' ? 'Failed basahin ang file.' : 'Failed to read file.',
        'error'
      );
      setIsUploadingLocalFile(false);
    };
    reader.readAsDataURL(file);
  };

  // Comment state per post ID
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingCommentId, setSubmittingCommentId] = useState<string | null>(null);

  // Moderation tab / list for admin
  const [modUsers, setModUsers] = useState<any[]>([]);
  const [showModPanel, setShowModPanel] = useState(false);
  const [loadingModUsers, setLoadingModUsers] = useState(false);

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch('/api/zone/posts', {
        headers: {
          'Authorization': token
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to load posts', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchModUsers = async () => {
    if (!user.isAdmin) return;
    setLoadingModUsers(true);
    try {
      const res = await fetch('/api/admin/moderation/users', {
        headers: {
          'Authorization': token
        }
      });
      if (res.ok) {
        const data = await res.json();
        setModUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load moderation users', err);
    } finally {
      setLoadingModUsers(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    if (user.isAdmin) {
      fetchModUsers();
    }
  }, [token]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() && !selectedPhoto && !selectedVideo && !customMediaUrl) {
      triggerNotification(
        language === 'tl' ? 'Mag-type ng mensahe o pumili ng media!' : 'Please type a message or select media!',
        'error'
      );
      return;
    }

    setIsSubmittingPost(true);
    let finalMediaUrl = customMediaUrl || selectedPhoto || selectedVideo || undefined;
    let finalMediaType: 'image' | 'video' | undefined = undefined;

    if (selectedPhoto || (customMediaUrl && !customMediaUrl.endsWith('.mp4'))) {
      finalMediaType = 'image';
    } else if (selectedVideo || (customMediaUrl && customMediaUrl.endsWith('.mp4'))) {
      finalMediaType = 'video';
    }

    try {
      const res = await fetch('/api/zone/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          text: postText,
          mediaUrl: finalMediaUrl,
          mediaType: finalMediaType
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerNotification(
          language === 'tl' ? 'Nai-post na sa Z-one! 🎉' : 'Successfully posted to Z-one! 🎉',
          'success'
        );
        setPostText('');
        setSelectedPhoto(null);
        setSelectedVideo(null);
        setCustomMediaUrl('');
        setShowMediaSelect(false);
        fetchPosts();
      } else {
        triggerNotification(data.error || 'Naglalaman ng bawal na salita.', 'error');
      }
    } catch (err) {
      triggerNotification('Koneksyon error sa pag-post.', 'error');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/zone/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': token
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Optimistically update likes in local state
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { ...p, likes: data.likes };
          }
          return p;
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostComment = async (postId: string) => {
    const commentText = commentInputs[postId];
    if (!commentText || !commentText.trim()) return;

    setSubmittingCommentId(postId);
    try {
      const res = await fetch(`/api/zone/posts/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ text: commentText })
      });

      const data = await res.json();
      if (res.ok) {
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { ...p, comments: data.comments };
          }
          return p;
        }));
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      } else {
        triggerNotification(data.error || 'Bawal na salita sa comment.', 'error');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingCommentId(null);
    }
  };

  const handleToggleZone = async (targetUserId: string) => {
    try {
      const res = await fetch(`/api/zone/users/${targetUserId}/toggle-zone`, {
        method: 'POST',
        headers: {
          'Authorization': token
        }
      });
      const data = await res.json();
      if (res.ok) {
        const msg = data.isZoned 
          ? (language === 'tl' ? 'Naka-Zone (Follow) ka na sa kanya!' : 'You zoned (followed) this user!')
          : (language === 'tl' ? 'Inalis sa Zone (Unfollowed) ang user.' : 'You unzoned this user.');
        
        triggerNotification(msg, 'success');
        onRefreshProfile();
      } else {
        triggerNotification(data.error || 'Hindi magawa ang action.', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBan = async (userIdToMod: string) => {
    try {
      const res = await fetch(`/api/admin/moderation/users/${userIdToMod}/toggle-ban`, {
        method: 'POST',
        headers: {
          'Authorization': token
        }
      });
      const data = await res.json();
      if (res.ok) {
        triggerNotification(data.message, 'success');
        fetchModUsers();
        fetchPosts(); // Refresh avatars/posts in case they were banned
      } else {
        triggerNotification(data.error || 'Moderation error.', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isUserZoned = (targetUserId: string) => {
    return user.zonedUsers?.includes(targetUserId);
  };

  return (
    <div id="z-one-container" className="space-y-6">
      
      {/* 👑 BRAND HEADER */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Users className="w-48 h-48 rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-white text-blue-700 font-black text-xs px-2.5 py-1 rounded-full uppercase tracking-widest shadow-xs">
                {language === 'tl' ? 'PANG-KAPWA FEED' : 'SOCIAL COMMUNITY'}
              </span>
              {user.isAdmin && (
                <span className="bg-rose-500 text-white font-black text-[10px] px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                  <Ban className="w-3 h-3" />
                  Moderator Mode
                </span>
              )}
            </div>
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <span>Z-one Social</span>
              <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
            </h2>
            <p className="text-xs text-blue-100 font-medium max-w-xl">
              {language === 'tl' 
                ? 'Ang opisyal na social gateway ng GCash Click-Earn! Mag-post ng iyong mga payouts, tagumpay, makipag-ugnayan sa ibang clickers, at I-Zone (Follow) ang bawat isa.' 
                : 'The official social hub of GCash Click-Earn! Post your payouts, success stories, interact with fellow clickers, and Zone (Follow) each other.'}
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            {user.isAdmin && (
              <button
                onClick={() => setShowModPanel(!showModPanel)}
                className={`font-black text-xs px-4 py-2.5 rounded-2xl cursor-pointer transition ${
                  showModPanel 
                    ? 'bg-rose-500 text-white shadow-inner' 
                    : 'bg-white text-rose-600 hover:bg-rose-50 shadow-xs'
                }`}
              >
                {showModPanel ? '❌ Close Moderator Panel' : '🛡️ Manage Banned Users'}
              </button>
            )}
            <button
              onClick={fetchPosts}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-4 py-2.5 rounded-2xl cursor-pointer transition flex items-center gap-1.5"
            >
              <Users className="w-4 h-4" />
              <span>{language === 'tl' ? 'I-Refresh ang Feed' : 'Refresh Feed'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ⚠️ SYSTEM WARNING BANNER */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="text-xs text-yellow-800 space-y-1 font-semibold leading-relaxed">
          <p>
            <strong>{language === 'tl' ? 'Alituntunin sa Z-one (Z-one Safety Rules):' : 'Z-one Safety Guidelines:'}</strong>
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>{language === 'tl' ? 'Bawal ang malalaswang larawan, nudes, at pornographic videos.' : 'Nude pictures, porn videos, or explicit content are strictly prohibited.'}</li>
            <li>{language === 'tl' ? 'Bawal ang mga mura, bastos na salita, o mapanirang posts.' : 'Profanity, toxic behavior, and swear words will be auto-filtered.'}</li>
            <li>{language === 'tl' ? 'Ang system ay may auto-moderator na nagbubura/humaharang ng posts. Ang mga lumabag ay maaaring i-ban ng Admin.' : 'The system auto-moderates and rejects posts violating rules. Violators will be banned by Administrators.'}</li>
          </ul>
        </div>
      </div>

      {/* 🛡️ ADMIN MODERATION PANEL */}
      <AnimatePresence>
        {showModPanel && user.isAdmin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 space-y-4 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-sm tracking-wider uppercase flex items-center gap-2 text-rose-400">
                <Ban className="w-5 h-5" />
                <span>Admin User Moderation Dashboard</span>
              </h3>
              <span className="text-[10px] bg-slate-800 px-2 py-1 rounded-full font-bold">
                {modUsers.length} Users Tracked
              </span>
            </div>

            {loadingModUsers ? (
              <div className="text-center py-6 text-slate-400 text-xs">Sini-sync ang listahan ng mamamayan...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-2">
                {modUsers.map((u) => (
                  <div key={u.id} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{u.avatar || '👤'}</span>
                      <div>
                        <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {u.isAdmin && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded font-black">Admin</span>}
                        </div>
                        <span className="text-[10px] text-slate-500 block font-mono">{u.email}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleBan(u.id)}
                      disabled={u.id === user.id}
                      className={`text-[10px] font-black px-3.5 py-2 rounded-xl cursor-pointer transition ${
                        u.isBanned 
                          ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30' 
                          : 'bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 disabled:opacity-30'
                      }`}
                    >
                      {u.isBanned ? '🟢 Unban User' : '🔴 Ban User'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: CREATE POST & QUICK PRESET GALLERY */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* CREATE POST FORM */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span>{language === 'tl' ? 'Gumawa ng Post' : 'Create a New Post'}</span>
            </h3>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="space-y-2">
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder={language === 'tl' ? 'Ano ang naiisip mo ngayon? Mag-bahagi ng payout...' : 'What is on your mind? Share your payout or achievements...'}
                  rows={4}
                  className="w-full border border-slate-200 rounded-2xl p-3 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium resize-none"
                />
              </div>

              {/* CHOSEN MEDIA PREVIEW */}
              {(selectedPhoto || selectedVideo || customMediaUrl) && (
                <div className="relative border border-slate-100 p-2 rounded-2xl bg-slate-50 space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Attached Media:</span>
                  {selectedPhoto && (
                    <img src={selectedPhoto} alt="Selected" className="w-full max-h-40 object-cover rounded-xl" />
                  )}
                  {selectedVideo && (
                    <video src={selectedVideo} controls className="w-full max-h-40 rounded-xl" />
                  )}
                  {customMediaUrl && (
                    <div className="text-[10px] font-mono font-bold text-blue-600 truncate bg-blue-50 p-2 rounded-lg">
                      🔗 {customMediaUrl}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPhoto(null);
                      setSelectedVideo(null);
                      setCustomMediaUrl('');
                    }}
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white p-1 rounded-full text-[10px] h-5 w-5 flex items-center justify-center font-black cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* MEDIA EXPANSION CONTROLS */}
              <div className="space-y-3">
                {/* File input for local phone gallery upload */}
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleLocalFileChange}
                  className="hidden"
                  id="local-media-upload"
                  disabled={isUploadingLocalFile}
                />
                <label
                  htmlFor="local-media-upload"
                  className="w-full border border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/20 p-2.5 rounded-2xl text-[11px] text-indigo-750 font-extrabold cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  {isUploadingLocalFile ? (
                    <span className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Upload className="w-4 h-4 text-indigo-600" />
                  )}
                  <span>
                    {isUploadingLocalFile 
                      ? (language === 'tl' ? 'Binabasa ang file...' : 'Reading file...') 
                      : (language === 'tl' ? 'Kumuha sa Phone Gallery (Upload)' : 'Choose from Phone Gallery (Upload)')}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowMediaSelect(!showMediaSelect)}
                  className="w-full border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 p-2.5 rounded-2xl text-[11px] text-slate-650 font-extrabold cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-4 h-4 text-emerald-500" />
                  <span>{language === 'tl' ? 'Pumili sa Presets (Larawan o Video)' : 'Select from Presets (Photo or Video)'}</span>
                </button>

                <AnimatePresence>
                  {showMediaSelect && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border border-slate-150 p-3 rounded-2xl bg-slate-50 space-y-3"
                    >
                      <div className="space-y-1.5">
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">📷 preset photos</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {PRESET_PHOTOS.map((ph, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSelectedPhoto(ph.url);
                                setSelectedVideo(null);
                                setCustomMediaUrl('');
                              }}
                              className={`p-1 border rounded-lg overflow-hidden transition ${
                                selectedPhoto === ph.url ? 'border-blue-600 bg-blue-100/40' : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                            >
                              <img src={ph.url} alt={ph.label} className="w-full h-10 object-cover rounded" />
                              <span className="text-[8px] font-black block mt-1 text-slate-600 text-center truncate">{ph.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5 border-t border-slate-200 pt-2.5">
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">🎥 preset videos</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {PRESET_VIDEOS.map((vi, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSelectedVideo(vi.url);
                                setSelectedPhoto(null);
                                setCustomMediaUrl('');
                              }}
                              className={`p-1.5 border rounded-lg transition ${
                                selectedVideo === vi.url ? 'border-indigo-600 bg-indigo-100/40' : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                            >
                              <span className="text-[9px] font-black block text-slate-750 text-center truncate flex items-center justify-center gap-1">
                                <Tv className="w-3 h-3 text-indigo-500 shrink-0" />
                                {vi.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1 border-t border-slate-200 pt-2.5">
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">🔗 custom url</span>
                        <input
                          type="text"
                          value={customMediaUrl}
                          onChange={(e) => {
                            setCustomMediaUrl(e.target.value);
                            setSelectedPhoto(null);
                            setSelectedVideo(null);
                          }}
                          placeholder="https://example.com/image.jpg"
                          className="w-full border border-slate-200 rounded-xl p-1.5 text-[10px] outline-none bg-white font-mono"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="submit"
                disabled={isSubmittingPost}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-3 rounded-2xl text-xs cursor-pointer shadow-md transition flex items-center justify-center gap-1.5"
              >
                {isSubmittingPost ? (
                  <span>Inilalathala...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{language === 'tl' ? 'I-Post sa Z-one' : 'Post to Z-one'}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* QUICK ZONE GUIDE */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h4 className="font-extrabold text-indigo-950 text-xs uppercase tracking-wider">
                Ano ang "I-Zone" (Follow)?
              </h4>
            </div>
            <p className="text-[11px] text-indigo-900 font-semibold leading-relaxed">
              {language === 'tl' 
                ? 'Ang "I-Zone" ay kapareho ng pag-follow sa Facebook. Kapag mo "I-Zone" ang isang clicker, ipinapakita nito ang iyong suporta. Makikita mo rin kung sino ang may pinakamaraming followers sa komunidad.'
                : 'To "I-Zone" someone is to follow them. Express community support and keep updated with top clickers by zoning their accounts!'}
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: RECENT FEED POSTS */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-950 text-xs tracking-wider uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
              <span>Mga Balita at Kwento (Z-one Live Feed)</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              {posts.length} Active Posts
            </span>
          </div>

          {loadingPosts ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 text-xs font-bold">
              Kinukuha ang pinakabagong posts sa Z-one...
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs font-bold space-y-1">
              <p>📭 Walang laman ang Z-one feed sa ngayon.</p>
              <p className="text-[10px] text-slate-450 font-normal">Maging kauna-unahang clicker na mag-post sa komunidad!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                const hasLiked = post.likes.includes(user.id);
                const isMyOwnPost = post.userId === user.id;
                const userZoned = isUserZoned(post.userId);

                return (
                  <motion.div
                    key={post.id}
                    layoutId={post.id}
                    className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden"
                  >
                    {/* Header */}
                    <div className="p-4 flex items-center justify-between gap-3 border-b border-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl leading-none shrink-0 select-none block">
                          {post.userAvatar && (post.userAvatar.startsWith('http') || post.userAvatar.startsWith('data:')) ? (
                            <img src={post.userAvatar} alt={post.userName} className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-3xl bg-slate-100 p-1 rounded-full">{post.userAvatar || '👤'}</span>
                          )}
                        </span>
                        <div>
                          <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                            <span>{post.userName}</span>
                            {post.userId === 'admin-rosco' && (
                              <span className="bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Admin</span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            {new Date(post.createdAt).toLocaleString('fil-PH', { hour12: true, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Zone (Follow) Toggle */}
                        {!isMyOwnPost && (
                          <button
                            onClick={() => handleToggleZone(post.userId)}
                            className={`text-[10px] font-black px-3 py-1.5 rounded-full cursor-pointer transition flex items-center gap-1 border ${
                              userZoned 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                : 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white shadow-xs'
                            }`}
                          >
                            {userZoned ? (
                              <>
                                <UserCheck className="w-3 h-3" />
                                <span>Zoned (Followed)</span>
                              </>
                            ) : (
                              <>
                                <Users className="w-3 h-3" />
                                <span>I-Zone (Follow)</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Admin delete/moderate button */}
                        {user.isAdmin && !isMyOwnPost && (
                          <button
                            onClick={() => handleToggleBan(post.userId)}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 p-1.5 rounded-lg text-[10px] font-black cursor-pointer flex items-center gap-1"
                            title="Ban user for rule violation"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ban User</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-3">
                      <p className="text-slate-800 text-xs font-semibold leading-relaxed whitespace-pre-wrap">
                        {post.text}
                      </p>

                      {/* Attached Media Render */}
                      {post.mediaUrl && post.mediaType === 'image' && (
                        <div className="rounded-2xl overflow-hidden border border-slate-100">
                          <img src={post.mediaUrl} alt="Post Attachment" className="w-full max-h-80 object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}

                      {post.mediaUrl && post.mediaType === 'video' && (
                        <div className="rounded-2xl overflow-hidden border border-slate-100">
                          <video src={post.mediaUrl} controls className="w-full max-h-80 object-cover" />
                        </div>
                      )}
                    </div>

                    {/* Likes & Comments Counters */}
                    <div className="px-4 py-2 border-t border-b border-slate-50 flex items-center justify-between text-[10px] text-slate-450 font-bold">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
                        <span>{post.likes.length} Likes</span>
                      </span>
                      <span>{post.comments?.length || 0} Comments</span>
                    </div>

                    {/* Interaction Actions */}
                    <div className="px-4 py-1.5 bg-slate-50/50 flex items-center justify-around gap-2 border-b border-slate-50">
                      <button
                        onClick={() => handleLikePost(post.id)}
                        className={`flex-1 py-2 rounded-xl text-xs font-black cursor-pointer transition flex items-center justify-center gap-1.5 ${
                          hasLiked 
                            ? 'text-rose-600 bg-rose-50' 
                            : 'text-slate-650 hover:bg-slate-100'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${hasLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
                        <span>{hasLiked ? 'Liked' : 'Like'}</span>
                      </button>

                      <button
                        onClick={() => {
                          // Focus comment box
                          const el = document.getElementById(`comment-input-${post.id}`);
                          el?.focus();
                        }}
                        className="flex-1 py-2 rounded-xl text-xs font-black text-slate-650 hover:bg-slate-100 cursor-pointer transition flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-4 h-4 text-slate-500" />
                        <span>Comment</span>
                      </button>
                    </div>

                    {/* Comments section */}
                    <div className="bg-slate-50/30 p-4 space-y-3">
                      
                      {/* Comment input form */}
                      <div className="flex gap-2">
                        <span className="text-xl shrink-0">
                          {user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:')) ? (
                            <img src={user.avatar} alt="Profile" className="w-7 h-7 rounded-full object-cover border border-slate-200 shadow-xs" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-xl shrink-0">{user.avatar || '👤'}</span>
                          )}
                        </span>
                        <div className="flex-1 flex gap-1 bg-white border border-slate-200 rounded-xl p-1 focus-within:ring-2 focus-within:ring-blue-500">
                          <input
                            type="text"
                            id={`comment-input-${post.id}`}
                            placeholder={language === 'tl' ? 'Sumulat ng komento...' : 'Write a comment...'}
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handlePostComment(post.id);
                            }}
                            className="flex-1 text-xs px-2 py-1 outline-none font-semibold text-slate-800"
                          />
                          <button
                            onClick={() => handlePostComment(post.id)}
                            disabled={submittingCommentId === post.id}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-1.5 rounded-lg cursor-pointer transition shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Comments list */}
                      {post.comments && post.comments.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          {post.comments.map((comm) => (
                            <div key={comm.id} className="flex gap-2.5 items-start">
                              <span className="text-lg shrink-0 block">
                                {comm.userAvatar && (comm.userAvatar.startsWith('http') || comm.userAvatar.startsWith('data:')) ? (
                                  <img src={comm.userAvatar} alt={comm.userName} className="w-6 h-6 rounded-full object-cover border border-slate-200 shadow-xs" referrerPolicy="no-referrer" />
                                ) : (
                                  <span className="text-lg bg-slate-100 p-0.5 rounded-full shrink-0">{comm.userAvatar || '👤'}</span>
                                )}
                              </span>
                              <div className="bg-slate-100 p-2.5 rounded-2xl flex-1 space-y-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-extrabold text-slate-900 text-[10px]">{comm.userName}</span>
                                  <span className="text-[8px] text-slate-400 font-mono">
                                    {new Date(comm.createdAt).toLocaleTimeString('fil-PH', { hour: 'numeric', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-slate-750 text-xs font-semibold leading-relaxed">
                                  {comm.text}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
