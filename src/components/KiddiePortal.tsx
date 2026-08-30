import React, { useState, useEffect } from 'react';
import { Play, Sparkles, BookOpen, Film, Tv, ShieldCheck, Heart, Search, LogOut, ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { KiddieContentItem, UserSession } from '../types';

interface KiddiePortalProps {
  currentUser?: UserSession;
  user?: UserSession;
  onLogout?: () => void;
  onBackToLauncher?: () => void;
}

export const KiddiePortal: React.FC<KiddiePortalProps> = ({ currentUser, user, onLogout, onBackToLauncher }) => {
  const [contentList, setContentList] = useState<KiddieContentItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeVideo, setActiveVideo] = useState<KiddieContentItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    fetchKiddieContent();
  }, []);

  const fetchKiddieContent = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/kiddie/feed');
      if (res.ok) {
        const data = await res.json();
        if (data.items && Array.isArray(data.items)) {
          setContentList(data.items);
          if (data.items.length > 0 && !activeVideo) {
            setActiveVideo(data.items[0]);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load kiddie content:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredContent = contentList.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { id: 'all', label: 'Lahat ng Palabas', icon: Sparkles, color: 'bg-amber-500' },
    { id: 'cartoon', label: 'Cartoons & Animation', icon: Tv, color: 'bg-pink-500' },
    { id: 'educational', label: 'Edukasyon & Kaalaman', icon: BookOpen, color: 'bg-blue-500' },
    { id: 'story', label: 'Kwentong Pambata', icon: Heart, color: 'bg-emerald-500' },
    { id: 'kiddie_movie', label: 'Pambatang Pelikula', icon: Film, color: 'bg-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 selection:bg-amber-400 selection:text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-amber-500/20 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-0.5 shadow-lg shadow-amber-500/10">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-amber-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Z-oneKiddie
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Child Safe
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Hello, {currentUser.name} 🎈</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
              title="Mag-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Child Safety Banner */}
        <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-300">Protektadong Child-Safe Community</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Naka-kandado ang profile na ito sa mga ligtas at pambatang palabas lamang. Walang public messages o hindi naaangkop na nilalaman.
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800 self-stretch sm:self-auto text-center">
            Age Status: <span className="font-bold text-amber-400">Minor Portal (Under 18)</span>
          </div>
        </div>

        {/* Active Theater Player */}
        {activeVideo && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              {activeVideo.videoUrl.includes('youtube') || activeVideo.videoUrl.includes('embed') ? (
                <iframe
                  src={activeVideo.videoUrl}
                  title={activeVideo.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={activeVideo.videoUrl}
                  controls
                  autoPlay
                  muted={isMuted}
                  poster={activeVideo.thumbnailUrl}
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border-t border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 uppercase tracking-wide">
                    {activeVideo.category.replace('_', ' ')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {activeVideo.ageRating === 'all_ages' ? 'Lahat ng Edad' : '7+ Anyos'}
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">{activeVideo.title}</h1>
                <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">{activeVideo.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search & Categories */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Maghanap ng pambatang palabas o kwento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-pink-500 text-slate-950 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Video Grid */}
        {loading ? (
          <div className="text-center py-16 space-y-3">
            <Sparkles className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <p className="text-sm text-slate-400">Inihahanda ang mga pambatang palabas...</p>
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-2">
            <Film className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">Walang nahanap na palabas</h4>
            <p className="text-xs text-slate-500">Subukang magpalit ng kategorya o maghanap ng ibang pamagat.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredContent.map((item) => {
              const isCurrent = activeVideo?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setActiveVideo(item);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`group relative bg-slate-900 border rounded-2xl overflow-hidden cursor-pointer transition transform hover:-translate-y-1 hover:shadow-xl ${
                    isCurrent ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40">
                      <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 text-[10px] font-bold text-white">
                      {Math.floor(item.durationSeconds / 60)}:{(item.durationSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <div className="p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-amber-400 uppercase">
                        {item.category.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-amber-300 transition">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
