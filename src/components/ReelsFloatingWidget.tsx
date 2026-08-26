import React, { useState, useEffect, useRef } from 'react';
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
  Info
} from 'lucide-react';
import { ReelVideo, ReelRedemption } from '../types';
import { idbStorage } from '../utils/idbStorage';

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

  // Cache only lightweight reels metadata, thumbnails, IDs and safe references (no raw video binaries)
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeReels = reels && reels.length > 0 
    ? [...reels].sort((a, b) => a.likes - b.likes) 
    : [];

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Handle Drag Start (Mouse & Touch)
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

  // Handle Drag Move (Mouse & Touch)
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

  // COMPLETELY BLOCK ALL MONETAG ADS & POPUNDERS WHEN REELS WIDGET IS OPEN
  useEffect(() => {
    if (!isOpen) return;

    // 1. Immediately remove Monetag ad script tag if present
    const monetagScript = document.getElementById('monetag-login-ads-script');
    if (monetagScript) {
      monetagScript.remove();
    }

    // 2. Safely override window.open to permanently block ad popunders while Reels Widget is active
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

    // 3. Intercept events for widget open/close without blocking internal React button clicks
    const handleGlobalCapture = (e: Event) => {
      const el = widgetRef.current;
      const backdrop = backdropRef.current;
      const target = e.target as HTMLElement | null;

      if ((el && (el.contains(target) || target === el)) || (backdrop && (backdrop.contains(target) || target === backdrop))) {
        // Handle Close and Open buttons directly
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

  // Hide floating Install App button whenever Reels widget is open OR when user is logged in
  useEffect(() => {
    const installBtn = document.getElementById('installBtn');
    const isLoggedIn = document.body.classList.contains('user-logged-in');

    if (isOpen) {
      document.body.classList.add('reels-widget-open');
      if (installBtn) {
        installBtn.style.setProperty('display', 'none', 'important');
      }
    } else {
      document.body.classList.remove('reels-widget-open');
      if (installBtn && !isLoggedIn) {
        installBtn.style.display = 'block';
      } else if (installBtn && isLoggedIn) {
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

  const scrollToReel = (index: number) => {
    if (index < 0 || index >= activeReels.length) return;
    setCurrentIndex(index);
    if (scrollContainerRef.current) {
      const child = scrollContainerRef.current.children[index] as HTMLElement;
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleNext = () => {
    if (activeReels.length === 0) return;
    const nextIdx = (currentIndex + 1) % activeReels.length;
    scrollToReel(nextIdx);
  };

  const handlePrev = () => {
    if (activeReels.length === 0) return;
    const prevIdx = (currentIndex - 1 + activeReels.length) % activeReels.length;
    scrollToReel(prevIdx);
  };

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

  // Sync HTML5 video element play/pause state
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Reset watch progress whenever active reel changes (e.g. user switches reels)
  useEffect(() => {
    setWatchProgress(0);
    setIsPlaying(false);
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

  // YouTube / Iframe postMessage event listener for synchronized video progress
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        if (!event.data) return;
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data) return;

        const activeReel = activeReels[currentIndex];
        if (!activeReel) return;

        // YouTube state change (1: playing, 2: paused, 0: ended)
        if (data.event === 'onStateChange') {
          if (data.info === 1) setIsPlaying(true);
          if (data.info === 2 || data.info === 3) setIsPlaying(false);
          if (data.info === 0) {
            setIsPlaying(false);
            setWatchProgress(100);
            handleClaimWatchReward(activeReel.id);
          }
        }

        // YouTube info delivery with exact currentTime & duration
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

  // Watch Timer Fallback for Embedded Iframes (only runs while isPlaying is TRUE and for non-direct video files)
  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    const activeReel = activeReels[currentIndex];
    if (!activeReel) return;

    // Direct MP4 videos update watchProgress via video.onTimeUpdate directly, so skip timer for direct videos
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

    // 250ms interval ~ 25s total reel duration sync
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
    // Jump to newly added reel at index 0 (top)
    scrollToReel(0);
  };

  // Closed Trigger Floating Button (Vibrant Solid Gradient & Draggable)
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
      {/* 🌑 BACKDROP OVERLAY to completely lock and freeze background Login/Register area when widget is open */}
      <div 
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn touch-none"
        onClick={() => setIsOpen(false)}
        onTouchMove={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />

      <div 
        ref={widgetRef}
        className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 max-w-[340px] w-[92vw] bg-slate-950/98 border border-slate-800 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col transition duration-300 animate-fadeIn"
      >
      
      {/* 🔮 HEADER BAR WITH NAVIGATION CONTROLS */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-3 border-b border-slate-800 flex items-center justify-between gap-1.5 shrink-0 select-none">
        
        {/* Title & Badge */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-400 shrink-0">
            <Video className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-xs text-white tracking-tight uppercase flex items-center gap-1">
                <span>REELS & SHORTS</span>
              </h3>
              {activeReels.length > 0 && (
                <span className="bg-rose-500/20 text-rose-300 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border border-rose-500/30">
                  {currentIndex + 1}/{activeReels.length}
                </span>
              )}
            </div>
            <p className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">
              {language === 'tl' ? 'I-scroll pababa o gamitin ang ⬆️⬇️' : 'Scroll down or use ⬆️⬇️'}
            </p>
          </div>
        </div>

        {/* Navigation & Action Controls */}
        <div className="flex items-center gap-1">
          
          {/* Scroll Up / Previous Reel */}
          {activeReels.length > 1 && (
            <button
              onClick={handlePrev}
              className="bg-slate-800 hover:bg-slate-700 text-white p-1.5 rounded-xl transition cursor-pointer border border-slate-700 active:scale-90"
              title={language === 'tl' ? 'Itaas / Nakaraang Reel' : 'Scroll Up'}
            >
              <ChevronUp className="w-3.5 h-3.5 text-indigo-300" />
            </button>
          )}

          {/* Scroll Down / Next Reel */}
          {activeReels.length > 1 && (
            <button
              onClick={handleNext}
              className="bg-slate-800 hover:bg-slate-700 text-white p-1.5 rounded-xl transition cursor-pointer border border-slate-700 active:scale-90"
              title={language === 'tl' ? 'Ibaba / Susunod na Reel' : 'Scroll Down'}
            >
              <ChevronDown className="w-3.5 h-3.5 text-indigo-300" />
            </button>
          )}

          {/* User Upload Reel Icon Button (Registered & Non-registered users) */}
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white px-2 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 transition cursor-pointer shadow-md shadow-rose-950/50 border border-rose-400/40 active:scale-95 shrink-0"
            title={language === 'tl' ? 'Mag-upload ng Reels/Shorts (0.50 Tokens)' : 'Upload Reel'}
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="font-extrabold">Upload</span>
          </button>

          {/* Admin Add Reel button */}
          {isAdmin && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
              title={language === 'tl' ? 'Magdagdag ng Reel (Admin)' : 'Add Reel'}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Close Floating Window Button */}
          <button
            id="reels-widget-close-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsOpen(false);
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer z-10"
            title={language === 'tl' ? 'Isara ang Window' : 'Close Floating Window'}
          >
            <X className="w-4 h-4 pointer-events-none" />
          </button>
        </div>
      </div>

      {/* 📹 MAIN CONTENT AREA - SMOOTH ULTRA-RESPONSIVE FEED */}
      <div 
        ref={scrollContainerRef}
        onScroll={() => {
          if (!scrollContainerRef.current) return;
          const container = scrollContainerRef.current;
          const children = Array.from(container.children) as HTMLElement[];
          let closestIndex = currentIndex;
          let minDiff = Infinity;
          const containerTop = container.scrollTop;

          children.forEach((child, idx) => {
            const childTop = child.offsetTop - container.offsetTop;
            const diff = Math.abs(childTop - containerTop);
            if (diff < minDiff) {
              minDiff = diff;
              closestIndex = idx;
            }
          });

          if (closestIndex !== currentIndex && closestIndex >= 0 && closestIndex < activeReels.length) {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => {
              setCurrentIndex(closestIndex);
            }, 600);
          }
        }}
        className="reels-widget-scroll-container p-3 space-y-4 max-h-[68vh] sm:max-h-[460px] overflow-y-auto touch-pan-y overscroll-contain"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4f46e5 #0f172a',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {activeReels.length > 0 ? (
          activeReels.map((reel, index) => {
            const isActive = index === currentIndex;

            return (
              <div 
                key={reel.id} 
                onClick={() => {
                  if (!isActive) scrollToReel(index);
                }}
                className={`space-y-2 p-2.5 rounded-2xl border transition duration-200 ${
                  isActive 
                    ? 'ring-2 ring-indigo-500/60 bg-indigo-950/40 border-indigo-500/50 shadow-lg' 
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 opacity-90 hover:opacity-100 cursor-pointer'
                }`}
              >
                
                {/* Header bar for each reel */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-1">
                  <span className="flex items-center gap-1.5">
                    <span className={`font-extrabold px-2 py-0.5 rounded-md border ${
                      isActive ? 'bg-rose-500 text-white border-rose-400 shadow-md' : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      Reel #{index + 1} {isActive && '▶️ NOW PLAYING'}
                    </span>
                    {index === 0 && (
                      <span className="bg-emerald-500/20 text-emerald-300 font-extrabold px-1.5 py-0.5 rounded-md border border-emerald-500/30 uppercase text-[8px]">
                        ⚡ PINAKAMABABANG LIKES
                      </span>
                    )}
                    {index === activeReels.length - 1 && activeReels.length > 1 && (
                      <span className="bg-amber-500/20 text-amber-300 font-extrabold px-1.5 py-0.5 rounded-md border border-amber-500/30 uppercase text-[8px]">
                        🔥 MARAMING LIKES
                      </span>
                    )}
                  </span>
                  
                  <span className={`font-black px-2 py-0.5 rounded-full border text-[9px] ${
                    reel.platform === 'tiktok'
                      ? 'bg-black/80 text-cyan-300 border-cyan-500/40'
                      : reel.platform === 'facebook'
                      ? 'bg-blue-900/80 text-blue-200 border-blue-400/40'
                      : reel.platform === 'youtube'
                      ? 'bg-rose-950/80 text-rose-200 border-rose-500/40'
                      : 'bg-slate-900/80 text-slate-200 border-slate-700'
                  }`}>
                    {reel.platform === 'tiktok' && '🎵 TikTok'}
                    {reel.platform === 'facebook' && '📘 FB Reel'}
                    {reel.platform === 'youtube' && '▶️ YT Short'}
                    {reel.platform === 'direct' && '📹 Video'}
                  </span>
                </div>

                {/* Video Container Frame */}
                <div className="relative bg-black rounded-2xl overflow-hidden border border-slate-800 aspect-[9/14] sm:aspect-[9/13] max-h-[320px] flex items-center justify-center shadow-lg group touch-pan-y">
                  
                  {/* 🧧 RED POCKET FLOATING BADGE WITH CIRCULAR PROGRESS RING */}
                  {(() => {
                    const isReelClaimed = Boolean(
                      (currentUserId && reel.watchedBy?.includes(currentUserId)) ||
                      watchedIds.includes(reel.id)
                    );
                    const currentProgress = isActive ? (isReelClaimed ? 100 : watchProgress) : (isReelClaimed ? 100 : 0);
                    const radius = 11;
                    const circumference = 2 * Math.PI * radius; // ~69.115
                    const dashOffset = circumference - (circumference * currentProgress) / 100;

                    return (
                      <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm border border-amber-500/40 p-1 pr-2.5 rounded-full shadow-lg hover:bg-black/60 transition">
                        <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                          <svg className="w-7 h-7 -rotate-90 transform">
                            <circle
                              cx="14"
                              cy="14"
                              r={radius}
                              className="stroke-slate-900/80"
                              strokeWidth="2.5"
                              fill="transparent"
                            />
                            <circle
                              cx="14"
                              cy="14"
                              r={radius}
                              className={isReelClaimed ? 'stroke-emerald-400' : 'stroke-amber-400'}
                              strokeWidth="2.5"
                              strokeDasharray={circumference}
                              strokeDashoffset={dashOffset}
                              strokeLinecap="round"
                              fill="transparent"
                              style={{ transition: 'stroke-dashoffset 0.15s linear' }}
                            />
                          </svg>
                          <div className={`absolute inset-0 m-auto w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] shadow-sm ${
                            isReelClaimed ? 'bg-emerald-600 text-white' : 'bg-red-600/90 text-amber-200 border border-amber-300/80 animate-pulse'
                          }`}>
                            {isReelClaimed ? '✅' : '🧧'}
                          </div>
                        </div>

                        <div className="flex flex-col text-left">
                          <span className="text-[7.5px] font-black uppercase tracking-wider text-amber-300 leading-none">
                            {isReelClaimed ? 'RED POCKET CLAIMED' : 'RED POCKET REWARD'}
                          </span>
                          <span className="text-[10px] font-black text-white leading-tight flex items-center gap-1 mt-0.5">
                            {isReelClaimed ? (
                              <span className="text-emerald-400 font-extrabold flex items-center gap-1 text-[9px]">
                                100% DONE (+₱0.10)
                              </span>
                            ) : (
                              <>
                                <span className="text-amber-400 font-black">{currentProgress}%</span>
                                <span className="text-[8.5px] text-slate-200 font-semibold">
                                  {isActive ? (isPlaying ? '▶️ Loading...' : '⏸️ Tap Play to Start') : '0%'}
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Play Button Overlay (Shown when active reel is NOT playing and NOT yet claimed) */}
                  {(() => {
                    const isReelClaimed = Boolean(
                      (currentUserId && reel.watchedBy?.includes(currentUserId)) ||
                      watchedIds.includes(reel.id)
                    );
                    if (isActive && !isPlaying && !isReelClaimed) {
                      return (
                        <div 
                          onClick={() => setIsPlaying(true)}
                          className="absolute inset-0 z-25 bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-slate-950/70 transition group/play"
                        >
                          {/* Red YouTube style Play Button */}
                          <div className="w-16 h-12 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl border border-amber-300/60 flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.8)] group-hover/play:scale-110 group-hover/play:from-red-500 group-hover/play:to-rose-500 transition-all mb-3 animate-bounce">
                            <Play className="w-8 h-8 fill-white text-white ml-1" />
                          </div>
                          <span className="text-xs font-black text-amber-300 uppercase tracking-wide drop-shadow-md bg-slate-900/90 px-3 py-1 rounded-full border border-amber-500/40">
                            ▶️ PINDUTIN ANG PLAY BUTTON
                          </span>
                          <p className="text-[11px] font-bold text-slate-200 mt-2 max-w-[220px] leading-snug">
                            I-click para i-play at simulan ang circular loading animation (1% ➔ 100%) para sa ₱0.10 Red Pocket reward!
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* IF ACTIVE: Render iframe / video. IF INACTIVE: Render placeholder thumbnail preview to stop audio/video background playing */}
                  {isActive ? (
                    (() => {
                      const formatted = formatEmbedUrl(reel.embedUrl || reel.url || '');
                      const isDirect = formatted.platform === 'direct' && (
                        formatted.embedUrl.match(/\.(mp4|webm|mov)($|\?)/i) || 
                        reel.url?.match(/\.(mp4|webm|mov)($|\?)/i)
                      );

                      if (isDirect) {
                        return (
                          <video
                            ref={videoRef}
                            src={formatted.embedUrl || reel.url}
                            controls
                            autoPlay={isPlaying}
                            playsInline
                            className="w-full h-full object-contain bg-black"
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onTimeUpdate={(e) => {
                              const v = e.currentTarget;
                              if (v.duration && v.duration > 0) {
                                const pct = Math.min(100, Math.floor((v.currentTime / v.duration) * 100));
                                setWatchProgress(pct);
                                if (pct >= 100) {
                                  handleClaimWatchReward(reel.id);
                                }
                              }
                            }}
                            onEnded={() => {
                              setWatchProgress(100);
                              handleClaimWatchReward(reel.id);
                              setIsPlaying(false);
                            }}
                          />
                        );
                      }

                      const finalIframeSrc = formatted.embedUrl.includes('?') 
                        ? `${formatted.embedUrl}&enablejsapi=1&autoplay=${isPlaying ? 1 : 0}` 
                        : `${formatted.embedUrl}?enablejsapi=1&autoplay=${isPlaying ? 1 : 0}`;

                      return (
                        <iframe
                          src={finalIframeSrc}
                          title={reel.title || `Reel Video ${index + 1}`}
                          className="w-full h-full border-0 bg-slate-950"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
                        />
                      );
                    })()
                  ) : (
                    /* Inactive Reel Card Overlay (Stops video/audio playback completely until clicked/scrolled) */
                    <div 
                      onClick={() => scrollToReel(index)}
                      className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-slate-900/90 transition group/play"
                    >
                      <div className="p-4 bg-indigo-600/30 border border-indigo-500/50 rounded-full text-indigo-300 group-hover/play:scale-110 group-hover/play:bg-indigo-600 transition shadow-xl mb-2">
                        <Play className="w-7 h-7 fill-indigo-300 text-indigo-300 group-hover/play:fill-white group-hover/play:text-white" />
                      </div>
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        I-tap para i-play ang Reel #{index + 1}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 max-w-[200px]">
                        {reel.title || 'Panoorin ang video reel'}
                      </p>
                    </div>
                  )}

                  {/* Delete Button for Admin */}
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteReel(reel.id);
                      }}
                      className="absolute top-2 right-2 bg-rose-600/90 hover:bg-rose-600 text-white p-1.5 rounded-full border border-rose-400/30 transition cursor-pointer shadow-md z-10"
                      title="Delete Reel (Admin)"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Title & Interactive Controls Bar */}
                <div className="space-y-2 bg-slate-900/80 border border-slate-800/80 p-2.5 rounded-2xl">
                  
                  {/* Title / Description */}
                  {reel.title && (
                    <p className="text-xs font-bold text-slate-200 leading-snug line-clamp-2">
                      {reel.title}
                    </p>
                  )}

                  {/* Like Button & Open Original Link */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                    
                    {/* LIKE BUTTON */}
                    {(() => {
                      const isReelLiked = Boolean(
                        currentUserId
                          ? reel.likedBy?.includes(currentUserId)
                          : likedIds.includes(reel.id)
                      );
                      return (
                        <button
                          type="button"
                          onClick={(e) => handleLike(reel.id, e)}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer active:scale-90 select-none z-20 ${
                            isReelLiked
                              ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white border border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.6)] scale-105'
                              : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-rose-400 border border-slate-700'
                          }`}
                        >
                          <Heart className={`w-4 h-4 transition ${isReelLiked ? 'fill-white text-white scale-110' : ''}`} />
                          <span>{reel.likes}</span>
                        </button>
                      );
                    })()}

                    {/* Pause / Play Watch Timer button */}
                    {isActive && !Boolean((currentUserId && reel.watchedBy?.includes(currentUserId)) || watchedIds.includes(reel.id)) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPlaying(!isPlaying);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-black text-[11px] border flex items-center gap-1.5 transition-all cursor-pointer z-20 ${
                          isPlaying
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                            : 'bg-emerald-600 text-white border-emerald-400 hover:bg-emerald-500 shadow-md animate-pulse'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                            <span>⏸️ Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-white text-white" />
                            <span>▶️ Start Watch</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Open original link button */}
                    <a
                      href={reel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-indigo-300 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border border-slate-700 flex items-center gap-1 transition"
                      title="Open original link in new tab"
                    >
                      <span>Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                  </div>
                </div>

              </div>
            );
          })
        ) : (
          <div className="py-8 text-center space-y-2">
            <Tv className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
            <p className="text-xs text-slate-400 font-semibold">
              {language === 'tl' ? 'Walang available na reels video.' : 'No reels videos published yet.'}
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs"
              >
                + Magdagdag ng Unang Reel
              </button>
            )}
          </div>
        )}
      </div>

      {/* ⚙️ ADMIN ADD REEL FORM POPUP MODAL */}
      {showAddForm && isAdmin && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border-2 border-indigo-500/60 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4 text-xs">
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

      {/* 📜 BOTTOM SCROLL NAVIGATION CONTROL BAR */}
      {activeReels.length > 1 && (
        <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <button
            onClick={handlePrev}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold border border-slate-700 transition cursor-pointer text-[11px]"
          >
            <ChevronUp className="w-4 h-4" />
            <span>Itaas (Previous)</span>
          </button>

          <span className="text-[10px] font-black text-slate-400 uppercase">
            {currentIndex + 1} / {activeReels.length}
          </span>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold border border-slate-700 transition cursor-pointer text-[11px]"
          >
            <span>Ibaba (Next)</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 📤 USER REEL UPLOAD & TOKEN SUBSCRIPTION MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-fadeIn">
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
                  
                  // Calculate total gross revenue across all approved reels
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

    </div>
    </>
  );
}

