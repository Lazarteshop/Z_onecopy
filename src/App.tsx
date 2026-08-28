import React, { useState, useEffect } from 'react';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  Wallet, 
  Coins, 
  Eye, 
  Newspaper, 
  ShoppingBag, 
  TrendingUp, 
  PlusCircle, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle,
  Clock,
  Compass,
  DollarSign,
  UserCheck,
  Globe,
  Share2,
  ListFilter,
  CheckCircle,
  Activity,
  History,
  Plus,
  Moon,
  Sun,
  AlertCircle,
  Lock,
  Mail,
  User,
  UserPlus,
  ShieldAlert,
  LogOut,
  RefreshCw,
  Shield,
  Award,
  Trash2,
  Heart,
  MessageSquare,
  ThumbsUp,
  Camera,
  Tv,
  Users,
  Ban,
  Upload,
  Megaphone,
  Briefcase,
  Smartphone,
  Bell,
  QrCode,
  Download,
  Flame,
  Rocket,
  ArrowLeft,
  X,
  Home,
  Gift,
  Receipt
} from 'lucide-react';
import { INITIAL_CAMPAIGNS } from './data/campaigns';
import { WebsiteCampaign, WithdrawalRequest, ActivityLog, UserStats, ReferralFriend, ReelVideo } from './types';
import BrowserSimulator from './components/BrowserSimulator';
import GCashCashout from './components/GCashCashout';
import ReferralPanel from './components/ReferralPanel';
import AdminPanel from './components/AdminPanel';
import ZoneFeed from './components/ZoneFeed';
import MerchantPortal from './components/MerchantPortal';
import { ZoneShopVAHub } from './components/ZoneShopVAHub';
import AICommercialPlayer from './components/AICommercialPlayer';
import SpinWheel from './components/SpinWheel';
import PayoutMarquee from './components/PayoutMarquee';
import ReelsFloatingWidget, { parseVideoUrl } from './components/ReelsFloatingWidget';
import ZoneAppBanner from './components/ZoneAppBanner';
import { SmartphoneAppLauncher } from './components/SmartphoneAppLauncher';
import { PromoAdBannerModal } from './components/PromoAdBannerModal';
import { DemoTestingFloatingBanner } from './components/DemoTestingFloatingBanner';
import { WithdrawalPolicyModal } from './components/WithdrawalPolicyModal';
import { WithdrawalPolicyBanner } from './components/WithdrawalPolicyBanner';
import { AddCampaignModal } from './components/AddCampaignModal';
import { BackgroundNotificationModal } from './components/BackgroundNotificationModal';
import { DataSaverSettingsModal } from './components/DataSaverSettingsModal';
import { dataSaver, generateIdempotencyKey } from './utils/dataSaver';
import { idbStorage } from './utils/idbStorage';
import { soundEffects } from './utils/audio';
import { 
  subscribeUserToPush, 
  sendTestPushNotification, 
  isPushNotificationSupported, 
  getNotificationPermissionState 
} from './utils/pushManager';

interface UserSession {
  id: string;
  email: string;
  name: string;
  avatar: string;
  isAdmin: boolean;
  isBanned?: boolean;
  zonedUsers?: string[];
  referralCode: string;
  stats: UserStats;
  withdrawals: WithdrawalRequest[];
  activityLogs: ActivityLog[];
  referredFriends: ReferralFriend[];
}

const compressImage = (base64Str: string, maxWidth = 150, maxHeight = 150): Promise<string> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn("Avatar compression timed out. Resolving with original string.");
      resolve(base64Str);
    }, 4000); // 4 seconds fail-safe timeout

    const img = new Image();
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          resolve(base64Str);
        }
      } catch (err) {
        console.error("Avatar compression error:", err);
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(base64Str);
    };
    img.src = base64Str;
  });
};

