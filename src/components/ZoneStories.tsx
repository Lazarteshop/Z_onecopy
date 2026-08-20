import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, X, Trash2, Eye, Heart, Flame, Smile, ThumbsUp, 
  Send, Sparkles, Image as ImageIcon, Video as VideoIcon, 
  Type, ChevronLeft, ChevronRight, Play, Pause, RefreshCw,
  CheckCircle2, Layers
} from 'lucide-react';
import { ZoneStory, StoryViewerDetail } from '../types';
import { dataSaver } from '../utils/dataSaver';

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

export interface UserStoryGroup {
  userId: string;
  userName: string;
  userAvatar: string;
  isMe: boolean;
  stories: ZoneStory[];
  allViewed: boolean;
  latestStory: ZoneStory;
  latestCreatedAt: string;
  unviewedCount: number;
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
  
  // Grouped viewer state
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [activeStoryIndexInGroup, setActiveStoryIndexInGroup] = useState<number>(0);
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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Helper to check if logged-in user has viewed a specific story
  const isStoryViewedByMe = (story: ZoneStory) => {
    return (story.viewers || []).includes(user.id) || story.userId === user.id;
  };

  // --- 🌟 GROUP STORIES BY USER & SORT WITH LOGGED-IN USER FIRST ---
  const storyGroups: UserStoryGroup[] = useMemo(() => {
    const map = new Map<string, ZoneStory[]>();
    
    stories.forEach(story => {
      if (!map.has(story.userId)) {
        map.set(story.userId, []);
      }
      map.get(story.userId)!.push(story);
    });

    const groups: UserStoryGroup[] = [];
    map.forEach((userStories, uid) => {
      // Sort stories chronologically (earliest to latest for watching sequentially)
      const sorted = [...userStories].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const latestStory = sorted[sorted.length - 1];
      const isMe = uid === user.id;
      const unviewedCount = sorted.filter(s => !isStoryViewedByMe(s)).length;
      const allViewed = isMe ? true : unviewedCount === 0;

      groups.push({
        userId: uid,
        userName: latestStory.userName || (isMe ? user.name : 'Ka-Zone User'),
        userAvatar: latestStory.userAvatar || (isMe ? user.avatar : '👤'),
        isMe,
        stories: sorted,
        allViewed,
        latestStory,
        latestCreatedAt: latestStory.createdAt,
        unviewedCount
      });
    });

    // Sort order:
    // 1. Current logged-in user ALWAYS comes first (isMe = true)
    // 2. Groups with unviewed stories (sorted by newest story)
    // 3. Groups with all viewed stories (sorted by newest story)
    return groups.sort((a, b) => {
      if (a.isMe && !b.isMe) return -1;
      if (!a.isMe && b.isMe) return 1;
      if (a.allViewed !== b.allViewed) {
        return a.allViewed ? 1 : -1;
      }
      return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime();
    });
  }, [stories, user.id, user.name, user.avatar]);

  // Current active group and story
  const activeGroup = activeGroupIndex !== null ? storyGroups[activeGroupIndex] : null;
  const activeStory = activeGroup ? activeGroup.stories[activeStoryIndexInGroup] : null;

  // Has current user posted any active story?
  const myGroup = useMemo(() => {
    return storyGroups.find(g => g.isMe) || null;
  }, [storyGroups]);

  // Other users' groups (excluding current user)
  const otherGroups = useMemo(() => {
    return storyGroups.filter(g => !g.isMe);
  }, [storyGroups]);

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

  // Handle open viewer for a user group
  const handleOpenGroupViewer = (groupIndex: number) => {
    const group = storyGroups[groupIndex];
    if (!group || group.stories.length === 0) return;

    // Find first unviewed story, or default to first story (0)
    const firstUnviewedIdx = group.stories.findIndex(s => !isStoryViewedByMe(s));
    const startIdx = firstUnviewedIdx !== -1 ? firstUnviewedIdx : 0;

    setActiveGroupIndex(groupIndex);
    setActiveStoryIndexInGroup(startIdx);
    setProgress(0);
  };

