import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

interface SocialNotificationCenterProps {
  token: string;
  currentUserId: string;
  language?: string;
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
  onNavigateToChallenge,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Check unread notifications from local storage / API safely
    setUnreadCount(0);
  }, [token, currentUserId]);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition cursor-pointer"
        title={language === 'tl' ? 'Mga Notipikasyon' : 'Notifications'}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl p-4 z-50 backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h4 className="text-sm font-bold text-white">
              {language === 'tl' ? 'Mga Notipikasyon' : 'Notifications'}
            </h4>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="py-6 text-center text-xs text-slate-400">
            {language === 'tl' ? 'Walang bagong notipikasyon sa ngayon.' : 'No new notifications right now.'}
          </div>
        </div>
      )}
    </div>
  );
};
