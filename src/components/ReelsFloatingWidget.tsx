import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatEmbedUrl, calculateReelRevenue, AUDIENCE_CPM_RATES, AudienceCountry } from '../utils/reels';
import { 
  Tv, 
  X, 
  Heart, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Sparkles, 
  Shield, 
  Play, 
  Pause,
  Video,
  Upload,
  Copy,
  Check,
  Coins,
  Megaphone,
  TrendingUp,
  CreditCard,
  Ticket,
  AlertCircle,
  Activity,
  DollarSign,
  Eye,
  Globe,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Wallet,
  RefreshCw,
  Info,
  Search,
  ArrowLeft,
  Flame,
  Zap,
  Radio
} from 'lucide-react';
import { ReelVideo, ReelRedemption } from '../types';
import { idbStorage } from '../utils/idbStorage';
import { ReelsVideoCard } from './ReelsVideoCard';

interface ReelsFloatingWidgetProps {
  reels: ReelVideo[];
  isAdmin?: boolean;
  currentUserName?: string;
  currentUserId?: string;
  currentUserEmail?: string;
  isLoggedIn?: boolean;
  language?: 'tl' | 'en';
  userTokens?: number;
  onAddReel: (url: string, title?: string) => void;
  onDeleteReel: (id: string) => void;
  onLikeReel: (id: string, delta?: number) => void;
  onWatchRewardReel?: (id: string) => void;
  triggerNotification?: (message: string, type?: 'success' | 'info' | 'error') => void;
  onRefreshReels?: () => void;
}

export function parseVideoUrl(inputUrl: string): { embedUrl: string; platform: 'tiktok' | 'facebook' | 'youtube' | 'direct' } {
  const url = inputUrl.trim();
  
  // 1. TikTok URL parsing
  if (url.includes('tiktok.com')) {
    const match = url.match(/video\/(\d+)/) || url.match(/\/v\/(\d+)/);
    if (match && match[1]) {
      return {
        embedUrl: `https://www.tiktok.com/embed/v2/${match[1]}`,
        platform: 'tiktok'
      };
    }
    return {
      embedUrl: url.includes('/embed/') ? url : `https://www.tiktok.com/embed/v2/${url.split('/').pop()?.split('?')[0]}`,
      platform: 'tiktok'
    };
  }
  
  // 2. Facebook Reel or FB Watch
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    const encoded = encodeURIComponent(url);
    return {
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&width=500`,
      platform: 'facebook'
    };
  }
  
  // 3. YouTube Shorts or Video
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('/shorts/')) {
      videoId = url.split('/shorts/')[1]?.split('?')[0] || '';
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (url.includes('v=')) {
      videoId = url.split('v=')[1]?.split('&')[0] || '';
    }
    
    if (videoId) {
      return {
        embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0&loop=1&playlist=${videoId}&controls=1&rel=0`,
        platform: 'youtube'
      };
    }
    
    return {
      embedUrl: url,
      platform: 'youtube'
    };
  }
  
  // 4. Direct video files
  if (url.match(/\.(mp4|webm|ogg)($|\?)/i)) {
    return {
      embedUrl: url,
      platform: 'direct'
    };
  }
  
  // 5. Default generic iframe
  return {
    embedUrl: url,
    platform: 'direct'
  };
}