export default function App() {
  // --- AUTHENTICATION & SYNC STATES ---
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('gcash_click_earn_token');
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const backup = localStorage.getItem('gcash_user_backup_profile');
      if (backup) {
        const parsed = JSON.parse(backup);
        if (parsed && parsed.id) return parsed;
      }
    } catch {}
    return null;
  });

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [newAvatar, setNewAvatar] = useState('👤');
  const [newName, setNewName] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Load from IndexedDB on startup if memory user is empty
  useEffect(() => {
    if (!user && token) {
      idbStorage.get<UserSession>('zone_cached_user_profile').then(cached => {
        if (cached && cached.id) {
          setUser(cached);
          if (cached.stats) setStats(cached.stats);
          if (cached.withdrawals) setWithdrawals(cached.withdrawals);
          if (cached.activityLogs) setActivityLogs(cached.activityLogs);
          if (cached.referredFriends) setReferredFriends(cached.referredFriends);
        }
      }).catch(() => {});
    }
  }, [token]);

  // Form states
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);

  // --- CORE APP STATES ---
  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const backup = localStorage.getItem('gcash_user_backup_profile');
      if (backup) {
        const parsed = JSON.parse(backup);
        if (parsed?.stats?.balance !== undefined) return parsed.stats;
      }
    } catch {}
    return {
      balance: 25.00,
      lifetimeEarnings: 25.00,
      completedTasksCount: 0,
      dailyCheckInDate: null
    };
  });

  const [campaigns, setCampaigns] = useState<WebsiteCampaign[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(() => {
    try {
      const backup = localStorage.getItem('gcash_user_backup_profile');
      if (backup) {
        const parsed = JSON.parse(backup);
        if (Array.isArray(parsed?.withdrawals)) return parsed.withdrawals;
      }
    } catch {}
    return [];
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    try {
      const backup = localStorage.getItem('gcash_user_backup_profile');
      if (backup) {
        const parsed = JSON.parse(backup);
        if (Array.isArray(parsed?.activityLogs)) return parsed.activityLogs;
      }
    } catch {}
    return [];
  });
  const [referredFriends, setReferredFriends] = useState<ReferralFriend[]>([]);
  
  const [activeTab, setActiveTab] = useState<'earn' | 'cashout' | 'zone' | 'guide' | 'admin' | 'negosyo' | 'va_shop' | null>(null);

  const [currentViewingCampaign, setCurrentViewingCampaign] = useState<WebsiteCampaign | null>(null);
  const [activeCommercialCamp, setActiveCommercialCamp] = useState<WebsiteCampaign | null>(null);

  // Add custom campaigns state
  const [showAddCampaignModal, setShowAddCampaignModal] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customReward, setCustomReward] = useState('0.75');
  const [customTimer, setCustomTimer] = useState('15');
  const [customDescription, setCustomDescription] = useState('');
  const [campaignFilter, setCampaignFilter] = useState<'all' | 'high' | 'available'>('all');
  const [showPromoAdModal, setShowPromoAdModal] = useState<boolean>(true);
  // Always true on initial app load / open so the popup banner shows every time
  const [showWithdrawalPolicyModal, setShowWithdrawalPolicyModal] = useState<boolean>(true);
  const [showPushNotifModal, setShowPushNotifModal] = useState<boolean>(false);
  const [showDataSaverModal, setShowDataSaverModal] = useState<boolean>(false);
  const [isDataSaverActive, setIsDataSaverActive] = useState<boolean>(() => dataSaver.isDataSaverActive());

  useEffect(() => {
    const unsub = dataSaver.subscribe((active) => {
      setIsDataSaverActive(active);
    });
    return unsub;
  }, []);

  // 🌐 CLONE / TESTING DEMO MODE DETECTOR
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const isQueryDemo = (
      params.get('mode') === 'demo' ||
      params.get('demo') === 'true' ||
      params.get('demo') === '1' ||
      params.get('testing') === 'true' ||
      window.location.pathname.includes('/demo')
    );
    if (isQueryDemo) {
      try { localStorage.setItem('is_demo_mode', 'true'); } catch (e) {}
      return true;
    }
    return localStorage.getItem('is_demo_mode') === 'true';
  });

  // Animation states
  const [floatingCoinReward, setFloatingCoinReward] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSpinModal, setShowSpinModal] = useState(false);
  
  // Floating Reels & Shorts State
  const [reels, setReels] = useState<ReelVideo[]>(() => {
    try {
      const saved = localStorage.getItem('gcash_reels_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading reels', e);
    }
    return [
      {
        id: 'reel-1',
        url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
        embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0&loop=1&playlist=dQw4w9WgXcQ',
        platform: 'youtube',
        title: '🔥 Actual GCash Cashout Proof - Daily PPV Earning Reel',
        likes: 1248,
        createdAt: new Date().toISOString()
      },
      {
        id: 'reel-2',
        url: 'https://www.tiktok.com/@tiktok/video/7100000000000000000',
        embedUrl: 'https://www.youtube.com/embed/L_LUpnjgPso?autoplay=0&loop=1&playlist=L_LUpnjgPso',
        platform: 'tiktok',
        title: '🎵 TikTok Viral Earning Hack - Mag-click lang at kumita ng GCash!',
        likes: 3890,
        createdAt: new Date().toISOString()
      },
      {
        id: 'reel-3',
        url: 'https://www.facebook.com/reel/100000000000000',
        embedUrl: 'https://www.youtube.com/embed/kJQP7kiw5Fk?autoplay=0&loop=1&playlist=kJQP7kiw5Fk',
        platform: 'facebook',
        title: '📘 FB Reels Feature Preview - PAUTANG NO MORE!',
        likes: 2150,
        createdAt: new Date().toISOString()
      }
    ];
  });

  const fetchReels = async () => {
    try {
      const res = await fetch('/api/reels', {
        headers: {
          ...(token ? { 'Authorization': token } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reels && Array.isArray(data.reels)) {
          setReels(data.reels);
          localStorage.setItem('gcash_reels_data', JSON.stringify(data.reels));
        }
        if (data.userReelsTokens !== undefined || data.reelsTokens !== undefined) {
          const freshTokens = data.userReelsTokens ?? data.reelsTokens;
          setUser(prev => prev ? { ...prev, reelsTokens: freshTokens } : null);
        }
      }
    } catch (e) {
      console.error('Error fetching reels:', e);
    }
  };

  useEffect(() => {
    fetchReels();
    const pollTime = dataSaver.getPollingInterval(25000);
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchReels();
      }
    }, pollTime);
    const handleOpen = () => fetchReels();
    window.addEventListener('open-reels-widget', handleOpen);
    window.addEventListener('refresh-reels', handleOpen);
    return () => {
      clearInterval(interval);
      window.removeEventListener('open-reels-widget', handleOpen);
      window.removeEventListener('refresh-reels', handleOpen);
    };
  }, []);

  const handleAddReel = async (url: string, title?: string) => {
    const parsed = parseVideoUrl(url);
    const addedByName = user?.name || 'Admin';

    try {
      const res = await fetch('/api/reels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id ? { 'Authorization': user.id } : {})
        },
        body: JSON.stringify({
          url,
          embedUrl: parsed.embedUrl,
          platform: parsed.platform,
          title: title || (parsed.platform === 'tiktok' ? '🎵 TikTok Reel Video' : parsed.platform === 'facebook' ? '📘 FB Reel Video' : '🎬 Reel Video'),
          addedBy: addedByName
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reels) {
          setReels(data.reels);
          localStorage.setItem('gcash_reels_data', JSON.stringify(data.reels));
        }
      } else {
        throw new Error('Failed to save reel on server');
      }
    } catch (e) {
      console.error('Failed to save reel on server, using local fallback:', e);
      const newReel: ReelVideo = {
        id: 'reel-' + Date.now(),
        url,
        embedUrl: parsed.embedUrl,
        platform: parsed.platform,
        title: title || (parsed.platform === 'tiktok' ? '🎵 TikTok Reel Video' : parsed.platform === 'facebook' ? '📘 FB Reel Video' : '🎬 Reel Video'),
        likes: 0,
        addedBy: addedByName,
        createdAt: new Date().toISOString()
      };
      const updated = [newReel, ...reels];
      setReels(updated);
      try {
        localStorage.setItem('gcash_reels_data', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save reels', err);
      }
    }

    triggerNotification(
      language === 'tl' ? '🚀 Matagumpay na na-publish ang Reel Video!' : '🚀 Reel Video successfully published!',
      'success'
    );
  };

  const handleDeleteReel = async (id: string) => {
    try {
      const res = await fetch(`/api/reels/${id}`, {
        method: 'DELETE',
        headers: {
          ...(user?.id ? { 'Authorization': user.id } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reels) {
          setReels(data.reels);
          localStorage.setItem('gcash_reels_data', JSON.stringify(data.reels));
        }
      } else {
        throw new Error('Failed to delete reel on server');
      }
    } catch (e) {
      console.error('Failed to delete reel on server, deleting locally:', e);
      const updated = reels.filter(r => r.id !== id);
      setReels(updated);
      try {
        localStorage.setItem('gcash_reels_data', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save reels', err);
      }
    }

    triggerNotification(
      language === 'tl' ? '🗑️ Na-delete ang Reel Video.' : '🗑️ Reel Video deleted.',
      'info'
    );
  };

  const handleLikeReel = async (id: string) => {
    if (!token || !user) {
      triggerNotification(
        language === 'tl'
          ? '⚠️ Kailangan mong mag-login upang mag-like at kumita ng ₱0.05 per Reel!'
          : '⚠️ Please login to like Reels and earn ₱0.05 per Reel!',
        'error'
      );
      return;
    }

    const reel = reels.find(r => r.id === id);
    if (reel && reel.likedBy?.includes(user.id)) {
      triggerNotification(
        language === 'tl'
          ? '⚠️ Naliked mo na ang Reel na ito! Permanente na ito at hindi na pwedeng i-unlike.'
          : '⚠️ You already liked this Reel! Unliking is not allowed.',
        'info'
      );
      return;
    }

    try {
      const res = await fetch(`/api/reels/${id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ userId: user.id })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.reels) {
          setReels(data.reels);
          localStorage.setItem('gcash_reels_data', JSON.stringify(data.reels));
        }
        triggerNotification(
          language === 'tl'
            ? '🎉 +₱0.05 Reward sa pag-like ng Reel!'
            : '🎉 +₱0.05 Reward for liking Reel!',
          'success'
        );
        fetchUserProfile(token);
      } else {
        triggerNotification(
          data.error || (language === 'tl' ? '⚠️ Hindi na-record ang like.' : '⚠️ Failed to like Reel.'),
          'info'
        );
      }
    } catch (e) {
      console.error('Failed to save like on server:', e);
      triggerNotification(
        language === 'tl' ? '⚠️ Connection error sa server.' : '⚠️ Connection error.',
        'error'
      );
    }
  };

  const handleWatchRewardReel = async (id: string) => {
    if (!user || !token) {
      triggerNotification(
        language === 'tl'
          ? '⚠️ Mag-register o mag-login muna para makuha ang ₱0.10 Red Pocket Reward!'
          : '⚠️ Please register or login to claim ₱0.10 Red Pocket Reward!',
        'info'
      );
      return;
    }

    try {
      const res = await fetch(`/api/reels/${id}/watch-reward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ userId: user.id })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.reels) {
          setReels(data.reels);
          localStorage.setItem('gcash_reels_data', JSON.stringify(data.reels));
        }
        soundEffects.playReward();
        setFloatingCoinReward(0.10);
        setTimeout(() => setFloatingCoinReward(null), 3000);
        triggerNotification(
          language === 'tl'
            ? '🧧 +₱0.10 Red Pocket Reel Reward na-claim!'
            : '🧧 +₱0.10 Red Pocket Reel Reward claimed!',
          'success'
        );
        fetchUserProfile(token);
      } else {
        triggerNotification(
          data.error || (language === 'tl' ? '⚠️ Hindi na-claim ang Red Pocket reward.' : '⚠️ Failed to claim Red Pocket reward.'),
          'info'
        );
      }
    } catch (e) {
      console.error('Failed to claim watch reward on server:', e);
    }
  };
  
  // Language switcher state (English default)
  const [language, setLanguage] = useState<'en' | 'tl'>((localStorage.getItem('user_lang') as 'en' | 'tl') || 'en');

  useEffect(() => {
    localStorage.setItem('user_lang', language);
  }, [language]);

  // Dynamically backup active user profile and stats locally to recover transparently after server cold starts/reboots
  useEffect(() => {
    if (user) {
      let savedPassword = '';
      const existingBackupStr = localStorage.getItem('gcash_user_backup_profile');
      if (existingBackupStr) {
        try {
          const parsed = JSON.parse(existingBackupStr);
          if (parsed && parsed.password) {
            savedPassword = parsed.password;
          }
        } catch (_) {}
      }

      if (!savedPassword && passwordInput) {
        savedPassword = passwordInput;
      }

      localStorage.setItem('gcash_user_backup_profile', JSON.stringify({
        ...user,
        password: savedPassword || (user as any).password
      }));
    }
  }, [user, passwordInput]);

  // --- NOTIFICATION BANNER STATE ---
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const showDeviceNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      const cleanMessage = message.replace(/<[^>]*>/g, ''); // strip any HTML tags safely
      const title = type === 'success' 
        ? '🎉 Z-oneApp Reward' 
        : type === 'error' 
          ? '⚠️ Z-oneApp Alert' 
          : '🔔 Z-oneApp Notification';
          
      const options = {
        body: cleanMessage,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [100, 50, 100],
        tag: 'zone-app-notif',
        renotify: true,
        data: {
          url: window.location.origin
        }
      };

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, options).catch((err) => {
            console.warn('SW registration showNotification failed:', err);
            try {
              new Notification(title, options);
            } catch (e) {
              console.error('Standard Notification fallback failed:', e);
            }
          });
        }).catch(() => {
          try {
            new Notification(title, options);
          } catch (e) {
            console.error('Standard Notification failed:', e);
          }
        });
      } else {
        try {
          new Notification(title, options);
        } catch (e) {
          console.error('Standard Notification failed:', e);
        }
      }
    }
  };

  const requestNotificationPermission = async () => {
    if (!isPushNotificationSupported()) {
      triggerNotification(
        language === 'tl'
          ? '⚠️ Hindi suportado ng iyong device/browser ang system push notifications.'
          : '⚠️ Your device/browser does not support system push notifications.',
        'error'
      );
      return;
    }

    try {
      if (token) {
        const res = await subscribeUserToPush(token);
        if (res.permission) {
          setNotificationPermission(res.permission);
        }
        if (res.success) {
          triggerNotification(
            language === 'tl'
              ? '🎉 Aktibo na ang Background Push Notifications! Makakatanggap ka na ng alert sa GCash Cashouts, Group Chat, at kita kahit sarado ang app.'
              : '🎉 Background Push Notifications active! You will receive alerts on payouts, chats, and rewards even when the app is closed.',
            'success'
          );
        } else {
          triggerNotification(res.message, res.permission === 'denied' ? 'error' : 'info');
        }
      } else {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          triggerNotification(
            language === 'tl'
              ? '🎉 Pinayagan ang notifications! Mag-login upang kumonekta ang background alerts.'
              : '🎉 Notifications allowed! Log in to connect background alerts.',
            'success'
          );
        }
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  // Auto-subscribe to push notifications in background if permission is already granted
  useEffect(() => {
    if (token && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      subscribeUserToPush(token).catch(err => {
        console.log('Background push auto-subscribe info:', err);
      });
    }
  }, [token]);

  const triggerNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type });
    showDeviceNotification(message, type);

    // Play coin audio chime for reward notifications
    if (type === 'success' || message.includes('₱') || message.toLowerCase().includes('reward') || message.toLowerCase().includes('bonus')) {
      try {
        soundEffects.playReward();
      } catch (err) {
        console.warn('Notification audio effect skipped:', err);
      }
    }

    setTimeout(() => {
      setNotification((curr) => curr?.message === message ? null : curr);
    }, 4500);
  };

  // --- COMPILATION & SETUP EFFECTS ---

  // Check for auto referral code in URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralInput(ref);
      setAuthMode('register');
      triggerNotification(`🔗 Referral Link na-detect! Awtomatikong sinali sa ref code: ${ref}`, 'info');
    }
  }, []);


  // Hide Install App button when user is logged in
  useEffect(() => {
    if (user) {
      document.body.classList.add('user-logged-in');
      const installBtn = document.getElementById('installBtn');
      if (installBtn) {
        installBtn.style.display = 'none';
      }
    } else {
      document.body.classList.remove('user-logged-in');
    }
  }, [user]);

  // Fetch or sync user profile
  const fetchUserProfile = async (authToken: string, silent = false) => {
    if (!silent) setLoadingProfile(true);
    try {
      const res = await fetch('/api/user/profile', {
        headers: {
          'Authorization': authToken,
          'x-demo-mode': isDemoMode ? 'true' : 'false'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setStats(data.user.stats);
        setWithdrawals(data.user.withdrawals);
        setActivityLogs(data.user.activityLogs);
        setReferredFriends(data.user.referredFriends);
        
        // Persist to async IndexedDB storage
        idbStorage.set('zone_cached_user_profile', data.user).catch(() => {});
        
        // Load campaigns directly from our centralized cloud backend
        try {
          const campRes = await fetch('/api/campaigns', {
            headers: {
              'Authorization': authToken
            }
          });
          if (campRes.ok) {
            const campData = await campRes.json();
            setCampaigns(campData.campaigns);
            idbStorage.set('zone_cached_campaigns', campData.campaigns).catch(() => {});
          } else {
            throw new Error('Failed to fetch from /api/campaigns');
          }
        } catch (cErr) {
          console.error('Error fetching campaigns from backend, using fallback:', cErr);
          const mapped = INITIAL_CAMPAIGNS.map(c => ({
            ...c,
            completed: data.user.activityLogs.some((l: any) => l.type === 'reward' && l.title.includes(c.title))
          }));
          setCampaigns(mapped);
        }
      } else if (res.status === 401) {
        // Token has explicitly expired/invalid. Try auto-restoring session from offline backup!
        const backupStr = localStorage.getItem('gcash_user_backup_profile');
        if (backupStr) {
          try {
            const backupProfile = JSON.parse(backupStr);
            if (backupProfile && backupProfile.email && backupProfile.password && backupProfile.name) {
              const restoreRes = await fetch('/api/auth/auto-restore', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-demo-mode': isDemoMode ? 'true' : 'false'
                },
                body: JSON.stringify({
                  email: backupProfile.email,
                  password: backupProfile.password,
                  name: backupProfile.name,
                  avatar: backupProfile.avatar,
                  stats: backupProfile.stats,
                  withdrawals: backupProfile.withdrawals,
                  activityLogs: backupProfile.activityLogs,
                  referredFriends: backupProfile.referredFriends,
                  isDemo: isDemoMode
                })
              });
              if (restoreRes.ok) {
                const restoreData = await restoreRes.json();
                localStorage.setItem('gcash_click_earn_token', restoreData.token);
                setToken(restoreData.token);
                setUser(restoreData.user);
                setStats(restoreData.user.stats);
                setWithdrawals(restoreData.user.withdrawals);
                setActivityLogs(restoreData.user.activityLogs);
                setReferredFriends(restoreData.user.referredFriends);
                triggerNotification('🔄 Ang iyong session at naipong balance ay ligtas na na-sync muli!', 'success');
                if (!silent) setLoadingProfile(false);
                return;
              }
            }
          } catch (restoreErr) {
            console.error('Failed to auto-restore session from backup:', restoreErr);
          }
        }

        // Only log out if strictly 401 Unauthorized and auto-restore failed
        handleLogout();
      } else {
        // Server temporary 500/502/503 or network lag - DO NOT log out user!
        console.warn('⚠️ Server temporarily busy (Status: ' + res.status + '). Preserving local session.');
      }
    } catch (e) {
      console.error(e);
      if (!silent) triggerNotification('⚠️ Connection error sa pag-load ng inyong Profile.', 'error');
    } finally {
      if (!silent) setLoadingProfile(false);
    }
  };

  // Trigger sync on login status change
  useEffect(() => {
    if (token) {
      fetchUserProfile(token);
    } else {
      setUser(null);
    }
  }, [token]);

  // Purge Demo session from RAM immediately when leaving System Clone / Demo mode or closing page
  useEffect(() => {
    if (!isDemoMode) return;

    const handleDemoUnload = () => {
      if (user || token) {
        const payload = JSON.stringify({ userId: user?.id || token, email: user?.email });
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon('/api/auth/demo-session-clear', blob);
        } else {
          fetch('/api/auth/demo-session-clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true
          }).catch(() => {});
        }
      }
      try {
        localStorage.removeItem('gcash_user_backup_profile');
        localStorage.removeItem('is_demo_mode');
      } catch (e) {}
    };

    window.addEventListener('beforeunload', handleDemoUnload);
    window.addEventListener('pagehide', handleDemoUnload);

    return () => {
      window.removeEventListener('beforeunload', handleDemoUnload);
      window.removeEventListener('pagehide', handleDemoUnload);
    };
  }, [isDemoMode, user, token]);

  // Periodic active polling check to sync admin or other devices' actions
  useEffect(() => {
    if (!token) return;
    const pollTime = dataSaver.getPollingInterval(20000);
    const interval = setInterval(() => {
      // Only poll when the browser tab is actually visible and active
      if (!document.hidden) {
        fetchUserProfile(token, true);
      }
    }, pollTime);

    const handleRefresh = () => {
      fetchUserProfile(token, true);
    };
    window.addEventListener('refresh-user-profile', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-user-profile', handleRefresh);
    };
  }, [token]);

  // --- SUBSCRIPTIONS STATE & CALCULATIONS ---
  const [submittingSubscription, setSubmittingSubscription] = useState(false);
  const [now, setNow] = useState<Date>(new Date());
  const [showExpiryWarningModal, setShowExpiryWarningModal] = useState(false);
  const [hasShownExpiryWarning, setHasShownExpiryWarning] = useState(false);
  const [showPlansInWarning, setShowPlansInWarning] = useState(false);

  useEffect(() => {
    // Update reference time every 15 seconds instead of 1 second to eliminate CPU lag
    const timer = setInterval(() => {
      if (!document.hidden) {
        setNow(new Date());
      }
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user || user.isAdmin || isSubscriptionExpired()) {
      return;
    }
    const info = getAccessStatusInfo();
    if (info.expiresAt && !hasShownExpiryWarning) {
      const remainingMs = info.expiresAt.getTime() - now.getTime();
      // Less than 1 hour (3,600,000 ms) and more than 0
      if (remainingMs > 0 && remainingMs < 3600000) {
        setShowExpiryWarningModal(true);
        setHasShownExpiryWarning(true);
      }
    }
  }, [now, user, hasShownExpiryWarning]);

  const getAccessStatusInfo = () => {
    if (!user) {
      return {
        type: 'expired',
        label: language === 'tl' ? 'Walang Access' : 'No Access',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        expiresAt: null,
        expiresAtString: 'N/A',
        isExpired: true,
      };
    }
    
    if (user.isAdmin) {
      return {
        type: 'admin',
        label: language === 'tl' ? 'Owner Admin Access (Walang Limit)' : 'Owner Admin Access (Unlimited)',
        badgeColor: 'bg-red-500/10 text-red-500 border-red-500/20',
        expiresAt: null,
        expiresAtString: language === 'tl' ? 'Habang-buhay / Lifetime' : 'Lifetime Access',
        isExpired: false,
      };
    }

    const regDate = user.createdAt ? new Date(user.createdAt) : new Date();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const trialExpiresAt = new Date(regDate.getTime() + oneDayInMs);
    const isTrialActive = trialExpiresAt.getTime() > now.getTime();

    const sub = user.subscription;
    const isSubActive = sub && sub.status === 'active' && sub.expiresAt && new Date(sub.expiresAt).getTime() > now.getTime();

    if (isSubActive) {
      const expiresDate = new Date(sub.expiresAt!);
      const planName = sub.requestedPlanName || sub.planId || 'Premium Plan';
      return {
        type: 'premium',
        label: language === 'tl' ? `Premium Access (${planName})` : `Premium Access (${planName})`,
        badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        expiresAt: expiresDate,
        expiresAtString: expiresDate.toLocaleString(language === 'tl' ? 'fil-PH' : 'en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        isExpired: false,
      };
    }

    if (isTrialActive) {
      return {
        type: 'free',
        label: language === 'tl' ? 'Free Access (1-Day Trial)' : 'Free Access (1-Day Trial)',
        badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        expiresAt: trialExpiresAt,
        expiresAtString: trialExpiresAt.toLocaleString(language === 'tl' ? 'fil-PH' : 'en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        isExpired: false,
      };
    }

    // Otherwise, expired
    const lastExpiresAt = sub && sub.expiresAt ? new Date(sub.expiresAt) : trialExpiresAt;
    return {
      type: 'expired',
      label: language === 'tl' ? 'Expired Access' : 'Expired Access',
      badgeColor: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      expiresAt: lastExpiresAt,
      expiresAtString: lastExpiresAt.toLocaleString(language === 'tl' ? 'fil-PH' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
      isExpired: true,
    };
  };

  const getRemainingTimeText = (expiresAt: Date | null) => {
    if (!expiresAt) {
      return language === 'tl' ? 'Walang expiration limit' : 'No expiration limit';
    }
    const diffMs = expiresAt.getTime() - now.getTime();
    if (diffMs <= 0) {
      return language === 'tl' ? 'Expired na ang access' : 'Access expired';
    }
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    const mins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
    const secs = Math.floor((diffMs % (60 * 1000)) / 1000);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0 || hours > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);

    return language === 'tl' 
      ? `Ma-eexpire sa loob ng ${parts.join(' ')}` 
      : `Expires in ${parts.join(' ')}`;
  };

  const isSubscriptionExpired = () => {
    if (!user) return false;
    if (user.isAdmin) return false;

    // Check if free access is active from Spin Wheel
    if (user.freeAccessExpiresAt) {
      if (new Date(user.freeAccessExpiresAt).getTime() > now.getTime()) {
        return false; // NOT expired! They have active 3-hour access
      }
    }
    
    // Check registration creation date
    const regDate = user.createdAt ? new Date(user.createdAt) : new Date();
    const passedMs = now.getTime() - regDate.getTime();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    
    // Free trial active if registered less than 24 hours ago
    if (passedMs < oneDayInMs) {
      return false; 
    }
    
    // Check active subscription status
    const sub = user.subscription;
    if (!sub || sub.status !== 'active') {
      return true; // Locked out
    }
    
    if (sub.expiresAt) {
      return new Date(sub.expiresAt).getTime() < now.getTime();
    }
    
    return true; // Locked
  };

  const handleSubscriptionRequest = async (planId: string) => {
    if (!token) return;
    setSubmittingSubscription(true);
    try {
      const res = await fetch('/api/subscription/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ planId })
      });
      const result = await res.json();
      if (res.ok) {
        setUser(result.user);
        triggerNotification('📨 Ang iyong Subscription request ay natanggap ng Admin! Mangyaring magdeposito sa GCash.', 'success');
      } else {
        triggerNotification(`⚠️ ${result.error || 'Hindi maipadala ang request.'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerNotification('⚠️ Error sa pagkonekta sa server.', 'error');
    } finally {
      setSubmittingSubscription(false);
    }
  };

  const handleSimulateTrialExpiration = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/simulate-expire', {
        method: 'POST',
        headers: {
          'Authorization': token
        }
      });
      const result = await res.json();
      if (res.ok) {
        setUser(result.user);
        triggerNotification('⚡ Kunwari ay natapos na ang iyong 1-Day Trial! Subukan muli ang dashboard.', 'info');
      } else {
        triggerNotification(`⚠️ ${result.error || 'Hindi ma-expire ang trial.'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerNotification('⚠️ Error connecting to server.', 'error');
    }
  };

  // --- CORE SYSTEM CONTROLLER ACTIONS ---

  // 1. Daily Bonus Check-In Hook
  const handleDailyCheckIn = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/daily-checkin', {
        method: 'POST',
        headers: {
          'Authorization': token
        }
      });
      const result = await res.json();
      if (res.ok) {
        setUser(result.user);
        setStats(result.user.stats);
        setActivityLogs(result.user.activityLogs);
        
        // Play sound effect
        soundEffects.playReward();
        
        // Show visual coin rewards
        setFloatingCoinReward(1.00);
        setShowConfetti(true);
        triggerNotification('💰 +₱1.00 Instant GCash Bonus idinagdag sa iyong Wallet!', 'success');
        setTimeout(() => {
          setFloatingCoinReward(null);
          setShowConfetti(false);
        }, 4000);
      } else {
        triggerNotification(`⚠️ ${result.error || 'Hindi ma-claim ang bonus.'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerNotification('⚠️ Error connecting to server.', 'error');
    }
  };

  // 2. Open Website homepage for earning
  const handleOpenCampaign = (campaign: WebsiteCampaign) => {
    if (isSubscriptionExpired()) {
      const isAllowed = campaign.reward >= 0.05 && campaign.reward <= 1.99;
      if (!isAllowed) {
        triggerNotification(`⚠️ Dahil expired na ang iyong access, maaari mo lamang buksan ang mga website na may reward na ₱0.05 up to ₱1.99. Mangyaring mag-renew ng subscription para sa buong access!`, 'error');
        return;
      }
    }
    setCurrentViewingCampaign(campaign);
  };

  // 3. Complete browser simulator task
  const handleCompleteCampaignView = async (id: string, reward: number) => {
    if (!token) return;

    const matchCampaign = campaigns.find(c => c.id === id);
    const label = matchCampaign ? matchCampaign.title : 'Web Homepage View';

    try {
      const res = await fetch('/api/user/task-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          campaignId: id,
          rewardAmount: reward,
          title: `Natapos panoorin ang ${label}`,
          details: `Salamat sa pag-open at pananatili sa homepage ng ${label} nang ${matchCampaign?.timer || 10} segundo.`
        })
      });

      const result = await res.json();
      if (res.ok) {
        setUser(result.user);
        setStats(result.user.stats);
        setActivityLogs(result.user.activityLogs);
        
        // Mark campaign as completed locally
        const updatedCampaigns = campaigns.map((c) => {
          if (c.id === id) {
            return { ...c, completed: true };
          }
          return c;
        });
        setCampaigns(updatedCampaigns);
        localStorage.setItem('gcash_click_earn_campaigns', JSON.stringify(updatedCampaigns));

        // Play sound effect
        soundEffects.playReward();

        // Animate Coin Floating
        setFloatingCoinReward(reward);
        setShowConfetti(true);
        setCurrentViewingCampaign(null);
        triggerNotification(`💰 Matagumpay! Naka-ipon ka ng +₱${reward.toFixed(2)}`, 'success');

        setTimeout(() => {
          setFloatingCoinReward(null);
          setShowConfetti(false);
        }, 4000);
      } else {
        triggerNotification(`⚠️ ${result.error || 'Hindi mate-record ang task.'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      triggerNotification('⚠️ Connection error recording completions.', 'error');
    }
  };

  // 4. Submit GCash Withdrawal
  const handleWithdrawalRequest = async (accountName: string, gcashNumber: string, amount: number) => {
    if (!token) return { success: false, message: 'Naka-logout ka.' };

    try {
      const res = await fetch('/api/user/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ accountName, gcashNumber, amount })
      });
      const result = await res.json();
      if (res.ok) {
        setUser(result.user);
        setStats(result.user.stats);
        setWithdrawals(result.user.withdrawals);
        setActivityLogs(result.user.activityLogs);
        
        // Play cha-ching sound
        soundEffects.playWithdraw();
        
        triggerNotification(`💸 Sumite ng Cashout (Binubuo)`, 'success');
        return { 
          success: true, 
          message: language === 'tl'
            ? `Ang transaksyon ay ipapadala sa iyong GCash number ${gcashNumber}. Ang iyong request ay naghihintay ng System Administrator Approval.`
            : `The transaction will be sent to your GCash number ${gcashNumber}. Your request is pending System Administrator Approval.`
        };
      } else {
        return { success: false, message: result.error || 'Hindi maiproseso.' };
      }
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Server connection error.' };
    }
  };

  // 5. Add Custom Website Campaign
  const handleCreateCustomCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customTitle.trim()) {
      triggerNotification('⚠️ Pakilagay ang pamagat (Website Title).', 'error');
      return;
    }

    if (!customUrl.trim()) {
      triggerNotification('⚠️ Pakilagay ang URL ng website.', 'error');
      return;
    }

    let finalUrl = customUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    const rewardNum = parseFloat(customReward);
    const timerNum = parseInt(customTimer);

    const newCampaign: WebsiteCampaign = {
      id: 'custom-' + Date.now(),
      title: customTitle.trim(),
      url: finalUrl,
      reward: isNaN(rewardNum) ? 0.75 : rewardNum,
      timer: isNaN(timerNum) ? 15 : timerNum,
      completed: false,
      logo: 'Globe',
      category: 'E-Services',
      description: customDescription.trim() || 'Isang verified advertiser page para mas palawakin ang iyong simulated earnings.',
      mockPageContent: {
        heroTitle: customTitle.trim(),
        heroSubtitle: 'Maligayang pagdating sa aming isinadyang simulated ad landing partner. Manatili rito para sa automated GCash rewards!',
        primaryColor: '#1E40AF',
        accentColor: '#10B950',
        paragraphs: [
          'Salamat sa pagsuporta at pagbisita sa aming page upang matulungan kaming mai-optimize ang search visibility index.',
          'Ang simulated traffic flow na ito ay ligtas at direktang naka-link sa iyong aktibong user profile account.'
        ],
        features: [
          'SEO Rank Optimization',
          'Automated Traffic Validation',
          'Fast Rewards Payout Credits'
        ]
      }
    };

    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token || ''
        },
        body: JSON.stringify({ campaign: newCampaign })
      });
      if (res.ok) {
        const result = await res.json();
        setCampaigns(result.campaigns);
        setCustomTitle('');
        setCustomUrl('');
        setCustomReward('0.75');
        setCustomTimer('15');
        setCustomDescription('');
        triggerNotification(`💡 Tagumpay na naidagdag ang "${newCampaign.title}"! Puwede na itong buksan at panoorin para may mapanalunang ₱${newCampaign.reward.toFixed(2)}.`, 'success');
      } else {
        const errData = await res.json();
        triggerNotification(`⚠️ Bigo sa pagpasa: ${errData.error || 'Server error'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('⚠️ Connection error sa server.', 'error');
    }
  };

  const handleDeleteCampaign = async (campaignId: string, campaignTitle: string) => {
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token || ''
        }
      });
      if (res.ok) {
        const result = await res.json();
        setCampaigns(result.campaigns);
        triggerNotification(`🗑️ Tagumpay na tinanggal ang campaign: "${campaignTitle}"`, 'success');
      } else {
        const errData = await res.json();
        triggerNotification(`⚠️ Bigo sa pagtanggal: ${errData.error || 'Server error'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('⚠️ Connection error sa server.', 'error');
    }
  };

  // --- AUTHENTICATION INTERFACE HANDLERS ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = authMode === 'login' 
      ? { email: emailInput.trim(), password: passwordInput, isDemo: isDemoMode }
      : { name: nameInput.trim(), email: emailInput.trim(), password: passwordInput, referralCode: referralInput.trim(), isDemo: isDemoMode };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-mode': isDemoMode ? 'true' : 'false'
        },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok) {
        localStorage.setItem('gcash_click_earn_token', result.token);
        setToken(result.token);
        triggerNotification(authMode === 'login' ? '🔑 Welcome back!' : '🎉 Welcome! Tagumpay na ginawa ang account mo.', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setAuthError(result.error || 'May error sa authentication.');
      }
    } catch (err) {
      console.error(err);
      setAuthError('Hindi makakonekta sa central server.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSimulatedGoogleLogin = async (selectedName: string, selectedEmail: string, avatar: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-mode': isDemoMode ? 'true' : 'false'
        },
        body: JSON.stringify({
          name: selectedName,
          email: selectedEmail,
          avatar: avatar,
          isDemo: isDemoMode
        })
      });
      const result = await res.json();
      if (res.ok) {
        localStorage.setItem('gcash_click_earn_token', result.token);
        setToken(result.token);
        setShowGoogleChooser(false);
        triggerNotification(`🌐 Nag-sign in gamit ang Google: Hello, ${selectedName}!`, 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setAuthError(result.error);
      }
    } catch (e) {
      setAuthError('Connection error resolving Google session.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    if (isDemoMode || user?.isDemo) {
      if (user || token) {
        fetch('/api/auth/demo-session-clear', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token || ''
          },
          body: JSON.stringify({ userId: user?.id || token, email: user?.email })
        }).catch(() => {});
      }
      try {
        localStorage.removeItem('gcash_user_backup_profile');
        localStorage.removeItem('is_demo_mode');
      } catch (e) {}
    }

    localStorage.removeItem('gcash_click_earn_token');
    setToken(null);
    setUser(null);
    setActiveTab(null);
    setShowExpiryWarningModal(false);
    setHasShownExpiryWarning(false);
    setShowPlansInWarning(false);
    triggerNotification('🔒 Ligtas kang naka-logout sa controller.', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const openEditProfileModal = () => {
    if (user) {
      setNewAvatar(user.avatar || '👤');
      setNewName(user.name || '');
      setShowEditProfileModal(true);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      triggerNotification(language === 'tl' ? 'Mangyaring ilagay ang iyong pangalan.' : 'Please enter your name.', 'error');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token || ''
        },
        body: JSON.stringify({
          avatar: newAvatar,
          name: newName
        })
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        triggerNotification(language === 'tl' ? 'Matagumpay na na-update ang iyong profile! 🎉' : 'Profile updated successfully! 🎉', 'success');
        setShowEditProfileModal(false);
      } else {
        triggerNotification(data.error || 'May error sa pag-update.', 'error');
      }
    } catch (err) {
      triggerNotification(language === 'tl' ? 'Koneksyon error.' : 'Connection error.', 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // --- FILTERS LOGIC ---
  const filteredCampaigns = campaigns.filter((c) => {
    if (campaignFilter === 'high') return c.reward >= 1.00;
    if (campaignFilter === 'available') return !c.completed;
    return true;
  });

  return (
    <div id="application-sandbox-root" className="min-h-screen bg-slate-100 flex flex-col text-slate-800 font-sans antialiased selection:bg-blue-600 selection:text-white">
      
      {/* 💸 TOP SCROLLING LIVE PAYOUT MARQUEE (1,000+ Users Paid) */}
      <PayoutMarquee 
        realUserWithdrawals={withdrawals} 
        currentUserName={user?.name} 
        language={language} 
      />

      {/* 🔔 FLOATING NOTIFICATION SYSTEM (GCASH REWARDS POPUP ALERT) */}
      <AnimatePresence>
        {notification && (
          <div className="fixed top-3 sm:top-5 inset-x-0 z-[9999999] flex justify-center px-3 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              id="system-banner"
              className={`pointer-events-auto w-full max-w-[420px] p-3.5 sm:p-4 rounded-[22px] sm:rounded-[26px] bg-white border-2 flex items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-all ${
                notification.type === 'success'
                  ? 'border-emerald-500'
                  : notification.type === 'error'
                  ? 'border-rose-500'
                  : 'border-blue-500'
              }`}
              style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            >
              <div className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center text-xl shadow-xs border ${
                notification.type === 'success'
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                  : notification.type === 'error'
                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                  : 'bg-blue-100 text-blue-700 border-blue-300'
              }`}>
                {notification.type === 'success' ? '💰' : notification.type === 'error' ? '🚨' : 'ℹ️'}
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <span className="text-[10px] sm:text-[11px] font-black block text-slate-500 uppercase tracking-widest leading-none mb-1">
                  GCASH REWARDS ALERT
                </span>
                <p className="text-xs sm:text-sm font-extrabold leading-snug text-slate-900 break-words" style={{ color: '#0f172a' }}>
                  {notification.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotification(null)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-full bg-slate-100 hover:bg-slate-200 transition shrink-0 cursor-pointer border border-slate-200"
                title="Close"
              >
                <X className="w-4 h-4 text-slate-700" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🪙 FLOATING COINS OVERLAYS ANIMATION */}
      <AnimatePresence>
        {floatingCoinReward !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 100 }}
            animate={{ opacity: [1, 1, 0], scale: [1, 1.3, 1], y: -100 }}
            transition={{ duration: 1.5 }}
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          >
            <div className="bg-gradient-to-br from-yellow-300 to-amber-500 text-slate-950 p-6 rounded-full shadow-2xl flex flex-col items-center justify-center border-4 border-yellow-200 aspect-square min-w-[120px]">
              <Coins className="w-10 h-10 animate-repeat animate-bounce" />
              <div className="text-xl font-black mt-1 font-mono">+₱{floatingCoinReward.toFixed(2)}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 👤 EDIT PROFILE PIC & NAME MODAL */}
      <AnimatePresence>
        {showEditProfileModal && user && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-y-contain">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full max-h-[92vh] sm:max-h-[88vh] overflow-hidden flex flex-col my-auto"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 sm:p-5 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="bg-white/20 p-1.5 sm:p-2 rounded-xl shrink-0">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-xs sm:text-sm tracking-wide uppercase truncate">
                      {language === 'tl' ? '⚙️ I-edit ang Profile' : '⚙️ Edit Profile'}
                    </h3>
                    <p className="text-[9px] sm:text-[10px] text-white/90 font-semibold truncate">
                      {language === 'tl' ? 'Baguhin ang iyong pangalan at profile pic' : 'Customize your name and profile pic'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="text-white hover:text-blue-100 p-1 transition text-xs sm:text-sm font-black cursor-pointer shrink-0 ml-2"
                >
                  ✕
                </button>
              </div>

              {/* Form Content (Scrollable & Optimized for all mobile viewport heights) */}
              <form onSubmit={handleUpdateProfile} className="p-4 sm:p-6 space-y-3.5 sm:space-y-5 overflow-y-auto overscroll-contain">
                {/* Profile Pic Preview & Current Status */}
                <div className="flex flex-col items-center justify-center space-y-1.5 sm:space-y-2 py-1 bg-slate-50 border border-slate-100 rounded-2xl p-3 sm:p-4">
                  <div className="relative">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white flex items-center justify-center shadow-md border-2 sm:border-3 border-indigo-300 overflow-hidden ring-4 ring-indigo-50">
                      {newAvatar && (newAvatar.startsWith('http') || newAvatar.startsWith('data:')) ? (
                        <img src={newAvatar} alt="New Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-3xl sm:text-5xl leading-none">{newAvatar || '👤'}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-wider text-center">
                    📸 Live Profile Picture Preview
                  </span>
                </div>

                {/* Name field */}
                <div className="space-y-1 sm:space-y-1.5">
                  <label className="text-[10px] sm:text-[11px] text-slate-500 font-extrabold uppercase tracking-wide block">
                    {language === 'tl' ? 'Pangalan (Full Name)' : 'Name (Full Name)'}
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    maxLength={35}
                    placeholder="E.g., Juan Dela Cruz"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl sm:rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs font-bold text-slate-800 transition"
                  />
                </div>

                {/* Avatar Presets Selection */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-[11px] text-slate-500 font-extrabold uppercase tracking-wide block">
                    {language === 'tl' ? 'Pumili sa aming Presets (Choose Preset Emoji)' : 'Choose Preset Emoji'}
                  </label>
                  <div className="grid grid-cols-6 gap-1.5 sm:gap-2 bg-slate-50 border border-slate-150 p-2 sm:p-3 rounded-xl sm:rounded-2xl max-h-[95px] sm:max-h-[110px] overflow-y-auto">
                    {['👤', '👨‍💻', '👩‍💻', '🦁', '🦉', '🐱', '🐶', '🦊', '🦄', '🐼', '🤖', '👑', '💼', '🚀', '⭐', '🌈', '🔥', '💖', '🍀', '🍕', '😎', '🎮', '💡', '🎵'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewAvatar(preset)}
                        className={`text-xl sm:text-2xl p-1 rounded-lg sm:rounded-xl hover:bg-slate-200 transition cursor-pointer select-none text-center ${
                          newAvatar === preset ? 'bg-indigo-100 border-2 border-indigo-400 scale-110' : 'border border-transparent'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Avatar Upload from Gallery */}
                <div className="space-y-1 sm:space-y-1.5 border-t border-slate-100 pt-2.5 sm:pt-3">
                  <label className="text-[10px] sm:text-[11px] text-slate-500 font-extrabold uppercase tracking-wide block">
                    {language === 'tl' ? 'O Kumuha sa Phone Gallery (Upload)' : 'Or Upload From Phone Gallery'}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    id="profile-pic-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 15 * 1024 * 1024) {
                        triggerNotification(
                          language === 'tl' 
                            ? 'Masyadong malaki ang file. Dapat mas maliit sa 15MB.' 
                            : 'File too large. Must be smaller than 15MB.',
                          'error'
                        );
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        const rawBase64 = reader.result as string;
                        try {
                          const compressed = await compressImage(rawBase64);
                          setNewAvatar(compressed);
                        } catch (err) {
                          setNewAvatar(rawBase64);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('profile-pic-upload')?.click()}
                    className="w-full border border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/20 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] text-indigo-750 font-extrabold cursor-pointer transition flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                    <span>{language === 'tl' ? 'Mag-upload ng Larawan mula sa Gallery' : 'Upload Image from Gallery'}</span>
                  </button>
                </div>

                {/* Custom Avatar URL or Custom Emoji */}
                <div className="space-y-1 sm:space-y-1.5">
                  <label className="text-[10px] sm:text-[11px] text-slate-500 font-extrabold uppercase tracking-wide block">
                    {language === 'tl' ? 'O Maglagay ng Sariling Image URL' : 'Or Paste Custom Image URL'}
                  </label>
                  <input
                    type="text"
                    value={newAvatar.startsWith('http') || newAvatar.startsWith('data:') ? newAvatar : ''}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      if (val) {
                        setNewAvatar(val);
                      } else {
                        setNewAvatar('👤');
                      }
                    }}
                    placeholder="I-paste ang link (https://...) para sa tunay na profile pic"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl sm:rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs font-semibold text-slate-700 transition font-mono"
                  />
                  <p className="text-[9px] sm:text-[10px] text-slate-455 leading-normal font-semibold">
                    💡 Maari kang mag-paste ng link ng larawan mula sa internet (tulad ng Facebook, Imgur, o Unsplash) upang ito ang maging larawan ng iyong profile.
                  </p>
                </div>

                {/* Footer buttons */}
                <div className="flex gap-2 sm:gap-3 pt-1.5 sm:pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditProfileModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-slate-700 font-black text-xs cursor-pointer text-center"
                  >
                    {language === 'tl' ? 'I-cancel' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 active:bg-indigo-800 transition py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-white font-black text-xs cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  >
                    {isUpdatingProfile ? (
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>{language === 'tl' ? 'I-save ang Profile' : 'Save Profile'}</span>
                    )}
                  </button>
                </div>

                {/* Logout Button inside Profile Modal */}
                <div className="pt-2 sm:pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditProfileModal(false);
                      handleLogout();
                    }}
                    className="w-full bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200/80 text-rose-600 hover:text-rose-700 transition py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-extrabold text-xs cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  >
                    <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />
                    <span>{language === 'tl' ? '🔴 I-Logout ang Account' : '🔴 Logout Account'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⚠️ EXPIRY WARNING & PLAN SHORTCUT MODAL */}
      <AnimatePresence>
        {showExpiryWarningModal && user && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 to-rose-600 p-5 text-white flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl animate-bounce">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-wide uppercase">
                    {language === 'tl' ? '⚠️ Babala: Paubos na ang Access' : '⚠️ Warning: Access Expiring'}
                  </h3>
                  <p className="text-[10px] text-white/90 font-bold">
                    {language === 'tl' ? 'Mayroon ka na lamang kulang sa isang oras!' : 'You have less than 1 hour of access left!'}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl space-y-2 text-center">
                  <span className="text-[10px] text-rose-500 font-extrabold uppercase tracking-widest block">Natitirang Oras / Remaining Time</span>
                  <span className="text-xl font-black text-rose-650 font-mono block animate-pulse">
                    ⏳ {getRemainingTimeText(getAccessStatusInfo().expiresAt)}
                  </span>
                  <p className="text-[11px] text-slate-550 font-bold leading-relaxed">
                    {language === 'tl' 
                      ? 'Upang hindi maputol ang iyong pag-click, pag-earn, at pag-cashout, mag-extend o pumili ng subscription plan ngayon.' 
                      : 'To prevent interruptions in your clicking, earning, and cashouts, extend your access or select a subscription plan now.'}
                  </p>
                </div>

                {!showPlansInWarning ? (
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => setShowPlansInWarning(true)}
                      className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black py-3.5 rounded-2xl text-xs cursor-pointer shadow-md transition duration-300 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
                      <span>{language === 'tl' ? 'Tingnan ang Earning Plans (Extend Access)' : 'View Earning Plans (Extend Access)'}</span>
                    </button>
                    <button
                      onClick={() => setShowExpiryWarningModal(false)}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-650 font-black py-3 rounded-2xl text-xs cursor-pointer transition duration-300"
                    >
                      {language === 'tl' ? 'Pansamantalang I-dismiss (Close for Now)' : 'Dismiss for Now'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    <div className="border-b border-slate-100 pb-2">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Mga Pagpipiliang Plan (Select a Plan):</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {(() => {
                        const basePlans = [
                          { id: '1month', name: '1 Month Access', price: 200, desc: '₱200 para sa 30 araw na tuloy-tuloy na earn.' },
                          { id: '2months', name: '2 Months Access', price: 500, desc: '₱500 para sa 60 araw na pinalawak na access.' },
                          { id: '3months', name: '3 Months Access', price: 1000, desc: '₱1000 para sa 90 araw na VIP access.' },
                          { id: '4months', name: '4 Months Access', price: 2000, desc: '₱2000 para sa 120 araw na earning portal.' }
                        ];
                        if ((stats.balance || 0) < 50) {
                          return [
                            { id: '7days', name: '7 Days Special Access', price: 20, desc: '₱20 para sa 7 araw na mabilisang trial access habang nag-iipon.' },
                            ...basePlans
                          ];
                        }
                        return basePlans;
                      })().map((plan) => (
                        <div 
                          key={plan.id}
                          className="border border-slate-200 rounded-xl p-3.5 hover:border-indigo-400 hover:bg-indigo-50/20 transition duration-300 flex items-center justify-between gap-4"
                        >
                          <div className="space-y-0.5">
                            <h4 className="font-extrabold text-slate-900 text-xs">{plan.name}</h4>
                            <span className="text-indigo-650 font-black text-xs font-mono">₱{plan.price}</span>
                            <p className="text-[10px] text-slate-450 leading-tight font-semibold">{plan.desc}</p>
                          </div>
                          
                          <button
                            onClick={() => {
                              handleSubscriptionRequest(plan.id);
                              setShowExpiryWarningModal(false);
                            }}
                            disabled={submittingSubscription}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-[11px] px-4 py-2 rounded-xl cursor-pointer shadow-sm shrink-0"
                          >
                            {language === 'tl' ? 'Bilhin' : 'Buy'}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setShowPlansInWarning(false)}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 font-black py-2.5 rounded-xl text-xs cursor-pointer transition duration-300"
                      >
                        {language === 'tl' ? 'Bumalik' : 'Back'}
                      </button>
                      <button
                        onClick={() => setShowExpiryWarningModal(false)}
                        className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black py-2.5 rounded-xl text-xs cursor-pointer transition duration-300"
                      >
                        {language === 'tl' ? 'I-dismiss' : 'Dismiss'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🌐 FLOATING DEMO TESTING WATERMARK BANNER (WHEN CLONE / DEMO MODE IS ACTIVE) */}
      {isDemoMode && (
        <DemoTestingFloatingBanner />
      )}

      {/* 🚀 HIGH CONVERTING PROMO AD BANNER MODAL FOR UNSUBSCRIBED USERS */}
      <PromoAdBannerModal
        isOpen={showPromoAdModal && Boolean(user) && !user?.isAdmin && isSubscriptionExpired()}
        onClose={() => setShowPromoAdModal(false)}
        onSelectPlan={(planId) => {
          setActiveTab('cashout');
          handleSubscriptionRequest(planId);
          setTimeout(() => {
            const section = document.getElementById('renew-access-plan-section') || document.getElementById('subscription-plans-section');
            if (section) {
              section.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.scrollTo({ top: 300, behavior: 'smooth' });
            }
          }, 150);
        }}
        onNavigateToPlans={() => {
          setActiveTab('cashout');
          setTimeout(() => {
            const section = document.getElementById('renew-access-plan-section') || document.getElementById('subscription-plans-section');
            if (section) {
              section.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.scrollTo({ top: 300, behavior: 'smooth' });
            }
          }, 150);
        }}
        submittingSubscription={submittingSubscription}
        userBalance={stats.balance || 0}
      />

      {/* 📢 OFFICIAL Z-ONEAPP WITHDRAWAL POLICY UPDATE POP-UP MODAL (Lumalabas tuwing mag-oopen ang user) */}
      <WithdrawalPolicyModal
        isOpen={showWithdrawalPolicyModal && Boolean(user)}
        onClose={() => {
          setShowWithdrawalPolicyModal(false);
        }}
      />

      {/* 🚀 ADMIN EXCLUSIVE: ADD WEBSITE CAMPAIGN POP-UP MODAL */}
      <AddCampaignModal
        isOpen={showAddCampaignModal && Boolean(user && user.isAdmin)}
        onClose={() => setShowAddCampaignModal(false)}
        token={token}
        onCampaignCreated={(newCampaigns) => {
          setCampaigns(newCampaigns);
        }}
        triggerNotification={triggerNotification}
      />

      {/* 🔔 BACKGROUND PUSH NOTIFICATION SETTINGS & TEST MODAL */}
      <BackgroundNotificationModal
        isOpen={showPushNotifModal}
        onClose={() => setShowPushNotifModal(false)}
        token={token}
        language={language}
        triggerNotification={triggerNotification}
      />

      {/* 🚀 SCREEN GATEWAY 1: NOT AUTHENTICATED SCREEN */}
      {!token || !user ? (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
          
          {/* Ambient Cosmic Neon background lights */}
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
 
          <div className="max-w-md w-full space-y-6 z-10">
            
            {/* LOGO TITLE */}
            <div className="text-center space-y-2">
              <span className="mx-auto bg-blue-600 text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full flex items-center gap-1 w-max">
                <Coins className="w-3.5 h-3.5 text-yellow-300 animate-bounce" />
                <span>ACTIVE EARNING PORTAL</span>
              </span>
              <h1 className="text-3xl font-black text-white tracking-tight leading-none">
                G-Click & Get rewarded every visit
              </h1>
              <p className="text-xs text-slate-400 max-w-sm mx-auto font-semibold">
                Simulan ang pagbisita sa mga verified web homepage upang makakuha ng automated PPV rewards!
              </p>
            </div>

            {/* 🚀 OFFICIAL PROMO BANNER */}
            <ZoneAppBanner 
              language={language} 
              triggerNotification={triggerNotification} 
              compact={true} 
            />
 
            {/* MAIN CREDENTIAL CARD */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 relative">
              
              {/* Form Tab Toggles */}
              <div className="flex border-b border-slate-800 gap-2 text-xs font-black">
                <button
                  onClick={() => { setAuthMode('login'); setAuthError(null); }}
                  className={`flex-1 py-2.5 transition rounded-t-xl cursor-pointer text-center ${
                    authMode === 'login' 
                      ? 'border-b-2 border-blue-500 text-blue-400 bg-slate-800/40' 
                      : 'text-slate-500 hover:text-slate-400'
                  }`}
                >
                  Naka-rehistro (Login)
                </button>
                <button
                  onClick={() => { setAuthMode('register'); setAuthError(null); }}
                  className={`flex-1 py-2.5 transition rounded-t-xl cursor-pointer text-center ${
                    authMode === 'register' 
                      ? 'border-b-2 border-blue-500 text-blue-400 bg-slate-800/40' 
                      : 'text-slate-500 hover:text-slate-400'
                  }`}
                >
                  Gawa ng Account (Register)
                </button>
              </div>
 
              {/* AUTH FORM */}
              <form onSubmit={handleAuthSubmit} className="space-y-3.5 text-xs text-slate-300">
                
                {/* Name - Register only */}
                {authMode === 'register' && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-400 flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      <span>Buong Pangalan (Profile Name-Admin Visibility)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Hal. Juan Dela Cruz"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 hover:border-slate-700 p-3 rounded-xl outline-none font-bold text-white transition placeholder:font-normal placeholder:text-slate-600"
                    />
                  </div>
                )}
 
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-4 h-4" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Hal. juan.delacruz@gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 hover:border-slate-700 p-3 rounded-xl outline-none font-bold text-white transition placeholder:font-normal placeholder:text-slate-600"
                  />
                </div>
 
                {/* Password */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-400 flex items-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    <span>Password</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Wag kalimutan"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 hover:border-slate-700 p-3 rounded-xl outline-none font-bold text-white transition placeholder:font-normal placeholder:text-slate-600"
                  />
                </div>
 
                {/* Optional Referral Code - Register only */}
                {authMode === 'register' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="font-bold text-emerald-450 flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-emerald-450" />
                      <span>Referral Code (Opsyonal - pwedeng maiwan na blangko)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Hal. REF-123456"
                      value={referralInput}
                      onChange={(e) => setReferralInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 hover:border-slate-700 p-3 rounded-xl outline-none font-bold text-white transition placeholder:font-normal placeholder:text-slate-600 truncate uppercase"
                    />
                  </div>
                )}
 
                {/* Feedbacks */}
                {authError && (
                  <div className="p-3 bg-red-950/85 border border-red-900 rounded-xl flex items-start gap-2 text-[11px] text-red-300 leading-normal">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span className="font-bold text-rose-300">{authError}</span>
                  </div>
                )}
 
                {/* Submit button */}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition py-3 rounded-xl text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  {authLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : authMode === 'login' ? (
                    'I-verify at Mag-login'
                  ) : (
                    'Gumawa ng Account at Simulan'
                  )}
                </button>
 
              </form>
 
            </div>
 
            <p className="text-center text-[10px] text-slate-600 leading-normal max-w-sm mx-auto">
              {language === 'tl'
                ? "Sa pamamagitan ng pag-sign in, sumasang-ayon ka sa interactive simulator guidelines."
                : "By signing in, you agree to the interactive simulator guidelines."}
            </p>
 
          </div>
        </div>
      ) : (
        /* 📱 GATEWAY 2: AUTHENTICATED SYSTEM DASHBOARD */
        <>
          {/* 📱 SMARTPHONE APP LAUNCHER (Default Home Screen on Login) */}
          {activeTab === null ? (
            <main className="w-full flex-1 flex flex-col items-center justify-start p-0 sm:py-6">
              <SmartphoneAppLauncher
                activeTab={null}
                onSelectTab={(t) => setActiveTab(t)}
                isAdmin={Boolean(user?.isAdmin)}
                language={language}
                balance={stats.balance}
                isDataSaverActive={isDataSaverActive}
                user={user}
                stats={stats}
                activityLogs={activityLogs}
                withdrawals={withdrawals}
                onOpenSpinWheel={() => setShowSpinModal(true)}
                onOpenReferral={() => setActiveTab('earn')}
                onOpenCommercials={() => setActiveCommercialCamp(campaigns.find(c => Boolean(c.aiCommercial)) || campaigns[0] || null)}
                onOpenReels={() => {
                  window.dispatchEvent(new Event('open-reels-widget'));
                  const openBtn = document.getElementById('reels-widget-open-btn');
                  if (openBtn) {
                    openBtn.click();
                  }
                }}
                onOpenPolicy={() => setShowWithdrawalPolicyModal(true)}
                onOpenProfile={openEditProfileModal}
                onOpenDataSaver={() => setShowDataSaverModal(true)}
                onOpenNotifications={() => {
                  if (notificationPermission === 'default') {
                    requestNotificationPermission();
                  } else {
                    setShowPushNotifModal(true);
                  }
                }}
              />
            </main>
          ) : (
            /* 📱 DEDICATED FULL-SCREEN MODULE VIEW WITH BACK TO LAUNCHER BUTTON */
            <main className="w-full flex-1 flex flex-col">
              {/* STICKY MODULE TOP BAR WITH BACK BUTTON */}
              <div className="bg-[#0c1322] border-b border-slate-800 py-3 px-4 sm:px-6 sticky top-0 z-30 shadow-md flex items-center justify-between">
                <button
                  id="module-back-to-launcher-btn"
                  onClick={() => {
                    try { soundEffects.playClick(); } catch (e) {}
                    setActiveTab(null);
                  }}
                  type="button"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm px-4 py-2 rounded-xl transition cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98] border border-blue-400/30 select-none"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{language === 'tl' ? 'Bumalik sa Launcher' : 'Back to Launcher'}</span>
                </button>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <span className="text-slate-400 font-normal">{language === 'tl' ? 'Module:' : 'Module:'}</span>
                  <span className="font-extrabold text-white bg-slate-800 border border-slate-700 px-3 py-1 rounded-lg">
                    {activeTab === 'zone' && 'Z-one Social'}
                    {activeTab === 'va_shop' && 'VA & Shop'}
                    {activeTab === 'earn' && 'Mag-ipon'}
                    {activeTab === 'cashout' && 'GCash Cash-Out'}
                    {activeTab === 'negosyo' && 'Negosyo'}
                    {activeTab === 'guide' && 'Gabay'}
                    {activeTab === 'admin' && 'Admin Control'}
                  </span>
                </div>
              </div>

              {/* 📢 HIGH HYPE PROMO AD TOP BAR FOR NON-SUBSCRIBED USERS */}
              {isSubscriptionExpired() && !user?.isAdmin && (
                <div 
                  onClick={() => {
                    setShowPromoAdModal(true);
                  }}
                  className="bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white px-4 py-2.5 shadow-md cursor-pointer hover:opacity-95 transition flex items-center justify-between gap-3 text-xs font-black border-b border-amber-300/40"
                >
                  <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-yellow-300 animate-bounce shrink-0" />
                      <span>🔥 UNLOCK UNLIMITED GCASH EARNINGS: Kumita ng ₱500 - ₱1,500/day direct sa GCash!</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-yellow-300 hover:bg-yellow-200 text-slate-950 font-black text-[11px] px-3 py-1 rounded-full shadow-sm shrink-0 transition">
                      <Rocket className="w-3.5 h-3.5 text-slate-950" />
                      <span>I-RENEW ANG ACCESS PLAN 🚀</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 🖥️ MAIN BODY WORKSPACE */}
              <div id="main-content-layout" className={`flex-1 w-full mx-auto ${activeTab === 'zone' ? 'max-w-7xl px-2 sm:px-4 md:px-6 py-4 md:py-6' : 'max-w-7xl px-4 py-6 md:py-8'}`}>
            {isSubscriptionExpired() && activeTab !== 'earn' && activeTab !== 'zone' && activeTab !== 'negosyo' && activeTab !== 'guide' && activeTab !== 'admin' && activeTab !== 'va_shop' ? (
              <div id="renew-access-plan-section" className="max-w-2xl mx-auto space-y-6 animate-fadeIn py-6">
                
                {/* SYSTEM ALERT */}
                <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 shadow-md text-center space-y-4">
                  <div className="h-14 w-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600 animate-bounce">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-xl font-black text-rose-950">⚠️ Tapos na ang Iyong Access</h2>
                    <p className="text-xs text-rose-800 font-bold max-w-md mx-auto">
                      Ang system access para sa iyong account ay kasalukuyang natapos na dahil ang iyong 1-Day Trial o Subscription ay Expired na.
                    </p>
                  </div>
                </div>

                {/* DAILY LUCKY SPIN WHEEL */}
                <SpinWheel 
                  token={token} 
                  onAccessGranted={() => fetchUserProfile(token)} 
                />

                {/* ACCOUNT ACCESS STATUS SUMMARY (EXPIRED STATE) */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                  <h3 className="font-extrabold text-slate-950 text-xs tracking-wider uppercase flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-500 animate-pulse" />
                    <span>Detalye ng Iyong Access (Access Expiration Details)</span>
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50/50 border border-rose-100 p-4 rounded-2xl">
                    <div>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Kasalukuyang Status (Current Status)</span>
                      <span className="font-black text-rose-650 text-xs flex items-center gap-1.5 mt-0.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                        {getAccessStatusInfo().label}
                      </span>
                    </div>
                    <div className="sm:text-right">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Petsa ng Pagka-expire (Expiration Date)</span>
                      <span className="font-bold text-slate-700 text-xs mt-0.5 block font-mono">
                        {getAccessStatusInfo().expiresAtString}
                      </span>
                    </div>
                  </div>
                </div>

                {/* IF THE REQUEST IS PENDING */}
                {user.subscription?.status === 'pending' ? (
                  <div className="bg-white border-2 border-amber-400 rounded-3xl p-6 shadow-lg space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-amber-100 p-3 rounded-2xl shrink-0 text-amber-600 animate-pulse">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-slate-900 text-sm">📨 Naghihintay ng Pag-approve ng Admin...</h3>
                        <p className="text-xs text-slate-550 font-bold leading-relaxed">
                          Hiniling mo ang <span className="text-indigo-600 font-black">{user.subscription.requestedPlanName}</span>. Mangyaring magdeposito ng eksaktong halaga na <span className="text-emerald-600 font-black">₱{user.subscription.requestedAmount}</span> sa pamamagitan ng pag-scan sa aming official GCash InstaPay QR Code sa ibaba:
                        </p>
                      </div>
                    </div>

                    {/* QR CODE CONTAINER */}
                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md relative group">
                        <img 
                          src="/admin_gcash_qr.png" 
                          alt="Z-oneApp Admin GCash QR" 
                          className="w-56 h-56 object-contain rounded-lg mx-auto"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">
                          INSTAPAY
                        </div>
                      </div>

                      <div className="space-y-1.5 w-full max-w-sm">
                        <span className="text-indigo-600 font-black text-xs block">🛡️ SECURE INSTAPAY MERCHANT QR</span>
                        <a 
                          href="/admin_gcash_qr.png" 
                          download="Z-oneApp_Admin_GCash_QR.png"
                          className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 transition px-4 py-2 rounded-xl text-indigo-700 font-black text-[11px] cursor-pointer shadow-sm border border-indigo-150 mx-auto"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>I-download ang QR Code</span>
                        </a>
                      </div>
                    </div>

                    {/* SCAN INSTRUCTIONS */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
                      <h4 className="font-black text-slate-900 text-xs flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-indigo-600" />
                        <span>Gabay sa Pag-Scan Gamit ang GCash (How to Pay):</span>
                      </h4>
                      <ol className="list-decimal pl-4.5 text-xs text-slate-600 font-bold space-y-2 leading-relaxed">
                        <li>
                          I-click ang <span className="text-indigo-600 font-black">"I-download ang QR Code"</span> sa itaas o kumuha ng screenshot ng QR Code.
                        </li>
                        <li>
                          Buksan ang iyong <span className="text-blue-600 font-black">GCash App</span>.
                        </li>
                        <li>
                          Piliin ang <span className="text-slate-900 font-black">"QR"</span> o <span className="text-slate-900 font-black">"Scan QR"</span> sa ibaba ng iyong home screen sa GCash.
                        </li>
                        <li>
                          I-click ang <span className="text-indigo-600 font-black">"Upload from Gallery"</span> at piliin ang larawan ng QR Code na iyong na-save.
                        </li>
                        <li>
                          I-input ang tamang halaga ng subscription plan: <span className="text-emerald-600 font-black">₱{user.subscription.requestedAmount}</span>.
                        </li>
                        <li>
                          Kumuha ng screenshot ng iyong <span className="text-amber-600 font-black">Success Receipt</span> para sa mabilis na pag-verify.
                        </li>
                      </ol>
                    </div>

                    <div className="bg-amber-50/70 border border-amber-150 rounded-2xl p-4 text-xs font-bold text-amber-900 space-y-2 leading-relaxed">
                      <p>💡 **Para sa mabilis na pagsuri at tulong (Support Helpdesk):**</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Maghintay ng approval mula sa system. Kung medyo matagal ang proseso, maaari kayong mag-email sa aming helpline:</li>
                        <li>Email: <span className="font-mono bg-white px-1 py-0.2 rounded border select-all font-bold text-slate-800">Info.echozone@yahoo.com</span></li>
                        <li>O magpadala ng mensahe sa iyong upline, team leader, coach, o sa aming opisyal na Facebook page: <span className="font-black text-indigo-700">Z-oneApp2026</span>.</li>
                        <li>**THANK YOU FOR YOUR SUBSCRIPTION**</li>
                      </ul>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => fetchUserProfile(token)}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 transition py-3 rounded-2xl text-slate-950 font-black text-xs cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                      >
                        <RefreshCw className="w-4 h-4 animate-spin-slow" />
                        <span>I-refresh ang Status ng Aking Account</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="bg-slate-100 hover:bg-slate-200 transition px-5 py-3 rounded-2xl text-slate-650 font-black text-xs cursor-pointer"
                      >
                        Mag-logout
                      </button>
                    </div>
                  </div>
                ) : (
                  /* SELECTING A SUBSCRIPTION PLAN */
                  <div id="subscription-plans-section" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-lg space-y-6">
                    <div className="text-center space-y-1">
                      <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full select-none">
                        Mabilisang Pagpipilian (Subscription Plans)
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-sm">Pumili ng Subscription Plan Upang Mag-patuloy</h3>
                      <p className="text-xs text-slate-450 font-semibold max-w-sm mx-auto mt-1">
                        Kapag napili ang nais na plan, awtomatikong ipadadala ang iyong hiling sa admin queue para sa mabilisang validation.
                      </p>
                    </div>

                    {/* PLANS GRID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(() => {
                        const basePlans = [
                          { id: '1month', name: '1 Month Access', price: 200, desc: '₱200 para sa 30 araw na tuloy-tuloy na earn at cashouts.' },
                          { id: '2months', name: '2 Months Access', price: 500, desc: '₱500 para sa 60 araw na pinalawak na access.' },
                          { id: '3months', name: '3 Months Access', price: 1000, desc: '₱1000 para sa 90 araw na tanyag na VIP access.' },
                          { id: '4months', name: '4 Months Access', price: 2000, desc: '₱2000 para sa 120 araw ng walang katapusang earning portal.' }
                        ];
                        if ((stats.balance || 0) < 50) {
                          return [
                            { id: '7days', name: '7 Days Special Access', price: 20, desc: '₱20 para sa 7 araw na mabilisang trial access habang nag-iipon.' },
                            ...basePlans
                          ];
                        }
                        return basePlans;
                      })().map((plan) => (
                        <div 
                          key={plan.id}
                          className="border border-slate-200 rounded-2xl p-4 hover:border-blue-450 hover:shadow-md transition duration-300 flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-1">
                            <h4 className="font-extrabold text-slate-900 text-xs">{plan.name}</h4>
                            <div className="text-xl font-bold font-mono text-indigo-650">₱{plan.price}</div>
                            <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">{plan.desc}</p>
                          </div>
                          
                          <button
                            onClick={() => handleSubscriptionRequest(plan.id)}
                            disabled={submittingSubscription}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition py-2 text-white font-black text-xs rounded-xl cursor-pointer shadow-sm text-center"
                          >
                            Bilhin ang Plan na ito
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 pt-5 flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>Hindi pa handang magbayad?</span>
                      <button
                        onClick={handleLogout}
                        className="text-indigo-650 hover:underline font-black cursor-pointer"
                      >
                        I-logout ang aking Account
                      </button>
                    </div>

                  </div>
                )}

              </div>
            ) : activeTab === 'zone' && user ? (
              <div className="animate-fadeIn w-full">
                <ZoneFeed
                  token={token || ''}
                  user={user}
                  setUser={setUser}
                  triggerNotification={triggerNotification}
                  onRefreshProfile={() => fetchUserProfile(token || '')}
                  language={language}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              
              {/* TAB SHEETS ZONE (LHS - 3 COLUMNS) */}
              <div className="lg:col-span-3 space-y-6">
                
                {/* TAB 1: EARN CONTENT (VISITOR AD BLOCK) */}
                {activeTab === 'earn' && (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Withdrawal Policy Banner */}
                    <WithdrawalPolicyBanner onOpenModal={() => setShowWithdrawalPolicyModal(true)} />

                    {/* Promotional Banner */}
                    <ZoneAppBanner language={language} referralCode={user?.referralCode} triggerNotification={triggerNotification} />

                    {/* Expired Banner */}
                    {isSubscriptionExpired() && (
                      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
                        <div className="flex items-start gap-3.5">
                          <div className="bg-amber-100 p-2.5 rounded-full text-amber-750 animate-pulse shrink-0">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-amber-950 text-xs sm:text-sm">⚠️ Limitadong Earning Access (Expired Account)</h3>
                            <p className="text-[11px] sm:text-xs text-amber-850 font-extrabold leading-relaxed mt-0.5">
                              Dahil expired na ang iyong access, binibigyan ka pa rin ng Z-oneApp ng libreng daily access para kumita! Ngunit maaari mo lamang buksan ang mga website campaign na may reward na <span className="text-amber-950 font-black underline">₱0.05 up to ₱1.99 lamang</span>.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('cashout')}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4.5 py-2.5 rounded-xl transition shrink-0 cursor-pointer text-center shadow-sm"
                        >
                          I-renew ang Access Plan
                        </button>
                      </div>
                    )}

                    {/* Intro Title */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div>
                        <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                          <Compass className="w-5 h-5 text-blue-600" />
                          <span>Mga Pinagtitiwalaang Web Campaigns ngayong araw</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">Mag-click at manatili sa target homepage para makuha ang automated GCash bonus.</p>
                      </div>
                      <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/50 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Naka-ipon ngayon: {stats.completedTasksCount} Website Views</span>
                      </div>
                    </div>

                    {/* ADMIN EXCLUSIVE QUICK POPUP LAUNCHER BANNER */}
                    {user && user.isAdmin && (
                      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 border-2 border-indigo-400/40 rounded-3xl p-5 shadow-lg text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-400/40 text-indigo-300">
                            <PlusCircle className="w-6 h-6 text-indigo-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-md border border-indigo-400/30">
                                Admin Control
                              </span>
                              <h3 className="font-extrabold text-white text-sm">
                                Mag-add ng Bagong Website Campaign
                              </h3>
                            </div>
                            <p className="text-xs text-indigo-200/80 mt-0.5">
                              I-click ang button upang buksan ang pop-up window para sa pag-add ng bagong partner link nang hindi nawawala ang iyong tina-type.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          id="open-add-campaign-modal-btn"
                          onClick={() => setShowAddCampaignModal(true)}
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-xs transition shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>+ Buksan Pop-up Form</span>
                        </button>
                      </div>
                    )}

                    {/* Filter and Category toggles */}
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <ListFilter className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-500 mr-1.5">Suriin ang Campaigns:</span>
                        {[
                          { id: 'all', label: 'Lahat ng Webs' },
                          { id: 'high', label: 'Mataas ang Kita (≥ ₱1.00)' },
                          { id: 'available', label: 'Hindi pa Nabibisita' }
                        ].map(f => (
                          <button
                            key={f.id}
                            id={`filter-btn-${f.id}`}
                            onClick={() => setCampaignFilter(f.id as any)}
                            className={`px-3 py-1.5 rounded-xl border cursor-pointer transition ${
                              campaignFilter === f.id 
                                ? 'bg-slate-950 border-slate-950 text-white' 
                                : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      <span className="text-[10px] text-slate-400 font-extrabold uppercase">
                        Kabuuang nahanap: {filteredCampaigns.length} available
                      </span>
                    </div>

                    {/* WEBSITE GRID CARDS LIST */}
                    <div id="website-campaigns-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredCampaigns.map((camp) => {
                        const isExpiredUser = isSubscriptionExpired();
                        const isAllowedForExpired = camp.reward >= 0.05 && camp.reward <= 1.99;
                        const isLockedForUser = isExpiredUser && !isAllowedForExpired;

                        return (
                          <div 
                            key={camp.id}
                            id={`camp-card-${camp.id}`}
                            className={`bg-white border rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between gap-5 relative overflow-hidden ${
                              camp.completed 
                                ? 'border-emerald-250 bg-emerald-50/10' 
                                : isLockedForUser 
                                  ? 'border-slate-150 bg-slate-50/60 opacity-60' 
                                  : 'border-slate-200'
                            }`}
                          >
                            {/* Top row label and rewards badge */}
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="bg-slate-100 text-slate-600 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  {camp.category}
                                </span>
                                {isExpiredUser && (
                                  isAllowedForExpired ? (
                                    <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                                      <span>Maaaring buksan ✅</span>
                                    </span>
                                  ) : (
                                    <span className="bg-rose-50 border border-rose-150 text-rose-700 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                                      <Lock className="w-2.5 h-2.5" />
                                      <span>Kailangan ng Sub</span>
                                    </span>
                                  )
                                )}
                                {user && user.isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCampaign(camp.id, camp.title);
                                    }}
                                    title="Tanggalin/Burahin ang Campaign"
                                    className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/55 p-1 rounded-lg transition duration-200 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              
                              <span className="bg-emerald-50 border border-emerald-100 text-[12px] font-black text-emerald-700 px-2.5 py-1 rounded-xl">
                                ₱{camp.reward.toFixed(2)}
                              </span>
                            </div>

                            {/* Middle row main title */}
                            <div className="space-y-1.5">
                              <h4 className="font-extrabold text-slate-900 leading-snug line-clamp-2" title={camp.title}>
                                {camp.title}
                              </h4>
                              <p className="text-[10px] text-slate-400 truncate font-mono">{camp.url}</p>
                              {camp.description && (
                                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-1 line-clamp-2" title={camp.description}>
                                  {camp.description}
                                </p>
                              )}
                            </div>

                            {/* Bottom meta rules & Action triggers */}
                            <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-1">
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                                <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span>{camp.timer} segundo</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {camp.aiCommercial && !isLockedForUser && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveCommercialCamp(camp);
                                    }}
                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-black px-3 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer hover:scale-[1.03] animate-pulse"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Commercial</span>
                                  </button>
                                )}
                                {camp.completed ? (
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1 animate-fadeIn">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Tagumpay na nakuha!</span>
                                  </span>
                                ) : isLockedForUser ? (
                                  <button
                                    disabled
                                    className="bg-slate-100 border border-slate-250 text-slate-450 text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1 cursor-not-allowed"
                                  >
                                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>Naka-Lock (Expired)</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleOpenCampaign(camp)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-4 py-2 rounded-xl transition shadow shadow-blue-100 flex items-center gap-1 cursor-pointer hover:scale-[1.03]"
                                  >
                                    <Eye className="w-3.5 h-3.5 shrink-0" />
                                    <span>Buksan Homepage</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {filteredCampaigns.length === 0 && (
                        <div className="col-span-full bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-2">
                          <Compass className="w-10 h-10 stroke-1 mx-auto text-slate-350" />
                          <h4 className="font-extrabold text-slate-800">Walang makitang website campaign.</h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto font-semibold">
                            Subukang palitan ang list filter o lumapit sa Administrator para sa mga bagong campaign!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: CASHOUT (WITHDRAW GCASH INTEGRATOR) */}
                {activeTab === 'cashout' && (
                  <div className="animate-fadeIn w-full">
                    <GCashCashout 
                      stats={stats} 
                      withdrawals={withdrawals} 
                      onWithdrawSubmit={handleWithdrawalRequest} 
                      language={language}
                    />
                  </div>
                )}

                {/* TAB 3: FAQ GUIDE */}
                {activeTab === 'guide' && (
                   <div className="space-y-6 animate-fadeIn">
                     <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-xs leading-relaxed text-slate-600">
                      
                      <div className="border-b border-slate-150 pb-4">
                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                          <HelpCircle className="w-5 h-5 text-indigo-600" />
                          <span>Mga Karaniwang Katanungan (FAQs)</span>
                        </h2>
                        <p className="text-slate-400 font-bold mt-1">Narito ang mga kasagutan sa inyong mga katanungan tungkol sa paggamit ng aming secure simulator system.</p>
                      </div>

                      <div className="space-y-4 font-semibold">
                        
                        <div className="space-y-1.5 border-b border-slate-100 pb-3">
                          <h4 className="font-extrabold text-[#0F172A] text-sm">💡 1. Paano ako makaka-ipon ng totoong pera sa app na ito?</h4>
                          <p>
                            Ang bawat kumpanya ay nangangailangan ng 'Traffic Value' o pagbisita sa kanilang homepage upang mapataas ang kanilang ranking sa search engines. Binabayaran nila ang simulator upang maikalat ang kanilang links. Sa pamamagitan ng pagbukas at pananatili sa links nang ilang segundo habang umaandar ang countdown, binibigyan ka ng gantimpalang pondo diretso sa iyong wallet.
                          </p>
                        </div>

                        <div className="space-y-1.5 border-b border-slate-100 pb-3">
                          <h4 className="font-extrabold text-[#0F172A] text-sm">💡 2. Pwede ko ba talagang i-withdraw ang naipon ko sa pamamagitan ng GCash?</h4>
                          <p>
                            Oo! Kapag umabot sa minimum limit na ₱100.00 ang inyong balance, magpunta sa "GCash Cash-Out" tab, ilagay ang iyong GCash details at sumite. Kapag matagumpay na na-validate ng ating secure server network, kaagad itong sasalamin sa iyong logs at makatatanggap ka rin ng simulated mobile SMS verification.
                          </p>
                        </div>

                        <div className="space-y-1.5 border-b border-slate-100 pb-3">
                          <h4 className="font-extrabold text-[#0F172A] text-sm">💡 3. Paano gamitin ang Spin Wheel o Gulong ng Kapalaran?</h4>
                          <p>
                            Ang Spin Wheel ay matatagpuan sa iyong dashboard. Bawat spin ay may tsansang magbigay sa iyo ng karagdagang barya, wallet balance bonus, o referral benefits na makakatulong para mas mabilis mong maabot ang inyong cash-out goal!
                          </p>
                        </div>

                        <div className="space-y-1.5 pb-2">
                          <h4 className="font-extrabold text-[#0F172A] text-sm">💡 4. May limitasyon ba ang pag-upload sa Z-one Feed?</h4>
                          <p>
                            Maaari kang mag-upload ng paborito mong alaala galing sa iyong phone gallery anumang oras! Siguraduhin lamang na magalang, positibo, at ligtas para sa komunidad ang iyong ibabahaging larawan at kwento upang mapanatiling masaya at kapaki-pakinabang ang ating komunidad.
                          </p>
                        </div>

                      </div>

                    </div>
                  </div>
                )}

                {/* TAB 4: ADVANCED SECURE ADMIN WORKSPACE */}
                {activeTab === 'admin' && user.isAdmin && (
                  <div className="animate-fadeIn w-full">
                    <AdminPanel 
                      token={token} 
                      triggerNotification={triggerNotification} 
                    />
                  </div>
                )}

                {/* TAB 5: MERCHANT PORTAL (NEGOSYO PROMOTION HUB) */}
                {activeTab === 'negosyo' && (
                  <div className="animate-fadeIn w-full">
                    <MerchantPortal
                      token={token}
                      language={language}
                      triggerNotification={triggerNotification}
                    />
                  </div>
                )}

                {/* TAB 6: VIRTUAL ASSISTANT & Z-ONESHOP MARKETING HUB */}
                {activeTab === 'va_shop' && (
                  <div className="animate-fadeIn w-full">
                    <ZoneShopVAHub
                      token={token || ''}
                      user={user}
                      onRefreshProfile={() => fetchUserProfile(token)}
                      triggerNotification={triggerNotification}
                      language={language}
                    />
                  </div>
                )}

              </div>

              {/* SIDEBAR ZONE (RHS - 1 COLUMN) */}
              <div className="space-y-6">
                
                {/* REFERRAL INVITE PANEL IN SIDEBAR */}
                <ReferralPanel
                  referralCode={user.referralCode}
                  referredFriends={referredFriends}
                  token={token}
                  onRefreshProfile={() => fetchUserProfile(token)}
                  triggerNotification={triggerNotification}
                  language={language}
                />

                {/* 🔒 CENTRAL ACCESS & EXPIRE TIMER WIDGET */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-600 animate-spin-slow" />
                      <h4 className="font-extrabold text-slate-900 text-xs tracking-wider uppercase">
                        {language === 'tl' ? 'Aktibong Access Status' : 'Active Access Status'}
                      </h4>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${getAccessStatusInfo().badgeColor}`}>
                      {getAccessStatusInfo().type.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <span className="text-[9px] text-slate-400 block font-black uppercase tracking-wider">
                        {language === 'tl' ? 'Antas ng Access' : 'Access Level'}
                      </span>
                      <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${getAccessStatusInfo().isExpired ? 'bg-rose-500' : 'bg-emerald-500'} animate-pulse`} />
                        {getAccessStatusInfo().label}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <span className="text-[9px] text-slate-400 block font-black uppercase tracking-wider">
                        {language === 'tl' ? 'Oras ng Pag-expire' : 'Expiration Time'}
                      </span>
                      <span className="font-bold text-slate-800 text-xs block font-mono">
                        {getAccessStatusInfo().expiresAtString}
                      </span>
                      {getAccessStatusInfo().expiresAt && (
                        <span className="text-[10px] text-indigo-600 font-extrabold block mt-1">
                          ⏳ {getRemainingTimeText(getAccessStatusInfo().expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* CORE USER STATUS MOCK WIDGET */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <TrendingUp className="w-4 h-4 text-emerald-600 animate-pulse" />
                    <h4 className="font-extrabold text-slate-900 text-xs tracking-wider uppercase">Live Activity Status</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold leading-tight text-slate-700">
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                      <span className="text-[9px] text-slate-400 block font-black">Lifetime Profit</span>
                      <span className="text-emerald-600 font-extrabold text-sm font-mono mt-1 block">
                        ₱{stats.lifetimeEarnings.toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                      <span className="text-[9px] text-slate-400 block font-black">Referred list</span>
                      <span className="text-red-600 font-extrabold text-sm block mt-1">
                        {referredFriends.length} invitees
                      </span>
                    </div>
                  </div>

                  {/* MINI INTERNAL AUDIT LIST */}
                  <div className="space-y-1.5 pt-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-slate-400 font-bold">Your Recent Activity Logs</span>
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] space-y-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase ${
                              log.type === 'bonus' 
                                ? 'bg-amber-100 text-amber-800'
                                : log.type === 'reward'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {log.type}
                            </span>
                            <span className="text-[8px] text-slate-400 font-mono">
                              {log.timestamp.includes(',') ? log.timestamp.split(',')[1].trim() : log.timestamp}
                            </span>
                          </div>

                          <h5 className="font-extrabold text-slate-900 leading-tight">{log.title}</h5>
                          <p className="text-slate-500 text-[9px] leading-tight leading-normal">{log.details}</p>
                          
                          <div className="text-right text-[10px] font-black font-mono mt-0.5">
                            {log.type === 'withdraw' ? (
                              <span className="text-red-600">-₱{log.amount.toFixed(2)}</span>
                            ) : (
                              <span className="text-emerald-600">+₱{log.amount.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {activityLogs.length === 0 && (
                        <p className="text-center py-5 italic text-slate-400 text-[10px]">Wala pang naitalang kasanayan.</p>
                      )}
                    </div>

                  </div>

                  {/* Simulated SMS Alert Preview screen mock for GCash users */}
                  <div className="bg-slate-950 text-white rounded-2xl p-4 shadow-xl border border-slate-800 font-mono relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-1">
                      <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse"></div>
                    </div>
                    <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <span>📱 Simulated GCash SMS Monitor</span>
                    </p>
                    <div className="border border-slate-800 rounded bg-slate-900 p-2 text-[10px] text-slate-300 leading-relaxed max-h-[140px] overflow-y-auto">
                      {withdrawals.some(w => w.status === 'success') ? (
                        <div>
                          <p className="text-slate-400 text-[8px] font-semibold">Just Now • Globe Network</p>
                          <p className="text-white mt-1 text-[10px]">
                            "You have received <strong className="text-emerald-400 font-extrabold">₱{withdrawals.find(w => w.status === 'success')?.amount.toFixed(2)}</strong> of GCash from VisitorRewards on {new Date().toLocaleDateString()}. Ref: {withdrawals.find(w => w.status === 'success')?.referenceNo}."
                          </p>
                        </div>
                      ) : (
                        <p className="text-slate-500 italic text-center py-4">Naghihintay ng matagumpay na simulated withdrawal request...</p>
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </div>
            )}
          </div>
        </main>
      )}

          {/* 🌐 VIRTUAL BROWSER SIMULATOR CORE IFRAME PORTAL MODAL OVERLAY */}
          <AnimatePresence>
            {currentViewingCampaign && (
              <BrowserSimulator
                campaign={currentViewingCampaign}
                onComplete={handleCompleteCampaignView}
                onClose={() => setCurrentViewingCampaign(null)}
                language={language}
              />
            )}
          </AnimatePresence>

          {/* 🎬 AI COMMERCIAL POPUP PLAYER */}
          {activeCommercialCamp && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-1 max-w-4xl w-full relative shadow-2xl">
                <button
                  onClick={() => setActiveCommercialCamp(null)}
                  className="absolute -top-12 right-0 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-2 rounded-full border border-slate-700 cursor-pointer select-none transition z-50 flex items-center gap-1"
                >
                  ✕ {language === 'tl' ? 'Isara' : 'Close'}
                </button>
                {activeCommercialCamp.aiCommercial ? (
                  <AICommercialPlayer
                    commercial={activeCommercialCamp.aiCommercial}
                    businessUrl={activeCommercialCamp.url}
                    businessTitle={activeCommercialCamp.title}
                    onClose={() => setActiveCommercialCamp(null)}
                  />
                ) : (
                  <div className="p-8 text-center space-y-4">
                    <p className="text-slate-400 font-bold text-sm">Walang nahanap na AI Commercial para sa campaign na ito.</p>
                    <button 
                      onClick={() => setActiveCommercialCamp(null)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold cursor-pointer"
                    >
                      Isara
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 📱 MODERN 5-TAB BOTTOM NAVIGATION BAR (Matching Reference Image) */}
          <nav 
            id="mobile-bottom-navigation-bar" 
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-3 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.06)] sm:rounded-t-2xl"
          >
            {/* Home */}
            <button
              type="button"
              id="bottom-nav-home"
              onClick={() => {
                try { soundEffects.playClick(); } catch (e) {}
                setActiveTab(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer ${
                activeTab === null
                  ? 'text-blue-600 font-black'
                  : 'text-slate-400 hover:text-slate-600 font-semibold'
              }`}
            >
              <Home className={`w-5 h-5 ${activeTab === null ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] mt-0.5">Home</span>
            </button>

            {/* Campaigns / Earn */}
            <button
              type="button"
              id="bottom-nav-campaigns"
              onClick={() => {
                try { soundEffects.playClick(); } catch (e) {}
                setActiveTab('earn');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer ${
                activeTab === 'earn'
                  ? 'text-blue-600 font-black'
                  : 'text-slate-400 hover:text-slate-600 font-semibold'
              }`}
            >
              <Globe className={`w-5 h-5 ${activeTab === 'earn' ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] mt-0.5">Campaigns</span>
            </button>

            {/* Rewards / Spin */}
            <button
              type="button"
              id="bottom-nav-rewards"
              onClick={() => {
                try { soundEffects.playClick(); } catch (e) {}
                setShowSpinModal(true);
              }}
              className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer text-slate-400 hover:text-indigo-600 font-semibold relative group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-xs -mt-2 group-hover:scale-110 transition">
                <Gift className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="text-[10px] mt-0.5 text-slate-700 font-bold">Rewards</span>
            </button>

            {/* Transactions / Wallet */}
            <button
              type="button"
              id="bottom-nav-transactions"
              onClick={() => {
                try { soundEffects.playClick(); } catch (e) {}
                setActiveTab('cashout');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer ${
                activeTab === 'cashout'
                  ? 'text-blue-600 font-black'
                  : 'text-slate-400 hover:text-slate-600 font-semibold'
              }`}
            >
              <Receipt className={`w-5 h-5 ${activeTab === 'cashout' ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] mt-0.5">Transactions</span>
            </button>

            {/* Account / Profile */}
            <button
              type="button"
              id="bottom-nav-account"
              onClick={() => {
                try { soundEffects.playClick(); } catch (e) {}
                openEditProfileModal();
              }}
              className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer text-slate-400 hover:text-slate-600 font-semibold"
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Account</span>
            </button>
          </nav>

          {/* 🎡 LUCKY SPIN WHEEL MODAL */}
          {showSpinModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
                <button
                  type="button"
                  onClick={() => setShowSpinModal(false)}
                  className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-2 rounded-full cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="text-center pt-2">
                  <h3 className="text-lg font-black text-white">{language === 'tl' ? 'Araw-araw na Pa-Premyo' : 'Daily Lucky Spin'}</h3>
                  <p className="text-xs text-slate-400 mt-1">{language === 'tl' ? 'Mag-spin para manalo ng libreng access at dagdag na pondo!' : 'Spin the wheel to earn daily rewards and instant access!'}</p>
                </div>
                <SpinWheel 
                  token={token} 
                  onAccessGranted={() => {
                    fetchUserProfile(token);
                    setShowSpinModal(false);
                  }} 
                />
              </div>
            </div>
          )}

          {/* FOOTER */}
          <footer id="dashboard-footer" className="bg-white border-t border-slate-200 mt-12 py-6 pb-20">
            <div className="max-w-7xl mx-auto px-4 text-center space-y-2 text-xs">
              <p className="font-bold text-slate-500">
                © 2026 Website Visitor and GCash Rewards Simulation.
              </p>
              <p className="text-[10px] text-slate-400 max-w-xl mx-auto leading-relaxed font-semibold">
                Ang platform na ito ay isang interactive gamified web interface na idinisenyo para sa pag-explore ng featured content at pag-unawa sa mga konsepto ng modernong digital advertising at automated systems.

Ang mga aktibidad na isinasagawa sa loob ng platform ay para sa layunin ng pakikilahok at karanasan ng gumagamit. Ang platform ay hindi nag-aalok ng garantisadong resulta, hindi nangangako ng anumang partikular na benepisyo, at hindi dapat ituring bilang isang oportunidad sa pamumuhunan o paraan ng mabilisang pagkakaroon ng kita.

Ang paggamit ng platform ay napapailalim sa aming Terms of Use, Community Guidelines, at iba pang naaangkop na patakaran.

              </p>
            </div>
          </footer>
        </>
      )}

      {/* 🎬 FLOATING REELS & SHORTS WIDGET (Accessible to Users & Non-Users / Visitors) */}
      <ReelsFloatingWidget
        reels={reels}
        isAdmin={user?.isAdmin || false}
        currentUserName={user?.name}
        currentUserId={user?.id}
        currentUserEmail={user?.email}
        isLoggedIn={!!user}
        language={language}
        userTokens={user?.reelsTokens || 0}
        onAddReel={handleAddReel}
        onDeleteReel={handleDeleteReel}
        onLikeReel={handleLikeReel}
        onWatchRewardReel={handleWatchRewardReel}
        triggerNotification={triggerNotification}
        onRefreshReels={fetchReels}
      />

      {/* 📶 INTELLIGENT MOBILE DATA SAVER SETTINGS MODAL */}
      <DataSaverSettingsModal
        isOpen={showDataSaverModal}
        onClose={() => setShowDataSaverModal(false)}
        language={language}
        triggerNotification={triggerNotification}
      />

    </div>
  );
}
