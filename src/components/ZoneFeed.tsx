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
  Upload,
  Phone,
  Video,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff,
  X,
  Maximize2
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

// Curated live YouTube streams from Philippines broadcast networks
const LIVE_TV_STREAMS = [
  {
    id: 'stream-gma',
    name: 'GMA Integrated News 24 Oras Live Stream',
    network: 'GMA Integrated News',
    logo: '📺',
    url: 'https://www.youtube.com/embed/live_stream?channel=UC85fS0_2H6396_VAnz6vO9A',
    description: 'Panoorin ang pinakabagong balita, ulat-panahon, at talakayan mula sa GMA Integrated News at 24 Oras sa buong Pilipinas.'
  },
  {
    id: 'stream-abscbn',
    name: 'ABS-CBN News Channel (ANC) Live stream',
    network: 'ABS-CBN News',
    logo: '🔴',
    url: 'https://www.youtube.com/embed/live_stream?channel=UCE2606prvXQc_noEqKxVJXA',
    description: 'Manatiling updated sa pinakabagong breaking news, headline story, at eksklusibong panayam mula sa ABS-CBN News.'
  },
  {
    id: 'stream-tv5',
    name: 'TV5 News (News5 Everywhere) Live Stream',
    network: 'TV5 Network',
    logo: '🔵',
    url: 'https://www.youtube.com/embed/live_stream?channel=UCpP2SreG8A-u066XW1G9XJw',
    description: 'Sundan ang live coverage ng mga balitang pambansa, isports, at talakayan sa News5 Everywhere livestream.'
  }
];

// Curated simulated news from Philippine media channels regarding the economy, GCash, and general events
const PHILIPPINES_NEWS_ARTICLES = [
  {
    id: 'news-1',
    source: 'ABS-CBN News',
    category: 'ECONOMY',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    title: 'GCash Clicker App "Z-one" sikat ngayon sa bansa, libu-libong Pilipino patuloy ang pagkita',
    text: 'Isang bagong plataporma na tinatawag na Z-one App ang lumalaganap ngayon sa bansa kung saan ang mga gumagamit ay binabayaran sa pamamagitan ng GCash sa simpleng pag-click ng mga micro-tasks at panonood ng sponsors. Ayon sa mga ulat, marami ang nakakapag-withdraw ng P500 hanggang P5,000 bawat linggo habang nagre-refer ng kanilang mga kaibigan.',
    date: 'Ngayong Araw, 10:45 AM',
    reads: '12.4K reads',
    image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&auto=format&fit=crop&q=60'
  },
  {
    id: 'news-2',
    source: 'GMA Integrated News',
    category: 'TECHNOLOGY',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    title: 'Digital Wallets tulad ng GCash at Maya, nananatiling pangunahing paraan ng bayad sa Pilipinas',
    text: 'Inihayag ng Bangko Sentral ng Pilipinas (BSP) na higit sa 60% ng mga transaksyon sa bansa ay ginagawa na gamit ang mga mobile e-wallet. Ito ay nagpapakita ng mabilis na pag-unlad ng digital economy at cashless transactions sa bansa para sa taong 2026. Ang mga platform tulad ng Z-one ay nakakatulong sa financial literacy at mobile connectivity ng nakararaming Pilipino.',
    date: 'Kahapon, 2:30 PM',
    reads: '9.8K reads',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=60'
  },
  {
    id: 'news-3',
    source: 'Philippine Daily Inquirer',
    category: 'NATION',
    badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
    title: 'DTI nagbabala laban sa mga pekeng e-earning sites; Z-one pinuri dahil sa mabilis na payout',
    text: 'Nagpalabas ng paalala ang Department of Trade and Industry (DTI) sa publiko na maging mapagmatyag sa mga naglipanang pekeng e-earning sites sa internet na humihingi ng deposit. Gayunpaman, pinuri ng maraming clickers ang Z-one social portal dahil sa transparent na system nito, kawalan ng sapilitang bayad, at mabilis na GCash payout processing.',
    date: '2 araw ang nakalipas',
    reads: '18.2K reads',
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=60'
  },
  {
    id: 'news-4',
    source: 'Philstar Global',
    category: 'ENTERTAINMENT',
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-200',
    title: 'Sikat na Pinoy Influencers, ibinahagi ang kanilang sikreto sa Click-Earning sa Z-one App',
    text: 'Ibinahagi ng ilang tanyag na Pinoy content creators sa social media ang kanilang sikreto sa paggamit ng Z-one social app. Ayon sa kanila, ang pagsuporta o pag-Zone (follow) sa ibang users ay nakakatulong upang madagdagan ang earnings habang nakikipag-interact sa iba. "Mas masaya kapag tulong-tulong sa komunidad," sabi ng isang tanyag na vlogger.',
    date: '3 araw ang nakalipas',
    reads: '7.1K reads',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60'
  },
  {
    id: 'news-5',
    source: 'Rappler',
    category: 'WEATHER',
    badgeColor: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    title: 'PAGASA: Habagat patuloy na magdadala ng pag-ulan sa Kalakhang Maynila at ilang bahagi ng Luzon',
    text: 'Inabisuhan ng PAGASA ang publiko na maghanda sa mga biglaang pag-ulan at posibleng pagbaha dulot ng Southwest Monsoon o Habagat sa bansa. Pinayuhan ang mga mamamayan na manatili sa bahay, maging ligtas, at mag-enjoy muna sa pag-click-earn sa Z-one app habang sumisilong mula sa ulan.',
    date: '4 araw ang nakalipas',
    reads: '21.5K reads',
    image: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&auto=format&fit=crop&q=60'
  }
];

