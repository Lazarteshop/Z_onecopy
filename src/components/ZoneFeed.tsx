import React, { useState, useEffect } from 'react';
import Hls from 'hls.js';
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
  Upload,
  Phone,
  Video,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff,
  X,
  Maximize2,
  Play,
  RefreshCw,
  Film
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

// Curated live M3U8/HLS streams from Philippine broadcast networks and local television stations
const LIVE_TV_STREAMS = [
  {
    id: 'stream-cltv36',
    name: 'CLTV 36 (Central Luzon TV) - News & Lifestyle',
    network: 'CLTV 36 Regional',
    logo: '📡',
    url: 'https://live.cltv36.tv:5443/LiveApp/streams/cltvlive.m3u8',
    description: 'Sundan ang mga pinakabagong balita, kaganapan, kultura, at pamumuhay sa buong Pampanga at Gitnang Luzon.'
  },
  {
    id: 'stream-abantetv',
    name: 'Abante TV - National News & Talks',
    network: 'Abante TV',
    logo: '📰',
    url: 'https://amg19223-amg19223c12-amgplt0352.playout.now3.amagi.tv/playlist/amg19223-amg19223c12-amgplt0352/playlist.m3u8',
    description: 'Live na balitaan, talakayan sa maiinit na isyu, at pampublikong serbisyo mula sa Abante Tonite network.'
  },
  {
    id: 'stream-hope',
    name: 'Hope Channel Philippines - Family & Faith',
    network: 'Hope Channel',
    logo: '✝️',
    url: 'https://jstre.am/live/jsl:7A1swL7Fhlh.m3u8',
    description: 'Pampamilyang palabas na naghahatid ng inspirasyon, kalusugan, pamumuhay, at turo ng Salita ng Diyos.'
  },
  {
    id: 'stream-bilyonaryo',
    name: 'Bilyonaryo News Channel (BNC) - Finance & Business',
    network: 'Bilyonaryo News',
    logo: '💼',
    url: 'https://amg19223-amg19223c11-amgplt0352.playout.now3.amagi.tv/playlist/amg19223-amg19223c11-amgplt0352/playlist.m3u8',
    description: 'Ang nangungunang premium na balitang pangnegosyo, pananalapi, ekonomiya, at pambansang balitaan sa bansa.'
  },
  {
    id: 'stream-premier',
    name: 'Premier Sports Channel',
    network: 'Premier Sports',
    logo: '⚽',
    url: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8',
    description: 'Panoorin ang pinakapaboritong laro sa basketball, football, tennis, at combat sports ng live.'
  },
  {
    id: 'stream-premier2',
    name: 'Premier Sports 2 Channel',
    network: 'Premier Sports 2',
    logo: '🏎️',
    url: 'https://amg19223-amg19223c4-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c4-amgplt0351/playlist.m3u8',
    description: 'Karagdagang live sports coverage tulad ng motorsport, athletics, at combat championships.'
  },
  {
    id: 'stream-aniblast',
    name: 'Ani-Blast Channel',
    network: 'Ani-Blast',
    logo: '🎮',
    url: 'https://amg19223-amg19223c9-amgplt0019.playout.now3.amagi.tv/playlist/amg19223-amg19223c9-amgplt0019/playlist.m3u8',
    description: 'I-enjoy ang pinakamahusay na mga localized anime series na dinala sa wikang Filipino/Tagalog.'
  }
];

// Curated high-quality Netflix Free watch trailers & teaser releases with premium embedded YouTube links
const NETFLIX_FREE_VIDEOS = [
  {
    id: 'netflix-1',
    title: 'Squid Game: Season 2 | Official Teaser',
    category: 'THRILLER / DRAMA',
    source: 'Netflix International',
    embedUrl: 'https://www.youtube.com/embed/pSSTXbWpUjg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    duration: '2:15',
    likes: '4.8M',
    description: 'The game never stops. Three years after winning Squid Game, Player 456 remains determined to find the people behind the game and put an end to their vicious sport.',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    tags: ['Survival', 'High Stakes', 'Must Watch'],
    date: 'New Release',
    image: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=800&auto=format&fit=crop&q=60'
  },
  {
    id: 'netflix-2',
    title: 'Wednesday Season 2 | First Look Teaser',
    category: 'FANTASY / MYSTERY',
    source: 'Netflix International',
    embedUrl: 'https://www.youtube.com/embed/3SAnTf2q0Gg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    duration: '1:48',
    likes: '3.2M',
    description: 'More mayhem, mystery and murder. Wednesday Addams is returning to Nevermore Academy with new mysteries, new characters, and her signature dark charm.',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    tags: ['Spooky', 'Dark Comedy', 'Trending'],
    date: 'Coming Soon',
    image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=800&auto=format&fit=crop&q=60'
  },
  {
    id: 'netflix-3',
    title: 'Stranger Things 5 | The Final Season Teaser',
    category: 'SCI-FI / HORROR',
    source: 'Netflix International',
    embedUrl: 'https://www.youtube.com/embed/fD_0Nre31m4',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    duration: '1:55',
    likes: '5.1M',
    description: 'The final adventure begins. In the fall of 1987, one last adventure begins as Hawkins faces the ultimate threat from the Upside Down. Stream the epic conclusion.',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    tags: ['80s Nostalgia', 'Supernatural', 'Blockbuster'],
    date: 'Newest Teaser',
    image: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&auto=format&fit=crop&q=60'
  },
  {
    id: 'netflix-4',
    title: 'One Piece Live Action | Season 2 Teaser',
    category: 'ACTION / ADVENTURE',
    source: 'Netflix Anime',
    embedUrl: 'https://www.youtube.com/embed/4S37f8Z_Yc4',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    duration: '2:05',
    likes: '2.5M',
    description: 'The Straw Hat Pirates head to the Grand Line! Luffy, Zoro, Nami, Usopp, and Sanji are ready for new adventures, dangerous seas, and legendary enemies.',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    tags: ['Anime', 'Epic Journey', 'Live Action'],
    date: 'Recent Update',
    image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=60'
  },
  {
    id: 'netflix-5',
    title: 'Cobra Kai Season 6 - Part 3 | Finale Trailer',
    category: 'ACTION / MARTIAL ARTS',
    source: 'Netflix USA',
    embedUrl: 'https://www.youtube.com/embed/MhLgIeBqS9w',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: '2:30',
    likes: '1.9M',
    description: 'The global tournament is here. Daniel LaRusso and Johnny Lawrence lead their students to the Sekai Taikai for the ultimate martial arts showdown.',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    tags: ['Martial Arts', 'Rivalry', 'Inspirational'],
    date: 'Trending #1',
    image: 'https://images.unsplash.com/photo-1555538995-7ccc68ee2148?w=800&auto=format&fit=crop&q=60'
  },
  {
    id: 'netflix-6',
    title: 'Extraction 2 | High-Octane Action Scene',
    category: 'THRILLER / ACTION',
    source: 'Netflix International',
    embedUrl: 'https://www.youtube.com/embed/Y27Or9xgMhE',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    duration: '3:02',
    likes: '2.9M',
    description: 'Tyler Rake is back. Chris Hemsworth returns as the fearless black ops mercenary tasked with another deadly mission: rescuing the family of a ruthless Georgian gangster.',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    tags: ['Adrenaline', 'Gunfight', 'Non-Stop'],
    date: 'Popular',
    image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60'
  },
  {
    id: 'netflix-7',
    title: 'Avatar: The Last Airbender Live Action | Official Trailer',
    category: 'FANTASY / ADVENTURE',
    source: 'Netflix International',
    embedUrl: 'https://www.youtube.com/embed/waJKJW_PNSM',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: '2:22',
    likes: '3.7M',
    description: 'Water, Earth, Fire, Air. A young boy known as the Avatar must master the four elemental powers to save a world at war — and fight a ruthless enemy bent on stopping him.',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    tags: ['Elements', 'Bending', 'Chosen One'],
    date: 'Highly Rated',
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=60'
  },
  {
    id: 'netflix-8',
    title: 'Black Mirror Season 7 | Official Teaser',
    category: 'SCI-FI / ANTHOLOGY',
    source: 'Netflix International',
    embedUrl: 'https://www.youtube.com/embed/Y-6C0D9Yitg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    duration: '1:30',
    likes: '1.5M',
    description: 'Tech gets darker. The award-winning anthology series returns with six brand-new mind-bending stories exploring the terrifying future of human-technology interaction.',
    badgeColor: 'bg-zinc-50 text-zinc-700 border-zinc-200',
    tags: ['Dystopian', 'Mind Bending', 'Future'],
    date: 'Award Winner',
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=60'
  }
];

// Reusable high-performance HLS/M3U8 video stream player
interface M3U8PlayerProps {
  url: string;
  title: string;
  language: string;
  triggerNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

function M3U8Player({ url, title, language, triggerNotification }: M3U8PlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const hlsRef = React.useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setHasError(false);

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        maxBufferSize: 0,
        maxBufferLength: 30,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10,
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().then(() => {
          setIsPlaying(true);
        }).catch((e) => {
          console.warn("Autoplay blocked:", e);
          setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("Fatal network error in stream, retrying...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("Fatal media error in stream, retrying...");
              hls.recoverMediaError();
              break;
            default:
              console.error("Fatal unrecoverable HLS error:", data);
              setHasError(true);
              setIsLoading(false);
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native support (Safari, iOS)
      video.src = url;
      const onLoadedMetadata = () => {
        setIsLoading(false);
        video.play().then(() => {
          setIsPlaying(true);
        }).catch((e) => {
          console.warn("Native autoplay blocked:", e);
          setIsPlaying(false);
        });
      };
      
      const onNativeError = (e: Event) => {
        console.error("Native video play error:", e);
        setHasError(true);
        setIsLoading(false);
      };

      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('error', onNativeError);

      return () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onNativeError);
      };
    } else {
      setHasError(true);
      setIsLoading(false);
      triggerNotification(
        language === 'tl'
          ? 'Hindi suportado ang live HLS streaming sa browser na ito.'
          : 'Live HLS streaming is not supported in this browser.',
        'error'
      );
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url]);

