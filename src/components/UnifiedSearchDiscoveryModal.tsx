import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  User,
  Film,
  FileText,
  Trophy,
  ShoppingBag,
  TrendingUp,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Heart,
  MessageCircle,
  Eye,
  CheckCircle2,
  Hash,
  Users
} from 'lucide-react';
import { SearchResults, SocialProductRef, HashtagRecord } from '../types';

interface UnifiedSearchDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialType?: 'all' | 'people' | 'posts' | 'reels' | 'challenges' | 'products' | 'hashtags' | 'communities';
  language?: 'tl' | 'en';
  onSelectCreator?: (userId: string) => void;
  onSelectProduct?: (product: SocialProductRef) => void;
  onSelectReel?: (reelId: string) => void;
  onSelectPost?: (postId: string) => void;
  onSelectChallenge?: (challengeId: string) => void;
}

const DEFAULT_TRENDING_HASHTAGS = [
  'pinoy',
  'reels',
  'watchandearn',
  'negosyo',
  'gcash',
  'teleserye',
  'shoppee',
  'creatorchallenge'
];

export const UnifiedSearchDiscoveryModal: React.FC<UnifiedSearchDiscoveryModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  initialType = 'all',
  language = 'tl',
  onSelectCreator,
  onSelectProduct,
  onSelectReel,
  onSelectPost,
  onSelectChallenge
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'all' | 'people' | 'posts' | 'reels' | 'challenges' | 'products' | 'hashtags' | 'communities'>(initialType);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [trendingList, setTrendingList] = useState<string[]>(DEFAULT_TRENDING_HASHTAGS);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialQuery) setQuery(initialQuery);
      if (initialType) setActiveTab(initialType);
      setTimeout(() => inputRef.current?.focus(), 150);

      // Load live trending tags
      fetch('/api/zone/hashtags/trending?limit=10')
        .then(r => r.json())
        .then(d => {
          if (d.success && Array.isArray(d.trending) && d.trending.length > 0) {
            setTrendingList(d.trending.map((t: HashtagRecord) => t.normalizedName));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, initialQuery, initialType]);

  useEffect(() => {
    if (!isOpen) return;
    if (!query.trim()) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}&type=${activeTab}`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.results) {
            setResults(d.results);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }, 280);

    return () => clearTimeout(timer);
  }, [query, activeTab, isOpen]);

  if (!isOpen) return null;

  const totalResultsCount = results
    ? (results.people.length + 
       results.posts.length + 
       results.reels.length + 
       results.challenges.length + 
       results.products.length + 
       (results.hashtags?.length || 0) + 
       (results.communities?.length || 0))
    : 0;

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 pt-4 sm:pt-12 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Search Input */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  language === 'tl'
                    ? 'Maghanap ng Creator, Post, Reel, Challenge, o Produkto...'
                    : 'Search People, Posts, Reels, Challenges, or Products...'
                }
                className="w-full bg-slate-900/90 border border-slate-700 rounded-2xl pl-11 pr-10 py-3 text-sm text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-400 shadow-inner"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Trending Hashtags Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <span className="text-[10px] font-black text-amber-400 flex items-center gap-1 shrink-0 uppercase tracking-wider">
              <TrendingUp className="w-3 h-3" />
              <span>Trending:</span>
            </span>
            {trendingList.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-hashtag-modal', { detail: { hashtag: tag } }));
                  onClose();
                }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition shrink-0 cursor-pointer ${
                  query.toLowerCase() === tag.toLowerCase()
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-xs'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>

          {/* Tab Categories */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
            {[
              { id: 'all', label: language === 'tl' ? 'Lahat' : 'All', icon: Sparkles },
              { id: 'hashtags', label: '# Hashtags', icon: Hash },
              { id: 'communities', label: language === 'tl' ? 'Komunidad' : 'Communities', icon: Users },
              { id: 'people', label: language === 'tl' ? 'Creators' : 'People', icon: User },
              { id: 'reels', label: 'Reels', icon: Film },
              { id: 'posts', label: language === 'tl' ? 'Posts' : 'Posts', icon: FileText },
              { id: 'challenges', label: 'Challenges', icon: Trophy },
              { id: 'products', label: language === 'tl' ? 'Produkto' : 'Products', icon: ShoppingBag }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-medium">{language === 'tl' ? 'Naghahanap sa Z-one Social...' : 'Searching Z-one Social...'}</p>
            </div>
          ) : !query.trim() ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-white">
                {language === 'tl' ? 'Tuklasin ang Z-one Community' : 'Discover Z-one Community'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {language === 'tl'
                  ? 'I-type ang pangalan ng creator, pamagat ng video, challenge, o produkto sa itaas upang magsimula.'
                  : 'Type a creator name, video title, hashtag, challenge, or product above to begin.'}
              </p>
            </div>
          ) : totalResultsCount === 0 ? (
            <div className="text-center py-12 space-y-2">
              <div className="text-3xl">🔍</div>
              <h4 className="text-sm font-black text-white">
                {language === 'tl' ? 'Walang nahanap na resulta' : 'No results found'}
              </h4>
              <p className="text-xs text-slate-400">
                {language === 'tl'
                  ? `Walang tumutugma sa "${query}". Subukan ang ibang keyword o hashtag.`
                  : `No matches for "${query}". Try another search term.`}
              </p>
            </div>
          ) : (
            <>
              {/* 1. PEOPLE / CREATORS */}
              {(activeTab === 'all' || activeTab === 'people') && results?.people && results.people.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-blue-400">
                      <User className="w-3.5 h-3.5" />
                      <span>{language === 'tl' ? 'Mga Creator at Miyembro' : 'Creators & Members'} ({results.people.length})</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {results.people.map(person => (
                      <div
                        key={person.id}
                        className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-2.5 hover:border-blue-500/50 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-sm shrink-0 overflow-hidden">
                            {person.avatar && person.avatar.startsWith('http') ? (
                              <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
                            ) : (
                              person.avatar || person.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-black text-white truncate flex items-center gap-1">
                              <span>{person.name}</span>
                              {person.isZoned && (
                                <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {person.bio || `@${person.name.toLowerCase().replace(/\s+/g, '')}`}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectCreator) onSelectCreator(person.id);
                            onClose();
                          }}
                          className="text-[11px] font-black bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl cursor-pointer transition shrink-0 shadow-xs"
                        >
                          Profile
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 2. REELS */}
              {(activeTab === 'all' || activeTab === 'reels') && results?.reels && results.reels.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-rose-400">
                      <Film className="w-3.5 h-3.5" />
                      <span>{language === 'tl' ? 'Reels at Shorts' : 'Reels & Shorts'} ({results.reels.length})</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {results.reels.map(reel => (
                      <div
                        key={reel.id}
                        onClick={() => {
                          if (onSelectReel) {
                            onSelectReel(reel.id);
                          } else {
                            window.dispatchEvent(new CustomEvent('open-reel-detail', { detail: { reelId: reel.id } }));
                          }
                          onClose();
                        }}
                        className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-2.5 flex gap-2.5 cursor-pointer transition group"
                      >
                        <div className="w-16 h-20 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-center text-rose-500 shrink-0 group-hover:scale-105 transition">
                          <Film className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="text-xs font-black text-white line-clamp-2 group-hover:text-rose-300 transition">
                              {reel.title || 'Z-one Reels Video'}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              @{reel.addedBy || 'Creator'}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold">
                            <span className="flex items-center gap-0.5 text-rose-400">
                              <Heart className="w-3 h-3 fill-rose-500/40" />
                              <span>{reel.likes}</span>
                            </span>
                            <span className="flex items-center gap-0.5 text-cyan-400">
                              <Eye className="w-3 h-3" />
                              <span>{reel.views || 0}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 3. PRODUCTS (SOCIAL COMMERCE) */}
              {(activeTab === 'all' || activeTab === 'products') && results?.products && results.products.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{language === 'tl' ? 'Z-oneShop Produkto' : 'Shop Products'} ({results.products.length})</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {results.products.map(prod => (
                      <div
                        key={prod.id}
                        onClick={() => {
                          const productRef: SocialProductRef = {
                            id: prod.id,
                            name: prod.name,
                            price: prod.price,
                            image: prod.image || '',
                            category: prod.category
                          };
                          if (onSelectProduct) {
                            onSelectProduct(productRef);
                          } else {
                            window.dispatchEvent(new CustomEvent('open-shop-product-detail', { detail: { product: productRef } }));
                          }
                          onClose();
                        }}
                        className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-2.5 flex items-center gap-2.5 cursor-pointer transition group"
                      >
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-700 bg-slate-900 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-black text-white truncate group-hover:text-emerald-300 transition">
                            {prod.name}
                          </div>
                          <div className="text-xs font-black text-emerald-400 mt-0.5">
                            ₱{prod.price.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-cyan-400 font-bold">
                            Tingnan sa Shop ➔
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 4. POSTS */}
              {(activeTab === 'all' || activeTab === 'posts') && results?.posts && results.posts.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-amber-400">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{language === 'tl' ? 'Mga Post sa Feed' : 'Feed Posts'} ({results.posts.length})</span>
                    </span>
                  </div>
                  <div className="space-y-2">
                    {results.posts.map(post => (
                      <div
                        key={post.id}
                        onClick={() => {
                          if (onSelectPost) onSelectPost(post.id);
                          onClose();
                        }}
                        className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-3 cursor-pointer transition space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-white">{post.userName}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-2 whitespace-pre-wrap">
                          {post.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 5. CHALLENGES */}
              {(activeTab === 'all' || activeTab === 'challenges') && results?.challenges && results.challenges.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-purple-400">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Creator Challenges ({results.challenges.length})</span>
                    </span>
                  </div>
                  <div className="space-y-2">
                    {results.challenges.map(chal => (
                      <div
                        key={chal.id}
                        onClick={() => {
                          if (onSelectChallenge) onSelectChallenge(chal.id);
                          onClose();
                        }}
                        className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer transition"
                      >
                        <div>
                          <div className="text-xs font-black text-white">{chal.title}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">{chal.description}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-amber-400">
                            ₱{chal.prizePool?.toLocaleString()}
                          </div>
                          <span className="text-[9px] bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                            Sumali
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 6. HASHTAGS (PHASE 2C CONTENT GRAPH) */}
              {(activeTab === 'all' || activeTab === 'hashtags') && results?.hashtags && results.hashtags.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-blue-400">
                      <Hash className="w-3.5 h-3.5" />
                      <span>{language === 'tl' ? 'Mga Hashtag' : 'Hashtags'} ({results.hashtags.length})</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {results.hashtags.map(tag => (
                      <div
                        key={tag.id}
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('open-hashtag-modal', { detail: { hashtag: tag.normalizedName } }));
                          onClose();
                        }}
                        className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-3 flex items-center justify-between gap-2.5 cursor-pointer transition group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                            <Hash className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-white group-hover:text-blue-300 truncate">
                              #{tag.displayName.replace(/^#/, '')}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {tag.usageCount} {language === 'tl' ? 'gamit' : 'uses'} • {tag.postCount} posts, {tag.reelCount} reels
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white shrink-0" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 7. COMMUNITIES (PHASE 2B & 2C CONTENT GRAPH) */}
              {(activeTab === 'all' || activeTab === 'communities') && results?.communities && results.communities.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-indigo-400">
                      <Users className="w-3.5 h-3.5" />
                      <span>{language === 'tl' ? 'Mga Komunidad' : 'Communities'} ({results.communities.length})</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {results.communities.map((comm: any) => (
                      <div
                        key={comm.id}
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('open-community-modal', { detail: { communityId: comm.id } }));
                          onClose();
                        }}
                        className="bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-3 flex items-center justify-between gap-2.5 cursor-pointer transition group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-base shrink-0 overflow-hidden">
                            {comm.avatar?.startsWith('http') ? (
                              <img src={comm.avatar} alt={comm.name} className="w-full h-full object-cover" />
                            ) : (
                              comm.avatar || '🌐'
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-white group-hover:text-indigo-300 truncate">
                              {comm.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {comm.memberCount || 1} {language === 'tl' ? 'miyembro' : 'members'} • {comm.category || 'General'}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white shrink-0" />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