export default function ZoneFeed({ token, user, triggerNotification, onRefreshProfile, language }: ZoneFeedProps) {
  const [posts, setPosts] = useState<ZonePost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Z-one Social Media Tabs & Detailed View States
  const [socialTab, setSocialTab] = useState<'feed' | 'livetv' | 'news'>('feed');
  const [selectedNewsArticle, setSelectedNewsArticle] = useState<any | null>(null);

  // --- PRIVATE DIRECT MESSAGE (DM) STATES ---
  const [activeDmUser, setActiveDmUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const [dmMessages, setDmMessages] = useState<any[]>([]);
  const [loadingDms, setLoadingDms] = useState(false);
  const [newDmText, setNewDmText] = useState('');
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  // --- VOICE/VIDEO CALLING STATES ---
  const [activeCallSession, setActiveCallSession] = useState<any | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

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

    // Run immediately and then poll every 3 seconds
    pollDmsAndCalls();
    const intervalId = setInterval(pollDmsAndCalls, 3000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [token, activeCallSession, user.id]);

  // Hook to request camera streams when a video call connects
  useEffect(() => {
    if (activeCallSession && activeCallSession.status === 'accepted' && activeCallSession.type === 'video' && !localStream && !isVideoOff) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          setLocalStream(stream);
        })
        .catch(err => {
          console.warn('Camera access was not permitted or not found.', err);
        });
    }
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
    };
  }, [activeCallSession?.status, activeCallSession?.type, isVideoOff]);

  // Render the local video preview stream inside the video component
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

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
              onClick={() => setSocialTab('news')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${socialTab === 'news' ? 'bg-white text-emerald-600 shadow-xs border border-slate-200/50 font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
            >
              <Sparkles className="w-4 h-4" />
              <span>PH News Hub</span>
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

          {/* TAB CONTENT: 2. PH LIVE TV STREAMS (YOUTUBE EMBEDS) */}
          {socialTab === 'livetv' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gradient-to-r from-red-500 to-indigo-600 text-white rounded-3xl p-6 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 text-white/10 text-9xl font-black select-none pointer-events-none font-mono">LIVE</div>
                <div className="relative z-10 space-y-2">
                  <span className="bg-white/20 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border border-white/10">Z-one Broadcast TV</span>
                  <h3 className="text-xl font-black">{language === 'tl' ? 'Mga Live Feed mula sa YouTube' : 'Live Streams from YouTube'}</h3>
                  <p className="text-xs text-white/90 font-medium leading-relaxed">
                    {language === 'tl'
                      ? 'Panoorin ang pinakabagong balita at palabas nang LIVE at walang bawas! Piliin lamang ang network sa ibaba.'
                      : 'Watch Philippine news broadcasts live and in real-time. Pick your preferred media network below.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {LIVE_TV_STREAMS.map((st) => (
                  <div key={st.id} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                    <div className="aspect-video w-full bg-slate-950">
                      <iframe
                        src={st.url}
                        title={st.name}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        referrerPolicy="no-referrer"
                      ></iframe>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-slate-50/50">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base leading-none select-none">📺</span>
                          <span className="bg-slate-200 text-slate-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-300/50">
                            {st.network}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-xs leading-snug">{st.name}</h4>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed line-clamp-2">{st.description}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-[9px] text-rose-600 font-black uppercase tracking-widest flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                          <span>LIVE FEED</span>
                        </span>
                        <a 
                          href={st.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-blue-600 hover:underline font-black uppercase"
                        >
                          Visit Stream ↗
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB CONTENT: 3. PHILIPPINES NEWS HUB */}
          {socialTab === 'news' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm select-none">📰</span>
                    <h4 className="font-extrabold text-emerald-950 text-xs uppercase tracking-wider">Philippine Press Portal</h4>
                  </div>
                  <p className="text-[11px] text-emerald-900 font-medium leading-relaxed">
                    {language === 'tl'
                      ? 'Basahin ang pinakabagong ulat mula sa ABS-CBN News, GMA, Inquirer, at iba pang mapagkakatiwalaang media network.'
                      : 'Stay informed with standard press reports covering GCash, digital earning trends, and national events.'}
                  </p>
                </div>
                <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase shrink-0">NEWS</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PHILIPPINES_NEWS_ARTICLES.map((article) => (
                  <div 
                    key={article.id} 
                    onClick={() => setSelectedNewsArticle(article)}
                    className="bg-white rounded-3xl border border-slate-200 hover:border-slate-300 hover:shadow-md cursor-pointer transition overflow-hidden flex flex-col group"
                  >
                    <div className="aspect-video w-full relative overflow-hidden bg-slate-100">
                      <img 
                        src={article.image} 
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <span className={`absolute top-3 left-3 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shadow-sm ${article.badgeColor}`}>
                        {article.category}
                      </span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase">{article.source}</span>
                        <h4 className="font-extrabold text-slate-900 text-xs leading-snug group-hover:text-blue-600 transition">
                          {article.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed line-clamp-3">
                          {article.text}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[9px] text-slate-400 font-bold uppercase font-mono">
                        <span>{article.date}</span>
                        <span>{article.reads}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl overflow-hidden flex flex-col items-center justify-between min-h-[420px] text-center"
            >
              {/* Call Mode Badge */}
              <span className="bg-white/10 text-white/90 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                <span>Z-one Secure Call ({activeCallSession.type})</span>
              </span>

              {/* Status & Profile rendering */}
              <div className="space-y-4 my-auto py-6">
                <div className="relative">
                  {/* Pulsing visual halo */}
                  <span className="absolute inset-0 rounded-full bg-blue-500/15 animate-ping scale-150"></span>
                  <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-4xl shadow-lg border-4 border-slate-800 select-none mx-auto">
                    {activeCallSession.callerId === user.id ? '👤' : (activeCallSession.callerAvatar || '👤')}
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg text-white">
                    {activeCallSession.callerId === user.id ? activeCallSession.receiverName : activeCallSession.callerName}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">
                    {activeCallSession.status === 'ringing' 
                      ? (activeCallSession.callerId === user.id ? 'Tumatawag...' : 'May tumatawag sa iyo...') 
                      : 'Konektado'}
                  </p>
                </div>
              </div>

              {/* Video Stream rendering (if connected video call) */}
              {activeCallSession.status === 'accepted' && activeCallSession.type === 'video' && (
                <div className="w-full aspect-video bg-slate-950 rounded-2xl relative border border-slate-800 overflow-hidden mb-6">
                  {/* Local video thumbnail */}
                  {!isVideoOff && (
                    <div className="absolute top-3 right-3 w-32 aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-lg z-20">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover scale-x-[-1]" 
                      />
                    </div>
                  )}

                  {/* Remote stream mockup animation */}
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 z-10 relative">
                    <span className="text-4xl animate-bounce select-none">🎥</span>
                    <p className="text-xs font-black text-slate-400 mt-2">Active Camera Connection Live</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Real-time encryption enabled</p>
                  </div>
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
                        {activeCallSession.type === 'video' && (
                          <button
                            onClick={() => setIsVideoOff(!isVideoOff)}
                            className={`p-3 rounded-2xl cursor-pointer transition border ${isVideoOff ? 'bg-red-500 text-white border-red-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'}`}
                            title={isVideoOff ? 'Open Camera' : 'Close Camera'}
                          >
                            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                          </button>
                        )}
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
          </div>
        )}
      </AnimatePresence>

      {/* 📰 PHILIPPINES NEWS HUB DETAILED POPUP CARD */}
      <AnimatePresence>
        {selectedNewsArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 text-slate-850 text-left overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-emerald-200">
                  {selectedNewsArticle.category}
                </span>
                <button 
                  onClick={() => setSelectedNewsArticle(null)}
                  className="text-slate-400 hover:text-slate-600 font-extrabold text-xs bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full px-3 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 shadow-xs border border-slate-200/50">
                <img 
                  src={selectedNewsArticle.image} 
                  alt={selectedNewsArticle.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase font-mono tracking-wider">{selectedNewsArticle.source} • {selectedNewsArticle.date}</span>
                <h3 className="font-extrabold text-slate-900 text-sm md:text-base leading-snug">{selectedNewsArticle.title}</h3>
                <p className="text-xs text-slate-700 leading-relaxed font-semibold pt-2 border-t border-slate-100/50 whitespace-pre-wrap">{selectedNewsArticle.text}</p>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedNewsArticle(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl cursor-pointer transition"
                >
                  {language === 'tl' ? 'Isara' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
