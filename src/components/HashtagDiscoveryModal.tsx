import React, { useState, useEffect, useCallback } from 'react';
import {
  Hash,
  X,
  Film,
  FileText,
  TrendingUp,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Heart,
  MessageCircle,
  Eye,
  RefreshCw,
  Search,
  Share2,
  Layers,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { HashtagRecord, ContentGraphSummary, RelatedContentCandidate } from '../types';

interface HashtagDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialHashtag?: string;
  token?: string;
  language?: 'tl' | 'en';
  onSelectReel?: (reelId: string) => void;
  onSelectPost?: (postId: string) => void;
}

export const HashtagDiscoveryModal: React.FC<HashtagDiscoveryModalProps> = ({
  isOpen,
  onClose,
  initialHashtag = '',
  token,
  language = 'tl',
  onSelectReel,
  onSelectPost
}) => {
  const [currentTag, setCurrentTag] = useState<string>(initialHashtag.replace(/^#/, ''));
  const [activeTab, setActiveTab] = useState<'all' | 'post' | 'reel'>('all');
  const [activeSort, setActiveSort] = useState<'recent' | 'popular'>('recent');
  
  const [hashtagMeta, setHashtagMeta] = useState<HashtagRecord | null>(null);
  const [items, setItems] = useState<ContentGraphSummary[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [trendingTags, setTrendingTags] = useState<HashtagRecord[]>([]);
  
  // Related content modal state
  const [inspectingContent, setInspectingContent] = useState<ContentGraphSummary | null>(null);
  const [relatedCandidates, setRelatedCandidates] = useState<RelatedContentCandidate[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState<boolean>(false);

  // Sync initial hashtag when opened
  useEffect(() => {
    if (isOpen) {
      const clean = (initialHashtag || '').replace(/^#/, '').trim();
      if (clean) {
        setCurrentTag(clean);
      }
      loadTrendingTags();
    }
  }, [isOpen, initialHashtag]);

  // Load trending hashtags
  const loadTrendingTags = async () => {
    try {
      const res = await fetch('/api/zone/hashtags/trending?limit=12&days=7');
      const data = await res.json();
      if (data.success && Array.isArray(data.trending)) {
        setTrendingTags(data.trending);
        if (!currentTag && data.trending.length > 0) {
          setCurrentTag(data.trending[0].normalizedName);
        }
      }
    } catch {
      // Fallback
    }
  };

  // Fetch hashtag content
  const fetchHashtagData = useCallback(async (tag: string, targetPage = 1, append = false) => {
    if (!tag.trim()) return;
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = token;

      const res = await fetch(
        `/api/zone/hashtags/${encodeURIComponent(tag)}?page=${targetPage}&limit=15&type=${activeTab}&sort=${activeSort}`,
        { headers }
      );
      const data = await res.json();
      if (data.success) {
        setHashtagMeta(data.hashtag);
        setTotalCount(data.total || 0);
        setHasMore(Boolean(data.hasMore));
        setPage(targetPage);
        if (append) {
          setItems(prev => [...prev, ...(data.items || [])]);
        } else {
          setItems(data.items || []);
        }
      } else {
        if (!append) setItems([]);
        setHasMore(false);
      }
    } catch {
      if (!append) setItems([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [token, activeTab, activeSort]);

  // Trigger fetch when currentTag, tab, or sort changes
  useEffect(() => {
    if (isOpen && currentTag.trim()) {
      fetchHashtagData(currentTag, 1, false);
    }
  }, [isOpen, currentTag, activeTab, activeSort, fetchHashtagData]);

  // Fetch related content candidates
  const handleInspectRelated = async (content: ContentGraphSummary) => {
    setInspectingContent(content);
    setIsLoadingRelated(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = token;

      const res = await fetch(
        `/api/zone/content/${encodeURIComponent(content.id)}/related?limit=8&type=all`,
        { headers }
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.related)) {
        setRelatedCandidates(data.related);
      } else {
        setRelatedCandidates([]);
      }
    } catch {
      setRelatedCandidates([]);
    } finally {
      setIsLoadingRelated(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 pt-4 sm:pt-10 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
                <Hash className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-black text-white truncate flex items-center gap-1.5">
                  <span>#{hashtagMeta?.displayName?.replace(/^#/, '') || currentTag}</span>
                  {hashtagMeta && hashtagMeta.usageCount > 5 && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Trending
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <span>{totalCount} {language === 'tl' ? 'kabuuang nilalaman' : 'total content items'}</span>
                  {hashtagMeta && (
                    <span>• {hashtagMeta.postCount} posts, {hashtagMeta.reelCount} reels</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fetchHashtagData(currentTag, 1, false)}
                title={language === 'tl' ? 'I-refresh' : 'Refresh'}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* TRENDING HASHTAGS HORIZONTAL CAROUSEL */}
          {trendingTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <span className="text-[10px] font-black text-amber-400 flex items-center gap-1 shrink-0 uppercase tracking-wider pr-1">
                <TrendingUp className="w-3 h-3" />
                <span>{language === 'tl' ? 'Mga Trending:' : 'Trending:'}</span>
              </span>
              {trendingTags.map((tag) => {
                const isSelected = currentTag.toLowerCase() === tag.normalizedName.toLowerCase();
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setCurrentTag(tag.normalizedName)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition shrink-0 cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-xs'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    <span>#{tag.displayName.replace(/^#/, '')}</span>
                    <span className="text-[9px] opacity-75">({tag.usageCount})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* FILTER AND SORT BAR */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1">
              {[
                { id: 'all', label: language === 'tl' ? 'Lahat' : 'All', icon: Sparkles },
                { id: 'post', label: language === 'tl' ? 'Mga Post' : 'Posts', icon: FileText },
                { id: 'reel', label: 'Reels', icon: Film }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-1 bg-slate-950/60 p-0.5 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveSort('recent')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  activeSort === 'recent'
                    ? 'bg-slate-800 text-amber-300 font-black shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {language === 'tl' ? 'Pinakabago' : 'Recent'}
              </button>
              <button
                type="button"
                onClick={() => setActiveSort('popular')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  activeSort === 'popular'
                    ? 'bg-slate-800 text-amber-300 font-black shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {language === 'tl' ? 'Sikat' : 'Popular'}
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT FEED BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isLoading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-medium">
                {language === 'tl' ? 'Kinukuha ang mga kaugnay na nilalaman...' : 'Loading tagged content...'}
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 mx-auto flex items-center justify-center">
                <Hash className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-white">
                {language === 'tl' ? 'Walang nahanap na nilalaman' : 'No content found'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {language === 'tl'
                  ? `Wala pang mga pampublikong post o reel na may hashtag na #${currentTag}.`
                  : `There are no public posts or reels tagged with #${currentTag} yet.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {items.map((item) => {
                const isReel = item.type === 'reel';
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition space-y-3"
                  >
                    {/* Header: Author + Type Badge + Community */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white text-xs font-black shrink-0 overflow-hidden">
                          {item.authorAvatar && item.authorAvatar.startsWith('http') ? (
                            <img src={item.authorAvatar} alt={item.authorName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{item.authorAvatar || '👤'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white truncate">{item.authorName}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                            {item.communityName && (
                              <span className="text-indigo-400 font-bold truncate">
                                • {item.communityName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          isReel
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {isReel ? <Film className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          <span>{isReel ? 'Reel' : 'Post'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Content Body */}
                    {item.title && (
                      <h4 className="text-xs sm:text-sm font-bold text-slate-100 leading-snug">
                        {item.title}
                      </h4>
                    )}

                    {item.text && (
                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                        {item.text}
                      </p>
                    )}

                    {/* Media Thumbnail */}
                    {(item.mediaUrl || item.thumbnailUrl) && (
                      <div
                        onClick={() => {
                          if (isReel && onSelectReel) {
                            onSelectReel(item.id);
                            onClose();
                          } else if (!isReel && onSelectPost) {
                            onSelectPost(item.id);
                            onClose();
                          }
                        }}
                        className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 max-h-56 cursor-pointer group"
                      >
                        <img
                          src={item.thumbnailUrl || item.mediaUrl}
                          alt={item.title || 'Media preview'}
                          className="w-full h-48 object-cover group-hover:scale-102 transition duration-300"
                        />
                        {isReel && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                              <Film className="w-5 h-5" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hashtags Bar */}
                    {item.hashtags && item.hashtags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {item.hashtags.map((tag, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setCurrentTag(tag.replace(/^#/, ''))}
                            className="text-[11px] font-bold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                          >
                            #{tag.replace(/^#/, '')}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Footer: Metrics + Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 text-rose-400" />
                          <span>{item.likesCount}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
                          <span>{item.commentsCount}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Kaugnay na Nilalaman / Related Button */}
                        <button
                          type="button"
                          onClick={() => handleInspectRelated(item)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Layers className="w-3 h-3 text-amber-400" />
                          <span>{language === 'tl' ? 'Kaugnay' : 'Related'}</span>
                        </button>

                        {/* Open Content Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isReel && onSelectReel) {
                              onSelectReel(item.id);
                              onClose();
                            } else if (!isReel && onSelectPost) {
                              onSelectPost(item.id);
                              onClose();
                            }
                          }}
                          className="px-3 py-1 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>{language === 'tl' ? 'Tingnan' : 'View'}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Load More Button */}
              {hasMore && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => fetchHashtagData(currentTag, page + 1, true)}
                    disabled={isLoading}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-xl border border-slate-700 transition cursor-pointer disabled:opacity-50"
                  >
                    {isLoading
                      ? (language === 'tl' ? 'Ikinakarga...' : 'Loading...')
                      : (language === 'tl' ? 'Mag-load ng Higit Pa' : 'Load More Content')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RELATED CONTENT DRAWER / POPUP */}
        {inspectingContent && (
          <div className="border-t border-slate-800 bg-slate-950 p-4 sm:p-5 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h5 className="text-xs sm:text-sm font-black text-white">
                  {language === 'tl' ? 'Mga Kaugnay na Nilalaman' : 'Related Content Graph Candidates'}
                </h5>
                <span className="text-[10px] text-slate-400">
                  (Para sa: {inspectingContent.title || inspectingContent.text?.slice(0, 30) || inspectingContent.id})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectingContent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingRelated ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <span>{language === 'tl' ? 'Hinahanap ang mga kaugnay na post at reel...' : 'Finding related posts and reels...'}</span>
              </div>
            ) : relatedCandidates.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                {language === 'tl'
                  ? 'Wala pang ibang kaugnay na nilalaman na may magkatulad na hashtag o komunidad.'
                  : 'No related content candidates found with shared hashtags or public communities.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto">
                {relatedCandidates.map((candidate) => (
                  <div
                    key={`rel-${candidate.type}-${candidate.id}`}
                    onClick={() => {
                      if (candidate.type === 'reel' && onSelectReel) {
                        onSelectReel(candidate.id);
                        onClose();
                      } else if (candidate.type === 'post' && onSelectPost) {
                        onSelectPost(candidate.id);
                        onClose();
                      }
                    }}
                    className="bg-slate-900 border border-slate-800 hover:border-amber-400/50 rounded-xl p-2.5 flex items-center justify-between gap-2 transition cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-white truncate group-hover:text-amber-300">
                        {candidate.title || candidate.text || candidate.id}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <span className="uppercase font-bold text-slate-300">{candidate.type}</span>
                        <span>• Ni {candidate.authorName}</span>
                        {candidate.sharedHashtags.length > 0 && (
                          <span className="text-amber-400 truncate">
                            • #{candidate.sharedHashtags[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