export default function ReelsFloatingWidget({
  reels,
  isAdmin = false,
  currentUserName,
  currentUserId,
  currentUserEmail,
  isLoggedIn = false,
  language = 'tl',
  userTokens = 0,
  onAddReel,
  onDeleteReel,
  onLikeReel,
  onWatchRewardReel,
  triggerNotification,
  onRefreshReels
}: ReelsFloatingWidgetProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Sorting and filtering tabs: 'all' | 'low_likes' | 'popular'
  const [activeTab, setActiveTab] = useState<'all' | 'low_likes' | 'popular'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');

  // User upload & token modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeUploadTab, setActiveUploadTab] = useState<'upload' | 'buy_tokens' | 'activity'>('upload');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [isUploadingUserReel, setIsUploadingUserReel] = useState(false);

  // User Reels Activity & Profit Redemption State
  const [myReelsList, setMyReelsList] = useState<ReelVideo[]>([]);
  const [myRedemptionsList, setMyRedemptionsList] = useState<ReelRedemption[]>([]);
  const [totalRedeemedAmount, setTotalRedeemedAmount] = useState<number>(0);
  const [isLoadingActivity, setIsLoadingActivity] = useState<boolean>(false);
  const [isRedeemingProfit, setIsRedeemingProfit] = useState<boolean>(false);
  const [reelCountries, setReelCountries] = useState<Record<string, AudienceCountry>>({});

  // Token subscription states
  const [subGcashNum, setSubGcashNum] = useState('');
  const [subGcashRef, setSubGcashRef] = useState('');
  const [isSubmittingTokenSub, setIsSubmittingTokenSub] = useState(false);
  const [copiedGcash, setCopiedGcash] = useState(false);

  // Local token balance state (synced with userTokens prop)
  const [localTokens, setLocalTokens] = useState<number>(userTokens);

  useEffect(() => {
    setLocalTokens(userTokens);
  }, [userTokens]);

  // Cache only lightweight reels metadata, thumbnails, IDs and safe references
  useEffect(() => {
    if (reels && reels.length > 0) {
      const metadataOnly = reels.map(r => ({
        id: r.id,
        title: r.title,
        platform: r.platform,
        embedUrl: r.embedUrl,
        url: r.url,
        likes: r.likes,
        views: r.views,
        likedBy: r.likedBy,
        watchedBy: r.watchedBy,
        addedBy: r.addedBy,
        createdAt: r.createdAt
      }));
      idbStorage.set('reels_metadata_cache', metadataOnly);
    }
  }, [reels]);

  const fetchUserReelsActivity = async () => {
    if (!currentUserId) return;
    setIsLoadingActivity(true);
    try {
      const res = await fetch(`/api/reels/my-activity?userId=${currentUserId}`, {
        headers: { 'Authorization': currentUserId }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMyReelsList(data.myReels || []);
        setMyRedemptionsList(data.myRedemptions || []);
        setTotalRedeemedAmount(data.totalRedeemed || 0);
      }
    } catch (err) {
      console.error('Failed to fetch user reels activity:', err);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  useEffect(() => {
    if (showUploadModal && (activeUploadTab === 'activity' || currentUserId)) {
      fetchUserReelsActivity();
    }
  }, [showUploadModal, activeUploadTab, currentUserId]);

  const handleRedeemProfit = async (amountToRedeem: number) => {
    if (!currentUserId) {
      if (triggerNotification) triggerNotification('Kailangan mag-login muna bago makapag-redeem.', 'error');
      return;
    }
    if (amountToRedeem < 300) {
      if (triggerNotification) triggerNotification('Kailangan ng minimum ₱300.00 profit bago makapag-redeem.', 'error');
      return;
    }

    setIsRedeemingProfit(true);
    try {
      const res = await fetch('/api/reels/redeem-profit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': currentUserId
        },
        body: JSON.stringify({
          userId: currentUserId,
          amount: amountToRedeem
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (triggerNotification) triggerNotification(`🎉 ${data.message}`, 'success');
        fetchUserReelsActivity();
        if (onRefreshReels) onRefreshReels();
      } else {
        if (triggerNotification) triggerNotification(`❌ ${data.error || 'Bigo sa pag-redeem ng profit.'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      if (triggerNotification) triggerNotification('❌ Error sa pakikipag-ugnayan sa server.', 'error');
    } finally {
      setIsRedeemingProfit(false);
    }
  };

  const handleCopyGcashNumber = () => {
    navigator.clipboard.writeText('09914089646');
    setCopiedGcash(true);
    if (triggerNotification) triggerNotification('📋 Kina-copy ang GCash number (09914089646)!', 'success');
    setTimeout(() => setCopiedGcash(false), 2000);
  };

  const handleUserSubmitReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl || !uploadUrl.trim()) {
      if (triggerNotification) triggerNotification('Mangyaring maglagay ng Video URL ng Reel.', 'error');
      return;
    }

    setIsUploadingUserReel(true);
    try {
      const res = await fetch('/api/reels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': currentUserId || ''
        },
        body: JSON.stringify({
          url: uploadUrl.trim(),
          title: uploadTitle.trim(),
          userId: currentUserId,
          addedBy: currentUserName || 'User'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (triggerNotification) triggerNotification(`🎉 ${data.message}`, 'success');
        setUploadUrl('');
        setUploadTitle('');
        setShowUploadModal(false);
        if (onRefreshReels) onRefreshReels();
      } else {
        if (data.needTokens) {
          if (triggerNotification) triggerNotification(`⚠️ ${data.error}`, 'error');
          setActiveUploadTab('buy_tokens');
        } else {
          if (triggerNotification) triggerNotification(`❌ ${data.error || 'Bigo sa pag-submit ng Reel.'}`, 'error');
        }
      }
    } catch (err) {
      console.error(err);
      if (triggerNotification) triggerNotification('❌ Error sa pakikipag-ugnayan sa server.', 'error');
    } finally {
      setIsUploadingUserReel(false);
    }
  };

  const handleUserSubmitTokenSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subGcashRef || !subGcashRef.trim()) {
      if (triggerNotification) triggerNotification('Kailangan ibigay ang GCash Reference Number.', 'error');
      return;
    }

    setIsSubmittingTokenSub(true);
    try {
      const res = await fetch('/api/reels/token-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': currentUserId || ''
        },
        body: JSON.stringify({
          userId: currentUserId,
          userName: currentUserName || 'User',
          userEmail: currentUserEmail || '',
          gcashNumber: subGcashNum.trim() || 'GCash',
          gcashRefNo: subGcashRef.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (triggerNotification) triggerNotification(`🎉 ${data.message}`, 'success');
        setSubGcashNum('');
        setSubGcashRef('');
        setShowUploadModal(false);
      } else {
        if (triggerNotification) triggerNotification(`❌ ${data.error || 'Bigo sa pag-submit ng subscription.'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      if (triggerNotification) triggerNotification('❌ Error sa pakikipag-ugnayan sa server.', 'error');
    } finally {
      setIsSubmittingTokenSub(false);
    }
  };

  // Listen for open event from header button
  useEffect(() => {
    const handleOpenWidget = () => setIsOpen(true);
    window.addEventListener('open-reels-widget', handleOpenWidget);
    return () => window.removeEventListener('open-reels-widget', handleOpenWidget);
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [likedIds, setLikedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gcash_liked_reels');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [watchedIds, setWatchedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gcash_watched_reels');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [watchProgress, setWatchProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Filter and sort reels based on tab & search
  const activeReels = React.useMemo(() => {
    let list = reels && reels.length > 0 ? [...reels] : [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => 
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.addedBy && r.addedBy.toLowerCase().includes(q)) ||
        (r.platform && r.platform.toLowerCase().includes(q))
      );
    }

    if (activeTab === 'low_likes') {
      list.sort((a, b) => (a.likes || 0) - (b.likes || 0));
    } else if (activeTab === 'popular') {
      list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }

    return list;
  }, [reels, activeTab, searchQuery]);

  // Draggable position state for the Watch Reels floating button
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const isDraggingRef = useRef(false);

  // Initialize position to bottom right default if not dragged yet
  useEffect(() => {
    if (!btnPos && typeof window !== 'undefined') {
      setBtnPos({
        x: Math.max(12, window.innerWidth - 185),
        y: Math.max(12, window.innerHeight - 75)
      });
    }
  }, [btnPos]);

  // Handle Drag Start
  const handleDragStart = (clientX: number, clientY: number) => {
    const currentX = btnPos ? btnPos.x : Math.max(12, window.innerWidth - 185);
    const currentY = btnPos ? btnPos.y : Math.max(12, window.innerHeight - 75);
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: currentX,
      initialY: currentY,
    };
    isDraggingRef.current = false;
  };

  // Handle Drag Move
  const handleDragMove = (clientX: number, clientY: number) => {
    if (!dragStartRef.current) return;
    const dx = clientX - dragStartRef.current.startX;
    const dy = clientY - dragStartRef.current.startY;

    if (Math.hypot(dx, dy) > 5) {
      isDraggingRef.current = true;
    }

    if (isDraggingRef.current) {
      const newX = Math.min(Math.max(8, dragStartRef.current.initialX + dx), window.innerWidth - 170);
      const newY = Math.min(Math.max(8, dragStartRef.current.initialY + dy), window.innerHeight - 65);
      setBtnPos({ x: newX, y: newY });
    }
  };

  // Handle Drag End
  const handleDragEnd = () => {
    dragStartRef.current = null;
  };

  // BLOCK POPUNDERS WHEN REELS WIDGET IS OPEN
  useEffect(() => {
    if (!isOpen) return;

    const originalWindowOpen = window.open;
    window.open = function (url?: string | URL, target?: string, features?: string) {
      const activeEl = document.activeElement as HTMLElement | null;
      const isExplicitUserLink = activeEl && (activeEl.tagName === 'A' || activeEl.closest('a'));
      if (isExplicitUserLink && url) {
        return originalWindowOpen.call(window, url, target || '_blank', features);
      }
      console.log('Blocked Monetag / Ad popunder attempt while Reels widget is open:', url);
      return null;
    };

    const handleGlobalCapture = (e: Event) => {
      const el = widgetRef.current;
      const backdrop = backdropRef.current;
      const target = e.target as HTMLElement | null;

      if ((el && (el.contains(target) || target === el)) || (backdrop && (backdrop.contains(target) || target === backdrop))) {
        if (target && (target.id === 'reels-widget-close-btn' || target.closest('#reels-widget-close-btn'))) {
          setIsOpen(false);
        }
        if (target && (target.id === 'reels-widget-open-btn' || target.closest('#reels-widget-open-btn'))) {
          setIsOpen(true);
        }
      }
    };

    const events = ['click', 'pointerup', 'mouseup'];
    events.forEach((evt) => {
      window.addEventListener(evt, handleGlobalCapture, { capture: true, passive: true });
      document.addEventListener(evt, handleGlobalCapture, { capture: true, passive: true });
    });

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleGlobalCapture, { capture: true });
        document.removeEventListener(evt, handleGlobalCapture, { capture: true });
      });
      window.open = originalWindowOpen;
    };
  }, [isOpen]);

  // Hide floating Install App button when open
  useEffect(() => {
    const installBtn = document.getElementById('installBtn');
    const userLoggedIn = document.body.classList.contains('user-logged-in');

    if (isOpen) {
      document.body.classList.add('reels-widget-open');
      if (installBtn) {
        installBtn.style.setProperty('display', 'none', 'important');
      }
    } else {
      document.body.classList.remove('reels-widget-open');
      if (installBtn && !userLoggedIn) {
        installBtn.style.display = 'block';
      } else if (installBtn && userLoggedIn) {
        installBtn.style.setProperty('display', 'none', 'important');
      }
    }

    return () => {
      document.body.classList.remove('reels-widget-open');
    };
  }, [isOpen]);

  useEffect(() => {
    if (currentIndex >= activeReels.length && activeReels.length > 0) {
      setCurrentIndex(0);
    }
  }, [activeReels.length, currentIndex]);

  // Scroll to video card in the snap container
  const scrollToCard = (index: number) => {
    const el = containerRef.current;
    if (!el || index < 0 || index >= activeReels.length) return;
    const height = el.clientHeight;
    el.scrollTo({
      top: index * height,
      behavior: 'smooth'
    });
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (activeReels.length === 0) return;
    const nextIdx = (currentIndex + 1) % activeReels.length;
    scrollToCard(nextIdx);
  };

  const handlePrev = () => {
    if (activeReels.length === 0) return;
    const prevIdx = (currentIndex - 1 + activeReels.length) % activeReels.length;
    scrollToCard(prevIdx);
  };

  // Scroll listener for detecting active card in the vertical snap container
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const height = el.clientHeight;
    if (height > 0) {
      const newIndex = Math.round(el.scrollTop / height);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < activeReels.length) {
        setCurrentIndex(newIndex);
      }
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen || showUploadModal || showAddForm) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, activeReels.length, showUploadModal, showAddForm]);

  const handleLike = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const reel = reels.find(r => r.id === id);
    const isLiked = currentUserId
      ? Boolean(reel?.likedBy?.includes(currentUserId))
      : likedIds.includes(id);

    if (isLiked) {
      if (triggerNotification) {
        triggerNotification(
          language === 'tl'
            ? '⚠️ Naliked mo na ang Reel na ito! Permanente na ito at hindi na pwedeng i-unlike.'
            : '⚠️ You already liked this Reel! Unliking is not allowed.',
          'info'
        );
      }
      return;
    }

    if (!isLoggedIn) {
      if (triggerNotification) {
        triggerNotification(
          language === 'tl'
            ? '⚠️ Kailangan mong mag-login upang mag-like at kumita ng ₱0.05 per Reel!'
            : '⚠️ Please login to like Reels and earn ₱0.05 per Reel!',
          'error'
        );
      }
      return;
    }

    onLikeReel(id);

    const updated = [...likedIds, id];
    setLikedIds(updated);
    try {
      localStorage.setItem('gcash_liked_reels', JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving liked reels', err);
    }
  };

  // Reset watch progress whenever active reel changes
  useEffect(() => {
    setWatchProgress(0);
    setIsPlaying(true);
  }, [currentIndex]);

  const handleClaimWatchReward = (id: string) => {
    const activeReel = activeReels.find(r => r.id === id);
    const isAlreadyClaimed = Boolean(
      (currentUserId && activeReel?.watchedBy?.includes(currentUserId)) ||
      watchedIds.includes(id)
    );

    if (isAlreadyClaimed) return;

    const updatedWatched = Array.from(new Set([...watchedIds, id]));
    setWatchedIds(updatedWatched);
    try {
      localStorage.setItem('gcash_watched_reels', JSON.stringify(updatedWatched));
    } catch (e) {
      console.error('Error saving watched reels:', e);
    }

    if (onWatchRewardReel) {
      onWatchRewardReel(id);
    }
  };

  // YouTube / Iframe postMessage event listener
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        if (!event.data) return;
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data) return;

        const activeReel = activeReels[currentIndex];
        if (!activeReel) return;

        if (data.event === 'onStateChange') {
          if (data.info === 1) setIsPlaying(true);
          if (data.info === 2 || data.info === 3) setIsPlaying(false);
          if (data.info === 0) {
            setIsPlaying(false);
            setWatchProgress(100);
            handleClaimWatchReward(activeReel.id);
          }
        }

        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.playerState === 'number') {
            if (data.info.playerState === 1) setIsPlaying(true);
            if (data.info.playerState === 2) setIsPlaying(false);
            if (data.info.playerState === 0) {
              setIsPlaying(false);
              setWatchProgress(100);
              handleClaimWatchReward(activeReel.id);
            }
          }
          if (typeof data.info.currentTime === 'number' && typeof data.info.duration === 'number' && data.info.duration > 0) {
            const pct = Math.min(100, Math.floor((data.info.currentTime / data.info.duration) * 100));
            setWatchProgress(pct);
            if (pct >= 100) {
              handleClaimWatchReward(activeReel.id);
            }
          }
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [currentIndex, activeReels]);

  // Watch Timer Fallback for Embedded Iframes
  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    const activeReel = activeReels[currentIndex];
    if (!activeReel) return;

    if (activeReel.platform === 'direct' && activeReel.embedUrl.match(/\.(mp4|webm)($|\?)/i)) {
      return;
    }

    const isAlreadyClaimed = Boolean(
      (currentUserId && activeReel.watchedBy?.includes(currentUserId)) ||
      watchedIds.includes(activeReel.id)
    );

    if (isAlreadyClaimed) {
      setWatchProgress(100);
      return;
    }

    if (watchProgress >= 100) return;

    const timer = setInterval(() => {
      setWatchProgress((prev) => {
        const next = prev + 1;
        if (next >= 100) {
          clearInterval(timer);
          handleClaimWatchReward(activeReel.id);
          return 100;
        }
        return next;
      });
    }, 250);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, currentIndex, watchProgress, activeReels, currentUserId, watchedIds]);

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    onAddReel(inputUrl.trim(), inputTitle.trim());
    setInputUrl('');
    setInputTitle('');
    setShowAddForm(false);
    scrollToCard(0);
  };

  // Closed Trigger Floating Button
  if (!isOpen) {
    if (isLoggedIn || (typeof document !== 'undefined' && document.body.classList.contains('user-logged-in'))) {
      return null;
    }

    const posStyle = btnPos
      ? { left: `${btnPos.x}px`, top: `${btnPos.y}px` }
      : { bottom: '16px', right: '16px' };

    return (
      <div 
        ref={widgetRef}
        style={posStyle}
        className="fixed z-50 touch-none select-none"
        onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
        onMouseUp={() => handleDragEnd()}
        onTouchStart={(e) => {
          if (e.touches.length === 1) {
            handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 1) {
            handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchEnd={() => handleDragEnd()}
      >
        <button
          id="reels-widget-open-btn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isDraggingRef.current) {
              isDraggingRef.current = false;
              return;
            }
            setIsOpen(true);
          }}
          className="bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black px-5 py-3.5 rounded-full shadow-[0_12px_35px_rgba(225,29,72,0.75)] border-2 border-white flex items-center gap-2.5 transition-transform duration-150 hover:scale-105 active:scale-95 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="relative pointer-events-none flex items-center justify-center bg-white/25 p-1.5 rounded-full shadow-inner">
            <Tv className="w-5 h-5 text-amber-300 drop-shadow-md" />
            {activeReels.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-slate-950 text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-slate-950 shadow-md">
                {activeReels.length}
              </span>
            )}
          </div>
          <span className="text-xs uppercase tracking-wider font-black text-white drop-shadow-md pointer-events-none flex items-center gap-1.5">
            🎬 {language === 'tl' ? 'Panoorin ang Reels' : 'Watch Reels'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* 🌑 BACKDROP OVERLAY */}
      <div 
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn touch-none"
        onClick={() => setIsOpen(false)}
        onTouchMove={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />

      {/* ================= TIKTOK VERTICAL SCROLL PORTAL CONTAINER ================= */}
      <div 
        ref={widgetRef}
        className="fixed inset-0 z-50 w-full h-[100dvh] bg-black text-white overflow-hidden select-none flex justify-center items-center"
      >
        <div className="relative w-full h-full max-w-[480px] bg-black overflow-hidden flex flex-col justify-between shadow-2xl border-x border-white/5">
          
          {/* ================= FIXED TOP TIKTOK HEADER BAR ================= */}
          <header className="absolute top-0 inset-x-0 z-40 pt-3 pb-2 px-3 flex items-center justify-between pointer-events-auto bg-gradient-to-b from-black/90 via-black/50 to-transparent">
            
            {/* Left: Close/Back button & Feed Badge */}
            <div className="flex items-center gap-2">
              <button
                id="reels-widget-close-btn"
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-90 transition shadow-md hover:bg-black/80 cursor-pointer"
                title={language === 'tl' ? 'Isara ang Reels' : 'Close Reels'}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 bg-rose-600/30 border border-rose-500/40 text-rose-300 px-2 py-1 rounded-full text-[10px] font-black backdrop-blur-md">
                <Video className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>REELS</span>
              </div>
            </div>

            {/* Center: Sorting / Filter Tabs (TikTok Style) */}
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/10 text-xs font-black">
              <button
                type="button"
                onClick={() => { setActiveTab('all'); scrollToCard(0); }}
                className={`px-2.5 py-1 rounded-full transition cursor-pointer text-[11px] ${
                  activeTab === 'all'
                    ? 'bg-white text-black shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Lahat
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('low_likes'); scrollToCard(0); }}
                className={`px-2.5 py-1 rounded-full transition cursor-pointer flex items-center gap-1 text-[11px] ${
                  activeTab === 'low_likes'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Pinakamababang likes muna"
              >
                <Zap className="w-3 h-3 text-amber-300" />
                <span>Low Likes</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('popular'); scrollToCard(0); }}
                className={`px-2.5 py-1 rounded-full transition cursor-pointer flex items-center gap-1 text-[11px] ${
                  activeTab === 'popular'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Maraming likes"
              >
                <Flame className="w-3 h-3 text-red-600" />
                <span>Popular</span>
              </button>
            </div>

            {/* Right: Upload & Admin Buttons */}
            <div className="flex items-center gap-1.5">
              {/* User Upload Reel Button */}
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black px-2.5 py-1.5 rounded-full text-[10px] flex items-center gap-1 shadow-md active:scale-95 transition cursor-pointer border border-white/20"
                title="Mag-upload ng Reels (0.50 Tokens)"
              >
                <Upload className="w-3 h-3" />
                <span>Upload</span>
              </button>

              {/* Admin Add Reel button */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center text-xs font-black shadow-md transition cursor-pointer border border-indigo-400"
                  title="Admin: Magdagdag ng Reel"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}

              {/* Search Toggle */}
              <button
                type="button"
                onClick={() => setShowSearchInput(!showSearchInput)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white backdrop-blur-md border transition cursor-pointer ${
                  showSearchInput ? 'bg-amber-500 text-black border-amber-400' : 'bg-black/40 border-white/10 hover:bg-black/60'
                }`}
                title="Mag-search ng Reel"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>

          </header>

          {/* Search Bar Input Dropdown (When active) */}
          {showSearchInput && (
            <div className="absolute top-14 inset-x-3 z-40 bg-black/90 backdrop-blur-md p-2 rounded-2xl border border-white/15 shadow-2xl flex items-center gap-2 animate-fadeIn">
              <Search className="w-4 h-4 text-amber-400 shrink-0 ml-1" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Mag-search ayon sa pamagat, creator, platform..."
                className="w-full bg-transparent text-white text-xs outline-none placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-white text-xs font-bold px-1"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* ================= TIKTOK VERTICAL SNAP SCROLL CONTAINER ================= */}
          <main 
            ref={containerRef}
            onScroll={handleScroll}
            className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar relative z-0"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {activeReels.length > 0 ? (
              activeReels.map((reel, index) => {
                const isActive = index === currentIndex;
                const isReelClaimed = Boolean(
                  (currentUserId && reel.watchedBy?.includes(currentUserId)) ||
                  watchedIds.includes(reel.id)
                );
                const isReelLiked = Boolean(
                  currentUserId
                    ? reel.likedBy?.includes(currentUserId)
                    : likedIds.includes(reel.id)
                );

                return (
                  <ReelsVideoCard
                    key={reel.id}
                    reel={reel}
                    index={index}
                    totalCount={activeReels.length}
                    isActive={isActive}
                    isPlaying={isActive ? isPlaying : false}
                    watchProgress={watchProgress}
                    isLiked={isReelLiked}
                    isClaimed={isReelClaimed}
                    fitMode={fitMode}
                    isAdmin={isAdmin}
                    language={language}
                    onTogglePlay={() => setIsPlaying(!isPlaying)}
                    onToggleFitMode={() => setFitMode(fitMode === 'contain' ? 'cover' : 'contain')}
                    onLike={handleLike}
                    onClaimReward={handleClaimWatchReward}
                    onDelete={onDeleteReel}
                    onOpenUploadModal={() => setShowUploadModal(true)}
                    triggerNotification={triggerNotification}
                  />
                );
              })
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950">
                <Tv className="w-12 h-12 text-slate-600 animate-pulse" />
                <h3 className="text-sm font-black text-white">Walang Nahanap na Reel</h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  {searchQuery ? `Walang tugma sa query na "${searchQuery}".` : 'Walang reels video sa listahan.'}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
                  >
                    I-clear ang Search
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-500 shadow-lg"
                  >
                    + Magdagdag ng Bagong Reel
                  </button>
                )}
              </div>
            )}
          </main>

          {/* ================= ON-SCREEN SCROLL FLOATER BUTTONS (Desktop/Mobile Nav Helper) ================= */}
          {activeReels.length > 1 && (
            <div className="absolute left-3 bottom-24 z-30 flex flex-col gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={handlePrev}
                className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition active:scale-90 shadow-md cursor-pointer"
                title="Previous Reel (Itaas)"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition active:scale-90 shadow-md cursor-pointer"
                title="Next Reel (Ibaba)"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ================= ⚙️ ADMIN ADD REEL FORM POPUP MODAL ================= */}
      {showAddForm && isAdmin && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border-2 border-indigo-500/60 rounded-3xl shadow-2xl overflow-hidden p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-900/60">
              <span className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-300" />
                <span>ADMIN: MAG-PUBLISH NG TIKTOK / FB REEL</span>
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-white text-sm font-extrabold w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishSubmit} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-wide mb-1.5">
                    Link / Video URL <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="I-paste ang TikTok, FB Reel, o Shorts URL"
                    className="w-full bg-slate-950 border border-indigo-500/60 text-white rounded-xl px-3.5 py-3 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 font-mono shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-wide mb-1.5">
                    Pamagat / Description (Opsyonal)
                  </label>
                  <input
                    type="text"
                    value={inputTitle}
                    onChange={(e) => setInputTitle(e.target.value)}
                    placeholder="Pamagat / Description ng Reel"
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-3 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 shadow-inner"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase cursor-pointer transition"
                >
                  Kanselahin
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 cursor-pointer transition active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>I-PUBLISH ANG REEL VIDEO</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 📤 USER REEL UPLOAD & TOKEN SUBSCRIPTION MODAL ================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 shadow-2xl text-slate-100 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-tr from-rose-500 to-amber-500 rounded-2xl text-white shadow-md">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white tracking-tight">
                      Upload Reels & Shorts
                    </h3>
                    <p className="text-[11px] text-slate-400 font-semibold">
                      Mag-promote ng iyong Facebook Reels, TikTok, o YouTube Shorts!
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TOKEN BALANCE & BENEFIT BANNER */}
            <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-rose-950/80 border border-indigo-500/30 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-slate-300 flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-amber-400" />
                  <span>Kasalukuyang Balance:</span>
                </span>
                <span className="font-black text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30 text-xs">
                  🎟️ {localTokens.toFixed(2)} Tokens ({Math.floor(localTokens / 0.5)} Reels)
                </span>
              </div>

              {/* HIGHLIGHTED ADVANTAGES / BENEFITS */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1.5 text-slate-300">
                <div className="font-black text-rose-400 flex items-center gap-1.5 text-xs">
                  <TrendingUp className="w-4 h-4 text-rose-400" />
                  <span>Benepisyo ng Pag-upload ng Reels sa Z-oneApp:</span>
                </div>
                <ul className="space-y-1 list-disc list-inside text-[10px] font-semibold text-slate-300">
                  <li><strong className="text-amber-300">Para sa Content Creators:</strong> Dadami ang tunay na views, subscribers, at engagements sa iyong Facebook, TikTok, o YouTube!</li>
                  <li><strong className="text-emerald-300">Para sa Affiliates & Business Owners:</strong> Maraming makakakita ng iyong pinopromote at dadami ang iyong magiging customer at benta!</li>
                  <li><strong className="text-indigo-300">Mura & Abot-kaya:</strong> 20 Reels & Shorts sa halagang <strong className="text-white">₱10.00 Pesos</strong> lamang (0.50 tokens/reel).</li>
                  <li><strong className="text-teal-300">Garantiya:</strong> Ang <strong className="text-rose-300">disapproved reels ay HINDI mababawasan</strong> sa tokens mo! Admin approved reels lamang ang mababawasan ng 0.50 tokens.</li>
                </ul>
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-black gap-1">
              <button
                type="button"
                onClick={() => setActiveUploadTab('upload')}
                className={`flex-1 py-2 px-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                  activeUploadTab === 'upload'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Upload</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveUploadTab('buy_tokens')}
                className={`flex-1 py-2 px-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                  activeUploadTab === 'buy_tokens'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">Buy Tokens</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveUploadTab('activity');
                  fetchUserReelsActivity();
                }}
                className={`flex-1 py-2 px-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                  activeUploadTab === 'activity'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                <span className="truncate">Activity & Profit</span>
              </button>
            </div>

            {/* TAB 1: MAG-UPLOAD NG REEL */}
            {activeUploadTab === 'upload' && (
              <form onSubmit={handleUserSubmitReel} className="space-y-3 pt-1">
                {localTokens < 0.50 && (
                  <div className="bg-rose-950/60 border border-rose-500/40 p-3 rounded-2xl text-xs space-y-2">
                    <div className="flex items-center gap-2 text-rose-300 font-black">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Kailangan ng Tokens Para Makapag-upload!</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-semibold leading-relaxed">
                      Kailangan ng <strong className="text-amber-300">0.50 Tokens</strong> bawat Reel. Ang iyong kasalukuyang balance ay <strong className="text-white">{localTokens.toFixed(2)} Tokens</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveUploadTab('buy_tokens')}
                      className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black py-2 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <Coins className="w-4 h-4" />
                      <span>Bumili ng 20 Reels Package (₱10.00 GCash)</span>
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-slate-300 mb-1">
                    Video URL (TikTok / FB Reels / YouTube Shorts) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/@user/video/1234567..."
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-rose-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                    Suportado ang TikTok, Facebook Reels, YouTube Shorts, o direct MP4 link.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-300 mb-1">
                    Pamagat o Pormal na Paglalarawan
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Hal. Bagong Earning Hack sa GCash! / Business Promo"
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-rose-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Kanselahin
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingUserReel || localTokens < 0.50}
                    className={`flex-1 py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${
                      localTokens < 0.50
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
                    }`}
                    style={localTokens >= 0.50 ? { backgroundColor: '#e11d48', color: '#ffffff' } : {}}
                  >
                    {isUploadingUserReel ? (
                      <span style={{ color: '#ffffff' }}>Isinusumite...</span>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-white" style={{ color: '#ffffff' }} />
                        <span style={{ color: '#ffffff' }}>Isumite Para Sa Admin Approval</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: BUMILI NG TOKENS */}
            {activeUploadTab === 'buy_tokens' && (
              <form onSubmit={handleUserSubmitTokenSub} className="space-y-3.5 pt-1">
                
                {/* GCASH PAYMENT DETAILS BOX */}
                <div className="bg-emerald-950/60 border border-emerald-500/40 p-3.5 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-300 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span>GCash Mobile Payment:</span>
                    </span>
                    <span className="font-black text-white bg-emerald-600/30 px-2 py-0.5 rounded-lg border border-emerald-500/30 text-[11px]">
                      ₱10.00 = 20 Reels & Shorts
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">GCash Account Number:</span>
                      <strong className="text-base text-emerald-300 font-mono tracking-wider">09914089646</strong>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyGcashNumber}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedGcash ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedGcash ? 'Kina-copy!' : 'Copy'}</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
                    👉 Mag-send ng <strong>₱10.00 Pesos</strong> sa GCash number na <strong>09914089646</strong>. Pagkatapos mag-send, ilagay ang GCash Reference Number sa ibaba para ma-verify at ma-credit ng Admin ang iyong 10 Tokens (20 Reels).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-300 mb-1">
                    GCash Sender Number
                  </label>
                  <input
                    type="text"
                    placeholder="Hal. 09171234567"
                    value={subGcashNum}
                    onChange={(e) => setSubGcashNum(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-300 mb-1">
                    GCash Reference Number (13 Digits) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Hal. 1002345678901"
                    value={subGcashRef}
                    onChange={(e) => setSubGcashRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white font-mono tracking-wider text-amber-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Kanselahin
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTokenSub}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/30 border border-amber-300"
                    style={{ backgroundColor: '#f59e0b', color: '#000000' }}
                  >
                    {isSubmittingTokenSub ? (
                      <span style={{ color: '#000000' }}>Isinusumite...</span>
                    ) : (
                      <>
                        <Coins className="w-4 h-4 text-black" style={{ color: '#000000' }} />
                        <span style={{ color: '#000000' }}>Isumite Payment Reference</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: ACTIVITY AREA & REELS PROFIT */}
            {activeUploadTab === 'activity' && (
              <div className="space-y-4 pt-1">
                {/* SUMMARY STATS & REDEEM SECTION */}
                {(() => {
                  const approvedReels = myReelsList.filter(r => r.status === 'approved' || !r.status);
                  const totalViews = approvedReels.reduce((acc, r) => acc + (r.watchedBy?.length || r.views || 0), 0);
                  
                  let totalGrossRevenue = 0;
                  approvedReels.forEach(r => {
                    const country = reelCountries[r.id] || r.audienceCountry || 'Philippines';
                    const views = r.watchedBy?.length || r.views || 0;
                    const breakdown = calculateReelRevenue(views, r.likes || 0, country);
                    totalGrossRevenue += breakdown.revenue;
                  });

                  const redeemableAmount = Math.max(0, Number((totalGrossRevenue - totalRedeemedAmount).toFixed(2)));
                  const progressPct = Math.min(100, Math.max(0, (redeemableAmount / 300) * 100));

                  return (
                    <div className="space-y-3">
                      {/* STATS CARDS */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Total Views</span>
                          </span>
                          <span className="text-base font-black text-white block font-mono">
                            {totalViews.toLocaleString()}
                          </span>
                        </div>

                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Gross Profit</span>
                          </span>
                          <span className="text-base font-black text-emerald-400 block font-mono">
                            ₱{totalGrossRevenue.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* REDEMPTION ACTION CARD */}
                      <div className="bg-indigo-950/50 border border-indigo-500/30 p-3.5 rounded-2xl space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-indigo-200 flex items-center gap-1.5">
                            <Wallet className="w-4 h-4 text-indigo-400" />
                            <span>Available Redeemable Profit:</span>
                          </span>
                          <span className="font-black text-emerald-300 font-mono text-sm">
                            ₱{redeemableAmount.toFixed(2)}
                          </span>
                        </div>

                        {/* PROGRESS BAR TO ₱300 */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                            <span>Goal Minimum: ₱300.00</span>
                            <span className="text-indigo-300 font-mono">{progressPct.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-800 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* REDEEM BUTTON */}
                        <button
                          type="button"
                          disabled={redeemableAmount < 300 || isRedeemingProfit}
                          onClick={() => handleRedeemProfit(redeemableAmount)}
                          className={`w-full py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${
                            redeemableAmount >= 300
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse shadow-emerald-950/50'
                              : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                          }`}
                        >
                          {isRedeemingProfit ? (
                            <span>Isina-sagawa ang Redemption...</span>
                          ) : redeemableAmount >= 300 ? (
                            <>
                              <DollarSign className="w-4 h-4 text-emerald-300" />
                              <span>🎉 I-Redeem Ang ₱{redeemableAmount.toFixed(2)} Profit sa Balance!</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                              <span>Minimum ₱300.00 Profit Bago Makapag-Redeem</span>
                            </>
                          )}
                        </button>
                        <p className="text-[10px] text-slate-400 text-center font-semibold">
                          Mapupunta agad sa iyong Kasalukuyang Balance ang mga na-redeem na profit.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* MY UPLOADED REELS LIST */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📹 Aking In-upload na Reels ({myReelsList.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={fetchUserReelsActivity}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingActivity ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {myReelsList.length === 0 ? (
                    <div className="text-center py-6 bg-slate-950 border border-slate-800 rounded-2xl text-slate-500 text-xs font-bold">
                      Wala ka pang naipagsumite na Reels. Mag-upload na ngayon para magsimulang kumita!
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                      {myReelsList.map((reel) => {
                        const views = reel.watchedBy?.length || reel.views || 0;
                        const likes = reel.likes || 0;
                        const country = reelCountries[reel.id] || reel.audienceCountry || 'Philippines';
                        const breakdown = calculateReelRevenue(views, likes, country);

                        return (
                          <div key={reel.id} className="bg-slate-950 border border-slate-800 p-3 rounded-2xl space-y-2 text-xs">
                            {/* HEADER */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-extrabold text-white block truncate max-w-[180px]">
                                  {reel.title || 'Untitled Reel'}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {new Date(reel.createdAt).toLocaleDateString('fil-PH')}
                                </span>
                              </div>

                              {/* STATUS BADGE */}
                              {reel.status === 'approved' ? (
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                  <CheckCircle2 className="w-3 h-3" /> Approved
                                </span>
                              ) : reel.status === 'disapproved' ? (
                                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                  <XCircle className="w-3 h-3" /> Disapproved
                                </span>
                              ) : (
                                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                  <Clock className="w-3 h-3 animate-pulse" /> Pending Review
                                </span>
                              )}
                            </div>

                            {/* DISAPPROVED MESSAGE */}
                            {reel.status === 'disapproved' && (
                              <div className="bg-rose-950/40 border border-rose-500/30 p-2 rounded-xl text-[10px] text-rose-300 font-semibold space-y-0.5">
                                <div>❌ <strong>Disapproval Reason:</strong> {reel.disapproveReason || 'Community guidelines violation.'}</div>
                                <div className="text-slate-400 text-[9px]"> Note: Walang nabawas na tokens sa iyong account.</div>
                              </div>
                            )}

                            {/* APPROVED REEL STATS & CPM BREAKDOWN */}
                            {reel.status === 'approved' && (
                              <div className="space-y-2 pt-1 border-t border-slate-900">
                                {/* AUDIENCE SELECTOR */}
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-slate-400 font-bold flex items-center gap-1">
                                    <Globe className="w-3 h-3 text-indigo-400" /> Audience Region:
                                  </span>
                                  <select
                                    value={country}
                                    onChange={(e) => setReelCountries({ ...reelCountries, [reel.id]: e.target.value as AudienceCountry })}
                                    className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-0.5 text-[10px] outline-none"
                                  >
                                    {Object.keys(AUDIENCE_CPM_RATES).map((c) => (
                                      <option key={c} value={c}>
                                        {AUDIENCE_CPM_RATES[c as AudienceCountry].label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* CPM CALCULATION FORMULA DISPLAY */}
                                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80 space-y-1 text-[10px]">
                                  <div className="flex justify-between text-slate-300 font-bold">
                                    <span>Views / Impressions:</span>
                                    <span className="text-white font-mono">{views.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-400">
                                    <span>Base CPM + Bonuses:</span>
                                    <span className="font-mono text-slate-300">
                                      ₱{breakdown.baseCPM} + ₱{breakdown.engagementBonus} + ₱{breakdown.watchTimeBonus} + ₱{breakdown.demandAdjustment}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-indigo-300 font-bold pt-0.5 border-t border-slate-800">
                                    <span>Final CPM Rate:</span>
                                    <span className="font-mono text-indigo-300">₱{breakdown.finalCPM.toFixed(2)} / 1k views</span>
                                  </div>
                                </div>

                                {/* TOTAL PROFIT FOR THIS REEL */}
                                <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1.5 rounded-xl text-[11px]">
                                  <span className="font-bold text-slate-300">Reel Profit:</span>
                                  <span className="font-black text-emerald-400 font-mono text-xs">
                                    ₱{breakdown.revenue.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </>
  );
}
