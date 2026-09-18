import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ThumbsUp, X, Users } from 'lucide-react';
import { ReactionType, PostReactionRecord } from '../types';

export const REACTION_CONFIG: Record<
  ReactionType,
  { label: string; emoji: string; color: string; bg: string; activeColor: string }
> = {
  like: {
    label: 'Like',
    emoji: '👍',
    color: 'text-blue-600',
    bg: 'bg-blue-50 hover:bg-blue-100',
    activeColor: 'text-blue-600 bg-blue-50'
  },
  love: {
    label: 'Love',
    emoji: '❤️',
    color: 'text-rose-600',
    bg: 'bg-rose-50 hover:bg-rose-100',
    activeColor: 'text-rose-600 bg-rose-50'
  },
  care: {
    label: 'Care',
    emoji: '🥰',
    color: 'text-amber-600',
    bg: 'bg-amber-50 hover:bg-amber-100',
    activeColor: 'text-amber-600 bg-amber-50'
  },
  haha: {
    label: 'Haha',
    emoji: '😆',
    color: 'text-amber-500',
    bg: 'bg-yellow-50 hover:bg-yellow-100',
    activeColor: 'text-amber-500 bg-yellow-50'
  },
  wow: {
    label: 'Wow',
    emoji: '😮',
    color: 'text-purple-600',
    bg: 'bg-purple-50 hover:bg-purple-100',
    activeColor: 'text-purple-600 bg-purple-50'
  },
  sad: {
    label: 'Sad',
    emoji: '😢',
    color: 'text-blue-500',
    bg: 'bg-sky-50 hover:bg-sky-100',
    activeColor: 'text-blue-500 bg-sky-50'
  },
  angry: {
    label: 'Angry',
    emoji: '😡',
    color: 'text-rose-700',
    bg: 'bg-rose-100 hover:bg-rose-200',
    activeColor: 'text-rose-700 bg-rose-50'
  }
};

const ALL_REACTIONS: ReactionType[] = ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'];

interface PostReactionsBarProps {
  postId: string;
  userReaction?: ReactionType | null;
  hasLiked?: boolean;
  likesCount: number;
  reactions?: PostReactionRecord[];
  reactionCounts?: Record<ReactionType, number>;
  onReact: (reactionType: ReactionType) => void;
  token?: string;
  onViewProfile?: (userId: string) => void;
}

export const PostReactionsSummary: React.FC<{
  postId: string;
  likesCount: number;
  reactions?: PostReactionRecord[];
  reactionCounts?: Record<ReactionType, number>;
  onOpenBreakdown: () => void;
}> = ({ likesCount, reactions = [], reactionCounts = {} as Record<ReactionType, number>, onOpenBreakdown }) => {
  // Aggregate reaction counts from reactions array or reactionCounts
  const counts: Record<string, number> = { ...reactionCounts };
  if (!counts.like && likesCount > 0) {
    counts.like = likesCount;
  }

  // Find top reactions present
  const presentReactions = ALL_REACTIONS.filter(type => (counts[type] || 0) > 0).sort(
    (a, b) => (counts[b] || 0) - (counts[a] || 0)
  );

  const total = Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);
  const displayTotal = total > 0 ? total : likesCount;

  if (displayTotal === 0) return null;

  return (
    <button
      onClick={onOpenBreakdown}
      className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer group"
      title="Tingnan kung sino ang nag-react"
    >
      <div className="flex items-center -space-x-1.5">
        {presentReactions.length > 0 ? (
          presentReactions.slice(0, 3).map(type => (
            <span
              key={type}
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white shadow-sm border border-slate-100 text-xs text-center transform group-hover:scale-110 transition-transform"
            >
              {REACTION_CONFIG[type].emoji}
            </span>
          ))
        ) : (
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
        )}
      </div>
      <span className="text-[11px] text-slate-500 font-bold group-hover:text-blue-600 transition-colors">
        {displayTotal}
      </span>
    </button>
  );
};

