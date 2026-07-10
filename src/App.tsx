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
  Smartphone,
  Bell,
  QrCode,
  Download
} from 'lucide-react';
import { INITIAL_CAMPAIGNS } from './data/campaigns';
import { WebsiteCampaign, WithdrawalRequest, ActivityLog, UserStats, ReferralFriend } from './types';
import BrowserSimulator from './components/BrowserSimulator';
import GCashCashout from './components/GCashCashout';
import ReferralPanel from './components/ReferralPanel';
import AdminPanel from './components/AdminPanel';
import ZoneFeed from './components/ZoneFeed';
import MerchantPortal from './components/MerchantPortal';
import AICommercialPlayer from './components/AICommercialPlayer';
import SpinWheel from './components/SpinWheel';
import { soundEffects } from './utils/audio';

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
  const [token, setToken] = useState<string | null>(localStorage.getItem('gcash_click_earn_token'));
  const [user, setUser] = useState<UserSession | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [newAvatar, setNewAvatar] = useState('👤');
  const [newName, setNewName] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

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
  const [stats, setStats] = useState<UserStats>({
    balance: 25.00,
    lifetimeEarnings: 25.00,
    completedTasksCount: 0,
    dailyCheckInDate: null
  });

  const [campaigns, setCampaigns] = useState<WebsiteCampaign[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [referredFriends, setReferredFriends] = useState<ReferralFriend[]>([]);
  
  const [activeTab, setActiveTab] = useState<'earn' | 'cashout' | 'zone' | 'guide' | 'admin' | 'negosyo'>('earn');
  const [currentViewingCampaign, setCurrentViewingCampaign] = useState<WebsiteCampaign | null>(null);
  const [activeCommercialCamp, setActiveCommercialCamp] = useState<WebsiteCampaign | null>(null);

  // Add custom campaigns state
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customReward, setCustomReward] = useState('0.75');
  const [customTimer, setCustomTimer] = useState('15');
  const [customDescription, setCustomDescription] = useState('');
  const [campaignFilter, setCampaignFilter] = useState<'all' | 'high' | 'available'>('all');

  // Animation states
  const [floatingCoinReward, setFloatingCoinReward] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
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
    if (!('Notification' in window)) {
      triggerNotification(
        language === 'tl'
          ? '⚠️ Hindi suportado ng iyong device ang system notifications.'
          : '⚠️ Your device does not support system notifications.',
        'error'
      );
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        triggerNotification(
          language === 'tl'
            ? '🎉 Matagumpay na pinagana ang notifications sa iyong device!'
            : '🎉 Device notifications successfully enabled!',
          'success'
        );
        setTimeout(() => {
          showDeviceNotification(
            language === 'tl'
              ? 'Salamat sa pag-enable! Makakatanggap ka na ng balita at update dito.'
              : 'Thank you for enabling! You will now receive alerts and updates here.',
            'success'
          );
        }, 1000);
      } else if (permission === 'denied') {
        triggerNotification(
          language === 'tl'
            ? '⚠️ Na-deny ang notifications. I-reset ang settings ng iyong Chrome/browser para payagan ito.'
            : '⚠️ Notifications denied. Please reset your browser/Chrome settings to allow them.',
          'error'
        );
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  const triggerNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type });
    showDeviceNotification(message, type);
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

  // Monetag script integration for the login/register screen only
  useEffect(() => {
    // If the user is definitely not logged in (no token, no user, and not loading), load the Monetag ads script
    if (!token && !user && !loadingProfile) {
      if (!document.getElementById('monetag-login-ads-script')) {
        const script = document.createElement('script');
        script.dataset.zone = '11201519';
        script.src = 'https://al5sm.com/tag.min.js';
        script.id = 'monetag-login-ads-script';
        
        const parent = [document.documentElement, document.body].filter(Boolean).pop();
        if (parent) {
          parent.appendChild(script);
        }
      }
    } else {
      // Remove the script when logged in or loading the profile
      const el = document.getElementById('monetag-login-ads-script');
      if (el) {
        el.remove();
      }
    }

    return () => {
      const el = document.getElementById('monetag-login-ads-script');
      if (el) {
        el.remove();
      }
    };
  }, [token, user, loadingProfile]);

  // Fetch or sync user profile
  const fetchUserProfile = async (authToken: string) => {
    setLoadingProfile(true);
    try {
      const res = await fetch('/api/user/profile', {
        headers: {
          'Authorization': authToken
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setStats(data.user.stats);
        setWithdrawals(data.user.withdrawals);
        setActivityLogs(data.user.activityLogs);
        setReferredFriends(data.user.referredFriends);
        
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

        // Auto transition into admin panel tab if they are logged in as admin to save steps
        if (data.user.isAdmin && activeTab === 'earn') {
          setActiveTab('admin');
        }
      } else {
        // Token has expired/invalid, or server rebooted on Cloud Run. Try auto-restoring session from offline backup!
        const backupStr = localStorage.getItem('gcash_user_backup_profile');
        if (backupStr) {
          try {
            const backupProfile = JSON.parse(backupStr);
            if (backupProfile && backupProfile.email && backupProfile.password && backupProfile.name) {
              const restoreRes = await fetch('/api/auth/auto-restore', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  email: backupProfile.email,
                  password: backupProfile.password,
                  name: backupProfile.name,
                  avatar: backupProfile.avatar,
                  stats: backupProfile.stats,
                  withdrawals: backupProfile.withdrawals,
                  activityLogs: backupProfile.activityLogs,
                  referredFriends: backupProfile.referredFriends
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
                setLoadingProfile(false);
                return;
              }
            }
          } catch (restoreErr) {
            console.error('Failed to auto-restore session from backup:', restoreErr);
          }
        }

        // Token has expired or is invalid
        handleLogout();
      }
    } catch (e) {
      console.error(e);
      triggerNotification('⚠️ Connection error sa pag-load ng inyong Profile.', 'error');
    } finally {
      setLoadingProfile(false);
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

  // Periodic active polling check to sync admin or other devices' actions
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchUserProfile(token);
    }, 10000); // Poll every 10 seconds to align with admin approvals/declines instantly
    return () => clearInterval(interval);
  }, [token, activeTab]);

  // --- SUBSCRIPTIONS STATE & CALCULATIONS ---
  const [submittingSubscription, setSubmittingSubscription] = useState(false);
  const [now, setNow] = useState<Date>(new Date());
  const [showExpiryWarningModal, setShowExpiryWarningModal] = useState(false);
  const [hasShownExpiryWarning, setHasShownExpiryWarning] = useState(false);
  const [showPlansInWarning, setShowPlansInWarning] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
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
      ? { email: emailInput.trim(), password: passwordInput }
      : { name: nameInput.trim(), email: emailInput.trim(), password: passwordInput, referralCode: referralInput.trim() };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: selectedName,
          email: selectedEmail,
          avatar: avatar
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
    localStorage.removeItem('gcash_click_earn_token');
    setToken(null);
    setUser(null);
    setActiveTab('earn');
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
      
      {/* 🔔 FLOATING NOTIFICATION SYSTEM */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            id="system-banner"
            className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%] p-4 rounded-2xl shadow-xl border flex items-start gap-3 backdrop-blur-md ${
              notification.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950'
                : notification.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-950'
                : 'bg-indigo-50/95 border-indigo-200 text-indigo-950'
            }`}
          >
            <div className={`p-1.5 rounded-xl shrink-0 ${
              notification.type === 'success' ? 'bg-emerald-100' : notification.type === 'error' ? 'bg-rose-100' : 'bg-indigo-100'
            }`}>
              {notification.type === 'success' ? '💰' : notification.type === 'error' ? '🚨' : 'ℹ️'}
            </div>
            <div className="flex-1">
              <span className="text-xs font-extrabold block text-slate-400 uppercase tracking-widest leading-none mb-1">GCash Rewards Alert</span>
              <p className="text-xs font-bold leading-normal">{notification.message}</p>
            </div>
          </motion.div>
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm tracking-wide uppercase">
                      {language === 'tl' ? '⚙️ I-edit ang Profile' : '⚙️ Edit Profile'}
                    </h3>
                    <p className="text-[10px] text-white/90 font-semibold">
                      {language === 'tl' ? 'Baguhin ang iyong pangalan at profile pic' : 'Customize your name and profile pic'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="text-white hover:text-blue-100 transition text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleUpdateProfile} className="p-6 space-y-5">
                {/* Profile Pic Preview & Current Status */}
                <div className="flex flex-col items-center justify-center space-y-2 py-2">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center shadow-lg border-2 border-indigo-250 overflow-hidden">
                      {newAvatar && (newAvatar.startsWith('http') || newAvatar.startsWith('data:')) ? (
                        <img src={newAvatar} alt="New Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-5xl leading-none">{newAvatar || '👤'}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Live Profile Picture Preview</span>
                </div>

                {/* Name field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wide block">
                    {language === 'tl' ? 'Pangalan (Full Name)' : 'Name (Full Name)'}
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    maxLength={35}
                    placeholder="E.g., Juan Dela Cruz"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 transition"
                  />
                </div>

                {/* Avatar Presets Selection */}
                <div className="space-y-2">
                  <label className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wide block">
                    {language === 'tl' ? 'Pumili sa aming Presets (Choose Preset Emoji)' : 'Choose Preset Emoji'}
                  </label>
                  <div className="grid grid-cols-6 gap-2 bg-slate-50 border border-slate-150 p-3 rounded-2xl max-h-[110px] overflow-y-auto">
                    {['👤', '👨‍💻', '👩‍💻', '🦁', '🦉', '🐱', '🐶', '🦊', '🦄', '🐼', '🤖', '👑', '💼', '🚀', '⭐', '🌈', '🔥', '💖', '🍀', '🍕', '😎', '🎮', '💡', '🎵'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewAvatar(preset)}
                        className={`text-2xl p-1 rounded-xl hover:bg-slate-200 transition cursor-pointer select-none text-center ${
                          newAvatar === preset ? 'bg-indigo-100 border-2 border-indigo-400 scale-110' : 'border border-transparent'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Avatar Upload from Gallery */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <label className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wide block">
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
                    className="w-full border border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/20 p-2.5 rounded-2xl text-[11px] text-indigo-750 font-extrabold cursor-pointer transition flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>{language === 'tl' ? 'Mag-upload ng Larawan mula sa Gallery' : 'Upload Image from Gallery'}</span>
                  </button>
                </div>

                {/* Custom Avatar URL or Custom Emoji */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wide block">
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
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-2xl px-4 py-3 text-xs font-semibold text-slate-700 transition font-mono"
                  />
                  <p className="text-[10px] text-slate-455 leading-normal font-semibold">
                    💡 Maari kang mag-paste ng link ng larawan mula sa internet (tulad ng Facebook, Imgur, o Unsplash) upang ito ang maging larawan ng iyong profile.
                  </p>
                </div>

                {/* Footer buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditProfileModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition py-3 rounded-2xl text-slate-700 font-black text-xs cursor-pointer text-center"
                  >
                    {language === 'tl' ? 'I-cancel' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 active:bg-indigo-800 transition py-3 rounded-2xl text-white font-black text-xs cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  >
                    {isUpdatingProfile ? (
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>{language === 'tl' ? 'I-save ang Profile' : 'Save Profile'}</span>
                    )}
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
          {/* HEADER BAR */}
          <header id="dashboard-header" className="bg-slate-900 border-b border-slate-800 text-white py-3 sm:py-4 shadow-md">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              
              {/* BRAND / IDENTITY */}
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="p-2 bg-blue-600 rounded-xl sm:rounded-2xl shadow-md flex items-center justify-center animate-pulse shrink-0">
                  <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
                </span>
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h1 className="font-black text-sm sm:text-lg tracking-tight">Earning Dashboard</h1>
                    {user.isAdmin && (
                      <span className="bg-red-500 text-white text-[8px] sm:text-[9px] font-black tracking-widest uppercase px-1.5 sm:px-2 py-0.5 rounded flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5 text-yellow-250 animate-bounce" />
                        <span>OWNER ADMIN</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-semibold hidden md:block">Explore featured websites and participate in platform activities to enjoy available PPV rewards, subject to our terms and guidelines.</p>
                </div>
              </div>

              {/* USER PROFILE CARD AND METRICS */}
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">


                {/* 🔔 Allow Device Notifications Prompt if state is default */}
                {notificationPermission === 'default' && (
                  <button
                    onClick={requestNotificationPermission}
                    className="bg-emerald-600 hover:bg-emerald-500 hover:scale-[1.03] active:scale-[0.97] text-white text-[9px] sm:text-[10px] font-black px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                    title={language === 'tl' ? 'Paganahin ang Notifications sa CP / Device' : 'Enable Device Notifications'}
                  >
                    <Bell className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                    <span>{language === 'tl' ? 'Payagan Notif' : 'Allow Notif'}</span>
                  </button>
                )}

                {/* 🌍 LANGUAGE SELECT SWITCH */}
                <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-950/65 border border-slate-800 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl shadow-inner shrink-0">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-[10px] font-black uppercase rounded-lg sm:rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                      language === 'en'
                        ? 'bg-slate-700 text-white shadow font-black scale-105'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🇺🇸</span>
                    <span className="hidden xs:inline">EN</span>
                  </button>
                  <button
                    onClick={() => setLanguage('tl')}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-[10px] font-black uppercase rounded-lg sm:rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                      language === 'tl'
                        ? 'bg-indigo-600 text-white shadow font-black scale-105'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🇵🇭</span>
                    <span className="hidden xs:inline">TL</span>
                  </button>
                </div>

                <div className="bg-slate-850 border border-slate-800 p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-2.5 shadow-sm min-w-0">
                  {/* Clickable Avatar to edit profile picture */}
                  <button
                    onClick={openEditProfileModal}
                    title={language === 'tl' ? 'I-edit ang iyong Profile at Larawan' : 'Edit your Profile and Picture'}
                    className="relative group cursor-pointer focus:outline-none shrink-0"
                  >
                    <div className="text-xl sm:text-2xl leading-none select-none flex items-center justify-center">
                      {user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:')) ? (
                        <img src={user.avatar} alt="Profile" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-slate-700 shadow-inner group-hover:opacity-85 transition" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-xl sm:text-2xl bg-slate-900 p-1 sm:p-1.5 rounded-full shadow-inner group-hover:scale-105 transition block">{user.avatar || '👤'}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 bg-blue-600 text-[8px] text-white font-black p-0.5 rounded-full border border-slate-900 group-hover:bg-blue-500 transition scale-90">
                      ✎
                    </span>
                  </button>

                  <div className="min-w-0 pr-1">
                    <button
                      onClick={openEditProfileModal}
                      title={language === 'tl' ? 'I-edit ang iyong Profile at Larawan' : 'Edit your Profile and Picture'}
                      className="text-left font-black text-[10px] sm:text-xs leading-none text-white truncate max-w-[80px] xs:max-w-[120px] sm:max-w-[130px] hover:text-blue-400 cursor-pointer transition block"
                    >
                      Mabuhay, {user.name}!
                    </button>
                    <p className="text-[8px] sm:text-[9px] text-slate-400 mt-0.5 sm:mt-1 font-semibold truncate max-w-[80px] xs:max-w-[120px] sm:max-w-[130px]" title={user.email}>
                      {user.email}
                    </p>
                  </div>
                  
                  {/* LOGOUT */}
                  <button 
                    onClick={handleLogout}
                    title="Log-out safe"
                    id="user-logout-btn"
                    className="p-1 sm:p-1.5 hover:bg-slate-700/60 transition rounded-lg sm:rounded-xl text-slate-400 hover:text-red-400 cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>

            </div>
          </header>

          {/* GIANT COLOR HERO BANNER PANEL */}
          <div id="hero-marketing-bar" className="bg-slate-900 border-b border-slate-800 py-8 text-white relative overflow-hidden shrink-0">
            
            {/* Ambient colorful vector orbs */}
            <div className="absolute top-0 right-0 h-44 w-44 rounded-full bg-indigo-500/10 blur-3xl" />
            
            <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
              
              {/* DETAILS LEFT */}
              <div className="space-y-2 text-center md:text-left">
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full flex items-center gap-1 w-max mx-auto md:mx-0">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>₱0.01 - ₱50.00 PER SIMULATED HOME VIEW</span>
                </span>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight max-w-xl">
                  Explore featured websites and discover businesses through our platform. Businesses may also partner with us for promotional exposure and increased website visits.
                </h2>
                <p className="text-slate-400 text-xs max-w-lg font-semibold">
                  I-explore ang mga featured homepage sa ibaba at hintaying matapos ang automatic browser timer upang makumpleto ang iyong participation sa activity.
                </p>
              </div>

              {/* WALLET AND REWARDS CENTER STATUS */}
              <div className="flex items-center gap-4 self-center md:self-auto">
                
                {/* CURRENT BALANCE */}
                <div className="bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl p-4 min-w-[170px] backdrop-blur-sm transition">
                  <div className="flex items-center justify-between gap-3 text-blue-200 text-[10px] font-bold uppercase tracking-wider">
                    <span>Kasalukuyang Balance</span>
                    <Coins className="w-4 h-4 text-yellow-300 animate-spin-slow" />
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-white mt-1 tracking-tight">
                    <span className="text-yellow-300 mr-0.5">₱</span>
                    {stats.balance.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-emerald-300 mt-1 font-semibold flex items-center gap-1">
                    <span>● Ligtas at Pwedeng i-GCash</span>
                  </p>
                </div>

                {/* DAILY CHECK IN ACTION */}
                <button
                  id="daily-bonus-checking-btn"
                  onClick={handleDailyCheckIn}
                  className="bg-gradient-to-b from-yellow-300 to-amber-500 hover:from-yellow-200 hover:to-amber-450 text-slate-950 font-black px-5 py-3 rounded-2xl h-full shadow-md text-sm transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex flex-col items-center justify-center gap-1 shrink-0"
                >
                  <Sparkles className="w-5 h-5 text-yellow-950 animate-pulse" />
                  <span>₱1.00 Araw Bonus</span>
                </button>

              </div>

            </div>

          </div>

          {/* 🧭 NAVIGATION TABS CONTROL BAR */}
          <div id="dashboard-navigation-tabs" className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-4">
              
              <div className={`w-full grid py-2.5 gap-1 shrink-0 ${user.isAdmin ? 'grid-cols-6' : 'grid-cols-5'} md:flex md:w-auto md:py-3 md:gap-1`}>
                {[
                  { id: 'earn', textMobile: 'Mag-ipon', textDesktop: ' (Website Lists)', icon: Globe },
                  { id: 'cashout', textMobile: 'GCash Cash-Out', textDesktop: ' (Withdraw)', icon: Wallet },
                  { id: 'zone', textMobile: 'Z-one Social', textDesktop: ' (Community Feed)', icon: Users },
                  { id: 'negosyo', textMobile: 'Negosyo', textDesktop: ' (Promotion)', icon: Megaphone },
                  { id: 'guide', textMobile: 'Gabay', textDesktop: ' (FAQs)', icon: HelpCircle },
                  // Dynamic Admin tab if the session yields an admin role
                  ...(user.isAdmin ? [{ id: 'admin', textMobile: 'Admin Control', textDesktop: ' Panel', icon: Shield }] : [])
                ].map((tab) => {
                  const IconComp = tab.icon;
                  const isSelected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      id={`nav-tab-${tab.id}`}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-1 py-1.5 sm:px-2 md:px-4.5 md:py-2.5 rounded-xl font-extrabold text-[10px] sm:text-xs md:text-sm transition cursor-pointer flex flex-col md:flex-row items-center justify-center text-center md:text-left gap-1 md:gap-2 leading-tight ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <IconComp className="w-4 h-4 md:w-4.5 md:h-4.5 shrink-0" />
                      <span className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-1">
                        <span>{tab.textMobile}</span>
                        {tab.textDesktop && (
                          <span className="hidden md:inline text-[10px] md:text-[11px] font-bold opacity-80">
                            {tab.textDesktop}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-slate-500 font-bold border-l border-slate-200 pl-4 py-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Server Synchronized: Real-Time</span>
              </div>

            </div>
          </div>

          {/* 🖥️ MAIN BODY WORKSPACE */}
          <div id="main-content-layout" className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:py-8">
            {isSubscriptionExpired() ? (
              <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn py-6">
                
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
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-lg space-y-6">
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

                    {/* INTERACTIVE FORM: CREATE CUSTOM WEBSITE AD CAMPAIGN WITH EARNING RULES */}
                    {user && user.isAdmin && (
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                        
                        <div className="border-b border-slate-100 pb-3">
                          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                            <PlusCircle className="w-5 h-5 text-indigo-600" />
                            <span>Mag-add ng Bagong Campaign (Admin Only)</span>
                          </h3>
                          <p className="text-[11px] text-slate-550 mt-0.5">Ipasok ang link, reward, at tagal ng pagbisita upang gawing available sa mga users.</p>
                        </div>

                        <form onSubmit={handleCreateCustomCampaign} className="grid grid-cols-1 md:grid-cols-6 gap-4 text-xs font-semibold">
                          
                          {/* Title input */}
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-slate-500 font-bold block">Pangalan ng Website / Title *</label>
                            <input 
                              type="text" 
                              required
                              placeholder="Hal. My Personal Blog" 
                              value={customTitle}
                              onChange={(e) => setCustomTitle(e.target.value)}
                              className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-hidden font-semibold transition"
                            />
                          </div>

                          {/* URL input */}
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-slate-550 font-bold block">Website Homepage URL *</label>
                            <input 
                              type="text" 
                              required
                              placeholder="Hal. myhomepage.com o blog.org" 
                              value={customUrl}
                              onChange={(e) => setCustomUrl(e.target.value)}
                              className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-hidden font-semibold transition"
                            />
                          </div>

                          {/* Reward amount */}
                          <div className="space-y-1 md:col-span-1">
                            <label className="text-slate-550 font-bold block">Reward (₱) *</label>
                            <input 
                              type="number" 
                              step="0.01"
                              min="0.01"
                              required
                              placeholder="Hal. 2.50" 
                              value={customReward}
                              onChange={(e) => setCustomReward(e.target.value)}
                              className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-hidden font-semibold transition"
                            />
                          </div>

                          {/* Timer */}
                          <div className="space-y-1 md:col-span-1">
                            <label className="text-slate-550 font-bold block">Timer (segundo) *</label>
                            <input 
                              type="number" 
                              min="5"
                              required
                              placeholder="Hal. 15" 
                              value={customTimer}
                              onChange={(e) => setCustomTimer(e.target.value)}
                              className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-hidden font-semibold transition"
                            />
                          </div>

                          {/* Description input */}
                          <div className="space-y-1 md:col-span-6">
                            <label className="text-slate-550 font-bold block">Paglalarawan / Description of Website</label>
                            <textarea 
                              placeholder="Hal. Isang mahusay na blog tungkol sa tech at balita sa bansa." 
                              value={customDescription}
                              onChange={(e) => setCustomDescription(e.target.value)}
                              rows={2}
                              className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-hidden font-semibold transition resize-none"
                            />
                          </div>

                          {/* Action Submit full row */}
                          <div className="md:col-span-6 flex justify-end">
                            <button
                              type="submit"
                              id="create-custom-campaign-btn"
                              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-6 py-2.5 rounded-xl cursor-pointer transition flex items-center justify-center gap-1.5"
                            >
                              <Plus className="w-4 h-4 text-emerald-400" />
                              <span>Mag-add Campaign</span>
                            </button>
                          </div>

                        </form>

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
                      {filteredCampaigns.map((camp) => (
                        <div 
                          key={camp.id}
                          id={`camp-card-${camp.id}`}
                          className={`bg-white border rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between gap-5 relative overflow-hidden ${
                            camp.completed 
                              ? 'border-emerald-250 bg-emerald-50/10' 
                              : 'border-slate-200'
                          }`}
                        >
                          {/* Top row label and rewards badge */}
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="bg-slate-100 text-slate-600 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {camp.category}
                              </span>
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
                              {camp.aiCommercial && (
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
                      ))}

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
                  <div className="animate-fadeIn">
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
                  <div className="animate-fadeIn">
                    <AdminPanel 
                      token={token} 
                      triggerNotification={triggerNotification} 
                    />
                  </div>
                )}

                {/* TAB 5: MERCHANT PORTAL (NEGOSYO PROMOTION HUB) */}
                {activeTab === 'negosyo' && (
                  <div className="animate-fadeIn">
                    <MerchantPortal
                      token={token}
                      language={language}
                      triggerNotification={triggerNotification}
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

          {/* FOOTER */}
          <footer id="dashboard-footer" className="bg-white border-t border-slate-200 mt-12 py-6">
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

    </div>
  );
}