  return (
    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-900 group">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        playsInline
        referrerPolicy="no-referrer"
      />

      {/* Loading Indicator Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 gap-3 z-10 animate-fadeIn">
          <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest animate-pulse">
            {language === 'tl' ? 'Kumokonekta sa Live Stream...' : 'Connecting to Live Feed...'}
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center gap-3 z-10">
          <div className="w-12 h-12 rounded-full bg-rose-950/50 border border-rose-900 flex items-center justify-center text-rose-500 text-lg">⚠️</div>
          <div className="space-y-1">
            <h4 className="text-white text-xs font-black uppercase tracking-wider">
              {language === 'tl' ? 'Hindi Ma-load ang Stream' : 'Live Stream Offline'}
            </h4>
            <p className="text-[10px] text-slate-400 max-w-xs font-medium leading-relaxed">
              {language === 'tl'
                ? 'Maaaring offline ang channel o hinarangan ng iyong browser/network ang direct streaming (CORS). Subukang panoorin ang ibang channel.'
                : 'The channel may be offline or direct stream is blocked by browser CORS security policies. Please try another channel below.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ZoneFeed({ token, user, triggerNotification, onRefreshProfile, language }: ZoneFeedProps) {
  const [posts, setPosts] = useState<ZonePost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Z-one Social Media Tabs & Detailed View States
  const [socialTab, setSocialTab] = useState<'feed' | 'livetv' | 'netflix'>('feed');
  const [selectedLiveTv, setSelectedLiveTv] = useState<any>(LIVE_TV_STREAMS[0]);
  const [selectedNetflixVideo, setSelectedNetflixVideo] = useState<any | null>(null);
  const [netflixVideos, setNetflixVideos] = useState<any[]>([]);
  const [isRefreshingNetflix, setIsRefreshingNetflix] = useState(false);

  // Fetch real-time Netflix videos from our live YouTube RSS backend
  const fetchRealTimeNetflixVideos = async (showNotification = false) => {
    setIsRefreshingNetflix(true);
    if (showNotification) {
      triggerNotification(
        language === 'tl' 
          ? 'Kumokonekta sa Netflix servers... Ina-update ang listahan...' 
          : 'Connecting to Netflix servers... Updating video feed...', 
        'info'
      );
    }
    try {
      const response = await fetch('/api/zone/netflix', {
        headers: {
          'Authorization': token || ''
        }
      });
      const data = await response.json();
      if (data.videos && data.videos.length > 0) {
        setNetflixVideos(data.videos);
        if (showNotification) {
          triggerNotification(
            language === 'tl' 
              ? 'Matagumpay na na-refresh! Na-load ang totoong Netflix free videos.' 
              : 'Successfully refreshed! Loaded real-time Netflix free videos & trailers.', 
            'success'
          );
        }
      } else {
        throw new Error('No videos returned');
      }
    } catch (err) {
      console.error('Error fetching real-time Netflix videos:', err);
      // Fallback to shuffled static array in case of connection failure
      const shuffled = [...NETFLIX_FREE_VIDEOS].sort(() => 0.5 - Math.random());
      setNetflixVideos(shuffled.slice(0, 4));
      if (showNotification) {
        triggerNotification(
          language === 'tl' 
            ? 'Hindi makakonekta. Na-load ang mga naka-cache na videos.' 
            : 'Cannot connect. Loaded cached videos instead.', 
          'info'
        );
      }
    } finally {
      setIsRefreshingNetflix(false);
    }
  };

  // Initialize with real-time Netflix videos on mount
  useEffect(() => {
    fetchRealTimeNetflixVideos();
  }, []);

  // Handle premium dynamic refresh to load the newest real-time videos from Netflix
  const handleRefreshNetflix = () => {
    fetchRealTimeNetflixVideos(true);
  };

  // --- LIVE TV STREAMS (IPTV M3U) DYNAMIC REFRESH AND SEARCH ---
  const [liveTvStreams, setLiveTvStreams] = useState<any[]>(LIVE_TV_STREAMS);
  const [isRefreshingLiveTv, setIsRefreshingLiveTv] = useState(false);
  const [liveTvSearchQuery, setLiveTvSearchQuery] = useState('');

  const fetchLiveTvStreams = async (showNotification = false) => {
    setIsRefreshingLiveTv(true);
    if (showNotification) {
      triggerNotification(
        language === 'tl'
          ? 'Kumukuha ng mga pinakabagong live channels mula sa IPTV registry...'
          : 'Retrieving latest live channels from public IPTV registry...',
        'info'
      );
    }
    try {
      const response = await fetch('/api/zone/livetv');
      const data = await response.json();
      if (data && data.success && Array.isArray(data.channels)) {
        setLiveTvStreams(data.channels);
        // Keep selected channel if it still exists in the new list, or fallback
        const exists = data.channels.some((c: any) => c.url === selectedLiveTv?.url);
        if (!exists && data.channels.length > 0) {
          // Try to prefer CLTV or first channel
          const cltv = data.channels.find((c: any) => c.id.includes('cltv') || c.name.toLowerCase().includes('cltv'));
          setSelectedLiveTv(cltv || data.channels[0]);
        }
        if (showNotification) {
          triggerNotification(
            language === 'tl'
              ? `Matagumpay na na-refresh! ${data.channels.length} na channels ang magagamit.`
              : `Successfully refreshed! ${data.channels.length} live channels are now available.`,
            'success'
          );
        }
      } else {
        throw new Error('Failed to retrieve channels successfully.');
      }
    } catch (err) {
      console.error('Error fetching dynamic live tv channels:', err);
      if (showNotification) {
        triggerNotification(
          language === 'tl'
            ? 'Hindi ma-load ang live registry stream. Ginagamit ang backup channels.'
            : 'Unable to reach live registry stream. Loaded offline backup channels.',
          'error'
        );
      }
    } finally {
      setIsRefreshingLiveTv(false);
    }
  };

  // Auto-fetch live tv list when visiting the live tv tab for the first time
  useEffect(() => {
    if (socialTab === 'livetv' && liveTvStreams.length === LIVE_TV_STREAMS.length) {
      fetchLiveTvStreams(false);
    }
  }, [socialTab]);

  const handleRefreshLiveTv = () => {
    fetchLiveTvStreams(true);
  };

  // --- PRIVATE DIRECT MESSAGE (DM) STATES ---
  const [activeDmUser, setActiveDmUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const [dmMessages, setDmMessages] = useState<any[]>([]);
  const [loadingDms, setLoadingDms] = useState(false);
  const [newDmText, setNewDmText] = useState('');
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  // --- DM READ/UNREAD TRACKING & INBOX PANEL STATES ---
  const [readMessageIds, setReadMessageIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`zone_read_msgs_${user.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const notifiedMsgIdsRef = React.useRef<Set<string>>(new Set());
  const [showInboxPanel, setShowInboxPanel] = useState(false);
  const [inboxSearch, setInboxSearch] = useState('');
  const [inboxTab, setInboxTab] = useState<'chats' | 'members'>('chats');
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [loadingUsersList, setLoadingUsersList] = useState(false);

  // Helper to play a lovely dual-tone chime for incoming message alerts
  const playMessageSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = audioCtx.currentTime;
      // High pitched premium dual-chime: E5 (659.25Hz) followed by A5 (880.00Hz)
      playTone(659.25, now, 0.15);
      playTone(880.00, now + 0.12, 0.25);
    } catch (e) {
      console.log('Audio Context notification failed or needs initial user click gesture');
    }
  };

  // Fetch registered users list for the inbox folder
  const fetchAllUsersList = async () => {
    setLoadingUsersList(true);
    try {
      const res = await fetch('/api/zone/users', {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const data = await res.json();
        setAllUsersList(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch users list for inbox', err);
    } finally {
      setLoadingUsersList(false);
    }
  };

  const handleOpenInbox = () => {
    setShowInboxPanel(true);
    setInboxSearch('');
    fetchAllUsersList();
  };

  // Persist read message IDs across page reloads
  useEffect(() => {
    try {
      localStorage.setItem(`zone_read_msgs_${user.id}`, JSON.stringify(readMessageIds));
    } catch (e) {}
  }, [readMessageIds, user.id]);

  // Handle incoming new message alerts and notification triggers
  useEffect(() => {
    if (!dmMessages || dmMessages.length === 0) return;

    const myReceivedMessages = dmMessages.filter(m => m.receiverId === user.id);

    // Initial load: populate already received messages so they don't trigger alerts on load
    if (notifiedMsgIdsRef.current.size === 0) {
      myReceivedMessages.forEach(m => {
        notifiedMsgIdsRef.current.add(m.id);
      });
      return;
    }

    // Identify brand-new incoming messages
    const newMessages = myReceivedMessages.filter(m => !notifiedMsgIdsRef.current.has(m.id));

    if (newMessages.length > 0) {
      let playSound = false;

      newMessages.forEach(msg => {
        notifiedMsgIdsRef.current.add(msg.id);

        // If currently talking with this sender in the active DM modal, mark as read instantly
        if (activeDmUser && activeDmUser.id === msg.senderId) {
          setReadMessageIds(prev => {
            if (prev.includes(msg.id)) return prev;
            return [...prev, msg.id];
          });
        } else {
          // Play notification tone and trigger a beautiful visual feedback banner
          playSound = true;
          triggerNotification(
            language === 'tl'
              ? `💬 Mensahe mula kay ${msg.senderName}: "${msg.text.substring(0, 35)}${msg.text.length > 35 ? '...' : ''}"`
              : `💬 Message from ${msg.senderName}: "${msg.text.substring(0, 35)}${msg.text.length > 35 ? '...' : ''}"`,
            'success'
          );
        }
      });

      if (playSound) {
        playMessageSound();
      }
    }
  }, [dmMessages, activeDmUser?.id]);

  // Mark all messages as read automatically from the active chat partner when the DM modal is opened
  useEffect(() => {
    if (activeDmUser && dmMessages.length > 0) {
      const unreadFromActiveUser = dmMessages.filter(
        m => m.senderId === activeDmUser.id && m.receiverId === user.id && !readMessageIds.includes(m.id)
      );

      if (unreadFromActiveUser.length > 0) {
        const unreadIds = unreadFromActiveUser.map(m => m.id);
        setReadMessageIds(prev => {
          const combined = Array.from(new Set([...prev, ...unreadIds]));
          return combined;
        });
      }
    }
  }, [activeDmUser?.id, dmMessages]);

  // Group and format active direct message threads
  const conversations = React.useMemo(() => {
    const map = new Map<string, {
      userId: string;
      userName: string;
      userAvatar: string;
      lastMessage: string;
      lastMessageTime: string;
      unreadCount: number;
    }>();

    // Process from oldest to newest so the last message always overwrites in our Map
    const sortedMsgs = [...dmMessages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    sortedMsgs.forEach(m => {
      const isSender = m.senderId === user.id;
      const peerId = isSender ? m.receiverId : m.senderId;
      const peerName = isSender ? m.receiverName : m.senderName;
      const peerAvatar = isSender ? m.receiverAvatar : m.senderAvatar;

      const isUnread = !isSender && !readMessageIds.includes(m.id);

      const existing = map.get(peerId);
      const unreadCount = (existing?.unreadCount || 0) + (isUnread ? 1 : 0);

      map.set(peerId, {
        userId: peerId,
        userName: peerName,
        userAvatar: peerAvatar,
        lastMessage: m.text,
        lastMessageTime: m.createdAt,
        unreadCount
      });
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }, [dmMessages, readMessageIds, user.id]);

  const formatInboxTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('fil-PH', { hour: 'numeric', minute: '2-digit' });
      }
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return language === 'tl' ? 'Kahapon' : 'Yesterday';
      }
      return date.toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const totalUnreadCount = dmMessages.filter(
    m => m.receiverId === user.id && !readMessageIds.includes(m.id)
  ).length;

  // --- VOICE/VIDEO CALLING STATES ---
  const [activeCallSession, setActiveCallSession] = useState<any | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const peerConnectionRef = React.useRef<RTCPeerConnection | null>(null);
  const [isLoopbackOn, setIsLoopbackOn] = useState(false);
  const [hasSpeechTriggered, setHasSpeechTriggered] = useState(false);

  // Programmatic ringtone / dialing synthesizer using Web Audio API
  const playCallTone = (isIncoming: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (isIncoming) {
        // High pitch pulsing ring for incoming call
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.35);
      } else {
        // Dial tone ringing
        osc.type = 'sine';
        osc.frequency.setValueAtTime(425, audioCtx.currentTime);
      }
      
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.start();
      
      setTimeout(() => {
        try {
          osc.stop();
          audioCtx.close();
        } catch (e) {}
      }, 400);
    } catch (e) {
      console.log('Web Audio API not supported or awaiting user interaction gesture');
    }
  };

  // Poll for incoming Direct Messages and Call invitations in real-time
  useEffect(() => {
    if (!token) return;
    let active = true;

    const pollDmsAndCalls = async () => {
      try {
        // 1. Fetch direct messages
        const dmRes = await fetch('/api/zone/messages', {
          headers: { 'Authorization': token }
        });
        if (dmRes.ok && active) {
          const dmData = await dmRes.json();
          setDmMessages(dmData.messages || []);
        }

        // 2. Fetch call status
        const callRes = await fetch('/api/zone/calls', {
          headers: { 'Authorization': token }
        });
        if (callRes.ok && active) {
          const callData = await callRes.json();
          const activeCalls = callData.calls || [];
          
          if (activeCalls.length > 0) {
            const currentCall = activeCalls[0];
            
            // Trigger ringtones and set the call session state
            if (!activeCallSession || activeCallSession.id !== currentCall.id) {
              setActiveCallSession(currentCall);
              if (currentCall.callerId !== user.id) {
                playCallTone(true);
                triggerNotification(`🔔 Papasok na ${currentCall.type === 'video' ? 'Video' : 'Voice'} Call mula kay ${currentCall.callerName}!`, 'info');
              } else {
                playCallTone(false);
              }
            } else {
              // Sync existing call status
              setActiveCallSession(currentCall);
              if (currentCall.status === 'ringing') {
                if (currentCall.callerId !== user.id) {
                  playCallTone(true);
                } else {
                  playCallTone(false);
                }
              }
            }
          } else {
            // No active call on the backend, clear call locally if we have one
            if (activeCallSession && activeCallSession.status !== 'ended') {
              setActiveCallSession(null);
              if (localStream) {
                localStream.getTracks().forEach(t => t.stop());
                setLocalStream(null);
              }
              if (remoteStream) {
                remoteStream.getTracks().forEach(t => t.stop());
                setRemoteStream(null);
              }
              if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
              }
              setIsLoopbackOn(false);
              setHasSpeechTriggered(false);
            }
          }
        }

        // 3. Fetch online users list
        const onlineRes = await fetch('/api/zone/online', {
          headers: { 'Authorization': token }
        });
        if (onlineRes.ok && active) {
          const onlineData = await onlineRes.json();
          setOnlineUserIds(onlineData.onlineUserIds || []);
        }
      } catch (err) {
        console.error('Error polling messages/calls:', err);
      }
    };

    // Run immediately and then poll every 1.5 seconds if in active call for fast handshakes, otherwise 3s
    pollDmsAndCalls();
    const intervalId = setInterval(pollDmsAndCalls, activeCallSession ? 1500 : 3000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [token, activeCallSession, user.id]);

  // Hook to request camera/mic streams when a call connects (supports both video & voice)
  useEffect(() => {
    if (activeCallSession && activeCallSession.status === 'accepted') {
      const needsVideo = activeCallSession.type === 'video' && !isVideoOff;
      const needsAudio = true; // always need audio for both voice and video calls
      
      if (!localStream) {
        navigator.mediaDevices.getUserMedia({ video: needsVideo, audio: needsAudio })
          .then(stream => {
            console.log('Media stream retrieved successfully:', needsVideo ? 'video+audio' : 'audio-only');
            setLocalStream(stream);
          })
          .catch(err => {
            console.warn('Media access failed, attempting audio-only fallback:', err);
            if (needsVideo) {
              navigator.mediaDevices.getUserMedia({ video: false, audio: true })
                .then(audioStream => {
                  setLocalStream(audioStream);
                  triggerNotification(
                    language === 'tl'
                      ? 'Hindi mapagana ang camera. Audio lamang ang gagamitin.'
                      : 'Camera failed. Defaulting to audio-only.',
                    'info'
                  );
                })
                .catch(e => {
                  console.error('Audio only fallback failed:', e);
                });
            }
          });
      }
    }
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
    };
  }, [activeCallSession?.status, activeCallSession?.type, isVideoOff]);

  // Handle hardware muting and camera toggles dynamically on the active localStream tracks
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoOff;
      });
    }
  }, [isVideoOff, localStream]);

  // Render local and remote video streams in their respective video players
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Hook to play local loopback audio when testing, or play remote audio for voice call
  useEffect(() => {
    if (remoteAudioRef.current) {
      if (isLoopbackOn && localStream) {
        remoteAudioRef.current.srcObject = localStream;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 0.5; // lower volume to prevent feedback loops
      } else if (remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1.0;
      } else {
        remoteAudioRef.current.srcObject = null;
      }
    }
  }, [isLoopbackOn, localStream, remoteStream]);

  // Trigger synthesized voice on call connection to guarantee they hear a voice announcement
  useEffect(() => {
    if (activeCallSession && activeCallSession.status === 'accepted' && !hasSpeechTriggered) {
      setHasSpeechTriggered(true);
      const peerName = activeCallSession.callerId === user.id ? activeCallSession.receiverName : activeCallSession.callerName;
      
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msgText = language === 'tl'
          ? `Konektado na sa Z-one secure ${activeCallSession.type === 'video' ? 'video' : 'voice'} call kay ${peerName}. Ang inyong koneksyon ay ligtas at handang gamitin.`
          : `Connected to Z-one secure ${activeCallSession.type} call with ${peerName}. Your communication channel is safe and active.`;
        
        const utterance = new SpeechSynthesisUtterance(msgText);
        utterance.rate = 0.95;
        
        if (language === 'tl') {
          const voices = window.speechSynthesis.getVoices();
          const tlVoice = voices.find(v => v.lang.includes('PH') || v.lang.includes('ID') || v.lang.includes('tl'));
          if (tlVoice) utterance.voice = tlVoice;
        }
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [activeCallSession?.status, hasSpeechTriggered]);

  // WebRTC PeerConnection Signaling Handler using polling endpoints
  useEffect(() => {
    if (!activeCallSession || activeCallSession.status !== 'accepted' || !localStream) {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      setRemoteStream(null);
      return;
    }

    const isCaller = activeCallSession.callerId === user.id;
    const callId = activeCallSession.id;

    if (!peerConnectionRef.current) {
      console.log('WebRTC: Initializing peer connection');
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = pc;

      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });

      pc.ontrack = (event) => {
        console.log('WebRTC: Received remote track event:', event.streams);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      const localIceCandidates: any[] = [];
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          localIceCandidates.push(event.candidate);
          const field = isCaller ? 'callerCandidates' : 'receiverCandidates';
          
          fetch('/api/zone/calls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({
              callId,
              [field]: JSON.stringify(localIceCandidates)
            })
          }).catch(err => console.error('Error sending candidates:', err));
        }
      };

      if (isCaller) {
        pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: activeCallSession.type === 'video' })
          .then(offer => pc.setLocalDescription(offer))
          .then(() => {
            console.log('WebRTC: Sending SDP Offer');
            return fetch('/api/zone/calls', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': token },
              body: JSON.stringify({
                callId,
                callerSignal: JSON.stringify(pc.localDescription)
              })
            });
          })
          .catch(err => console.error('WebRTC: Offer creation failed:', err));
      } else {
        if (activeCallSession.callerSignal) {
          const offer = JSON.parse(activeCallSession.callerSignal);
          pc.setRemoteDescription(new RTCSessionDescription(offer))
            .then(() => pc.createAnswer())
            .then(answer => pc.setLocalDescription(answer))
            .then(() => {
              console.log('WebRTC: Sending SDP Answer');
              return fetch('/api/zone/calls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify({
                  callId,
                  receiverSignal: JSON.stringify(pc.localDescription)
                })
              });
            })
            .catch(err => console.error('WebRTC: Answer creation failed:', err));
        }
      }
    } else {
      const pc = peerConnectionRef.current;

      if (isCaller && activeCallSession.receiverSignal && pc.signalingState === 'have-local-offer') {
        const answer = JSON.parse(activeCallSession.receiverSignal);
        pc.setRemoteDescription(new RTCSessionDescription(answer))
          .then(() => console.log('WebRTC: Remote description set on caller'))
          .catch(err => console.error('WebRTC: Error setting remote description on caller:', err));
      }

      const remoteCandStr = isCaller ? activeCallSession.receiverCandidates : activeCallSession.callerCandidates;
      if (remoteCandStr) {
        try {
          const candidates = JSON.parse(remoteCandStr);
          candidates.forEach((cand: any) => {
            pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          });
        } catch (e) {}
      }
    }
  }, [activeCallSession?.status, activeCallSession?.callerSignal, activeCallSession?.receiverSignal, activeCallSession?.callerCandidates, activeCallSession?.receiverCandidates, localStream]);

  // Handler to open DM modal with a specific user
  const handleOpenDm = (targetUser: { id: string; name: string; avatar: string }) => {
    if (targetUser.id === user.id) {
      triggerNotification(
        language === 'tl' ? 'Hindi mo pwedeng i-message ang iyong sarili.' : 'You cannot message yourself.',
        'error'
      );
      return;
    }
    setActiveDmUser(targetUser);
  };

  // Handler to send message
  const handleSendDm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeDmUser || !newDmText.trim()) return;

    try {
      const res = await fetch('/api/zone/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          receiverId: activeDmUser.id,
          text: newDmText
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDmMessages(prev => [...prev, data.message]);
        setNewDmText('');
        // Instantly focus scroll
        setTimeout(() => {
          const chatContainer = document.getElementById('dm-chat-scroll');
          if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 100);
      } else {
        const errData = await res.json();
        triggerNotification(errData.error || 'Failed to send message', 'error');
      }
    } catch (err) {
      console.error('Error sending DM:', err);
    }
  };

  // Handler to initiate voice/video call
  const handleStartCall = async (type: 'voice' | 'video') => {
    if (!activeDmUser) return;
    try {
      const res = await fetch('/api/zone/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          receiverId: activeDmUser.id,
          type
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveCallSession(data.call);
        triggerNotification(
          language === 'tl' ? `Tinatawagan si ${activeDmUser.name}...` : `Calling ${activeDmUser.name}...`,
          'success'
        );
      } else {
        const errData = await res.json();
        triggerNotification(errData.error || 'Failed to start call', 'error');
      }
    } catch (err) {
      console.error('Error starting call:', err);
    }
  };

  // Handler to accept an incoming call
  const handleAcceptCall = async () => {
    if (!activeCallSession) return;
    try {
      const res = await fetch('/api/zone/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          callId: activeCallSession.id,
          status: 'accepted'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveCallSession(data.call);
        triggerNotification(
          language === 'tl' ? 'Konektado na ang tawag!' : 'Call connected successfully!',
          'success'
        );
      }
    } catch (err) {
      console.error('Error accepting call:', err);
    }
  };

  // Handler to decline or hangup a call
  const handleDeclineOrHangup = async () => {
    if (!activeCallSession) return;
    try {
      // Determine new status based on roles
      const isCaller = activeCallSession.callerId === user.id;
      const targetStatus = isCaller ? 'ended' : 'declined';

      await fetch('/api/zone/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          callId: activeCallSession.id,
          status: targetStatus
        })
      });

      // Instantly clear call state locally
      setActiveCallSession(null);
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      triggerNotification(
        language === 'tl' ? 'Tinapos ang tawag.' : 'Call ended.',
        'info'
      );
    } catch (err) {
      console.error('Error ending call:', err);
    }
  };

  // Z-one Social Free/Basic Mode State
  const [isBasicMode, setIsBasicMode] = useState<boolean>(() => {
    return localStorage.getItem('zone_basic_mode') === 'true';
  });
  const [revealedMedia, setRevealedMedia] = useState<Set<string>>(new Set());

  const handleToggleBasicMode = (val: boolean) => {
    setIsBasicMode(val);
    localStorage.setItem('zone_basic_mode', String(val));
    if (val) {
      triggerNotification(
        language === 'tl'
          ? 'Naka-ON na ang Basic Mode (Libre)! Itinago muna ang mga larawan at video para makatipid sa load.'
          : 'Basic Mode is ON! Photos and videos are temporarily hidden to save mobile data.',
        'info'
      );
    } else {
      triggerNotification(
        language === 'tl'
          ? 'Naka-OFF na ang Basic Mode. Ilo-load na muli ang lahat ng larawan at video.'
          : 'Basic Mode is OFF. All images and videos will load normally.',
        'success'
      );
    }
  };

  const renderFeedAvatar = (
    avatarUrl: string | undefined, 
    name: string, 
    sizeClass: string = "w-10 h-10", 
    textClass: string = "text-base",
    userId?: string
  ) => {
    const fallbackChar = name ? name.charAt(0).toUpperCase() : '👤';
    const isEmoji = avatarUrl && avatarUrl.length <= 4;
    
    let avatarEl;

    if (isBasicMode) {
      // In Basic Mode, skip base64/url images to simulate saving data, but allow emojis
      if (isEmoji) {
        avatarEl = (
          <div className={`${sizeClass} bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 shrink-0`}>
            <span className={textClass}>{avatarUrl}</span>
          </div>
        );
      } else {
        avatarEl = (
          <div className={`${sizeClass} rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black select-none border border-blue-200 shrink-0 ${textClass}`}>
            {fallbackChar}
          </div>
        );
      }
    } else if (avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:') || avatarUrl.startsWith('blob:'))) {
      avatarEl = (
        <img 
          src={avatarUrl} 
          alt={name} 
          className={`${sizeClass} rounded-full object-cover border border-slate-200 shadow-sm shrink-0`} 
          referrerPolicy="no-referrer" 
        />
      );
    } else {
      avatarEl = (
        <div className={`${sizeClass} rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0`}>
          <span className={`select-none ${textClass}`}>{avatarUrl || '👤'}</span>
        </div>
      );
    }

    if (userId) {
      const isOnline = userId === user.id || onlineUserIds.includes(userId);
      return (
        <div className="relative inline-block shrink-0">
          {avatarEl}
          {isOnline ? (
            <span className="absolute bottom-0 right-0 flex h-3 w-3 translate-x-0.5 translate-y-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white"></span>
            </span>
          ) : (
            <span 
              className="absolute bottom-0 right-0 block h-3 w-3 translate-x-0.5 translate-y-0.5 rounded-full bg-rose-500 border border-white shadow-xs" 
              title="Offline"
            />
          )}
        </div>
      );
    }

    return avatarEl;
  };

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

  // Share post state
  const [sharingPostId, setSharingPostId] = useState<string | null>(null);
  const [shareCaptionText, setShareCaptionText] = useState('');
  const [isSharingPost, setIsSharingPost] = useState(false);

  // Moderation tab / list for admin
  const [modUsers, setModUsers] = useState<any[]>([]);
  const [showModPanel, setShowModPanel] = useState(false);
  const [loadingModUsers, setLoadingModUsers] = useState(false);

  const fetchPosts = async (silent: boolean = false) => {
    if (!silent) setLoadingPosts(true);
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
      if (!silent) setLoadingPosts(false);
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
      if (!loadingModUsers) setLoadingModUsers(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    if (user.isAdmin) {
      fetchModUsers();
    }

    // Auto-refresh the feed every 10 seconds silently like Facebook
    const interval = setInterval(() => {
      fetchPosts(true);
    }, 10000);

    return () => clearInterval(interval);
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
        
        // Optimistically prepend the new post to the local state list immediately
        if (data.post) {
          setPosts(prev => [data.post, ...prev]);
        }
        
        // Fetch silently in the background
        fetchPosts(true);
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

  const handleSharePost = async (postId: string, customCaption: string) => {
    setIsSharingPost(true);
    try {
      const res = await fetch(`/api/zone/posts/${postId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ text: customCaption })
      });

      const data = await res.json();
      if (res.ok) {
        triggerNotification(
          language === 'tl' ? 'Matagumpay na na-share ang post! 📢' : 'Successfully shared the post! 📢',
          'success'
        );
        setSharingPostId(null);
        setShareCaptionText('');
        
        // Optimistically prepend the new shared post to the local state list immediately
        if (data.post) {
          setPosts(prev => [data.post, ...prev]);
        }
        
        // Fetch silently in the background
        fetchPosts(true);
      } else {
        triggerNotification(data.error || 'Hindi ma-share ang post.', 'error');
      }
    } catch (err) {
      triggerNotification('Koneksyon error sa pag-share.', 'error');
    } finally {
      setIsSharingPost(false);
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

      {/* 📶 PHILIPPINE FREE/BASIC MODE CONTROL BAR */}
      <div className={`rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border shadow-xs transition-all duration-300 ${
        isBasicMode 
          ? 'bg-slate-900 border-slate-800 text-white' 
          : 'bg-indigo-50 border-indigo-100 text-indigo-950'
      }`}>
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isBasicMode ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isBasicMode ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
          </span>
          <div className="text-xs space-y-0.5">
            {isBasicMode ? (
              <>
                <p className="font-extrabold text-amber-400 uppercase tracking-wider text-[10px] sm:text-xs">
                  🇵🇭 Naka-Basic Mode Ka (Free Data)
                </p>
                <p className="text-[10px] sm:text-xs text-slate-300 font-semibold">
                  Naitago ang mga payout screenshot, preset photos, at videos para makatipid sa mobile load/data. Libreng mag-post at mag-interact!
                </p>
              </>
            ) : (
              <>
                <p className="font-extrabold text-indigo-800 uppercase tracking-wider text-[10px] sm:text-xs">
                  🌐 Naka-Normal Mode Ka (With Data)
                </p>
                <p className="text-[10px] sm:text-xs text-indigo-900/85 font-semibold">
                  Ilo-load ang lahat ng profile pics at payout screenshots. Lumipat sa Basic Mode kung ubos na ang iyong mobile internet load.
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end">
          {isBasicMode ? (
            <button
              onClick={() => handleToggleBasicMode(false)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] sm:text-xs px-4 py-2 rounded-xl cursor-pointer shadow-md transition"
            >
              🌐 Use Normal Mode
            </button>
          ) : (
            <button
              onClick={() => handleToggleBasicMode(true)}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] sm:text-xs px-4 py-2 rounded-xl cursor-pointer shadow-md transition"
            >
              📶 Go to Basic Mode (Libre)
            </button>
          )}
        </div>
      </div>
      
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
              onClick={handleOpenInbox}
              className="relative bg-white text-indigo-700 hover:bg-indigo-50 border border-slate-250 font-black text-xs px-4 py-2.5 rounded-2xl cursor-pointer transition flex items-center gap-2 shadow-xs"
            >
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span>{language === 'tl' ? 'Mga Mensahe' : 'Messages'}</span>
              {totalUnreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-white animate-bounce">
                  {totalUnreadCount}
                </span>
              )}
            </button>
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
                      <div className="relative inline-block select-none">
                        <span className="text-2xl">{u.avatar || '👤'}</span>
                        {(u.id === user.id || onlineUserIds.includes(u.id)) ? (
                          <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-950"></span>
                          </span>
                        ) : (
                          <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-rose-500 border border-slate-950" />
                        )}
                      </div>
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
          
          {/* MEDIA HUB SUB-NAVIGATION TABS */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap items-center gap-1 border border-slate-200">
            <button 
              onClick={() => setSocialTab('feed')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${socialTab === 'feed' ? 'bg-white text-blue-600 shadow-xs border border-slate-200/50 font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Z-one Social</span>
            </button>
            <button 
              onClick={() => setSocialTab('livetv')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${socialTab === 'livetv' ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/50 font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
            >
              <Tv className="w-4 h-4" />
              <span>PH Live TV Streams</span>
            </button>
            <button 
              onClick={() => setSocialTab('netflix')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${socialTab === 'netflix' ? 'bg-white text-rose-600 shadow-xs border border-rose-200/50 font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
            >
              <Film className="w-4 h-4" />
              <span>Netflix Free Videos</span>
            </button>
          </div>

          {/* TAB CONTENT: 1. CORE FEED */}
          {socialTab === 'feed' && (
            <div className="space-y-6 animate-fadeIn">
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
                        <button
                          onClick={() => handleOpenDm({ id: post.userId, name: post.userName, avatar: post.userAvatar || '👤' })}
                          className="leading-none shrink-0 select-none block hover:scale-105 transition cursor-pointer text-left focus:outline-hidden"
                          title="I-Message o Tawagan"
                        >
                          {renderFeedAvatar(post.userAvatar, post.userName, "w-10 h-10", "text-xl", post.userId)}
                        </button>
                        <div>
                          <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenDm({ id: post.userId, name: post.userName, avatar: post.userAvatar || '👤' })}
                              className="hover:underline hover:text-blue-600 font-extrabold cursor-pointer text-left transition focus:outline-hidden"
                              title="I-Message o Tawagan"
                            >
                              {post.userName}
                            </button>
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
                      {post.text && (
                        <p className="text-slate-800 text-xs font-semibold leading-relaxed whitespace-pre-wrap">
                          {post.text}
                        </p>
                      )}

                      {/* Render Shared Post Reference */}
                      {post.sharedPost && (
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3 shadow-xs">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenDm({ id: post.sharedPost.userId, name: post.sharedPost.userName, avatar: post.sharedPost.userAvatar || '👤' })}
                              className="leading-none shrink-0 select-none block hover:scale-105 transition cursor-pointer text-left focus:outline-hidden"
                              title="I-Message o Tawagan"
                            >
                              {renderFeedAvatar(post.sharedPost.userAvatar, post.sharedPost.userName, "w-8 h-8", "text-sm", post.sharedPost.userId)}
                            </button>
                            <div>
                              <div className="font-extrabold text-slate-850 text-[11px] leading-tight flex items-center gap-1.5">
                                <button
                                  onClick={() => handleOpenDm({ id: post.sharedPost.userId, name: post.sharedPost.userName, avatar: post.sharedPost.userAvatar || '👤' })}
                                  className="hover:underline hover:text-blue-600 font-extrabold cursor-pointer text-left transition focus:outline-hidden"
                                  title="I-Message o Tawagan"
                                >
                                  {post.sharedPost.userName}
                                </button>
                                {post.sharedPost.userId === 'admin-rosco' && (
                                  <span className="bg-blue-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase">Admin</span>
                                )}
                              </div>
                              <span className="text-[8px] text-slate-400 block font-mono">
                                {new Date(post.sharedPost.createdAt).toLocaleString('fil-PH', { hour12: true, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          
                          {post.sharedPost.text && (
                            <p className="text-slate-700 text-xs font-semibold leading-relaxed whitespace-pre-wrap">
                              {post.sharedPost.text}
                            </p>
                          )}

                          {post.sharedPost.mediaUrl && (
                            <>
                              {isBasicMode && !revealedMedia.has(post.sharedPost.id) ? (
                                <div className="bg-slate-100/50 border border-slate-200 rounded-xl p-3 text-center space-y-2">
                                  <p className="text-[10px] font-black text-slate-600">
                                    {post.sharedPost.mediaType === 'image' ? '📷 Larawan (Naitago sa Basic Mode)' : '🎥 Video (Naitago sa Basic Mode)'}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRevealedMedia(prev => {
                                        const next = new Set(prev);
                                        next.add(post.sharedPost!.id);
                                        return next;
                                      });
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] px-2.5 py-1 rounded-lg cursor-pointer transition"
                                  >
                                    👁️ Load Photo/Video
                                  </button>
                                </div>
                              ) : (
                                <>
                                  {post.sharedPost.mediaType === 'image' && (
                                    <div className="rounded-xl overflow-hidden border border-slate-200">
                                      <img src={post.sharedPost.mediaUrl} alt="Shared Attachment" className="w-full max-h-60 object-cover" referrerPolicy="no-referrer" />
                                    </div>
                                  )}
                                  {post.sharedPost.mediaType === 'video' && (
                                    <div className="rounded-xl overflow-hidden border border-slate-200">
                                      <video src={post.sharedPost.mediaUrl} controls className="w-full max-h-60 object-cover" />
                                    </div>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Attached Media Render */}
                      {post.mediaUrl && (
                        <>
                          {isBasicMode && !revealedMedia.has(post.id) ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-3">
                              <div className="space-y-1">
                                <p className="text-xs font-black text-slate-700">
                                  {post.mediaType === 'image' ? '📷 Larawan (Naitago sa Basic Mode)' : '🎥 Video (Naitago sa Basic Mode)'}
                                </p>
                                <p className="text-[10px] text-slate-450 font-semibold">
                                  {language === 'tl' 
                                    ? 'I-click ang button upang ipakita ang larawang ito gamit ang iyong mobile data.' 
                                    : 'Click the button below to load this media using standard data.'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setRevealedMedia(prev => {
                                    const next = new Set(prev);
                                    next.add(post.id);
                                    return next;
                                  });
                                  triggerNotification(
                                    language === 'tl' ? 'Niloload na ang larawan gamit ang normal data...' : 'Loading media using standard data...',
                                    'info'
                                  );
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] px-3.5 py-1.5 rounded-xl cursor-pointer shadow-xs transition"
                              >
                                {language === 'tl' ? '👁️ Panoorin ang Larawan' : '👁️ Load Photo/Video'}
                              </button>
                            </div>
                          ) : (
                            <>
                              {post.mediaType === 'image' && (
                                <div className="rounded-2xl overflow-hidden border border-slate-100 relative">
                                  <img src={post.mediaUrl} alt="Post Attachment" className="w-full max-h-80 object-cover" referrerPolicy="no-referrer" />
                                  {isBasicMode && (
                                    <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                                      Loaded via Mobile Data
                                    </span>
                                  )}
                                </div>
                              )}

                              {post.mediaType === 'video' && (
                                <div className="rounded-2xl overflow-hidden border border-slate-100 relative">
                                  <video src={post.mediaUrl} controls className="w-full max-h-80 object-cover" />
                                  {isBasicMode && (
                                    <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                                      Loaded via Mobile Data
                                    </span>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </>
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

                      <button
                        onClick={() => {
                          setSharingPostId(post.id);
                          setShareCaptionText('');
                        }}
                        className="flex-1 py-2 rounded-xl text-xs font-black text-slate-650 hover:bg-slate-100 cursor-pointer transition flex items-center justify-center gap-1.5"
                      >
                        <Share2 className="w-4 h-4 text-slate-500" />
                        <span>{language === 'tl' ? 'I-share' : 'Share'}</span>
                      </button>
                    </div>

                    {/* Comments section */}
                    <div className="bg-slate-50/30 p-4 space-y-3">
                      
                      {/* Comment input form */}
                      <div className="flex gap-2 items-center">
                        <span className="leading-none shrink-0 select-none block">
                          {renderFeedAvatar(user.avatar, user.name, "w-7 h-7", "text-xs", user.id)}
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

                      {/* Comments list - Scrollable Facebook Style */}
                      {post.comments && post.comments.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 max-h-64 overflow-y-auto pr-1">
                          {post.comments.map((comm) => (
                            <div key={comm.id} className="flex gap-2.5 items-start">
                              <button
                                onClick={() => handleOpenDm({ id: comm.userId, name: comm.userName, avatar: comm.userAvatar || '👤' })}
                                className="leading-none shrink-0 select-none block hover:scale-105 transition cursor-pointer text-left focus:outline-hidden"
                                title="I-Message o Tawagan"
                              >
                                {renderFeedAvatar(comm.userAvatar, comm.userName, "w-6 h-6", "text-[10px]", comm.userId)}
                              </button>
                              <div className="bg-slate-100 p-2.5 rounded-2xl flex-1 space-y-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    onClick={() => handleOpenDm({ id: comm.userId, name: comm.userName, avatar: comm.userAvatar || '👤' })}
                                    className="hover:underline hover:text-blue-600 font-extrabold cursor-pointer text-left transition focus:outline-hidden text-[10px]"
                                    title="I-Message o Tawagan"
                                  >
                                    {comm.userName}
                                  </button>
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
          )}

          {/* TAB CONTENT: 2. PH LIVE TV STREAMS (M3U8 HLS PLAYER) */}
          {socialTab === 'livetv' && (() => {
            const filteredStreams = liveTvStreams.filter((stream: any) => {
              const query = liveTvSearchQuery.toLowerCase();
              return (
                stream.name.toLowerCase().includes(query) ||
                stream.network.toLowerCase().includes(query)
              );
            });

            return (
              <div className="space-y-6 animate-fadeIn">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-rose-600 via-red-600 to-indigo-700 text-white rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 text-white/10 text-9xl font-black select-none pointer-events-none font-mono">LIVE</div>
                  <div className="relative z-10 space-y-2 flex-1">
                    <span className="bg-white/20 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border border-white/10">Z-one Broadcast TV</span>
                    <h3 className="text-xl font-black">{language === 'tl' ? 'Pilipinas Live TV Stream' : 'Philippines Live TV Stream'}</h3>
                    <p className="text-xs text-white/90 font-medium leading-relaxed">
                      {language === 'tl'
                        ? 'Manood ng mga pampublikong estasyon at lokal na balita sa bansa gamit ang totoong M3U8 feed! Piliin lamang ang estasyon sa ibaba.'
                        : 'Watch Philippine public broadcast stations and local channels live in real-time with direct M3U8 streams.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshLiveTv}
                    disabled={isRefreshingLiveTv}
                    className="relative z-10 bg-white hover:bg-slate-100 disabled:opacity-50 text-rose-600 text-[10px] font-black px-4 py-2.5 rounded-xl uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition shadow-xs cursor-pointer w-full md:w-auto justify-center"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLiveTv ? 'animate-spin' : ''}`} />
                    <span>{language === 'tl' ? 'I-refresh ang Channels' : 'Refresh Channels'}</span>
                  </button>
                </div>

                {/* Active Broadcast Player */}
                {selectedLiveTv && (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-4 animate-slideUp">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          {language === 'tl' ? 'Kasalukuyang I-na-stream' : 'Now Streaming'}
                        </span>
                      </div>
                      <span className="bg-rose-100 text-rose-700 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-rose-200/50">
                        {selectedLiveTv.network}
                      </span>
                    </div>

                    <M3U8Player
                      url={selectedLiveTv.url}
                      title={selectedLiveTv.name}
                      language={language}
                      triggerNotification={triggerNotification}
                    />

                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl leading-none select-none">{selectedLiveTv.logo}</span>
                        <h4 className="font-extrabold text-slate-900 text-base leading-snug">{selectedLiveTv.name}</h4>
                      </div>
                      <p className="text-xs text-slate-600 font-semibold leading-relaxed">{selectedLiveTv.description}</p>
                      
                      {/* Help/Troubleshooting Note */}
                      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-[10px] text-slate-500 font-medium leading-relaxed space-y-1 mt-2">
                        <span className="font-black text-slate-700 block uppercase tracking-wider">💡 Troubleshooting Tips:</span>
                        <p>{language === 'tl' 
                          ? '1. Kung hindi naglo-load o nag-e-error, maaari itong sanhi ng browser CORS/security block o offline ang source feed.'
                          : '1. If the stream fails to load or shows an error, it may be due to browser CORS security blocks or the feed being temporarily offline.'}</p>
                        <p>{language === 'tl'
                          ? '2. Ang CLTV 36, Abante TV, at Hope Channel ay nagbibigay ng matatag at pampublikong stream sa buong Pilipinas.'
                          : '2. CLTV 36, Abante TV, and Hope Channel provide robust, highly-stable public streaming services.'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Station Search bar */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest pl-0.5">
                        {language === 'tl' ? 'PAGHAHANAP NG ESTASYON' : 'STATION SEARCH & EXPLORE'}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {language === 'tl' 
                          ? `Mayroong ${liveTvStreams.length} available na channels mula sa registry.` 
                          : `Explore and play any of the ${liveTvStreams.length} live channels from the registry.`}
                      </p>
                    </div>
                    {isRefreshingLiveTv && (
                      <span className="bg-rose-50 text-rose-600 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
                        Updating Registry...
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder={language === 'tl' ? 'Maghanap ng channel, balita, sports, anime...' : 'Search for channels by name, network, category...'}
                      value={liveTvSearchQuery}
                      onChange={(e) => setLiveTvSearchQuery(e.target.value)}
                      className="w-full text-xs font-semibold text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white focus:outline-none rounded-xl px-4 py-3 pr-10 transition shadow-inner"
                    />
                    {liveTvSearchQuery && (
                      <button
                        onClick={() => setLiveTvSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-black"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Channel Selector Grid */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest pl-1">
                    {language === 'tl' ? 'MGA LOKAL NA ESTASYON' : 'AVAILABLE LOCAL CHANNELS'}
                  </h4>

                  {isRefreshingLiveTv ? (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-12 text-center space-y-2 animate-pulse">
                      <RefreshCw className="w-6 h-6 text-rose-600 animate-spin mx-auto" />
                      <p className="text-[11px] text-slate-600 font-extrabold uppercase tracking-wider">
                        {language === 'tl' ? 'Ina-update ang listahan ng channels...' : 'Updating channel lists...'}
                      </p>
                    </div>
                  ) : filteredStreams.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-2">
                      <div className="text-3xl">📺</div>
                      <h5 className="font-extrabold text-slate-800 text-xs">
                        {language === 'tl' ? 'Walang nahanap na channel' : 'No Channels Found'}
                      </h5>
                      <p className="text-[10px] text-slate-400 max-w-xs mx-auto font-semibold">
                        {language === 'tl'
                          ? `Walang tumutugmang estasyon para sa "${liveTvSearchQuery}". Subukang maghanap ng iba o i-refresh ang registry.`
                          : `No channels matched your query "${liveTvSearchQuery}". Try adjusting your keywords or refresh the stream registry.`}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredStreams.map((st) => {
                        const isCurrentlyPlaying = selectedLiveTv?.id === st.id || selectedLiveTv?.url === st.url;
                        return (
                          <button
                            key={st.id || st.url}
                            type="button"
                            onClick={() => {
                              setSelectedLiveTv(st);
                              triggerNotification(
                                language === 'tl'
                                  ? `Lumilipat sa ${st.name}...`
                                  : `Switching to ${st.name}...`,
                                'info'
                              );
                            }}
                            className={`text-left rounded-2xl border p-4 transition flex flex-col justify-between space-y-3 cursor-pointer ${
                              isCurrentlyPlaying
                                ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                            }`}
                          >
                            <div className="space-y-2 w-full">
                              <div className="flex items-center justify-between w-full">
                                <span className="bg-slate-100 text-slate-700 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-200 truncate max-w-[150px]">
                                  {st.network}
                                </span>
                                {isCurrentlyPlaying && (
                                  <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md animate-pulse shrink-0">
                                    ON AIR
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-start gap-2 pt-1">
                                <span className="text-xl leading-none select-none pt-0.5 shrink-0">{st.logo}</span>
                                <div className="space-y-0.5 min-w-0">
                                  <h5 className="font-extrabold text-slate-950 text-xs leading-snug line-clamp-1">{st.name}</h5>
                                  <p className="text-[10px] text-slate-500 font-semibold leading-normal line-clamp-2">{st.description}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100/60 text-[9px] font-bold">
                              <span className={isCurrentlyPlaying ? 'text-rose-600' : 'text-slate-500'}>
                                {isCurrentlyPlaying ? '● Currently Playing' : 'Click to Tune In'}
                              </span>
                              <span className="text-blue-600 uppercase tracking-wider hover:underline">
                                HLS Stream
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB CONTENT: 3. NETFLIX FREE VIDEOS */}
          {socialTab === 'netflix' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-rose-950 text-white rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-rose-900/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-rose-600 font-extrabold text-lg select-none">NETFLIX</span>
                    <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider">FREE WATCH</span>
                  </div>
                  <p className="text-[11px] text-rose-200 font-medium leading-relaxed">
                    {language === 'tl'
                      ? 'Manood ng mga pinakabagong libreng videos, official trailers, at teasers mula sa Netflix! I-refresh para makita ang mga bagong uploads.'
                      : 'Watch the latest free videos, official trailers, and teasers available on Netflix! Refresh to load new updates.'}
                  </p>
                </div>
                <button
                  onClick={handleRefreshNetflix}
                  disabled={isRefreshingNetflix}
                  className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition cursor-pointer self-stretch sm:self-auto justify-center"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingNetflix ? 'animate-spin' : ''}`} />
                  <span>{language === 'tl' ? 'Mag-refresh' : 'Refresh Videos'}</span>
                </button>
              </div>

              {isRefreshingNetflix ? (
                <div className="bg-slate-900 rounded-3xl border border-slate-800 p-16 text-center space-y-3 animate-pulse">
                  <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
                  <p className="text-xs text-rose-300 font-bold uppercase tracking-widest">
                    {language === 'tl' ? 'Kumokonekta sa Netflix Feed...' : 'Connecting to Netflix Video Feed...'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    {language === 'tl' ? 'Kinukuha ang pinakabagong free videos na available...' : 'Fetching latest available free videos...'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {netflixVideos.map((video) => (
                    <div 
                      key={video.id} 
                      onClick={() => setSelectedNetflixVideo(video)}
                      className="bg-slate-950 text-white rounded-3xl border border-slate-800 hover:border-slate-700 hover:shadow-lg cursor-pointer transition overflow-hidden flex flex-col group relative"
                    >
                      {/* Video Thumbnail with Play Overlay */}
                      <div className="aspect-video w-full relative overflow-hidden bg-slate-900">
                        <img 
                          src={video.image} 
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-80"
                          referrerPolicy="no-referrer"
                        />
                        {/* Play overlay button */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition">
                          <span className="bg-rose-600 text-white p-3 rounded-full shadow-lg group-hover:scale-110 transition duration-300">
                            <Play className="w-5 h-5 fill-current" />
                          </span>
                        </div>
                        {/* Badge category */}
                        <span className={`absolute top-3 left-3 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shadow-sm ${video.badgeColor}`}>
                          {video.category}
                        </span>
                        {/* Duration badge */}
                        <span className="absolute bottom-3 right-3 bg-black/70 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                          {video.duration}
                        </span>
                      </div>

                      {/* Video description metadata */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] text-rose-400 font-extrabold uppercase tracking-wider">{video.source}</span>
                            <span className="text-[9px] text-emerald-400 font-bold uppercase font-mono">{video.likes} Likes</span>
                          </div>
                          <h4 className="font-extrabold text-slate-100 text-xs leading-snug group-hover:text-rose-500 transition">
                            {video.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed line-clamp-2">
                            {video.description}
                          </p>
                        </div>

                        {/* Tags & Action row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900">
                          <div className="flex flex-wrap gap-1">
                            {video.tags.map((tag: string, index: number) => (
                              <span key={index} className="text-[8px] bg-slate-900 text-slate-300 font-bold px-1.5 py-0.5 rounded border border-slate-800">
                                #{tag}
                              </span>
                            ))}
                          </div>
                          <span className="text-[8px] text-rose-500 font-black uppercase font-mono tracking-wider">{video.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* 🔄 SHARING POST DIALOG / MODAL */}
      <AnimatePresence>
        {sharingPostId && (() => {
          const targetPost = posts.find(p => p.id === sharingPostId);
          if (!targetPost) return null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 text-slate-800"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-blue-600" />
                    <span>{language === 'tl' ? 'I-share ang Post na Ito' : 'Share This Post'}</span>
                  </h3>
                  <button 
                    onClick={() => setSharingPostId(null)}
                    className="text-slate-400 hover:text-slate-600 font-extrabold text-xs bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full px-3 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                    {language === 'tl' ? 'Magdagdag ng Caption o Reaksyon (Opsyonal)' : 'Add a Caption or Thoughts (Optional)'}
                  </label>
                  <textarea
                    value={shareCaptionText}
                    onChange={(e) => setShareCaptionText(e.target.value)}
                    placeholder={language === 'tl' ? 'Ano ang masasabi mo sa post na ito?' : 'What do you think about this post?'}
                    className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none text-slate-800 bg-slate-50"
                  />
                </div>

                {/* Preview of what is being shared */}
                <div className="border border-slate-100 rounded-2xl p-3 bg-slate-50/50 space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <span className="leading-none shrink-0 select-none block">
                      {renderFeedAvatar(targetPost.userAvatar, targetPost.userName, "w-6 h-6", "text-xs", targetPost.userId)}
                    </span>
                    <div>
                      <span className="font-extrabold text-slate-800 text-[10px] leading-tight block">{targetPost.userName}</span>
                      <span className="text-[8px] text-slate-400 font-mono">
                        {new Date(targetPost.createdAt).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-650 text-[11px] font-semibold line-clamp-2 leading-relaxed">
                    {targetPost.text}
                  </p>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setSharingPostId(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl cursor-pointer transition"
                  >
                    {language === 'tl' ? 'Kanselahin' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    disabled={isSharingPost}
                    onClick={() => handleSharePost(targetPost.id, shareCaptionText)}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black rounded-xl cursor-pointer shadow-sm transition flex items-center gap-1.5"
                  >
                    {isSharingPost ? (
                      <span>{language === 'tl' ? 'Sineshare...' : 'Sharing...'}</span>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{language === 'tl' ? 'I-share Ngayon' : 'Share Now'}</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* 💬 PRIVATE DIRECT MESSAGE (DM) MODAL */}
      <AnimatePresence>
        {activeDmUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[520px] text-slate-800"
            >
              {/* Header */}
              <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="leading-none select-none block">
                    {renderFeedAvatar(activeDmUser.avatar, activeDmUser.name, "w-9 h-9", "text-sm", activeDmUser.id)}
                  </span>
                  <div className="text-left">
                    <h3 className="font-extrabold text-slate-950 text-xs leading-none">{activeDmUser.name}</h3>
                    {(onlineUserIds.includes(activeDmUser.id) || activeDmUser.id === user.id) ? (
                      <span className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>{language === 'tl' ? 'Aktibo Ngayon' : 'Active Now'}</span>
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-extrabold flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        <span>{language === 'tl' ? 'Hindi Aktibo' : 'Offline'}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Call buttons */}
                  <button 
                    onClick={() => handleStartCall('voice')}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl cursor-pointer transition focus:outline-hidden"
                    title={language === 'tl' ? 'Voice Call' : 'Voice Call'}
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleStartCall('video')}
                    className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl cursor-pointer transition focus:outline-hidden"
                    title={language === 'tl' ? 'Video Call' : 'Video Call'}
                  >
                    <Video className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setActiveDmUser(null)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl cursor-pointer transition focus:outline-hidden"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message scroll container */}
              <div id="dm-chat-scroll" className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {dmMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-1">
                    <span className="text-2xl select-none">👋</span>
                    <p className="text-xs font-black text-slate-700">{language === 'tl' ? `Simulan ang usapan kay ${activeDmUser.name}` : `Say hello to ${activeDmUser.name}`}</p>
                    <p className="text-[10px] text-slate-450 font-semibold">{language === 'tl' ? 'Maaari kayong mag-usap at mag-tawagan nang ligtas.' : 'You can message each other and place secure calls.'}</p>
                  </div>
                ) : (
                  dmMessages
                    .filter(msg => (msg.senderId === user.id && msg.receiverId === activeDmUser.id) || (msg.senderId === activeDmUser.id && msg.receiverId === user.id))
                    .map((msg) => {
                      const isMe = msg.senderId === user.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs font-semibold leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-br-none shadow-xs text-left' : 'bg-slate-250 text-slate-900 rounded-bl-none text-left'}`}>
                            <p>{msg.text}</p>
                            <span className={`text-[8px] block mt-1 font-mono text-right ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString('fil-PH', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Message Input form */}
              <form onSubmit={handleSendDm} className="p-3 border-t border-slate-150 flex items-center gap-2 bg-white">
                <input
                  type="text"
                  value={newDmText}
                  onChange={(e) => setNewDmText(e.target.value)}
                  placeholder={language === 'tl' ? 'Sumulat ng mensahe...' : 'Write a message...'}
                  className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl px-4 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-slate-800"
                />
                <button
                  type="submit"
                  disabled={!newDmText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white p-2.5 rounded-2xl cursor-pointer transition flex items-center justify-center shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📞 INCOMING/OUTGOING VOICE & VIDEO CALL OVERLAY */}
      <AnimatePresence>
        {activeCallSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md">
            {/* Hidden elements to handle playing the actual stream audio output so they hear each other */}
            <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

            {activeCallSession.status === 'accepted' && activeCallSession.type === 'video' ? (
              // 🎥 FACEBOOK-STYLE FULL SCREEN VIDEO CALL LAYOUT
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full h-full bg-slate-950 text-white flex flex-col justify-between overflow-hidden"
              >
                {/* 1. REMOTE VIDEO (occupies the entire background) */}
                <div className="absolute inset-0 w-full h-full z-0 bg-slate-900">
                  {remoteStream ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    // Elegant waiting background
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 relative">
                      <div className="relative mb-6">
                        <span className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping scale-150"></span>
                        <div className="w-32 h-32 rounded-full bg-rose-600 flex items-center justify-center text-5xl shadow-2xl border-4 border-slate-800 select-none">
                          {activeCallSession.callerId === user.id ? '👤' : (activeCallSession.callerAvatar || '👤')}
                        </div>
                      </div>
                      <h3 className="text-xl font-extrabold text-white">
                        {activeCallSession.callerId === user.id ? activeCallSession.receiverName : activeCallSession.callerName}
                      </h3>
                      <p className="text-xs text-rose-400 font-bold uppercase tracking-widest font-mono mt-2 animate-pulse">
                        {language === 'tl' ? 'Kumukuha ng secure stream...' : 'Acquiring secure stream...'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold max-w-xs text-center mt-3 leading-relaxed px-4">
                        {language === 'tl' 
                          ? 'Awtomatikong mag-kokonekta gamit ang WebRTC kapag nakapasok ang receiver.'
                          : 'Automatically establishing real-time WebRTC connection once peer accepts.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. FLOATING LOCAL VIDEO (Picture-in-Picture at top-right, similar to Facebook) */}
                {!isVideoOff && (
                  <div className="absolute top-4 right-4 w-32 sm:w-48 aspect-video bg-slate-900 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-20 hover:scale-105 transition-transform duration-300">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <span className="absolute bottom-1 left-2 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                      {language === 'tl' ? 'Ikaw' : 'You'}
                    </span>
                  </div>
                )}

                {/* 3. TOP OVERLAY INFO (floating user names and security indicator) */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-slate-900/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shadow-lg">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-rose-600 flex items-center justify-center text-sm shadow">
                    🛡️
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black leading-none text-white tracking-tight">
                      {activeCallSession.callerId === user.id ? activeCallSession.receiverName : activeCallSession.callerName}
                    </h4>
                    <p className="text-[9px] text-rose-400 font-black tracking-wider uppercase font-mono mt-0.5">
                      Z-one HD Video Call
                    </p>
                  </div>
                </div>

                {/* 4. MIC LOOPBACK TEST ALERT (if active) */}
                {isLoopbackOn && (
                  <div className="absolute top-20 left-4 z-10 bg-emerald-500/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-xl border border-emerald-400 animate-pulse shadow-md">
                    🎤 Loopback Test Active: {language === 'tl' ? 'Naririnig mo ang iyong boses para i-test' : 'Hearing your own voice to test mic'}
                  </div>
                )}

                {/* 5. BOTTOM OVERLAY CONTROLS (Facebook-style floating dock) */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 bg-slate-900/80 backdrop-blur-xl px-6 py-4 rounded-3xl flex items-center gap-4 border border-white/10 shadow-2xl">
                  {/* Mic mute control */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition border ${isMuted ? 'bg-red-500 text-white border-red-400' : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'}`}
                    title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {/* Camera control */}
                  <button
                    onClick={() => setIsVideoOff(!isVideoOff)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition border ${isVideoOff ? 'bg-red-500 text-white border-red-400' : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'}`}
                    title={isVideoOff ? 'Open Camera' : 'Close Camera'}
                  >
                    {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>

                  {/* Loopback audio test toggle (very helpful for sandbox testing!) */}
                  <button
                    onClick={() => {
                      setIsLoopbackOn(!isLoopbackOn);
                      triggerNotification(
                        language === 'tl'
                          ? (isLoopbackOn ? 'Inoff ang loopback' : 'Inon ang loopback test')
                          : (isLoopbackOn ? 'Loopback off' : 'Loopback test on'),
                        'info'
                      );
                    }}
                    className={`p-3.5 rounded-2xl cursor-pointer transition border text-xs font-bold ${isLoopbackOn ? 'bg-emerald-600 border-emerald-500 text-white animate-pulse' : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'}`}
                    title="Test Voice Input"
                  >
                    {language === 'tl' ? 'i-Test Mic' : 'Test Mic'}
                  </button>

                  {/* Red circular end-call button (like Facebook) */}
                  <button
                    onClick={handleDeclineOrHangup}
                    className="p-3.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl cursor-pointer transition shadow-lg shadow-red-900/30 flex items-center justify-center border border-red-500"
                    title="Hang Up"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ) : (
              // 📞 STANDARD MODAL LAYOUT (For ringing, calling, and accepted voice calls)
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl overflow-hidden flex flex-col items-center justify-between min-h-[420px] text-center relative"
              >
                {/* Call Mode Badge */}
                <span className="bg-white/10 text-white/90 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                  <span>Z-one Secure {activeCallSession.type === 'video' ? 'Video' : 'Voice'} Call</span>
                </span>

                {/* Loopback alert if active in voice call */}
                {isLoopbackOn && (
                  <div className="absolute top-12 bg-emerald-600 text-white text-[9px] font-bold px-3 py-1 rounded-full animate-pulse z-10">
                    🎤 Mic Loopback Active
                  </div>
                )}

                {/* Status & Profile rendering with dynamic visual pulse wave */}
                <div className="space-y-4 my-auto py-6">
                  <div className="relative">
                    <span className="absolute inset-0 rounded-full bg-rose-500/10 animate-ping scale-150"></span>
                    <span className="absolute inset-0 rounded-full bg-rose-500/5 animate-pulse scale-200"></span>
                    <div className="w-24 h-24 rounded-full bg-rose-600 flex items-center justify-center text-4xl shadow-lg border-4 border-slate-800 select-none mx-auto">
                      {activeCallSession.callerId === user.id ? '👤' : (activeCallSession.callerAvatar || '👤')}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-extrabold text-lg text-white">
                      {activeCallSession.callerId === user.id ? activeCallSession.receiverName : activeCallSession.callerName}
                    </h3>
                    <p className="text-xs text-rose-400 font-extrabold uppercase tracking-wider font-mono">
                      {activeCallSession.status === 'ringing' 
                        ? (activeCallSession.callerId === user.id ? (language === 'tl' ? 'Tumatawag...' : 'Calling...') : (language === 'tl' ? 'Papasok na tawag...' : 'Incoming call...')) 
                        : (language === 'tl' ? 'Konektado na (Boses)' : 'Connected (Voice Only)')}
                    </p>
                  </div>
                </div>

                {/* Interactive call status details for voice calls */}
                {activeCallSession.status === 'accepted' && (
                  <div className="w-full bg-slate-950/60 p-3 rounded-2xl border border-slate-800/40 mb-4 text-center">
                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                      {language === 'tl' 
                        ? '✔️ Naka-enable ang end-to-end voice encryption.' 
                        : '✔️ End-to-end voice encryption enabled.'}
                    </p>
                    {remoteStream ? (
                      <p className="text-[9px] text-emerald-400 font-bold mt-1 animate-pulse">
                        ● Live Voice Stream Sync Active
                      </p>
                    ) : (
                      <p className="text-[9px] text-slate-500 font-bold mt-1 animate-pulse">
                        ⌛ Nag-hihintay ng voice audio track...
                      </p>
                    )}
                  </div>
                )}

                {/* Interaction Call Controls */}
                <div className="flex items-center gap-4 pt-4 border-t border-slate-800/50 w-full justify-center">
                  {activeCallSession.status === 'ringing' && activeCallSession.callerId !== user.id ? (
                    // Incoming Ring Controls
                    <>
                      <button
                        onClick={handleAcceptCall}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl flex items-center gap-1.5 cursor-pointer transition shadow-lg shadow-emerald-900/30"
                      >
                        <Phone className="w-4 h-4 animate-bounce" />
                        <span>{language === 'tl' ? 'Sagutin' : 'Accept'}</span>
                      </button>
                      <button
                        onClick={handleDeclineOrHangup}
                        className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-2xl flex items-center gap-1.5 cursor-pointer transition shadow-lg shadow-rose-900/30"
                      >
                        <PhoneOff className="w-4 h-4" />
                        <span>{language === 'tl' ? 'Tanggihan' : 'Decline'}</span>
                      </button>
                    </>
                  ) : (
                    // Outgoing Ringing or Active Connected Call Controls
                    <>
                      {activeCallSession.status === 'accepted' && (
                        <>
                          <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={`p-3 rounded-2xl cursor-pointer transition border ${isMuted ? 'bg-red-500 text-white border-red-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'}`}
                            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                          >
                            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          </button>

                          <button
                            onClick={() => {
                              setIsLoopbackOn(!isLoopbackOn);
                              triggerNotification(
                                language === 'tl'
                                  ? (isLoopbackOn ? 'Inoff ang loopback' : 'Inon ang loopback test')
                                  : (isLoopbackOn ? 'Loopback off' : 'Loopback test on'),
                                'info'
                              );
                            }}
                            className={`px-3 py-2 rounded-2xl cursor-pointer transition border text-[10px] font-bold ${isLoopbackOn ? 'bg-emerald-600 border-emerald-500 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'}`}
                            title="I-test ang Boses"
                          >
                            {language === 'tl' ? 'i-Test Mic' : 'Test Mic'}
                          </button>
                        </>
                      )}
                      <button
                        onClick={handleDeclineOrHangup}
                        className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-2xl flex items-center gap-1.5 cursor-pointer transition shadow-lg shadow-rose-900/30"
                      >
                        <PhoneOff className="w-4 h-4 animate-pulse" />
                        <span>{language === 'tl' ? 'Ibaba' : 'Hang Up'}</span>
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* 🎬 NETFLIX THEATRE VIDEO PLAYER POPUP MODAL */}
      <AnimatePresence>
        {selectedNetflixVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 text-left overflow-y-auto max-h-[95vh] text-white"
            >
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${selectedNetflixVideo.badgeColor}`}>
                  {selectedNetflixVideo.category}
                </span>
                <button 
                  onClick={() => setSelectedNetflixVideo(null)}
                  className="text-slate-400 hover:text-white font-extrabold text-xs bg-slate-900 hover:bg-slate-800 p-2 rounded-full cursor-pointer transition"
                >
                  ✕
                </button>
              </div>

              {/* Premium Cinematic Video Player (HTML5 Video or YouTube Iframe) */}
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-900 relative">
                {selectedNetflixVideo.videoUrl ? (
                  <video
                    src={selectedNetflixVideo.videoUrl}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    playsInline
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <iframe
                    src={`${selectedNetflixVideo.embedUrl}?autoplay=1&rel=0&modestbranding=1`}
                    title={selectedNetflixVideo.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-extrabold uppercase font-mono tracking-wider">
                  <span>{selectedNetflixVideo.source} • {selectedNetflixVideo.date}</span>
                  <span className="text-rose-500 font-black">🍿 {selectedNetflixVideo.duration} mins</span>
                </div>
                <h3 className="font-extrabold text-white text-base md:text-lg leading-snug">{selectedNetflixVideo.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-semibold pt-2 border-t border-slate-900/50 whitespace-pre-wrap">
                  {selectedNetflixVideo.description}
                </p>

                {/* Warning notification helper for sandboxed iframe issues */}
                <div className="bg-amber-950/40 border border-amber-900/30 rounded-xl p-3 text-[10px] text-amber-300 font-medium leading-relaxed">
                  ⚠️ {language === 'tl'
                    ? 'Tip: Kung ang video ay nakasulat na "Video unavailable", ito ay dahil sa browser sandbox restriction. I-click ang "Panoorin sa YouTube" sa ibaba upang mapanood ito nang direkta sa bagong tab!'
                    : 'Tip: If the video says "Video unavailable", it is due to browser iframe sandbox restrictions. Click "Watch on YouTube" below to watch it directly in a new tab!'}
                </div>

                {/* Additional metadata info tag */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedNetflixVideo.tags.map((tag: string, idx: number) => (
                    <span key={idx} className="text-[9px] bg-rose-950/50 text-rose-300 border border-rose-900/40 font-bold px-2 py-0.5 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-2 pt-3 border-t border-slate-900">
                <a
                  href={selectedNetflixVideo.youtubeUrl || `https://www.youtube.com/watch?v=${selectedNetflixVideo.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl cursor-pointer transition uppercase tracking-wider flex items-center justify-center gap-2 text-center"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{language === 'tl' ? 'Panoorin sa YouTube' : 'Watch on YouTube'}</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedNetflixVideo(null)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-black rounded-xl cursor-pointer transition uppercase tracking-wider"
                >
                  {language === 'tl' ? 'Isara' : 'Close Player'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📥 FLOATING MESSAGES INBOX SHORTCUT (PERSISTENT ON ALL TABS) */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleOpenInbox}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white shadow-2xl hover:from-indigo-700 hover:to-indigo-900 cursor-pointer border border-indigo-500 transition-colors"
          title={language === 'tl' ? 'Buksan ang Inbox' : 'Open Inbox'}
        >
          <MessageSquare className="w-6 h-6 animate-pulse" />
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[11px] font-black text-white ring-3 ring-slate-900 animate-bounce">
              {totalUnreadCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* 📥 MESSAGES INBOX SLIDE-OVER DRAWER OVERLAY */}
      <AnimatePresence>
        {showInboxPanel && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInboxPanel(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            {/* Slide-over Panel Container */}
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-100 text-slate-800"
              >
                {/* Drawer Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <MessageSquare className="w-5 h-5" />
                    </span>
                    <div className="text-left">
                      <h3 className="font-black text-slate-900 text-sm leading-tight">
                        {language === 'tl' ? 'Z-one Inbox (Mga Mensahe)' : 'Z-one Messages Inbox'}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-bold font-mono">
                        {totalUnreadCount > 0
                          ? (language === 'tl' ? `Mayroon kang ${totalUnreadCount} unread` : `You have ${totalUnreadCount} unread`)
                          : (language === 'tl' ? 'Ligtas na end-to-end messaging' : 'Secure end-to-end messaging')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowInboxPanel(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="p-3 bg-white border-b border-slate-50">
                  <div className="relative">
                    <input
                      type="text"
                      value={inboxSearch}
                      onChange={(e) => setInboxSearch(e.target.value)}
                      placeholder={
                        inboxTab === 'chats'
                          ? (language === 'tl' ? 'Maghanap ng chat o mensahe...' : 'Search chat or message...')
                          : (language === 'tl' ? 'Maghanap ng miyembro...' : 'Search members...')
                      }
                      className="w-full pl-3 pr-10 py-2 bg-slate-100 border-none rounded-2xl text-xs font-semibold placeholder-slate-450 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                    />
                    {inboxSearch && (
                      <button
                        onClick={() => setInboxSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Folder Selection Tabs */}
                <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-150 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 flex-1">
                    <button
                      onClick={() => setInboxTab('chats')}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                        inboxTab === 'chats'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                      }`}
                    >
                      {language === 'tl' ? 'Mga Chat' : 'Active Chats'}
                    </button>
                    <button
                      onClick={() => setInboxTab('members')}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                        inboxTab === 'members'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                      }`}
                    >
                      {language === 'tl' ? 'Mga Miyembro' : 'All Members'}
                    </button>
                  </div>
                </div>

                {/* Scrollable Container List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-50 bg-slate-50/30">
                  {inboxTab === 'chats' ? (
                    (() => {
                      const filtered = conversations.filter(conv =>
                        conv.userName.toLowerCase().includes(inboxSearch.toLowerCase()) ||
                        conv.lastMessage.toLowerCase().includes(inboxSearch.toLowerCase())
                      );

                      if (filtered.length === 0) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-2">
                            <span className="text-3xl select-none animate-bounce">💬</span>
                            <h4 className="font-extrabold text-xs text-slate-800">
                              {language === 'tl' ? 'Walang Aktibong Chat' : 'No Active Chats'}
                            </h4>
                            <p className="text-[10px] text-slate-450 font-semibold max-w-xs leading-relaxed">
                              {language === 'tl'
                                ? 'I-click ang "Mga Miyembro" tab sa itaas o mag-click ng avatar sa feed upang simulan ang pakikipag-chat!'
                                : 'Switch to "All Members" above or click any avatar in the feed to start messaging someone!'}
                            </p>
                          </div>
                        );
                      }

                      return filtered.map(conv => {
                        const isOnline = onlineUserIds.includes(conv.userId);
                        return (
                          <div
                            key={conv.userId}
                            onClick={() => {
                              setActiveDmUser({
                                id: conv.userId,
                                name: conv.userName,
                                avatar: conv.userAvatar
                              });
                              setShowInboxPanel(false);
                            }}
                            className="p-3.5 flex items-center justify-between gap-3 hover:bg-indigo-50/40 cursor-pointer transition duration-150"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative inline-block select-none shrink-0">
                                {renderFeedAvatar(conv.userAvatar, conv.userName, "w-11 h-11", "text-xl", conv.userId)}
                                {isOnline ? (
                                  <span className="absolute bottom-0 right-0 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
                                  </span>
                                ) : (
                                  <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-slate-400 border-2 border-white" />
                                )}
                              </div>

                              <div className="text-left min-w-0">
                                <h4 className={`text-xs font-black truncate text-slate-900 ${conv.unreadCount > 0 ? 'text-indigo-900 font-extrabold' : ''}`}>
                                  {conv.userName}
                                </h4>
                                <p className={`text-[11px] truncate mt-0.5 leading-none ${
                                  conv.unreadCount > 0 ? 'text-slate-900 font-extrabold' : 'text-slate-450 font-medium'
                                }`}>
                                  {conv.lastMessage}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col items-end shrink-0 gap-1.5">
                              <span className="text-[9px] text-slate-400 font-bold font-mono">
                                {formatInboxTime(conv.lastMessageTime)}
                              </span>
                              {conv.unreadCount > 0 && (
                                <span className="bg-red-500 text-white font-black text-[9px] rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center animate-pulse">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()
                  ) : (
                    // MEMBERS DIRECTORY TAB
                    (() => {
                      const filtered = allUsersList
                        .filter(u => u.id !== user.id) // hide ourselves
                        .filter(u => u.name.toLowerCase().includes(inboxSearch.toLowerCase()));

                      if (loadingUsersList) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-1">
                            <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                              {language === 'tl' ? 'Kinukuha ang listahan...' : 'Loading directory...'}
                            </p>
                          </div>
                        );
                      }

                      if (filtered.length === 0) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-2">
                            <span className="text-3xl select-none">🔍</span>
                            <h4 className="font-extrabold text-xs text-slate-800">
                              {language === 'tl' ? 'Walang Miyembro' : 'No Members Found'}
                            </h4>
                            <p className="text-[10px] text-slate-450 font-semibold max-w-xs leading-relaxed">
                              {language === 'tl'
                                ? 'Subukang mag-type ng iba pang pangalan.'
                                : 'Try searching for a different username.'}
                            </p>
                          </div>
                        );
                      }

                      return filtered.map(u => {
                        const isOnline = onlineUserIds.includes(u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={() => {
                              setActiveDmUser({
                                id: u.id,
                                name: u.name,
                                avatar: u.avatar
                              });
                              setShowInboxPanel(false);
                            }}
                            className="p-3.5 flex items-center justify-between gap-3 hover:bg-indigo-50/40 cursor-pointer transition duration-150"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative inline-block select-none shrink-0">
                                {renderFeedAvatar(u.avatar, u.name, "w-10 h-10", "text-lg", u.id)}
                                {isOnline ? (
                                  <span className="absolute bottom-0 right-0 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
                                  </span>
                                ) : (
                                  <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-slate-400 border-2 border-white" />
                                )}
                              </div>

                              <div className="text-left min-w-0">
                                <h4 className="text-xs font-black truncate text-slate-900">
                                  {u.name}
                                </h4>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                                  {isOnline
                                    ? (language === 'tl' ? 'Online Ngayon' : 'Active Now')
                                    : (language === 'tl' ? 'Hindi Aktibo' : 'Offline')}
                                </p>
                              </div>
                            </div>

                            <button className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-xl cursor-pointer transition uppercase tracking-wider shrink-0">
                              {language === 'tl' ? 'I-chat' : 'Message'}
                            </button>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
