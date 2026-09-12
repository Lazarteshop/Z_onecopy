import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Heart,
  MessageSquare,
  CornerDownRight,
  UserPlus,
  AtSign,
  Trophy,
  Info,
  X,
  ExternalLink
} from 'lucide-react';
import { SocialNotification } from '../types';

interface SocialNotificationCenterProps {
  token: string;
  currentUserId?: string;
  language?: 'tl' | 'en';
  onNavigateToPost?: (postId: string) => void;
  onNavigateToProfile?: (userId: string) => void;
  onNavigateToChallenge?: (challengeId: string) => void;
}

export const SocialNotificationCenter: React.FC<SocialNotificationCenterProps> = ({
  token,
  currentUserId,
  language = 'tl',
  onNavigateToPost,
  onNavigateToProfile,
  onNavigateToChallenge
}) => {
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/zone/notifications', {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      }
    } catch (err) {
      console.error('Failed to load social notifications', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(true);
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [token]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (notifId: string) => {
    try {
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
      await fetch(`/api/zone/notifications/${notifId}/read`, {
        method: 'POST',
        headers: { Authorization: token }
      });
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      await fetch('/api/zone/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: token }
      });
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClickNotification = (notif: SocialNotification) => {
    if (!notif.read) {
      handleMarkAsRead(notif.id);
    }
    setIsOpen(false);

    if (notif.targetType === 'post' && notif.targetId && onNavigateToPost) {
      onNavigateToPost(notif.targetId);
    } else if (notif.targetType === 'profile' && notif.targetId && onNavigateToProfile) {
      onNavigateToProfile(notif.targetId);
    } else if (notif.targetType === 'challenge' && notif.targetId && onNavigateToChallenge) {
      onNavigateToChallenge(notif.targetId);
    } else if (notif.senderUserId && onNavigateToProfile) {
      onNavigateToProfile(notif.senderUserId);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diff = Math.max(0, Date.now() - new Date(isoString).getTime());
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return language === 'tl' ? 'Ngayon lang' : 'Just now';
      if (mins < 60) return `${mins}m`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h`;
      const days = Math.floor(hrs / 24);
      return `${days}d`;
    } catch {
      return '';
    }
  };

  const renderIcon = (type: SocialNotification['type']) => {
    switch (type) {
      case 'like':
        return (
          <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
            <Heart className="w-3 h-3 fill-white" />
          </div>
        );
      case 'comment':
        return (
          <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-xs">
            <MessageSquare className="w-3 h-3 fill-white" />
          </div>
        );
      case 'reply':
        return (
          <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-xs">
            <CornerDownRight className="w-3 h-3" />
          </div>
        );
      case 'follow':
        return (
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
            <UserPlus className="w-3 h-3" />
          </div>
        );
      case 'mention':
        return (
          <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <AtSign className="w-3 h-3" />
          </div>
        );
      case 'challenge':
        return (
          <div className="w-5 h-5 rounded-full bg-yellow-500 text-slate-950 flex items-center justify-center shadow-xs">
            <Trophy className="w-3 h-3 fill-slate-950" />
          </div>
        );
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-slate-600 text-white flex items-center justify-center shadow-xs">
            <Info className="w-3 h-3" />
          </div>
        );
    }
  };

  const visibleNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        id="social-notification-bell-btn"
        onClick={() => {
          setIsOpen(prev => !prev);
          if (!isOpen) fetchNotifications(true);
        }}
        type="button"
        className={`relative p-2.5 rounded-2xl font-black text-xs cursor-pointer transition flex items-center justify-center border shadow-xs select-none ${
          isOpen
            ? 'bg-blue-600 text-white border-blue-500'
            : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-250'
        }`}
        title={language === 'tl' ? 'Mga Notification' : 'Notifications'}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[520px] animate-fadeIn">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-slate-900">
                {language === 'tl' ? 'Mga Notification' : 'Notifications'}
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-extrabold rounded-full">
                  {unreadCount} {language === 'tl' ? 'bago' : 'new'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50"
                  title="Basahin lahat"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{language === 'tl' ? 'Basahin Lahat' : 'Mark all read'}</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex px-3 pt-2 pb-1 gap-1 border-b border-slate-100 bg-white">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {language === 'tl' ? 'Lahat' : 'All'}
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{language === 'tl' ? 'Hindi pa nababasa' : 'Unread'}</span>
              {unreadCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  filter === 'unread' ? 'bg-white text-blue-600' : 'bg-red-500 text-white'
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {language === 'tl' ? 'Ikinakarga ang mga notification...' : 'Loading notifications...'}
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center">
                <Bell className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-500">
                  {filter === 'unread'
                    ? (language === 'tl' ? 'Walang bagong notification.' : 'No unread notifications.')
                    : (language === 'tl' ? 'Wala ka pang notification.' : 'No notifications yet.')}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {language === 'tl'
                    ? 'Makakatanggap ka ng balita kapag may nag-like, nag-komento, o nag-Zone sa iyo.'
                    : 'You will receive updates when someone likes, comments, or Zones you.'}
                </p>
              </div>
            ) : (
              visibleNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`p-3 sm:p-3.5 flex items-start gap-3 cursor-pointer transition hover:bg-slate-50 relative group ${
                    !n.read ? 'bg-blue-50/40' : 'bg-white'
                  }`}
                >
                  {/* Actor Avatar with Type Badge */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center font-bold text-slate-700 text-xs">
                      {n.senderUserAvatar && (n.senderUserAvatar.startsWith('http') || n.senderUserAvatar.startsWith('data:')) ? (
                        <img src={n.senderUserAvatar} alt={n.senderUserName || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        <span>{n.senderUserAvatar || '👤'}</span>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1">
                      {renderIcon(n.type)}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-xs text-slate-800 leading-snug">
                      {n.senderUserName && (
                        <span className="font-extrabold text-slate-900 mr-1">{n.senderUserName}</span>
                      )}
                      <span className="text-slate-700">{n.senderUserName ? n.message.replace(n.senderUserName, '').trim() : n.message}</span>
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>

                  {/* Unread dot indicator */}
                  {!n.read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
