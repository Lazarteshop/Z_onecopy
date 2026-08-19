import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  BellRing, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  Wifi, 
  X, 
  Sparkles, 
  Send, 
  ShieldCheck, 
  DollarSign, 
  MessageSquare, 
  Users 
} from 'lucide-react';
import { 
  subscribeUserToPush, 
  sendTestPushNotification, 
  isPushNotificationSupported 
} from '../utils/pushManager';

interface BackgroundNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  language: 'tl' | 'en';
  triggerNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function BackgroundNotificationModal({
  isOpen,
  onClose,
  token,
  language,
  triggerNotification
}: BackgroundNotificationModalProps) {
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testSent, setTestSent] = useState(false);

  if (!isOpen) return null;

  const isSupported = isPushNotificationSupported();
  const currentPermission = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
  const isGranted = currentPermission === 'granted';

  const handleEnableNotifications = async () => {
    if (!token) {
      triggerNotification(
        language === 'tl' ? 'Mag-login muna upang i-activate ang notifications.' : 'Please login to activate notifications.',
        'error'
      );
      return;
    }

    setIsSubscribing(true);
    try {
      const res = await subscribeUserToPush(token);
      if (res.success) {
        triggerNotification(
          language === 'tl'
            ? '🎉 Matagumpay na na-activate ang Background Push Notifications!'
            : '🎉 Background Push Notifications successfully activated!',
          'success'
        );
      } else {
        triggerNotification(res.message, 'error');
      }
    } catch (err: any) {
      triggerNotification(err?.message || 'Error subscribing to notifications.', 'error');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleSendTest = async () => {
    if (!token) return;
    setIsTesting(true);
    try {
      // If not yet granted, prompt first
      if (!isGranted) {
        const subRes = await subscribeUserToPush(token);
        if (!subRes.success) {
          triggerNotification(subRes.message, 'error');
          setIsTesting(false);
          return;
        }
      }

      const res = await sendTestPushNotification(token);
      if (res.success) {
        setTestSent(true);
        triggerNotification(
          language === 'tl'
            ? '🔔 Naipadala ang Test Notification! Lumipat ng tab o i-minimize ang browser upang makita ang pop-up banner.'
            : '🔔 Test Notification sent! Switch tabs or minimize browser to see the pop-up banner.',
          'success'
        );
      } else {
        triggerNotification(res.message, 'error');
      }
    } catch (err: any) {
      triggerNotification(err?.message || 'Failed to send test alert.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-auto"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 sm:p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-inner">
                <BellRing className="w-7 h-7 text-yellow-300 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black tracking-tight">
                  {language === 'tl' ? 'Background Push Notifications' : 'Background Push Notifications'}
                </h3>
                <p className="text-xs sm:text-sm text-blue-100/90 font-medium">
                  {language === 'tl' 
                    ? 'Makatanggap ng alerts kahit naka-exit sa app bastat may mobile data' 
                    : 'Get system alerts even when app is closed with mobile data'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Status Card */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
              isGranted 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                : currentPermission === 'denied'
                ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            }`}>
              {isGranted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold text-sm flex items-center gap-2">
                  <span>
                    {isGranted 
                      ? (language === 'tl' ? '🟢 AKTIBO: Background Alerts Naka-Enable' : '🟢 ACTIVE: Background Alerts Enabled')
                      : currentPermission === 'denied'
                      ? (language === 'tl' ? '🔴 NAKA-BLOCK SA BROWSER' : '🔴 BLOCKED IN BROWSER')
                      : (language === 'tl' ? '🟡 HINDI PA NAKA-ENABLE' : '🟡 NOT YET ENABLED')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isGranted
                    ? (language === 'tl'
                        ? 'Kahit i-exit mo ang browser o patayin ang screen ng iyong phone, makakatanggap ka pa rin ng pop-up notification at tunog bastat may Mobile Data o Wi-Fi connection ka!'
                        : 'Even if you close the browser or lock your phone screen, you will still receive pop-up notifications with sound as long as you have mobile data or Wi-Fi!')
                    : currentPermission === 'denied'
                    ? (language === 'tl'
                        ? 'Naka-block ang notifications sa settings ng iyong browser. Paki-pindot ang lock icon 🔒 sa address bar ng Chrome/browser at i-set ang Notifications sa "Allow".'
                        : 'Notifications are blocked in your browser settings. Tap the lock icon 🔒 in the URL address bar and set Notifications to "Allow".')
                    : (language === 'tl'
                        ? 'Pindutin ang "Paganahin ang Notifications" sa ibaba upang i-activate ang real-time alerts sa iyong cellphone o kompyuter.'
                        : 'Tap "Enable Notifications" below to activate real-time alerts on your mobile device or computer.')}
                </p>
              </div>
            </div>

            {/* Notification Highlights List */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {language === 'tl' ? 'Mga Matatanggap Mong Background Alerts:' : 'Background Alerts You Will Receive:'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-800/60 border border-slate-800 rounded-xl flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">{language === 'tl' ? 'GCash Payout Approved' : 'GCash Cashouts'}</div>
                    <div className="text-[10px] text-slate-400">{language === 'tl' ? 'Alerto kapag naipadala na ang pera' : 'Alert when money is sent'}</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/60 border border-slate-800 rounded-xl flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">{language === 'tl' ? 'Direct Messages (DM)' : 'Direct Messages'}</div>
                    <div className="text-[10px] text-slate-400">{language === 'tl' ? 'Bagong mensahe mula sa kaibigan' : 'New messages from friends'}</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/60 border border-slate-800 rounded-xl flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">{language === 'tl' ? 'Group Chat (GC) Updates' : 'Group Chat Alerts'}</div>
                    <div className="text-[10px] text-slate-400">{language === 'tl' ? 'Mensahe at announcements sa GC' : 'GC messages and mentions'}</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/60 border border-slate-800 rounded-xl flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">{language === 'tl' ? 'Likes, Comments & Kita' : 'Reactions & Rewards'}</div>
                    <div className="text-[10px] text-slate-400">{language === 'tl' ? 'Post reactions at referral rewards' : 'Post interactions & bonuses'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* How it works info */}
            <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 shrink-0 text-blue-400 font-bold">
                <Smartphone className="w-4 h-4" />
                <Wifi className="w-4 h-4" />
              </div>
              <p className="text-[11px] leading-tight">
                {language === 'tl'
                  ? 'Gamit ang standard Service Worker Web Push, hindi nauubos ang baterya at gumagana ito sa Android Chrome, Windows, Mac, at PWA install.'
                  : 'Powered by native Service Worker Web Push for battery-efficient background delivery on Android Chrome, Windows, & PWA.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {!isGranted ? (
                <button
                  onClick={handleEnableNotifications}
                  disabled={isSubscribing}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <Bell className="w-4 h-4 animate-bounce" />
                  <span>
                    {isSubscribing 
                      ? (language === 'tl' ? 'Ina-activate...' : 'Activating...') 
                      : (language === 'tl' ? 'PAGANAHIN ANG NOTIFICATIONS' : 'ENABLE BACKGROUND NOTIFICATIONS')}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleSendTest}
                  disabled={isTesting}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isTesting 
                      ? (language === 'tl' ? 'Ipinapadala ang test alert...' : 'Sending test alert...') 
                      : (language === 'tl' ? '🧪 Subukan ang Notification (Test Alert)' : '🧪 Send Test Push Notification')}
                  </span>
                </button>
              )}

              {testSent && (
                <p className="text-center text-[11px] text-emerald-400 font-semibold animate-pulse">
                  {language === 'tl'
                    ? '✅ Naipadala na! I-check ang notification shade o taskbar ng iyong device.'
                    : '✅ Sent! Check your device notification tray or taskbar.'}
                </p>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {language === 'tl' ? 'Isara (Close)' : 'Close'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
