import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, X, Trash2, Eye, Heart, Flame, Smile, ThumbsUp, 
  Send, Sparkles, Image as ImageIcon, Video as VideoIcon, 
  Type, ChevronLeft, ChevronRight, Play, Pause, RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { ZoneStory, StoryViewerDetail } from '../types';

interface ZoneStoriesProps {
  user: {
    id: string;
    name: string;
    avatar: string;
    isAdmin?: boolean;
  };
  token: string;
  language: 'tl' | 'en';
  stories: ZoneStory[];
  onRefreshStories: () => void;
  triggerNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
  renderAvatar: (avatar: string, name: string, sizeClass?: string, textClass?: string, userId?: string) => React.ReactNode;
  onOpenDm?: (targetUser: { id: string; name: string; avatar: string }) => void;
}

const GRADIENT_PRESETS = [
  { id: 'indigo', name: 'Royal Indigo', value: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 50%, #7c3aed 100%)', color: '#ffffff' },
  { id: 'sunset', name: 'Sunset Glow', value: 'linear-gradient(135deg, #ea580c 0%, #db2777 50%, #7c3aed 100%)', color: '#ffffff' },
  { id: 'emerald', name: 'Emerald Forest', value: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0284c7 100%)', color: '#ffffff' },
  { id: 'midnight', name: 'Midnight Cyber', value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)', color: '#38bdf8' },
  { id: 'rose', name: 'Rose Petal', value: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 50%, #fb7185 100%)', color: '#ffffff' },
  { id: 'gold', name: 'Golden Coin', value: 'linear-gradient(135deg, #d97706 0%, #eab308 50%, #f59e0b 100%)', color: '#0f172a' },
  { id: 'ocean', name: 'Deep Ocean', value: 'linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #06b6d4 100%)', color: '#ffffff' }
];

const QUICK_REACTION_EMOJIS = ['❤️', '🔥', '😂', '👏', '😮', '🎉', '💰', '👍'];

export const ZoneStories: React.FC<ZoneStoriesProps> = ({
  user,
  token,
  language,
  stories,
  onRefreshStories,
  triggerNotification,
  renderAvatar,
  onOpenDm
}) => {
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeViewerStoryIndex, setActiveViewerStoryIndex] = useState<number | null>(null);
  const [showViewersListModal, setShowViewersListModal] = useState(false);

  // Create Story Form states
  const [createType, setCreateType] = useState<'text' | 'image' | 'video'>('text');
  const [storyText, setStoryText] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Story Viewer Playback states
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Helper to check if logged-in user has viewed a story
  const isStoryViewedByMe = (story: ZoneStory) => {
    return (story.viewers || []).includes(user.id) || story.userId === user.id;
  };

  // Sort stories: group by author or keep chronological with unviewed first
  const sortedStories = [...stories].sort((a, b) => {
    const aViewed = isStoryViewedByMe(a);
    const bViewed = isStoryViewedByMe(b);
    if (aViewed === bViewed) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return aViewed ? 1 : -1;
  });

  const activeStory = activeViewerStoryIndex !== null ? sortedStories[activeViewerStoryIndex] : null;

  // Track story view on backend when opened
  useEffect(() => {
    if (activeStory && activeStory.userId !== user.id && !activeStory.viewers?.includes(user.id)) {
      fetch(`/api/zone/stories/${activeStory.id}/view`, {
        method: 'POST',
        headers: { Authorization: token }
      }).then(() => {
        onRefreshStories();
      }).catch(() => {});
    }
  }, [activeStory?.id]);

  // Story Viewer Timer Progress
  useEffect(() => {
    if (activeViewerStoryIndex === null || isPaused || showViewersListModal) {
      return;
    }

    const duration = activeStory?.mediaType === 'video' ? 12000 : 6000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          // Advance to next story or close viewer
          if (activeViewerStoryIndex < sortedStories.length - 1) {
            setActiveViewerStoryIndex(activeViewerStoryIndex + 1);
            return 0;
          } else {
            setActiveViewerStoryIndex(null);
            return 0;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [activeViewerStoryIndex, isPaused, showViewersListModal, activeStory?.mediaType]);

  // Reset progress when slide changes
  useEffect(() => {
    setProgress(0);
    setReplyText('');
  }, [activeViewerStoryIndex]);

  // Navigation handlers for story viewer
  const handlePrevStory = () => {
    if (activeViewerStoryIndex !== null && activeViewerStoryIndex > 0) {
      setActiveViewerStoryIndex(activeViewerStoryIndex - 1);
      setProgress(0);
    }
  };

  const handleNextStory = () => {
    if (activeViewerStoryIndex !== null) {
      if (activeViewerStoryIndex < sortedStories.length - 1) {
        setActiveViewerStoryIndex(activeViewerStoryIndex + 1);
        setProgress(0);
      } else {
        setActiveViewerStoryIndex(null);
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeViewerStoryIndex === null) return;
      if (e.key === 'ArrowLeft') handlePrevStory();
      if (e.key === 'ArrowRight') handleNextStory();
      if (e.key === 'Escape') setActiveViewerStoryIndex(null);
      if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeViewerStoryIndex]);

  // Handle Media Picker for Create Story
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    if (file.type.startsWith('video/')) {
      setCreateType('video');
    } else {
      setCreateType('image');
    }

    const reader = new FileReader();
    reader.onload = () => {
      setMediaPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit New Story
  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createType === 'text' && !storyText.trim()) {
      triggerNotification(
        language === 'tl' ? 'Mangyaring maglagay ng mensahe o salita sa iyong Story.' : 'Please enter text for your story.',
        'error'
      );
      return;
    }
    if ((createType === 'image' || createType === 'video') && !mediaPreviewUrl) {
      triggerNotification(
        language === 'tl' ? 'Mangyaring pumili ng litrato o video mula sa iyong gallery.' : 'Please select a photo or video.',
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      let finalMediaUrl = mediaPreviewUrl;

      // Upload media if present
      if (mediaPreviewUrl && mediaPreviewUrl.startsWith('data:')) {
        const uploadRes = await fetch('/api/zone/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token
          },
          body: JSON.stringify({ dataUrl: mediaPreviewUrl })
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalMediaUrl = uploadData.url;
        }
      }

      const res = await fetch('/api/zone/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: JSON.stringify({
          mediaType: createType,
          mediaUrl: createType === 'text' ? undefined : finalMediaUrl,
          text: createType === 'text' ? storyText : undefined,
          backgroundColor: createType === 'text' ? selectedGradient.value : undefined,
          textColor: createType === 'text' ? selectedGradient.color : undefined,
          caption: (createType !== 'text' && captionText.trim()) ? captionText.trim() : undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerNotification(
          language === 'tl' ? 'Matagumpay na nai-post ang iyong My Day / Story! 🎉' : 'Story posted successfully! 🎉',
          'success'
        );
        setShowCreateModal(false);
        setStoryText('');
        setCaptionText('');
        setMediaFile(null);
        setMediaPreviewUrl(null);
        setCreateType('text');
        onRefreshStories();
      } else {
        triggerNotification(data.error || 'Failed to create story', 'error');
      }
    } catch (err) {
      console.error('Error posting story:', err);
      triggerNotification(
        language === 'tl' ? 'Koneksyon error sa pag-post ng Story.' : 'Connection error posting story.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Story
  const handleDeleteStory = async (storyId: string) => {
    if (!window.confirm(language === 'tl' ? 'Sigurado ka bang gusto mong burahin ang Story na ito?' : 'Are you sure you want to delete this story?')) {
      return;
    }
    try {
      const res = await fetch(`/api/zone/stories/${storyId}`, {
        method: 'DELETE',
        headers: { Authorization: token }
      });
      if (res.ok) {
        triggerNotification(
          language === 'tl' ? 'Na-delete na ang Story!' : 'Story deleted successfully!',
          'info'
        );
        setActiveViewerStoryIndex(null);
        onRefreshStories();
      }
    } catch (err) {
      console.error('Error deleting story:', err);
    }
  };

  // Send Reaction or Reply
  const handleSendReaction = async (emoji: string) => {
    if (!activeStory) return;
    try {
      await fetch(`/api/zone/stories/${activeStory.id}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: JSON.stringify({ emoji })
      });
      triggerNotification(
        language === 'tl' ? `Nagpadala ng reaksyon: ${emoji}` : `Sent reaction: ${emoji}`,
        'success'
      );
      onRefreshStories();
    } catch (err) {
      console.error('Error reacting to story:', err);
    }
  };

  // Send Direct Message Reply to Story
  const handleSendStoryReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStory || !replyText.trim()) return;

    setIsSendingReply(true);
    try {
      const res = await fetch(`/api/zone/stories/${activeStory.id}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: JSON.stringify({
          emoji: '💬',
          replyMessage: replyText.trim()
        })
      });

      if (res.ok) {
        triggerNotification(
          language === 'tl' ? `Naipadala ang tugon kay ${activeStory.userName}! 💬` : `Reply sent to ${activeStory.userName}! 💬`,
          'success'
        );
        setReplyText('');
        onRefreshStories();
      }
    } catch (err) {
      console.error('Error sending story reply:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Format relative timestamp
  const formatStoryTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return language === 'tl' ? 'Kani-kanina lang' : 'Just now';
    if (mins < 60) return language === 'tl' ? `${mins}m ang nakalipas` : `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return language === 'tl' ? `${hours}o ang nakalipas` : `${hours}h ago`;
  };

  const myStories = sortedStories.filter(s => s.userId === user.id);
  const otherStories = sortedStories.filter(s => s.userId !== user.id);

  return (
    <div className="w-full mb-4 select-none">
      {/* 🚀 STORIES HORIZONTAL CAROUSEL TRAY */}
      <div className="relative bg-white rounded-3xl p-3 sm:p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
            </span>
            <h3 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
              <span>{language === 'tl' ? 'Mga My Day at Kwento' : 'Stories & My Day'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                24h
              </span>
            </h3>
          </div>

          <button
            onClick={onRefreshStories}
            className="text-[11px] font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition p-1 rounded-lg hover:bg-indigo-50"
            title={language === 'tl' ? 'I-refresh ang mga kwento' : 'Refresh stories'}
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* Horizontal Carousel */}
        <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-1.5 pt-0.5 px-0.5 no-scrollbar scroll-smooth">
          {/* ➕ "ADD TO STORY" CARD */}
          <div
            onClick={() => setShowCreateModal(true)}
            className="group relative flex-shrink-0 w-24 sm:w-28 h-36 sm:h-44 rounded-2xl overflow-hidden cursor-pointer border border-indigo-200/80 bg-gradient-to-b from-indigo-50/50 via-white to-indigo-100/50 hover:shadow-md transition duration-200 flex flex-col justify-between"
          >
            {/* Top Avatar Box */}
            <div className="h-[65%] w-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition duration-300">
              <div className="opacity-90 scale-110">
                {renderAvatar(user.avatar, user.name, "w-14 h-14", "text-2xl", user.id)}
              </div>
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition" />
            </div>

            {/* Floating Plus Badge */}
            <div className="absolute top-[56%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center border-2 border-white shadow-md group-hover:scale-110 group-hover:bg-indigo-700 transition">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>

            {/* Bottom Label */}
            <div className="h-[35%] w-full pt-4 pb-2 px-1 text-center flex flex-col justify-center bg-white">
              <span className="text-[10px] sm:text-[11px] font-black text-slate-800 leading-tight">
                {language === 'tl' ? 'Magdagdag' : 'Add Story'}
              </span>
              <span className="text-[8.5px] font-bold text-indigo-600">
                {language === 'tl' ? 'sa My Day' : 'to Story'}
              </span>
            </div>
          </div>

          {/* ACTIVE STORIES CARDS */}
          {sortedStories.map((story, index) => {
            const isMe = story.userId === user.id;
            const viewed = isStoryViewedByMe(story);

            return (
              <motion.div
                key={story.id}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setActiveViewerStoryIndex(index);
                  setProgress(0);
                }}
                className={`relative flex-shrink-0 w-24 sm:w-28 h-36 sm:h-44 rounded-2xl overflow-hidden cursor-pointer shadow-2xs hover:shadow-md transition duration-200 flex flex-col justify-between p-2 sm:p-2.5 ${
                  viewed
                    ? 'ring-1 ring-slate-200'
                    : 'ring-2 ring-indigo-500 shadow-indigo-100'
                }`}
                style={{
                  background: story.mediaType === 'text' 
                    ? (story.backgroundColor || 'linear-gradient(135deg, #3730a3, #4f46e5)')
                    : '#0f172a'
                }}
              >
                {/* Media Background if Image or Video */}
                {story.mediaType === 'image' && story.mediaUrl && (
                  <img
                    src={story.mediaUrl}
                    alt={story.userName}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                )}

                {story.mediaType === 'video' && story.mediaUrl && (
                  <div className="absolute inset-0 w-full h-full bg-slate-900">
                    <video
                      src={story.mediaUrl}
                      className="w-full h-full object-cover opacity-80"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-xs flex items-center justify-center text-white">
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </span>
                    </div>
                  </div>
                )}

                {/* Dark Gradient Overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 pointer-events-none" />

                {/* Top User Avatar with Unviewed Glow Ring */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className={`rounded-full p-0.5 ${
                    viewed ? 'bg-slate-300/80' : 'bg-gradient-to-tr from-pink-500 via-indigo-500 to-blue-400 p-[2px] shadow-sm animate-pulse'
                  }`}>
                    <span className="block ring-1 ring-white rounded-full">
                      {renderAvatar(story.userAvatar, story.userName, "w-7 h-7 sm:w-8 sm:h-8", "text-xs", story.userId)}
                    </span>
                  </div>

                  {story.mediaType === 'video' && (
                    <span className="p-1 bg-black/40 backdrop-blur-xs rounded-lg text-white">
                      <VideoIcon className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {/* Text excerpt for text stories */}
                {story.mediaType === 'text' && story.text && (
                  <div className="relative z-10 my-auto text-center px-1">
                    <p 
                      className="text-[10px] sm:text-xs font-black line-clamp-3 leading-snug drop-shadow-sm"
                      style={{ color: story.textColor || '#ffffff' }}
                    >
                      {story.text}
                    </p>
                  </div>
                )}

                {/* Bottom Story Author Name */}
                <div className="relative z-10 text-left">
                  <p className="text-[10px] sm:text-[11px] font-black text-white truncate drop-shadow-md leading-tight">
                    {isMe ? (language === 'tl' ? 'Iyong Story' : 'Your Story') : story.userName.split(' ')[0]}
                  </p>
                  <p className="text-[8px] font-bold text-white/80 drop-shadow-sm leading-none mt-0.5">
                    {formatStoryTime(story.createdAt)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 📝 CREATE STORY ("MY DAY") MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] text-slate-800"
            >
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-white/20 rounded-xl">
                    <Sparkles className="w-5 h-5 text-white" />
                  </span>
                  <div>
                    <h3 className="font-black text-white text-sm">
                      {language === 'tl' ? 'Gumawa ng My Day / Story' : 'Create Story / My Day'}
                    </h3>
                    <p className="text-[10px] text-indigo-100 font-medium">
                      {language === 'tl' ? 'Makikita ng mga Ka-Zone sa loob ng 24 oras' : 'Visible to Ka-Zone friends for 24 hours'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Story Mode Selector Tabs */}
              <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreateType('text');
                    setMediaPreviewUrl(null);
                    setMediaFile(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    createType === 'text'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>{language === 'tl' ? 'Text / Salita' : 'Text Story'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreateType('image');
                    fileInputRef.current?.click();
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    createType === 'image'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{language === 'tl' ? 'Litrato / Larawan' : 'Photo'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreateType('video');
                    fileInputRef.current?.click();
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    createType === 'video'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <VideoIcon className="w-3.5 h-3.5" />
                  <span>{language === 'tl' ? 'Video' : 'Video'}</span>
                </button>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Form Content Body */}
              <form onSubmit={handleCreateStory} className="p-4 space-y-4 flex-1 overflow-y-auto">
                {/* 📝 TEXT STORY CANVAS PREVIEW */}
                {createType === 'text' && (
                  <div className="space-y-3">
                    <div
                      className="w-full h-56 rounded-2xl p-4 flex items-center justify-center text-center shadow-inner relative overflow-hidden transition-all duration-300"
                      style={{ background: selectedGradient.value }}
                    >
                      <textarea
                        value={storyText}
                        onChange={(e) => setStoryText(e.target.value)}
                        placeholder={language === 'tl' ? 'Isulat ang iyong iniisip o status dito...' : 'Start typing your thoughts or status...'}
                        className="w-full bg-transparent border-none text-center font-extrabold text-base sm:text-lg focus:outline-hidden resize-none placeholder-white/60 drop-shadow-md"
                        style={{ color: selectedGradient.color }}
                        rows={4}
                        maxLength={200}
                        autoFocus
                      />
                      <span className="absolute bottom-2 right-3 text-[10px] font-bold text-white/70">
                        {storyText.length}/200
                      </span>
                    </div>

                    {/* Gradient Themes Palette */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        {language === 'tl' ? 'Pumili ng Kulay / Gradient:' : 'Choose Background Style:'}
                      </label>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {GRADIENT_PRESETS.map(preset => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setSelectedGradient(preset)}
                            className={`w-9 h-9 rounded-xl flex-shrink-0 transition transform ${
                              selectedGradient.id === preset.id ? 'scale-110 ring-2 ring-indigo-600 ring-offset-2' : 'hover:scale-105 opacity-85'
                            }`}
                            style={{ background: preset.value }}
                            title={preset.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 🖼️ PHOTO / VIDEO PREVIEW */}
                {(createType === 'image' || createType === 'video') && (
                  <div className="space-y-3">
                    {mediaPreviewUrl ? (
                      <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-200">
                        {createType === 'image' ? (
                          <img
                            src={mediaPreviewUrl}
                            alt="Story Preview"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <video
                            src={mediaPreviewUrl}
                            controls
                            className="w-full h-full object-contain"
                          />
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setMediaPreviewUrl(null);
                            setMediaFile(null);
                            setCreateType('text');
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/60 hover:bg-red-600 text-white transition"
                          title="Remove media"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-44 border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl bg-indigo-50/50 flex flex-col items-center justify-center cursor-pointer p-4 transition group"
                      >
                        <span className="p-3 bg-white text-indigo-600 rounded-2xl shadow-xs group-hover:scale-110 transition mb-2">
                          <ImageIcon className="w-6 h-6" />
                        </span>
                        <p className="text-xs font-black text-slate-700">
                          {language === 'tl' ? 'Pumili ng Litrato o Video mula sa Gallery' : 'Click to Upload Photo or Video'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {language === 'tl' ? 'Sinusuportahan ang JPG, PNG, MP4, WebM' : 'Supports JPG, PNG, MP4, WebM'}
                        </p>
                      </div>
                    )}

                    {/* Caption Input */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                        {language === 'tl' ? 'Caption (Opsyonal):' : 'Caption (Optional):'}
                      </label>
                      <input
                        type="text"
                        value={captionText}
                        onChange={(e) => setCaptionText(e.target.value)}
                        placeholder={language === 'tl' ? 'Maglagay ng caption o mensahe...' : 'Add a caption...'}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 text-slate-800"
                        maxLength={120}
                      />
                    </div>
                  </div>
                )}

                {/* Submit / Share Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{language === 'tl' ? 'Ipinopost sa Story...' : 'Sharing to Story...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{language === 'tl' ? 'I-bahagi sa Story (My Day) 🚀' : 'Share to Story (My Day) 🚀'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📱 FULLSCREEN IMMERSIVE STORY VIEWER MODAL */}
      <AnimatePresence>
        {activeStory && (
          <div className="fixed inset-0 z-60 bg-black flex items-center justify-center overflow-hidden">
            {/* Story Card Viewport */}
            <div className="relative w-full h-full max-w-md bg-slate-950 flex flex-col justify-between overflow-hidden shadow-2xl">
              {/* Top Progress Multi-Bars */}
              <div className="absolute top-0 inset-x-0 z-30 p-3 pt-4 flex gap-1.5">
                {sortedStories.map((_, idx) => {
                  let barProgress = 0;
                  if (idx < (activeViewerStoryIndex || 0)) {
                    barProgress = 100;
                  } else if (idx === activeViewerStoryIndex) {
                    barProgress = progress;
                  }

                  return (
                    <div
                      key={idx}
                      className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-xs"
                    >
                      <div
                        className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                        style={{ width: `${barProgress}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Story Top Header Bar */}
              <div className="absolute top-6 inset-x-0 z-30 px-3 py-2 flex items-center justify-between text-white">
                <div className="flex items-center gap-2.5">
                  <span className="ring-2 ring-indigo-400 rounded-full select-none">
                    {renderAvatar(activeStory.userAvatar, activeStory.userName, "w-9 h-9", "text-sm", activeStory.userId)}
                  </span>
                  <div className="text-left">
                    <h4 className="font-extrabold text-white text-xs leading-tight flex items-center gap-1.5 drop-shadow-md">
                      <span>{activeStory.userName}</span>
                      {activeStory.userId === user.id && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-500 font-bold">
                          {language === 'tl' ? 'Ikaw' : 'You'}
                        </span>
                      )}
                    </h4>
                    <p className="text-[9px] text-white/80 font-semibold drop-shadow-sm">
                      {formatStoryTime(activeStory.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Play/Pause Button */}
                  <button
                    type="button"
                    onClick={() => setIsPaused(prev => !prev)}
                    className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition"
                  >
                    {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
                  </button>

                  {/* Delete Button (if author or admin) */}
                  {(activeStory.userId === user.id || user.isAdmin || user.id === 'admin-rosco') && (
                    <button
                      type="button"
                      onClick={() => handleDeleteStory(activeStory.id)}
                      className="p-2 rounded-xl bg-red-600/80 hover:bg-red-700 text-white backdrop-blur-xs transition"
                      title={language === 'tl' ? 'Burahin ang Story' : 'Delete Story'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setActiveViewerStoryIndex(null)}
                    className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 🌟 STORY CANVAS / MEDIA CONTENT */}
              <div 
                className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden"
                onMouseDown={() => setIsPaused(true)}
                onMouseUp={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
              >
                {/* TEXT STORY */}
                {activeStory.mediaType === 'text' && (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center p-8 text-center"
                    style={{ background: activeStory.backgroundColor || 'linear-gradient(135deg, #3730a3, #4f46e5)' }}
                  >
                    <p
                      className="font-black text-xl sm:text-2xl leading-relaxed max-w-sm drop-shadow-md select-none"
                      style={{ color: activeStory.textColor || '#ffffff' }}
                    >
                      {activeStory.text}
                    </p>
                  </div>
                )}

                {/* PHOTO STORY */}
                {activeStory.mediaType === 'image' && activeStory.mediaUrl && (
                  <div className="w-full h-full flex items-center justify-center bg-black relative">
                    <img
                      src={activeStory.mediaUrl}
                      alt={activeStory.userName}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                    {activeStory.caption && (
                      <div className="absolute bottom-20 inset-x-4 p-3 bg-black/60 backdrop-blur-md rounded-2xl text-center">
                        <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                          {activeStory.caption}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* VIDEO STORY */}
                {activeStory.mediaType === 'video' && activeStory.mediaUrl && (
                  <div className="w-full h-full flex items-center justify-center bg-black relative">
                    <video
                      ref={videoRef}
                      src={activeStory.mediaUrl}
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                    />
                    {activeStory.caption && (
                      <div className="absolute bottom-20 inset-x-4 p-3 bg-black/60 backdrop-blur-md rounded-2xl text-center">
                        <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                          {activeStory.caption}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAP NAVIGATION ZONES */}
                <div
                  onClick={handlePrevStory}
                  className="absolute inset-y-0 left-0 w-1/3 cursor-pointer z-20"
                  title="Previous Story"
                />
                <div
                  onClick={handleNextStory}
                  className="absolute inset-y-0 right-0 w-1/3 cursor-pointer z-20"
                  title="Next Story"
                />
              </div>

              {/* 💬 BOTTOM INTERACTION BAR */}
              <div className="relative z-30 p-3 bg-gradient-to-t from-black via-black/80 to-transparent space-y-2">
                {activeStory.userId === user.id ? (
                  /* Author View: Viewers counter */
                  <div className="flex items-center justify-between bg-white/10 backdrop-blur-md rounded-2xl p-2.5 px-4 text-white">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold">
                        {language === 'tl'
                          ? `Nakita ng ${activeStory.viewers?.length || 0} Ka-Zone`
                          : `Viewed by ${activeStory.viewers?.length || 0} people`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowViewersListModal(true)}
                      className="text-xs font-black text-indigo-300 hover:text-white underline cursor-pointer"
                    >
                      {language === 'tl' ? 'Tingnan Lahat' : 'See Viewers'}
                    </button>
                  </div>
                ) : (
                  /* Viewer View: Quick Reactions & DM Reply */
                  <div className="space-y-2">
                    {/* Quick Reactions */}
                    <div className="flex items-center justify-around px-2">
                      {QUICK_REACTION_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleSendReaction(emoji)}
                          className="text-xl sm:text-2xl hover:scale-125 active:scale-95 transition transform p-1"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    {/* Reply Input Form */}
                    <form onSubmit={handleSendStoryReply} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={language === 'tl' ? `Magpadala ng mensahe kay ${activeStory.userName.split(' ')[0]}...` : `Reply to ${activeStory.userName.split(' ')[0]}...`}
                        className="flex-1 px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl text-xs font-semibold text-white placeholder-white/60 focus:outline-hidden focus:ring-2 focus:ring-white"
                      />
                      <button
                        type="submit"
                        disabled={!replyText.trim() || isSendingReply}
                        className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-40"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* 👁️ VIEWERS LIST POPUP MODAL */}
            <AnimatePresence>
              {showViewersListModal && (
                <div className="fixed inset-0 z-70 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs">
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-4 shadow-2xl text-slate-800 max-h-[70vh] flex flex-col"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-indigo-600" />
                        <h4 className="font-black text-sm text-slate-800">
                          {language === 'tl' ? 'Mga Nakakita sa Story' : 'Story Viewers'} ({activeStory.viewerDetails?.length || 0})
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowViewersListModal(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto py-2 space-y-2">
                      {!activeStory.viewerDetails || activeStory.viewerDetails.length === 0 ? (
                        <p className="text-center py-6 text-xs text-slate-400 font-semibold">
                          {language === 'tl' ? 'Wala pang nakakakita sa iyong Story.' : 'No viewers yet.'}
                        </p>
                      ) : (
                        activeStory.viewerDetails.map(viewer => {
                          const reaction = activeStory.reactions?.find(r => r.userId === viewer.id);
                          return (
                            <div
                              key={viewer.id}
                              className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50"
                            >
                              <div className="flex items-center gap-2.5">
                                {renderAvatar(viewer.avatar, viewer.name, "w-8 h-8", "text-xs", viewer.id)}
                                <div>
                                  <p className="text-xs font-black text-slate-800 leading-tight">
                                    {viewer.name}
                                  </p>
                                  <p className="text-[9px] text-slate-400 font-semibold">
                                    {formatStoryTime(viewer.viewedAt)}
                                  </p>
                                </div>
                              </div>

                              {reaction && (
                                <span className="text-lg select-none">
                                  {reaction.emoji}
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