  // Story Viewer Timer Progress & Auto Advance
  useEffect(() => {
    if (activeGroupIndex === null || !activeGroup || !activeStory || isPaused || showViewersListModal) {
      return;
    }

    const duration = activeStory.mediaType === 'video' ? 12000 : 6000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          // Check if there is a next story in the current user's group
          if (activeStoryIndexInGroup < activeGroup.stories.length - 1) {
            setActiveStoryIndexInGroup(activeStoryIndexInGroup + 1);
            return 0;
          } else {
            // End of current user's stories -> advance to next user's group
            if (activeGroupIndex < storyGroups.length - 1) {
              const nextGroupIdx = activeGroupIndex + 1;
              setActiveGroupIndex(nextGroupIdx);
              setActiveStoryIndexInGroup(0);
              return 0;
            } else {
              // Reached end of all stories -> close viewer
              setActiveGroupIndex(null);
              return 0;
            }
          }
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [activeGroupIndex, activeStoryIndexInGroup, isPaused, showViewersListModal, activeStory?.id, activeStory?.mediaType, activeGroup?.stories.length, storyGroups.length]);

  // Reset progress when story index or group changes
  useEffect(() => {
    setProgress(0);
    setReplyText('');
  }, [activeGroupIndex, activeStoryIndexInGroup]);

  // Navigation handlers for story viewer
  const handlePrevStory = () => {
    if (activeGroupIndex === null || !activeGroup) return;

    if (activeStoryIndexInGroup > 0) {
      setActiveStoryIndexInGroup(activeStoryIndexInGroup - 1);
      setProgress(0);
    } else if (activeGroupIndex > 0) {
      // Go to previous user's last story
      const prevGroupIdx = activeGroupIndex - 1;
      const prevGroup = storyGroups[prevGroupIdx];
      setActiveGroupIndex(prevGroupIdx);
      setActiveStoryIndexInGroup(Math.max(0, prevGroup.stories.length - 1));
      setProgress(0);
    }
  };

  const handleNextStory = () => {
    if (activeGroupIndex === null || !activeGroup) return;

    if (activeStoryIndexInGroup < activeGroup.stories.length - 1) {
      setActiveStoryIndexInGroup(activeStoryIndexInGroup + 1);
      setProgress(0);
    } else if (activeGroupIndex < storyGroups.length - 1) {
      // Go to next user's first story
      setActiveGroupIndex(activeGroupIndex + 1);
      setActiveStoryIndexInGroup(0);
      setProgress(0);
    } else {
      // Reached the end
      setActiveGroupIndex(null);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeGroupIndex === null) return;
      if (e.key === 'ArrowLeft') handlePrevStory();
      if (e.key === 'ArrowRight') handleNextStory();
      if (e.key === 'Escape') setActiveGroupIndex(null);
      if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeGroupIndex, activeStoryIndexInGroup, activeGroup]);

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
          const uploadText = await uploadRes.text();
          try {
            const uploadData = JSON.parse(uploadText);
            finalMediaUrl = uploadData.url;
          } catch {
            // fallback
          }
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