export const PostReactionButton: React.FC<PostReactionsBarProps> = ({
  postId,
  userReaction,
  hasLiked,
  likesCount,
  reactions = [],
  reactionCounts = {} as Record<ReactionType, number>,
  onReact,
  onViewProfile
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const timerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setShowPicker(true);
    }, 280);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShowPicker(false);
    }, 350);
  };

  const handleDirectClick = () => {
    if (userReaction) {
      // Re-trigger current reaction or keep it
      onReact(userReaction);
    } else if (hasLiked) {
      onReact('like');
    } else {
      onReact('like');
    }
  };

  const currentType = userReaction || (hasLiked ? 'like' : null);
  const currentConfig = currentType ? REACTION_CONFIG[currentType] : null;

  return (
    <div
      ref={containerRef}
      className="relative flex-1"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Floating Reactions Bar Picker */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            className="absolute bottom-full left-0 mb-2 z-40 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-full shadow-2xl px-2 py-1.5 flex items-center gap-1.5"
          >
            {ALL_REACTIONS.map((type, idx) => {
              const cfg = REACTION_CONFIG[type];
              const isSelected = currentType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPicker(false);
                    onReact(type);
                  }}
                  className={`relative group p-1.5 rounded-full hover:bg-slate-100 transition-all transform hover:scale-135 active:scale-110 cursor-pointer ${
                    isSelected ? 'ring-2 ring-blue-500 scale-110' : ''
                  }`}
                  style={{ transitionDelay: `${idx * 15}ms` }}
                >
                  <span className="text-xl sm:text-2xl leading-none select-none drop-shadow-sm">
                    {cfg.emoji}
                  </span>
                  {/* Floating tooltip label */}
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-slate-900/90 text-white text-[10px] font-bold rounded shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Like / React Button */}
      <button
        type="button"
        onClick={handleDirectClick}
        className={`w-full py-2 rounded-xl text-xs font-black cursor-pointer transition flex items-center justify-center gap-1.5 ${
          currentConfig ? currentConfig.activeColor : 'text-slate-650 hover:bg-slate-100'
        }`}
      >
        {currentConfig ? (
          <>
            <span className="text-base leading-none select-none">{currentConfig.emoji}</span>
            <span className={currentConfig.color}>{currentConfig.label}</span>
          </>
        ) : (
          <>
            <ThumbsUp className="w-4 h-4 text-slate-500" />
            <span>Like</span>
          </>
        )}
      </button>

      {/* Reactions Breakdown Modal */}
      {isBreakdownOpen && (
        <ReactionsBreakdownModal
          postId={postId}
          reactions={reactions}
          reactionCounts={reactionCounts}
          onClose={() => setIsBreakdownOpen(false)}
          onViewProfile={onViewProfile}
        />
      )}
    </div>
  );
};

interface ReactionsBreakdownModalProps {
  postId: string;
  reactions?: PostReactionRecord[];
  reactionCounts?: Record<ReactionType, number>;
  onClose: () => void;
  onViewProfile?: (userId: string) => void;
}

export const ReactionsBreakdownModal: React.FC<ReactionsBreakdownModalProps> = ({
  postId,
  reactions = [],
  reactionCounts = {} as Record<ReactionType, number>,
  onClose,
  onViewProfile
}) => {
  const [selectedFilter, setSelectedFilter] = useState<ReactionType | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [fetchedReactions, setFetchedReactions] = useState<PostReactionRecord[]>(reactions);
  const [counts, setCounts] = useState<Record<string, number>>(reactionCounts);

  useEffect(() => {
    // Fetch full reactions data if available
    const fetchReactions = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/zone/posts/${postId}/reactions`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setFetchedReactions(data.reactions || []);
            setCounts(data.counts || {});
          }
        }
      } catch (err) {
        console.error('Error fetching reactions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReactions();
  }, [postId]);

  const filteredReactions = selectedFilter === 'all'
    ? fetchedReactions
    : fetchedReactions.filter(r => r.type === selectedFilter);

  const total = Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">👍❤️🥰</span>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Mga Nag-react ({total || fetchedReactions.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1 p-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar bg-slate-50/50 dark:bg-slate-950/40">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${
              selectedFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-650 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            Lahat ({total || fetchedReactions.length})
          </button>
          {ALL_REACTIONS.map(type => {
            const count = counts[type] || 0;
            if (count === 0) return null;
            const cfg = REACTION_CONFIG[type];
            return (
              <button
                key={type}
                onClick={() => setSelectedFilter(type)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
                  selectedFilter === type
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-650 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>{cfg.emoji}</span>
                <span>{count}</span>
              </button>
            );
          })}
        </div>

        {/* List of Users */}
        <div className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar">
          {filteredReactions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Walang reactions para sa kategoryang ito.
            </div>
          ) : (
            filteredReactions.map((r, i) => {
              const cfg = REACTION_CONFIG[r.type] || REACTION_CONFIG.like;
              return (
                <div
                  key={r.userId + '-' + i}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                  onClick={() => {
                    if (onViewProfile) {
                      onViewProfile(r.userId);
                      onClose();
                    }
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-sm font-bold">
                        {r.userAvatar && (r.userAvatar.startsWith('http') || r.userAvatar.startsWith('data:')) ? (
                          <img src={r.userAvatar} alt={r.userName} className="w-full h-full object-cover" />
                        ) : (
                          <span>{r.userAvatar || '👤'}</span>
                        )}
                      </div>
                      <span className="absolute -bottom-1 -right-1 text-xs select-none">
                        {cfg.emoji}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white hover:text-blue-600 transition">
                        {r.userName || 'Z-one Member'}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(r.createdAt).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-black ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
};

export const PostReactionsBar = PostReactionButton;