      const resText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch {
        if (res.status === 413) {
          throw new Error('Masyadong malaki ang video/media file (Max 25MB). Mangyaring pumili ng mas maikling video.');
        }
        throw new Error('Pansamantalang nagka-error sa koneksyon. Subukan muli.');
      }

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
    } catch (err: any) {
      console.error('Error posting story:', err);
      triggerNotification(
        err?.message || (language === 'tl' ? 'Koneksyon error sa pag-post ng Story.' : 'Connection error posting story.'),
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
        
        // If current group has only 1 story, close viewer, else adjust index
        if (activeGroup && activeGroup.stories.length <= 1) {
          setActiveGroupIndex(null);
        } else if (activeStoryIndexInGroup > 0) {
          setActiveStoryIndexInGroup(activeStoryIndexInGroup - 1);
        }
        onRefreshStories();
      }
    } catch (err) {
      console.error('Error deleting story:', err);
    }
  };

  // Send Reaction
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

          <div className="flex items-center gap-2">
            {myGroup && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 hidden sm:inline-block">
                {language === 'tl' ? `May ${myGroup.stories.length} kang aktibong My Day` : `You have ${myGroup.stories.length} active story`}
              </span>
            )}
            <button
              onClick={onRefreshStories}
              className="text-[11px] font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition p-1 rounded-lg hover:bg-indigo-50"
              title={language === 'tl' ? 'I-refresh ang mga kwento' : 'Refresh stories'}
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Horizontal Carousel */}
        <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-1.5 pt-0.5 px-0.5 no-scrollbar scroll-smooth">
          
          {/* ========================================================================= */}
          {/* 🌟 1. LOGGED-IN USER'S CARD (UNA LAGING MAKIKITA NG MAY-ARI NG ACCOUNT) */}
          {/* ========================================================================= */}
          {myGroup ? (
            /* User HAS active stories -> Render user's story card as #1 with tap to view & (+) to add */
            <motion.div
              key="my-active-story-group"
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleOpenGroupViewer(0)}
              className="relative flex-shrink-0 w-24 sm:w-28 h-36 sm:h-44 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between p-2 sm:p-2.5 ring-2 ring-indigo-600 shadow-indigo-100"
              style={{
                background: myGroup.latestStory.mediaType === 'text' 
                  ? (myGroup.latestStory.backgroundColor || 'linear-gradient(135deg, #3730a3, #4f46e5)')
                  : '#0f172a'
              }}
            >
              {/* Media Background if Image or Video */}
              {myGroup.latestStory.mediaType === 'image' && myGroup.latestStory.mediaUrl && (
                <img
                  src={dataSaver.getOptimizedImageUrl(myGroup.latestStory.mediaUrl, { width: 280, quality: 50 })}
                  alt={myGroup.userName}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              )}

              {myGroup.latestStory.mediaType === 'video' && myGroup.latestStory.mediaUrl && (
                <div className="absolute inset-0 w-full h-full bg-slate-900">
                  {!dataSaver.isDataSaverActive() ? (
                    <video
                      src={myGroup.latestStory.mediaUrl}
                      className="w-full h-full object-cover opacity-80"
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-indigo-950 to-slate-900 opacity-90" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-xs flex items-center justify-center text-white">
                      <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                    </span>
                  </div>
                </div>
              )}

              {/* Dark Gradient Overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/75 pointer-events-none" />

              {/* Segmented Top Indicator Dots for multiple stories */}
              {myGroup.stories.length > 1 && (
                <div className="absolute top-1.5 inset-x-2 z-20 flex gap-1 pointer-events-none">
                  {myGroup.stories.map((_, dotIdx) => (
                    <div key={dotIdx} className="flex-1 h-0.5 bg-white/70 rounded-full" />
                  ))}
                </div>
              )}

              {/* Top User Avatar with Glowing Indigo Ring */}
              <div className="relative z-10 flex items-center justify-between mt-1">
                <div className="rounded-full p-[2px] bg-gradient-to-tr from-indigo-500 via-blue-500 to-emerald-400 shadow-sm animate-pulse">
                  <span className="block ring-1 ring-white rounded-full">
                    {renderAvatar(user.avatar, user.name, "w-7 h-7 sm:w-8 sm:h-8", "text-xs", user.id)}
                  </span>
                </div>

                {/* Quick Add Story (+) Overlay Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreateModal(true);
                  }}
                  className="w-6 h-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center border-2 border-white shadow-md transition transform active:scale-90"
                  title={language === 'tl' ? 'Magdagdag ng panibagong kwento' : 'Add another story'}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>

              {/* Text excerpt for text stories */}
              {myGroup.latestStory.mediaType === 'text' && myGroup.latestStory.text && (
                <div className="relative z-10 my-auto text-center px-1">
                  <p 
                    className="text-[10px] sm:text-xs font-black line-clamp-3 leading-snug drop-shadow-sm"
                    style={{ color: myGroup.latestStory.textColor || '#ffffff' }}
                  >
                    {myGroup.latestStory.text}
                  </p>
                </div>
              )}

              {/* Bottom Label & Story Count */}
              <div className="relative z-10 text-left">
                <div className="flex items-center gap-1">
                  <p className="text-[10px] sm:text-[11px] font-black text-white truncate drop-shadow-md leading-tight">
                    {language === 'tl' ? 'Iyong Story' : 'Your Story'}
                  </p>
                  {myGroup.stories.length > 1 && (
                    <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-white/20 backdrop-blur-xs text-white border border-white/30">
                      {myGroup.stories.length}
                    </span>
                  )}
                </div>
                <p className="text-[8px] font-bold text-indigo-200 drop-shadow-sm leading-none mt-0.5">
                  {formatStoryTime(myGroup.latestCreatedAt)}
                </p>
              </div>
            </motion.div>
          ) : (
            /* User HAS NO active stories -> Render Add to Story card as #1 */
            <div
              key="create-story-card"
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
          )}

          {/* ========================================================================= */}
          {/* 👥 2. OTHER USERS' GROUPED STORY CARDS (1 CARD PER USER) */}
          {/* ========================================================================= */}
          {otherGroups.map((group) => {
            // Find global index of this group in storyGroups
            const groupIndex = storyGroups.findIndex(g => g.userId === group.userId);
            const viewed = group.allViewed;

            return (
              <motion.div
                key={group.userId}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleOpenGroupViewer(groupIndex)}
                className={`relative flex-shrink-0 w-24 sm:w-28 h-36 sm:h-44 rounded-2xl overflow-hidden cursor-pointer shadow-2xs hover:shadow-md transition duration-200 flex flex-col justify-between p-2 sm:p-2.5 ${
                  viewed
                    ? 'ring-1 ring-slate-200'
                    : 'ring-2 ring-indigo-500 shadow-indigo-100'
                }`}
                style={{
                  background: group.latestStory.mediaType === 'text' 
                    ? (group.latestStory.backgroundColor || 'linear-gradient(135deg, #3730a3, #4f46e5)')
                    : '#0f172a'
                }}
              >
                {/* Media Background if Image or Video */}
                {group.latestStory.mediaType === 'image' && group.latestStory.mediaUrl && (
                  <img
                    src={dataSaver.getOptimizedImageUrl(group.latestStory.mediaUrl, { width: 280, quality: 50 })}
                    alt={group.userName}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                )}

                {group.latestStory.mediaType === 'video' && group.latestStory.mediaUrl && (
                  <div className="absolute inset-0 w-full h-full bg-slate-900">
                    {!dataSaver.isDataSaverActive() ? (
                      <video
                        src={group.latestStory.mediaUrl}
                        className="w-full h-full object-cover opacity-80"
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-b from-indigo-950 to-slate-900 opacity-90" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-xs flex items-center justify-center text-white">
                        <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                      </span>
                    </div>
                  </div>
                )}

                {/* Dark Gradient Overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/75 pointer-events-none" />

                {/* Segmented Top Indicator Dots for multiple stories */}
                {group.stories.length > 1 && (
                  <div className="absolute top-1.5 inset-x-2 z-20 flex gap-1 pointer-events-none">
                    {group.stories.map((s, dotIdx) => {
                      const isDotViewed = isStoryViewedByMe(s);
                      return (
                        <div 
                          key={dotIdx} 
                          className={`flex-1 h-0.5 rounded-full ${isDotViewed ? 'bg-white/40' : 'bg-indigo-400'}`} 
                        />
                      );
                    })}
                  </div>
                )}

                {/* Top User Avatar with Glow Ring */}
                <div className="relative z-10 flex items-center justify-between mt-1">
                  <div className={`rounded-full p-0.5 ${
                    viewed 
                      ? 'bg-slate-300/80' 
                      : 'bg-gradient-to-tr from-pink-500 via-indigo-500 to-blue-400 p-[2px] shadow-sm animate-pulse'
                  }`}>
                    <span className="block ring-1 ring-white rounded-full">
                      {renderAvatar(group.userAvatar, group.userName, "w-7 h-7 sm:w-8 sm:h-8", "text-xs", group.userId)}
                    </span>
                  </div>

                  {group.latestStory.mediaType === 'video' && (
                    <span className="p-1 bg-black/40 backdrop-blur-xs rounded-lg text-white">
                      <VideoIcon className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {/* Text excerpt for text stories */}
                {group.latestStory.mediaType === 'text' && group.latestStory.text && (
                  <div className="relative z-10 my-auto text-center px-1">
                    <p 
                      className="text-[10px] sm:text-xs font-black line-clamp-3 leading-snug drop-shadow-sm"
                      style={{ color: group.latestStory.textColor || '#ffffff' }}
                    >
                      {group.latestStory.text}
                    </p>
                  </div>
                )}

                {/* Bottom Story Author Name & Total Story Count */}
                <div className="relative z-10 text-left">
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] sm:text-[11px] font-black text-white truncate drop-shadow-md leading-tight">
                      {group.userName.split(' ')[0]}
                    </p>
                    {group.stories.length > 1 && (
                      <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-white/20 backdrop-blur-xs text-white border border-white/30">
                        {group.stories.length}
                      </span>
                    )}
                  </div>
                  <p className="text-[8px] font-bold text-white/80 drop-shadow-sm leading-none mt-0.5">
                    {formatStoryTime(group.latestCreatedAt)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📝 CREATE STORY ("MY DAY") MODAL */}
      {/* ========================================================================= */}
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
                  className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
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
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
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
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
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
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
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
                            className={`w-9 h-9 rounded-xl flex-shrink-0 transition transform cursor-pointer ${
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
                          className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/60 hover:bg-red-600 text-white transition cursor-pointer"
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

      {/* ========================================================================= */}
      {/* 📱 FULLSCREEN IMMERSIVE STORY VIEWER MODAL WITH SEQUENTIAL USER STORIES */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeGroup && activeStory && (
          <div className="fixed inset-0 z-60 bg-black flex items-center justify-center overflow-hidden">
            {/* Story Card Viewport */}
            <div className="relative w-full h-full max-w-md bg-slate-950 flex flex-col justify-between overflow-hidden shadow-2xl">
              
              {/* Top Progress Multi-Bars (Per Story belonging to the Active User) */}
              <div className="absolute top-0 inset-x-0 z-30 p-3 pt-4 flex gap-1.5">
                {activeGroup.stories.map((_, idx) => {
                  let barProgress = 0;
                  if (idx < activeStoryIndexInGroup) {
                    barProgress = 100;
                  } else if (idx === activeStoryIndexInGroup) {
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
                    {renderAvatar(activeGroup.userAvatar, activeGroup.userName, "w-9 h-9", "text-sm", activeGroup.userId)}
                  </span>
                  <div className="text-left">
                    <h4 className="font-extrabold text-white text-xs leading-tight flex items-center gap-1.5 drop-shadow-md">
                      <span>{activeGroup.userName}</span>
                      {activeGroup.isMe && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-500 font-bold">
                          {language === 'tl' ? 'Ikaw' : 'You'}
                        </span>
                      )}
                      {activeGroup.stories.length > 1 && (
                        <span className="text-[9px] text-indigo-200 font-mono">
                          ({activeStoryIndexInGroup + 1}/{activeGroup.stories.length})
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
                    className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition cursor-pointer"
                  >
                    {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
                  </button>

                  {/* Delete Button (if author or admin) */}
                  {(activeStory.userId === user.id || user.isAdmin || user.id === 'admin-rosco') && (
                    <button
                      type="button"
                      onClick={() => handleDeleteStory(activeStory.id)}
                      className="p-2 rounded-xl bg-red-600/80 hover:bg-red-700 text-white backdrop-blur-xs transition cursor-pointer"
                      title={language === 'tl' ? 'Burahin ang Story' : 'Delete Story'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setActiveGroupIndex(null)}
                    className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition cursor-pointer"
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
                          className="text-xl sm:text-2xl hover:scale-125 active:scale-95 transition transform p-1 cursor-pointer"
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
                        className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-40 cursor-pointer"
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
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
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
