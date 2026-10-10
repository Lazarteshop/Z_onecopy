import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Users,
  Search,
  Send,
  Image as ImageIcon,
  Phone,
  Video,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff,
  ArrowLeft,
  Plus,
  X,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Pencil,
  Trash2,
  Info,
  UserPlus,
  LogOut,
  Download,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Sparkles,
  Globe,
  Lock,
  Mail,
  User as UserIcon,
  Smartphone
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DirectMessage, GroupChat, GroupMessage } from '../types';
import { chatSocket, ConnectionStatus } from '../utils/chatSocketClient';
import { idbStorage } from '../utils/idbStorage';
import { dataSaver } from '../utils/dataSaver';
import { getDeviceSecurityHeaders } from '../utils/deviceSecurity';

interface ZoneMessengerAppProps {
  token: string | null;
  user: any | null;
  setToken: (token: string | null) => void;
  setUser: React.Dispatch<React.SetStateAction<any | null>>;
  language: 'tl' | 'en';
  setLanguage: (lang: 'tl' | 'en') => void;
  onLogout: () => void;
  onRefreshProfile: () => void;
  onNavigateHome: () => void;
  onOpenDeviceTransfer: () => void;
  triggerNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

async function compressMessengerImage(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export default function ZoneMessengerApp({
  token,
  user,
  setToken,
  setUser,
  language,
  setLanguage,
  onLogout,
  onRefreshProfile,
  onNavigateHome,
  onOpenDeviceTransfer,
  triggerNotification
}: ZoneMessengerAppProps) {
  // --- AUTH FORM STATE (when unauthenticated at /messenger) ---
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [deviceBoundError, setDeviceBoundError] = useState(false);

  // --- PWA INSTALL STATE ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => (window as any).deferredMessengerPrompt || (window as any).deferredPrompt || null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  });
  const [showInstallGuideModal, setShowInstallGuideModal] = useState(false);

  // --- MESSENGER NAVIGATION & INBOX STATE ---
  const [activeTab, setActiveTab] = useState<'chats' | 'groups' | 'people'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('tab');
      if (t === 'groups' || t === 'people' || t === 'chats') return t;
    }
    return 'chats';
  });
  const [inboxSearch, setInboxSearch] = useState('');
  const [threadSearch, setThreadSearch] = useState('');
  const [showThreadSearch, setShowThreadSearch] = useState(false);

  // --- DIRECT MESSAGES & GROUP CHATS STATE ---
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [allUsersList, setAllUsersList] = useState<Array<{ id: string; name: string; avatar: string }>>([]);
  const [loadingUsersList, setLoadingUsersList] = useState(false);

  const [activeDmUser, setActiveDmUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const [activeGroupChat, setActiveGroupChat] = useState<GroupChat | null>(null);
  const activeDmUserRef = useRef<{ id: string; name: string; avatar: string } | null>(null);
  useEffect(() => {
    activeDmUserRef.current = activeDmUser;
  }, [activeDmUser]);

  const [visibleDmCount, setVisibleDmCount] = useState(40);
  const [chatConnectionStatus, setChatConnectionStatus] = useState<ConnectionStatus>('offline');
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, { isTyping: boolean; name: string }>>({});

  // --- MESSAGE COMPOSER & EDIT STATE ---
  const [newDmText, setNewDmText] = useState('');
  const [dmMediaPreview, setDmMediaPreview] = useState<string | null>(null);
  const [dmMediaType, setDmMediaType] = useState<'image' | 'video'>('image');
  const dmFileInputRef = useRef<HTMLInputElement>(null);

  const [newGroupMessageText, setNewGroupMessageText] = useState('');
  const [gcMediaPreview, setGcMediaPreview] = useState<string | null>(null);
  const [gcMediaType, setGcMediaType] = useState<'image' | 'video'>('image');
  const gcFileInputRef = useRef<HTMLInputElement>(null);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [editingGroupMessageId, setEditingGroupMessageId] = useState<string | null>(null);
  const [editingGroupMessageText, setEditingGroupMessageText] = useState('');

  // --- GROUP MANAGEMENT MODALS ---
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupAvatar, setNewGroupAvatar] = useState('👥');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [addMemberSelectedIds, setAddMemberSelectedIds] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [confirmLeaveGroup, setConfirmLeaveGroup] = useState(false);
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<{ id: string; isGroup: boolean } | null>(null);

  // --- MEDIA LIGHTBOX ---
  const [lightboxMediaUrl, setLightboxMediaUrl] = useState<string | null>(null);
  const [lightboxMediaType, setLightboxMediaType] = useState<'image' | 'video'>('image');

  // --- VOICE & VIDEO CALLING STATE ---
  const [activeCallSession, setActiveCallSession] = useState<any | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [isLoopbackOn, setIsLoopbackOn] = useState(false);
  const [hasSpeechTriggered, setHasSpeechTriggered] = useState(false);

  // --- READ/UNREAD TRACKING ---
  const [readMessageIds, setReadMessageIds] = useState<string[]>(() => {
    if (!user?.id) return [];
    try {
      const saved = localStorage.getItem(`zone_read_msgs_${user.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const notifiedMsgIdsRef = useRef<Set<string>>(new Set());
  const lastSyncTimeRef = useRef<string>('');

  useEffect(() => {
    if (!user?.id) return;
    try {
      const saved = localStorage.getItem(`zone_read_msgs_${user.id}`);
      if (saved) setReadMessageIds(JSON.parse(saved));
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(`zone_read_msgs_${user.id}`, JSON.stringify(readMessageIds));
    } catch {}
  }, [readMessageIds, user?.id]);

  // --- PWA MANIFEST & INSTALL PROMPT HOOK ---
  useEffect(() => {
    // Ensure document head uses Z-oneMessenger manifest and title while on /messenger
    const prevTitle = document.title;
    document.title = 'Z-oneMessenger — Chat, Groups & Calls';

    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    const prevManifest = manifestLink?.getAttribute('href') || '/manifest.json';
    if (manifestLink) {
      manifestLink.setAttribute('href', '/manifest-messenger.json');
    }

    const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
    const prevAppleTitle = appleTitleMeta?.getAttribute('content') || 'Z-oneApp';
    if (appleTitleMeta) {
      appleTitleMeta.setAttribute('content', 'Z-oneMessenger');
    }

    // Hide the global legacy #installBtn banner on /messenger so Z-oneMessenger uses its own clean install UI
    const legacyInstallBtn = document.getElementById('installBtn');
    if (legacyInstallBtn) {
      legacyInstallBtn.style.display = 'none';
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredMessengerPrompt = e;
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setShowInstallGuideModal(false);
      triggerNotification(
        language === 'tl'
          ? '🎉 Na-install na ang Z-oneMessenger sa iyong device!'
          : '🎉 Z-oneMessenger is now installed on your device!',
        'success'
      );
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.title = prevTitle;
      if (manifestLink) manifestLink.setAttribute('href', prevManifest);
      if (appleTitleMeta) appleTitleMeta.setAttribute('content', prevAppleTitle);
    };
  }, [language]);

  const handleInstallMessengerClick = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredMessengerPrompt || (window as any).deferredPrompt;
    if (promptEvent && typeof promptEvent.prompt === 'function') {
      try {
        promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setDeferredPrompt(null);
          (window as any).deferredMessengerPrompt = null;
        }
        return;
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }
    setShowInstallGuideModal(true);
  };

  // --- AUDIO CHIMES ---
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
      playTone(659.25, now, 0.15);
      playTone(880.0, now + 0.12, 0.25);
    } catch {}
  };

  const playCallTone = (isIncoming: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      if (isIncoming) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.35);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(425, audioCtx.currentTime);
      }
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.start();
      setTimeout(() => {
        try {
          osc.stop();
          audioCtx.close();
        } catch {}
      }, 400);
    } catch {}
  };

  // --- FETCH DIRECTORY USERS ---
  const fetchAllUsersList = async () => {
    if (!token) return;
    setLoadingUsersList(true);
    try {
      const res = await fetch('/api/zone/users', {
        headers: { Authorization: token }
      });
      if (res.ok) {
        const data = await res.json();
        setAllUsersList(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch users list:', err);
    } finally {
      setLoadingUsersList(false);
    }
  };

  useEffect(() => {
    if (token && user?.id) {
      fetchAllUsersList();
    }
  }, [token, user?.id]);

  // --- INITIAL CACHE LOAD FROM INDEXEDDB ---
  useEffect(() => {
    if (!user?.id) return;
    idbStorage.get<DirectMessage[]>(`zone_dms_${user.id}`).then((cached) => {
      if (cached && cached.length > 0) setDmMessages(cached);
    });
    idbStorage.get<GroupMessage[]>(`zone_group_msgs_${user.id}`).then((cached) => {
      if (cached && cached.length > 0) setGroupMessages(cached);
    });
  }, [user?.id]);

  // --- REAL-TIME WEBSOCKET CONNECTION ---
  useEffect(() => {
    if (!token || !user?.id) return;

    chatSocket.init(token, user.id);
    const unsubStatus = chatSocket.onStatusChange((newStatus) => {
      setChatConnectionStatus(newStatus);
    });

    const unsubMsg = chatSocket.onMessage((incomingMsg) => {
      setDmMessages((prev) => {
        const exists = prev.some(
          (m) =>
            m.id === incomingMsg.id ||
            (incomingMsg.clientMessageId && m.clientMessageId === incomingMsg.clientMessageId)
        );
        const updated = exists
          ? prev.map((m) =>
              m.id === incomingMsg.id ||
              (incomingMsg.clientMessageId && m.clientMessageId === incomingMsg.clientMessageId)
                ? incomingMsg
                : m
            )
          : [...prev, incomingMsg];
        idbStorage.set(`zone_dms_${user.id}`, updated);
        return updated;
      });

      if (
        activeDmUserRef.current &&
        (activeDmUserRef.current.id === incomingMsg.senderId ||
          activeDmUserRef.current.id === incomingMsg.receiverId)
      ) {
        setTimeout(() => {
          const el = document.getElementById('messenger-dm-scroll');
          if (el) el.scrollTop = el.scrollHeight;
        }, 30);

        if (incomingMsg.senderId === activeDmUserRef.current.id) {
          chatSocket.markAsRead(incomingMsg.senderId, [incomingMsg.id]);
        }
      }
    });

    const unsubAck = chatSocket.onAck(({ clientMessageId, serverMessageId, status, message }) => {
      setDmMessages((prev) => {
        const updated = prev.map((m) => {
          if (
            m.clientMessageId === clientMessageId ||
            m.id === clientMessageId ||
            m.id === serverMessageId
          ) {
            return {
              ...message,
              id: serverMessageId,
              clientMessageId,
              status: status || 'sent'
            };
          }
          return m;
        });
        idbStorage.set(`zone_dms_${user.id}`, updated);
        return updated;
      });
    });

    const unsubDelivered = chatSocket.onDelivered(({ clientMessageId, messageId, deliveredAt }) => {
      setDmMessages((prev) => {
        const updated: DirectMessage[] = prev.map((m) => {
          if (m.id === messageId || (clientMessageId && m.clientMessageId === clientMessageId)) {
            const nextStatus: DirectMessage['status'] = m.status === 'read' ? 'read' : 'delivered';
            return {
              ...m,
              status: nextStatus,
              deliveredAt
            };
          }
          return m;
        });
        idbStorage.set(`zone_dms_${user.id}`, updated);
        return updated;
      });
    });

    const unsubRead = chatSocket.onRead(({ readerId, messageIds, readAt }) => {
      setDmMessages((prev) => {
        const updated: DirectMessage[] = prev.map((m) => {
          if (
            m.receiverId === readerId &&
            (messageIds.length === 0 || messageIds.includes(m.id))
          ) {
            return {
              ...m,
              status: 'read' as const,
              readAt
            };
          }
          return m;
        });
        idbStorage.set(`zone_dms_${user.id}`, updated);
        return updated;
      });
    });

    const unsubTyping = chatSocket.onTyping(({ senderId, senderName, isTyping }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [senderId]: { isTyping, name: senderName }
      }));
    });

    const unsubPresence = chatSocket.onPresence(({ userId, isOnline }) => {
      setOnlineUserIds((prev) => {
        if (isOnline) {
          return prev.includes(userId) ? prev : [...prev, userId];
        }
        return prev.filter((id) => id !== userId);
      });
    });

    return () => {
      unsubStatus();
      unsubMsg();
      unsubAck();
      unsubDelivered();
      unsubRead();
      unsubTyping();
      unsubPresence();
    };
  }, [token, user?.id]);

  // --- DELTA SYNC POLLING FOR DMs, GROUPS & CALLS ---
  useEffect(() => {
    if (!token || !user?.id) return;
    let active = true;

    const pollSync = async () => {
      if (document.hidden && !activeCallSession) return;
      try {
        const syncUrl = lastSyncTimeRef.current
          ? `/api/zone/sync?since=${encodeURIComponent(lastSyncTimeRef.current)}`
          : '/api/zone/sync';
        const res = await fetch(syncUrl, {
          headers: { Authorization: token }
        });
        if (!res.ok || !active) return;
        const syncData = await res.json();

        if (syncData.serverTime) {
          lastSyncTimeRef.current = syncData.serverTime;
        }

        if (syncData.isDelta) {
          if (Array.isArray(syncData.messages) && syncData.messages.length > 0) {
            setDmMessages((prev) => {
              const map = new Map(prev.map((m) => [m.id, m]));
              syncData.messages.forEach((m: DirectMessage) => map.set(m.id, m));
              const merged = Array.from(map.values());
              idbStorage.set(`zone_dms_${user.id}`, merged);
              return merged;
            });
          }
          if (Array.isArray(syncData.groupMessages) && syncData.groupMessages.length > 0) {
            setGroupMessages((prev) => {
              const map = new Map(prev.map((m) => [m.id, m]));
              syncData.groupMessages.forEach((m: GroupMessage) => map.set(m.id, m));
              const merged = Array.from(map.values());
              idbStorage.set(`zone_group_msgs_${user.id}`, merged);
              return merged;
            });
          }
        } else {
          const msgs = syncData.messages || [];
          const gmsgs = syncData.groupMessages || [];
          setDmMessages(msgs);
          setGroupMessages(gmsgs);
          idbStorage.set(`zone_dms_${user.id}`, msgs);
          idbStorage.set(`zone_group_msgs_${user.id}`, gmsgs);
        }

        setGroupChats(syncData.groups || []);
        setOnlineUserIds(syncData.onlineUserIds || []);

        if (activeGroupChat && Array.isArray(syncData.groups)) {
          const updatedGroup = syncData.groups.find((g: GroupChat) => g.id === activeGroupChat.id);
          if (updatedGroup) setActiveGroupChat(updatedGroup);
        }

        const activeCalls = syncData.calls || [];
        if (activeCalls.length > 0) {
          const currentCall = activeCalls[0];
          if (!activeCallSession || activeCallSession.id !== currentCall.id) {
            setActiveCallSession(currentCall);
            if (currentCall.callerId !== user.id) {
              playCallTone(true);
              triggerNotification(
                language === 'tl'
                  ? `🔔 Papasok na ${currentCall.type === 'video' ? 'Video' : 'Voice'} Call mula kay ${currentCall.callerName}!`
                  : `🔔 Incoming ${currentCall.type === 'video' ? 'Video' : 'Voice'} Call from ${currentCall.callerName}!`,
                'info'
              );
            } else {
              playCallTone(false);
            }
          } else {
            setActiveCallSession(currentCall);
            if (currentCall.status === 'ringing') {
              playCallTone(currentCall.callerId !== user.id);
            }
          }
        } else if (activeCallSession && activeCallSession.status !== 'ended') {
          setActiveCallSession(null);
          if (localStream) {
            localStream.getTracks().forEach((t) => t.stop());
            setLocalStream(null);
          }
          if (remoteStream) {
            remoteStream.getTracks().forEach((t) => t.stop());
            setRemoteStream(null);
          }
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
          }
          setIsLoopbackOn(false);
          setHasSpeechTriggered(false);
        }
      } catch (err) {
        console.error('Messenger sync error:', err);
      }
    };

    pollSync();
    const intervalMs = activeCallSession ? 1500 : dataSaver.getPollingInterval(5000);
    const id = setInterval(() => {
      if (!document.hidden || activeCallSession) {
        pollSync();
      }
    }, intervalMs);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [token, user?.id, activeCallSession, activeGroupChat?.id]);

  // --- INCOMING MESSAGE SOUND & READ MARKING ---
  useEffect(() => {
    if (!user?.id || dmMessages.length === 0) return;
    const myReceived = dmMessages.filter((m) => m.receiverId === user.id);

    if (notifiedMsgIdsRef.current.size === 0) {
      myReceived.forEach((m) => notifiedMsgIdsRef.current.add(m.id));
      return;
    }

    const newMessages = myReceived.filter((m) => !notifiedMsgIdsRef.current.has(m.id));
    if (newMessages.length > 0) {
      let shouldChime = false;
      newMessages.forEach((msg) => {
        notifiedMsgIdsRef.current.add(msg.id);
        if (activeDmUser && activeDmUser.id === msg.senderId) {
          setReadMessageIds((prev) => (prev.includes(msg.id) ? prev : [...prev, msg.id]));
        } else {
          shouldChime = true;
        }
      });
      if (shouldChime) playMessageSound();
    }
  }, [dmMessages, activeDmUser?.id, user?.id]);

  useEffect(() => {
    if (!activeDmUser || !user?.id || dmMessages.length === 0) return;
    const unreadFromPartner = dmMessages.filter(
      (m) =>
        m.senderId === activeDmUser.id &&
        m.receiverId === user.id &&
        (!readMessageIds.includes(m.id) || !m.readAt)
    );
    if (unreadFromPartner.length > 0) {
      const ids = unreadFromPartner.map((m) => m.id);
      setReadMessageIds((prev) => Array.from(new Set([...prev, ...ids])));
      chatSocket.markAsRead(activeDmUser.id, ids);
    }
  }, [activeDmUser?.id, dmMessages, user?.id]);

  // Auto-scroll when switching conversation
  useEffect(() => {
    if (activeDmUser) {
      setVisibleDmCount(40);
      setShowThreadSearch(false);
      setThreadSearch('');
      setTimeout(() => {
        const el = document.getElementById('messenger-dm-scroll');
        if (el) el.scrollTop = el.scrollHeight;
      }, 40);
    }
  }, [activeDmUser?.id]);

  useEffect(() => {
    if (activeGroupChat) {
      setShowThreadSearch(false);
      setThreadSearch('');
      setTimeout(() => {
        const el = document.getElementById('messenger-gc-scroll');
        if (el) el.scrollTop = el.scrollHeight;
      }, 40);
    }
  }, [activeGroupChat?.id]);

  // --- WEBRTC CALLING HOOKS ---
  useEffect(() => {
    if (activeCallSession && activeCallSession.status === 'accepted') {
      const needsVideo = activeCallSession.type === 'video' && !isVideoOff;
      if (!localStream) {
        navigator.mediaDevices
          .getUserMedia({ video: needsVideo, audio: true })
          .then((stream) => setLocalStream(stream))
          .catch(() => {
            if (needsVideo) {
              navigator.mediaDevices
                .getUserMedia({ video: false, audio: true })
                .then((audioStream) => {
                  setLocalStream(audioStream);
                  triggerNotification(
                    language === 'tl'
                      ? 'Hindi mapagana ang camera. Audio lamang ang gagamitin.'
                      : 'Camera unavailable. Using audio-only mode.',
                    'info'
                  );
                })
                .catch(() => {});
            }
          });
      }
    }
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
        setLocalStream(null);
      }
    };
  }, [activeCallSession?.status, activeCallSession?.type, isVideoOff]);

  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => {
        t.enabled = !isVideoOff;
      });
    }
  }, [isVideoOff, localStream]);

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

  useEffect(() => {
    if (remoteAudioRef.current) {
      if (isLoopbackOn && localStream) {
        remoteAudioRef.current.srcObject = localStream;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 0.5;
      } else if (remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1.0;
      } else {
        remoteAudioRef.current.srcObject = null;
      }
    }
  }, [isLoopbackOn, localStream, remoteStream]);

  useEffect(() => {
    if (!activeCallSession || activeCallSession.status !== 'accepted' || !localStream || !user?.id || !token) {
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
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      });
      peerConnectionRef.current = pc;

      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
      pc.ontrack = (event) => {
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
            headers: { 'Content-Type': 'application/json', Authorization: token },
            body: JSON.stringify({ callId, [field]: JSON.stringify(localIceCandidates) })
          }).catch(() => {});
        }
      };

      if (isCaller) {
        pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: activeCallSession.type === 'video' })
          .then((offer) => pc.setLocalDescription(offer))
          .then(() =>
            fetch('/api/zone/calls', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: token },
              body: JSON.stringify({ callId, callerSignal: JSON.stringify(pc.localDescription) })
            })
          )
          .catch(() => {});
      } else if (activeCallSession.callerSignal) {
        const offer = JSON.parse(activeCallSession.callerSignal);
        pc.setRemoteDescription(new RTCSessionDescription(offer))
          .then(() => pc.createAnswer())
          .then((answer) => pc.setLocalDescription(answer))
          .then(() =>
            fetch('/api/zone/calls', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: token },
              body: JSON.stringify({ callId, receiverSignal: JSON.stringify(pc.localDescription) })
            })
          )
          .catch(() => {});
      }
    } else {
      const pc = peerConnectionRef.current;
      if (isCaller && activeCallSession.receiverSignal && pc.signalingState === 'have-local-offer') {
        try {
          const answer = JSON.parse(activeCallSession.receiverSignal);
          pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(() => {});
        } catch {}
      }
      const remoteCandStr = isCaller
        ? activeCallSession.receiverCandidates
        : activeCallSession.callerCandidates;
      if (remoteCandStr) {
        try {
          const candidates = JSON.parse(remoteCandStr);
          candidates.forEach((cand: any) => {
            pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          });
        } catch {}
      }
    }
  }, [
    activeCallSession?.status,
    activeCallSession?.callerSignal,
    activeCallSession?.receiverSignal,
    activeCallSession?.callerCandidates,
    activeCallSession?.receiverCandidates,
    localStream,
    token,
    user?.id
  ]);

  // --- CONVERSATIONS COMPUTATION ---
  const conversations = useMemo(() => {
    if (!user?.id) return [];
    const map = new Map<
      string,
      {
        userId: string;
        userName: string;
        userAvatar: string;
        lastMessage: string;
        lastMessageTime: string;
        lastMessageSenderId: string;
        lastMessageStatus?: DirectMessage['status'];
        unreadCount: number;
      }
    >();

    const sorted = [...dmMessages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sorted.forEach((m) => {
      const isSender = m.senderId === user.id;
      const peerId = isSender ? m.receiverId : m.senderId;
      const peerName = isSender ? m.receiverName : m.senderName;
      const peerAvatar = isSender ? m.receiverAvatar : m.senderAvatar;
      const isUnread = !isSender && !readMessageIds.includes(m.id) && !m.readAt;

      const existing = map.get(peerId);
      const unreadCount = (existing?.unreadCount || 0) + (isUnread ? 1 : 0);

      map.set(peerId, {
        userId: peerId,
        userName: peerName || 'Z-one Member',
        userAvatar: peerAvatar || '👤',
        lastMessage: m.text || (m.mediaType === 'video' ? '📹 Video attachment' : '📷 Photo attachment'),
        lastMessageTime: m.createdAt,
        lastMessageSenderId: m.senderId,
        lastMessageStatus: m.status,
        unreadCount
      });
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }, [dmMessages, readMessageIds, user?.id]);

  const totalUnreadCount = useMemo(() => {
    if (!user?.id) return 0;
    return dmMessages.filter(
      (m) => m.receiverId === user.id && !readMessageIds.includes(m.id) && !m.readAt
    ).length;
  }, [dmMessages, readMessageIds, user?.id]);

  const formatInboxTime = (isoString?: string) => {
    if (!isoString) return '';
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
    } catch {
      return '';
    }
  };

  const renderAvatar = (
    avatarStr: string | undefined,
    nameStr: string | undefined,
    sizeClass = 'w-10 h-10',
    textClass = 'text-base'
  ) => {
    const cleanAvatar = avatarStr?.trim() || '👤';
    const isImage =
      cleanAvatar.startsWith('http://') ||
      cleanAvatar.startsWith('https://') ||
      cleanAvatar.startsWith('data:image') ||
      cleanAvatar.startsWith('/uploads/');

    if (isImage) {
      return (
        <img
          src={dataSaver.getOptimizedImageUrl(cleanAvatar, { width: 120, quality: 70 })}
          alt={nameStr || 'User'}
          className={`${sizeClass} rounded-full object-cover border border-slate-200/80 shrink-0 bg-slate-100`}
        />
      );
    }

    return (
      <div
        className={`${sizeClass} rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center font-bold ${textClass} shrink-0 select-none shadow-2xs`}
      >
        {cleanAvatar}
      </div>
    );
  };

  // --- AUTH SUBMIT HANDLER (Reuses existing /api/auth/login & /api/auth/register) ---
  const handleMessengerAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setDeviceBoundError(false);
    setAuthLoading(true);

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload =
      authMode === 'login'
        ? { email: emailInput.trim(), password: passwordInput, isDemo: false }
        : {
            name: nameInput.trim(),
            email: emailInput.trim(),
            password: passwordInput,
            referralCode: '',
            isDemo: false
          };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-mode': 'false',
          ...getDeviceSecurityHeaders()
        },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok && result.token) {
        localStorage.setItem('gcash_click_earn_token', result.token);
        setToken(result.token);
        if (result.user) {
          setUser(result.user);
        }
        onRefreshProfile();
        triggerNotification(
          authMode === 'login'
            ? language === 'tl'
              ? '🔑 Maligayang pagbabalik sa Z-oneMessenger!'
              : '🔑 Welcome back to Z-oneMessenger!'
            : language === 'tl'
              ? '🎉 Matagumpay na nagawa ang iyong Z-one account!'
              : '🎉 Your Z-one account is ready!',
          'success'
        );
      } else {
        if (result.deviceBindingBlocked) {
          setDeviceBoundError(true);
        }
        setAuthError(result.error || 'Authentication failed.');
      }
    } catch {
      setAuthError(
        language === 'tl'
          ? 'Hindi makakonekta sa server. Pakisuri ang iyong internet.'
          : 'Could not connect to server. Please check your connection.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  // --- DIRECT MESSAGE ACTIONS ---
  const handleSelectDmUser = (target: { id: string; name: string; avatar: string }) => {
    if (user && target.id === user.id) return;
    setActiveGroupChat(null);
    setActiveDmUser(target);
  };

  const handleSelectGroupChat = (group: GroupChat) => {
    setActiveDmUser(null);
    setActiveGroupChat(group);
  };

  const handleDmFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|webm|3gp|m4v)$/i)) {
      setDmMediaType('video');
      const reader = new FileReader();
      reader.onload = () => setDmMediaPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setDmMediaType('image');
      try {
        const compressed = await compressMessengerImage(file, 1000, 1000, 0.72);
        setDmMediaPreview(compressed);
      } catch {
        const reader = new FileReader();
        reader.onload = () => setDmMediaPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSendDm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeDmUser || !user || !token || (!newDmText.trim() && !dmMediaPreview)) return;

    const tempId = 'temp-msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    const originalText = newDmText;
    const mediaToSend = dmMediaPreview;
    const mediaTypeToSend = dmMediaType;

    const optimisticMsg: DirectMessage = {
      id: tempId,
      clientMessageId: tempId,
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar || '👤',
      receiverId: activeDmUser.id,
      receiverName: activeDmUser.name,
      receiverAvatar: activeDmUser.avatar || '👤',
      text: originalText,
      mediaUrl: mediaToSend || undefined,
      mediaType: mediaToSend ? mediaTypeToSend : undefined,
      createdAt: new Date().toISOString(),
      status: 'sending'
    };

    setDmMessages((prev) => [...prev, optimisticMsg]);
    setNewDmText('');
    setDmMediaPreview(null);
    if (dmFileInputRef.current) dmFileInputRef.current.value = '';
    chatSocket.stopTyping(activeDmUser.id);

    setTimeout(() => {
      const el = document.getElementById('messenger-dm-scroll');
      if (el) el.scrollTop = el.scrollHeight;
    }, 25);

    let outboxId = '';
    try {
      outboxId = await idbStorage.addToOutbox({
        type: 'message',
        url: '/api/zone/messages',
        method: 'POST',
        payload: {
          clientMessageId: tempId,
          tempId,
          receiverId: activeDmUser.id,
          text: originalText,
          mediaUrl: mediaToSend || undefined,
          mediaType: mediaToSend ? mediaTypeToSend : undefined
        }
      });
    } catch {}

    try {
      let finalMediaUrl = mediaToSend;
      if (mediaToSend && mediaToSend.startsWith('data:')) {
        const uploadRes = await fetch('/api/zone/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token
          },
          body: JSON.stringify({ dataUrl: mediaToSend })
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json().catch(() => null);
          if (uploadData?.url) finalMediaUrl = uploadData.url;
        }
      }

      const canSendViaSocket = !finalMediaUrl || !finalMediaUrl.startsWith('data:');
      if (canSendViaSocket && chatSocket.getStatus() === 'live') {
        const sent = chatSocket.sendMessage({
          clientMessageId: tempId,
          receiverId: activeDmUser.id,
          text: originalText,
          mediaUrl: finalMediaUrl || undefined,
          mediaType: finalMediaUrl ? mediaTypeToSend : undefined
        });
        if (sent) {
          if (outboxId) {
            setTimeout(() => {
              idbStorage.removeOutboxItem(outboxId).catch(() => {});
            }, 1500);
          }
          return;
        }
      }

      const res = await fetch('/api/zone/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: JSON.stringify({
          clientMessageId: tempId,
          tempId,
          receiverId: activeDmUser.id,
          text: originalText,
          mediaUrl: finalMediaUrl || undefined,
          mediaType: finalMediaUrl ? mediaTypeToSend : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDmMessages((prev) =>
          prev.map((m) =>
            m.id === tempId || m.clientMessageId === tempId
              ? { ...data.message, status: 'sent' }
              : m
          )
        );
        if (outboxId) await idbStorage.removeOutboxItem(outboxId);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 400 || res.status === 403) {
          setDmMessages((prev) =>
            prev.filter((m) => m.id !== tempId && m.clientMessageId !== tempId)
          );
          setNewDmText(originalText);
          setDmMediaPreview(mediaToSend);
          if (outboxId) await idbStorage.removeOutboxItem(outboxId);
          triggerNotification(errData.error || 'Failed to send message', 'error');
        } else {
          setDmMessages((prev) =>
            prev.map((m) =>
              m.id === tempId || m.clientMessageId === tempId ? { ...m, status: 'failed' } : m
            )
          );
        }
      }
    } catch {
      setDmMessages((prev) =>
        prev.map((m) =>
          m.id === tempId || m.clientMessageId === tempId ? { ...m, status: 'failed' } : m
        )
      );
    }
  };

  const handleRetryDmMessage = async (msg: DirectMessage) => {
    if (!token) return;
    setDmMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: 'sending' } : m)));
    const sent = chatSocket.sendMessage({
      clientMessageId: msg.clientMessageId || msg.id,
      receiverId: msg.receiverId,
      text: msg.text,
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType
    });
    if (sent) return;

    try {
      const res = await fetch('/api/zone/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: JSON.stringify({
          clientMessageId: msg.clientMessageId || msg.id,
          tempId: msg.id,
          receiverId: msg.receiverId,
          text: msg.text,
          mediaUrl: msg.mediaUrl,
          mediaType: msg.mediaType
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDmMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id || m.clientMessageId === msg.clientMessageId
              ? { ...data.message, status: 'sent' }
              : m
          )
        );
      } else {
        setDmMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: 'failed' } : m)));
      }
    } catch {
      setDmMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: 'failed' } : m)));
    }
  };

  const handleSaveMessageEdit = async (messageId: string) => {
    if (!token || !editingMessageText.trim()) return;
    try {
      const res = await fetch(`/api/zone/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: JSON.stringify({ text: editingMessageText })
      });
      const data = await res.json();
      if (res.ok) {
        setDmMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, text: data.message.text } : m))
        );
        setEditingMessageId(null);
        setEditingMessageText('');
      } else {
        triggerNotification(data.error || 'Could not edit message.', 'error');
      }
    } catch {
      triggerNotification('Connection error editing message.', 'error');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/zone/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: token }
      });
      const data = await res.json();
      if (res.ok) {
        setDmMessages((prev) => prev.filter((m) => m.id !== messageId));
      } else {
        triggerNotification(data.error || 'Could not unsend message.', 'error');
      }
    } catch {
      triggerNotification('Connection error deleting message.', 'error');
    }
  };

  // --- GROUP CHAT ACTIONS ---
  const handleGcFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|webm|3gp|m4v)$/i)) {
      setGcMediaType('video');
      const reader = new FileReader();
      reader.onload = () => setGcMediaPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setGcMediaType('image');
      try {
        const compressed = await compressMessengerImage(file, 1000, 1000, 0.72);
        setGcMediaPreview(compressed);
      } catch {
        const reader = new FileReader();
        reader.onload = () => setGcMediaPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSendGroupMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeGroupChat || !user || !token || (!newGroupMessageText.trim() && !gcMediaPreview))
      return;

    const tempId = 'temp-gmsg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    const originalText = newGroupMessageText;
    const mediaToSend = gcMediaPreview;
    const mediaTypeToSend = gcMediaType;

    const optimisticMsg: GroupMessage = {
      id: tempId,
      clientMessageId: tempId,
      groupId: activeGroupChat.id,
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar || '👤',
      text: originalText,
      mediaUrl: mediaToSend || undefined,
      mediaType: mediaToSend ? mediaTypeToSend : undefined,
      createdAt: new Date().toISOString()
    };

    setGroupMessages((prev) => [...prev, optimisticMsg]);
    setNewGroupMessageText('');
    setGcMediaPreview(null);
    if (gcFileInputRef.current) gcFileInputRef.current.value = '';

    setTimeout(() => {
      const el = document.getElementById('messenger-gc-scroll');
      if (el) el.scrollTop = el.scrollHeight;
    }, 25);

    let outboxId = '';
    try {
      outboxId = await idbStorage.addToOutbox({
        type: 'message',
        url: `/api/zone/groups/${activeGroupChat.id}/messages`,
        method: 'POST',
        payload: {
          clientMessageId: tempId,
          tempId,
          text: originalText,
          mediaUrl: mediaToSend || undefined,
          mediaType: mediaToSend ? mediaTypeToSend : undefined
        }
      });
    } catch {}

    try {
      let finalMediaUrl = mediaToSend;
      if (mediaToSend && mediaToSend.startsWith('data:')) {
        const uploadRes = await fetch('/api/zone/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token
          },
          body: JSON.stringify({ dataUrl: mediaToSend })
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json().catch(() => null);
          if (uploadData?.url) finalMediaUrl = uploadData.url;
        }
      }

      const res = await fetch(`/api/zone/groups/${activeGroupChat.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: JSON.stringify({
          clientMessageId: tempId,
          tempId,
          text: originalText,
          mediaUrl: finalMediaUrl || undefined,
          mediaType: finalMediaUrl ? mediaTypeToSend : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGroupMessages((prev) =>
          prev.map((m) => (m.id === tempId || m.clientMessageId === tempId ? data.message : m))
        );
        if (outboxId) await idbStorage.removeOutboxItem(outboxId);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 400 || res.status === 403) {
          setGroupMessages((prev) =>
            prev.filter((m) => m.id !== tempId && m.clientMessageId !== tempId)
          );
          setNewGroupMessageText(originalText);
          setGcMediaPreview(mediaToSend);
          if (outboxId) await idbStorage.removeOutboxItem(outboxId);
          triggerNotification(errData.error || 'Failed to send group message', 'error');
        }
      }
    } catch {}
  };

  const handleSaveGroupMessageEdit = async (messageId: string) => {
    if (!activeGroupChat || !token || !editingGroupMessageText.trim()) return;
    try {
      const res = await fetch(`/api/zone/groups/${activeGroupChat.id}/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: JSON.stringify({ text: editingGroupMessageText })
      });
      const data = await res.json();
      if (res.ok) {
        setGroupMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, text: data.message.text } : m))
        );
        setEditingGroupMessageId(null);
        setEditingGroupMessageText('');
      } else {
        triggerNotification(data.error || 'Could not edit group message.', 'error');
      }
    } catch {
      triggerNotification('Connection error editing group message.', 'error');
    }
  };

  const handleDeleteGroupMessage = async (messageId: string) => {
    if (!activeGroupChat || !token) return;
    try {
      const res = await fetch(`/api/zone/groups/${activeGroupChat.id}/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: token }
      });
      const data = await res.json();
      if (res.ok) {
        setGroupMessages((prev) => prev.filter((m) => m.id !== messageId));
      } else {
        triggerNotification(data.error || 'Could not delete group message.', 'error');
      }
    } catch {
      triggerNotification('Connection error deleting group message.', 'error');
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newGroupName.trim()) return;
    setIsCreatingGroup(true);
    try {
      const res = await fetch('/api/zone/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: JSON.stringify({
          name: newGroupName.trim(),
          avatar: newGroupAvatar || '👥',
          description: newGroupDescription.trim(),
          memberIds: newGroupMemberIds
        })
      });
      const data = await res.json();
      if (res.ok && data.group) {
        setGroupChats((prev) => [data.group, ...prev]);
        setShowCreateGroupModal(false);
        setNewGroupName('');
        setNewGroupAvatar('👥');
        setNewGroupDescription('');
        setNewGroupMemberIds([]);
        setActiveDmUser(null);
        setActiveGroupChat(data.group);
        triggerNotification(
          language === 'tl' ? 'Matagumpay na nagawa ang Group Chat! 🎉' : 'Group Chat created! 🎉',
          'success'
        );
      } else {
        triggerNotification(data.error || 'Failed to create group chat.', 'error');
      }
    } catch {
      triggerNotification('Error creating group chat.', 'error');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleAddGroupMembers = async () => {
    if (!activeGroupChat || !token || addMemberSelectedIds.length === 0) return;
    setIsAddingMembers(true);
    try {
      const res = await fetch(`/api/zone/groups/${activeGroupChat.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: JSON.stringify({ memberIds: addMemberSelectedIds })
      });
      const data = await res.json();
      if (res.ok && data.group) {
        setActiveGroupChat(data.group);
        setGroupChats((prev) => prev.map((g) => (g.id === data.group.id ? data.group : g)));
        setShowAddMembersModal(false);
        setAddMemberSelectedIds([]);
        triggerNotification(
          language === 'tl' ? 'Naidagdag na ang mga miyembro!' : 'Members added successfully!',
          'success'
        );
      } else {
        triggerNotification(data.error || 'Could not add members.', 'error');
      }
    } catch {
      triggerNotification('Error adding members.', 'error');
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeGroupChat || !token) return;
    try {
      const res = await fetch(`/api/zone/groups/${activeGroupChat.id}/leave`, {
        method: 'POST',
        headers: { Authorization: token }
      });
      const data = await res.json();
      if (res.ok) {
        setGroupChats((prev) => prev.filter((g) => g.id !== activeGroupChat.id));
        setActiveGroupChat(null);
        setShowGroupInfoModal(false);
        setConfirmLeaveGroup(false);
        triggerNotification(
          language === 'tl' ? 'Nakaalis ka na sa Group Chat.' : 'You left the group chat.',
          'info'
        );
      } else {
        triggerNotification(data.error || 'Could not leave group.', 'error');
      }
    } catch {
      triggerNotification('Error leaving group.', 'error');
    }
  };

  // --- CALL HANDLERS ---
  const handleStartCall = async (type: 'voice' | 'video') => {
    if (!activeDmUser || !token) return;
    try {
      const res = await fetch('/api/zone/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: JSON.stringify({
          receiverId: activeDmUser.id,
          type
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCallSession(data.call);
      } else {
        const err = await res.json().catch(() => ({}));
        triggerNotification(err.error || 'Could not start call.', 'error');
      }
    } catch {}
  };

  const handleAcceptCall = async () => {
    if (!activeCallSession || !token) return;
    try {
      const res = await fetch('/api/zone/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: JSON.stringify({
          callId: activeCallSession.id,
          status: 'accepted'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCallSession(data.call);
      }
    } catch {}
  };

  const handleDeclineOrHangup = async () => {
    if (!activeCallSession || !token || !user) return;
    try {
      const isCaller = activeCallSession.callerId === user.id;
      const targetStatus = isCaller ? 'ended' : 'declined';
      await fetch('/api/zone/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: JSON.stringify({
          callId: activeCallSession.id,
          status: targetStatus
        })
      });
      setActiveCallSession(null);
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
        setLocalStream(null);
      }
    } catch {}
  };

  // ============================================================================
  // GATEWAY 1: UNAUTHENTICATED Z-ONEMESSENGER LOGIN / REGISTER SCREEN
  // ============================================================================
  if (!token || !user) {
    return (
      <div className="min-h-dvh bg-slate-950 text-white flex flex-col justify-between relative overflow-hidden">
        {/* Ambient radial glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-indigo-600/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-[380px] h-[380px] rounded-full bg-blue-600/20 blur-3xl" />

        {/* Top Bar */}
        <header className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/messenger-icon-192.png"
              alt="Z-oneMessenger"
              className="w-10 h-10 rounded-2xl shadow-lg border border-white/15"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base sm:text-lg tracking-tight text-white">
                  Z-one<span className="text-sky-400">Messenger</span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  PWA
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold">
                {language === 'tl'
                  ? 'Instant Chat, Group Chats & HD Calls'
                  : 'Instant Chat, Group Chats & HD Calls'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isStandalone && (
              <button
                type="button"
                onClick={handleInstallMessengerClick}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{language === 'tl' ? 'I-install ang App' : 'Install App'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setLanguage(language === 'tl' ? 'en' : 'tl')}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-200 cursor-pointer transition"
            >
              {language === 'tl' ? '🇵🇭 TL' : '🇺🇸 EN'}
            </button>
            <button
              type="button"
              onClick={onNavigateHome}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Z-oneApp</span>
            </button>
          </div>
        </header>

        {/* Center Auth Card */}
        <main className="relative z-10 flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl mx-auto overflow-hidden shadow-xl ring-2 ring-indigo-500/40">
                <img
                  src="/messenger-icon-192.png"
                  alt="Z-oneMessenger"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {authMode === 'login'
                  ? language === 'tl'
                    ? 'Mag-sign in sa Z-oneMessenger'
                    : 'Sign in to Z-oneMessenger'
                  : language === 'tl'
                    ? 'Gumawa ng Z-one Account'
                    : 'Create a Z-one Account'}
              </h1>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                {language === 'tl'
                  ? 'Gamitin ang iyong kasalukuyang Z-oneApp account para ma-access ang lahat ng iyong Direct Messages, Group Chats, at Calls.'
                  : 'Use your existing Z-oneApp account to access all your Direct Messages, Group Chats, and Calls.'}
              </p>
            </div>

            {authError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-semibold space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
                {deviceBoundError && (
                  <button
                    type="button"
                    onClick={onOpenDeviceTransfer}
                    className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs cursor-pointer transition"
                  >
                    {language === 'tl'
                      ? '📱 Ilipat ang Account sa Device na Ito'
                      : '📱 Transfer Account to This Device'}
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleMessengerAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    {language === 'tl' ? 'Buong Pangalan' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder={language === 'tl' ? 'Juan Dela Cruz' : 'Your full name'}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950/90 border border-slate-800 focus:border-indigo-500 text-sm font-semibold text-white placeholder-slate-500 outline-none transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950/90 border border-slate-800 focus:border-indigo-500 text-sm font-semibold text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950/90 border border-slate-800 focus:border-indigo-500 text-sm font-semibold text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-indigo-600/30 cursor-pointer transition flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{language === 'tl' ? 'Kumokonekta...' : 'Signing in...'}</span>
                  </>
                ) : (
                  <span>
                    {authMode === 'login'
                      ? language === 'tl'
                        ? 'Buksan ang Messenger'
                        : 'Continue to Messenger'
                      : language === 'tl'
                        ? 'Gumawa ng Account'
                        : 'Create Account'}
                  </span>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setAuthError(null);
                }}
                className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
              >
                {authMode === 'login'
                  ? language === 'tl'
                    ? 'Wala pang account? Mag-register dito'
                    : "Don't have an account? Register"
                  : language === 'tl'
                    ? 'May account na? Mag-sign in'
                    : 'Already have an account? Sign in'}
              </button>

              <button
                type="button"
                onClick={onOpenDeviceTransfer}
                className="text-slate-400 hover:text-white font-semibold cursor-pointer"
              >
                {language === 'tl' ? 'Lumipat ng Device?' : 'Device Recovery'}
              </button>
            </div>
          </div>
        </main>

        <footer className="relative z-10 py-4 text-center text-[11px] text-slate-500 font-semibold">
          Z-oneMessenger PWA • Powered by Z-oneApp Real-Time Engine
        </footer>

        {/* Install Guide Modal */}
        <AnimatePresence>
          {showInstallGuideModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-white/15 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/messenger-icon-192.png"
                      alt="Z-oneMessenger"
                      className="w-10 h-10 rounded-2xl"
                    />
                    <div>
                      <h3 className="font-black text-sm">Install Z-oneMessenger</h3>
                      <p className="text-[11px] text-slate-400">Standalone Messenger Web App</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInstallGuideModal(false)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1.5">
                    <p className="font-black text-indigo-300">📱 Android (Chrome / Edge / Brave):</p>
                    <p>
                      I-tap ang browser menu (<strong>⋮</strong>) sa kanang itaas at piliin ang{' '}
                      <strong>"Add to Home screen"</strong> o <strong>"Install app"</strong>.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1.5">
                    <p className="font-black text-sky-300">🍎 iPhone & iPad (Safari):</p>
                    <p>
                      I-tap ang <strong>Share</strong> button sa ibaba ng Safari at piliin ang{' '}
                      <strong>"Add to Home Screen"</strong>.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowInstallGuideModal(false)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer"
                >
                  {language === 'tl' ? 'Naiintindihan Ko' : 'Got It'}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ============================================================================
  // GATEWAY 2: AUTHENTICATED Z-ONEMESSENGER WORKSPACE
  // ============================================================================
  const hasActiveConversation = Boolean(activeDmUser || activeGroupChat);

  const filteredConversations = conversations.filter(
    (c) =>
      c.userName.toLowerCase().includes(inboxSearch.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(inboxSearch.toLowerCase())
  );

  const filteredGroups = groupChats.filter(
    (g) =>
      g.name.toLowerCase().includes(inboxSearch.toLowerCase()) ||
      (g.description && g.description.toLowerCase().includes(inboxSearch.toLowerCase())) ||
      (g.lastMessage && g.lastMessage.toLowerCase().includes(inboxSearch.toLowerCase()))
  );

  const filteredDirectory = allUsersList
    .filter((u) => u.id !== user.id)
    .filter((u) => u.name.toLowerCase().includes(inboxSearch.toLowerCase()));

  const onlineContactsStrip = allUsersList
    .filter((u) => u.id !== user.id && onlineUserIds.includes(u.id))
    .slice(0, 14);

  return (
    <div className="h-dvh w-full bg-slate-100 flex flex-col overflow-hidden select-none sm:select-auto">
      {/* TOP BAR */}
      <header className="h-14 bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-800 text-white px-3 sm:px-5 flex items-center justify-between gap-2 shrink-0 shadow-md z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/messenger-icon-192.png"
            alt="Z-oneMessenger"
            className="w-9 h-9 rounded-xl shadow-sm border border-white/20 shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-sm sm:text-base tracking-tight text-white truncate">
                Z-one<span className="text-sky-300">Messenger</span>
              </h1>
              {chatConnectionStatus === 'live' ? (
                <span className="text-[9px] bg-emerald-500/25 text-emerald-200 font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-400/40 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              ) : chatConnectionStatus === 'reconnecting' ? (
                <span className="text-[9px] bg-amber-500/25 text-amber-200 font-extrabold px-1.5 py-0.5 rounded-full border border-amber-400/40 flex items-center gap-1 shrink-0">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Syncing
                </span>
              ) : (
                <span className="text-[9px] bg-white/15 text-indigo-100 font-extrabold px-1.5 py-0.5 rounded-full border border-white/20 shrink-0">
                  Active
                </span>
              )}
            </div>
            <p className="text-[10px] text-indigo-200 font-semibold truncate">
              {user.name} • {onlineUserIds.length} online
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!isStandalone && (
            <button
              type="button"
              onClick={handleInstallMessengerClick}
              className="px-2.5 py-1.5 rounded-xl bg-white text-indigo-800 hover:bg-indigo-50 font-black text-[11px] flex items-center gap-1 shadow-xs cursor-pointer transition active:scale-95"
              title={language === 'tl' ? 'I-install ang Z-oneMessenger' : 'Install Z-oneMessenger'}
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden xs:inline">
                {language === 'tl' ? 'I-install' : 'Install App'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateHome}
            className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
            title={language === 'tl' ? 'Buksan ang Z-oneApp Feed' : 'Open Z-oneApp Feed'}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Z-oneApp</span>
          </button>

          <button
            type="button"
            onClick={() => setLanguage(language === 'tl' ? 'en' : 'tl')}
            className="px-2 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] cursor-pointer transition"
          >
            {language === 'tl' ? 'TL' : 'EN'}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white cursor-pointer transition"
            title={language === 'tl' ? 'Mag-logout' : 'Log out'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN SPLIT WORKSPACE */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* LEFT PANE: INBOX, SEARCH, TABS, CONVERSATION & GROUP LIST */}
        <aside
          className={`w-full md:w-[360px] lg:w-[390px] shrink-0 bg-white border-r border-slate-200 flex flex-col h-full ${
            hasActiveConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search & New Group Action */}
          <div className="p-3 border-b border-slate-100 space-y-2.5 bg-white">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inboxSearch}
                  onChange={(e) => setInboxSearch(e.target.value)}
                  placeholder={
                    activeTab === 'chats'
                      ? language === 'tl'
                        ? 'Maghanap ng chat o mensahe...'
                        : 'Search chats or messages...'
                      : activeTab === 'groups'
                        ? language === 'tl'
                          ? 'Maghanap ng Group Chat...'
                          : 'Search Group Chats...'
                        : language === 'tl'
                          ? 'Maghanap ng miyembro...'
                          : 'Search people directory...'
                  }
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-500 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none transition"
                />
                {inboxSearch && (
                  <button
                    type="button"
                    onClick={() => setInboxSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCreateGroupModal(true);
                  fetchAllUsersList();
                }}
                className="p-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer transition"
                title={language === 'tl' ? 'Gumawa ng Bagong Group Chat' : 'Create New Group Chat'}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px] font-black">GC</span>
              </button>
            </div>

            {/* Active Online Contacts Strip */}
            {onlineContactsStrip.length > 0 && (
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pt-1 pb-0.5">
                {onlineContactsStrip.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleSelectDmUser(contact)}
                    className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group w-14"
                  >
                    <div className="relative">
                      {renderAvatar(contact.avatar, contact.name, 'w-11 h-11', 'text-base')}
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 group-hover:text-indigo-600 truncate w-full text-center">
                      {contact.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('chats')}
                className={`py-2 px-2 rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'chats'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{language === 'tl' ? 'Mga Chat' : 'Chats'}</span>
                {totalUnreadCount > 0 && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                      activeTab === 'chats' ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {totalUnreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('groups')}
                className={`py-2 px-2 rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'groups'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Groups</span>
                {groupChats.length > 0 && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                      activeTab === 'groups'
                        ? 'bg-white text-indigo-700'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {groupChats.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('people');
                  if (allUsersList.length === 0) fetchAllUsersList();
                }}
                className={`py-2 px-2 rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'people'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{language === 'tl' ? 'Miyembro' : 'People'}</span>
              </button>
            </div>
          </div>

          {/* Scrollable List Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {activeTab === 'chats' && (
              <>
                {filteredConversations.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
                    <div className="w-14 h-14 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <MessageSquare className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-black text-xs text-slate-800">
                        {language === 'tl' ? 'Walang Nahanap na Chat' : 'No Conversations Yet'}
                      </h3>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        {language === 'tl'
                          ? 'Buksan ang "Miyembro" tab upang magsimula ng bagong Direct Message.'
                          : 'Switch to the "People" tab to start a new Direct Message.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('people')}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs cursor-pointer transition"
                    >
                      {language === 'tl' ? 'Tingnan ang mga Miyembro' : 'Browse People Directory'}
                    </button>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const isOnline = onlineUserIds.includes(conv.userId);
                    const isSelected = activeDmUser?.id === conv.userId;
                    const isMeLast = conv.lastMessageSenderId === user.id;

                    return (
                      <div
                        key={conv.userId}
                        onClick={() =>
                          handleSelectDmUser({
                            id: conv.userId,
                            name: conv.userName,
                            avatar: conv.userAvatar
                          })
                        }
                        className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition ${
                          isSelected
                            ? 'bg-indigo-50 border border-indigo-200/80'
                            : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            {renderAvatar(conv.userAvatar, conv.userName, 'w-12 h-12', 'text-lg')}
                            <span
                              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            />
                          </div>

                          <div className="min-w-0 text-left">
                            <h4
                              className={`text-xs truncate ${
                                conv.unreadCount > 0
                                  ? 'font-black text-slate-950'
                                  : 'font-bold text-slate-800'
                              }`}
                            >
                              {conv.userName}
                            </h4>
                            {typingUsers[conv.userId]?.isTyping ? (
                              <p className="text-[11px] text-emerald-600 font-extrabold truncate mt-0.5 animate-pulse">
                                ✍️ {language === 'tl' ? 'nagsusulat...' : 'typing...'}
                              </p>
                            ) : (
                              <div className="flex items-center gap-1 mt-0.5">
                                {isMeLast && (
                                  <span className="shrink-0">
                                    {conv.lastMessageStatus === 'read' ? (
                                      <CheckCheck className="w-3 h-3 text-emerald-600" />
                                    ) : conv.lastMessageStatus === 'delivered' ? (
                                      <CheckCheck className="w-3 h-3 text-indigo-500" />
                                    ) : (
                                      <Check className="w-3 h-3 text-slate-400" />
                                    )}
                                  </span>
                                )}
                                <p
                                  className={`text-[11px] truncate ${
                                    conv.unreadCount > 0
                                      ? 'font-extrabold text-slate-900'
                                      : 'font-medium text-slate-500'
                                  }`}
                                >
                                  {isMeLast ? `You: ${conv.lastMessage}` : conv.lastMessage}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            {formatInboxTime(conv.lastMessageTime)}
                          </span>
                          {conv.unreadCount > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] font-black rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center shadow-xs">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {activeTab === 'groups' && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroupModal(true);
                    fetchAllUsersList();
                  }}
                  className="w-full p-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white flex items-center justify-between cursor-pointer shadow-xs transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-white/20">
                      <Plus className="w-4 h-4 text-white" />
                    </span>
                    <div className="text-left">
                      <div className="text-xs font-black">
                        {language === 'tl' ? '+ Gumawa ng Bagong Group Chat' : '+ Create New Group Chat'}
                      </div>
                      <div className="text-[10px] text-indigo-100 font-semibold">
                        {language === 'tl'
                          ? 'Mag-imbita ng mga kaibigan sa GC'
                          : 'Start a group conversation with members'}
                      </div>
                    </div>
                  </div>
                </button>

                {filteredGroups.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <span className="text-3xl">👥</span>
                    <p className="text-xs font-bold text-slate-700">
                      {language === 'tl' ? 'Walang Group Chat na nahanap' : 'No Group Chats found'}
                    </p>
                  </div>
                ) : (
                  filteredGroups.map((gc) => {
                    const isOfficial = gc.id === 'gc-community-main';
                    const isSelected = activeGroupChat?.id === gc.id;
                    return (
                      <div
                        key={gc.id}
                        onClick={() => handleSelectGroupChat(gc)}
                        className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition border ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-200'
                            : isOfficial
                              ? 'bg-indigo-50/30 border-indigo-100 hover:bg-indigo-50/60'
                              : 'bg-white border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
                            {gc.avatar || '👥'}
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-black text-slate-900 truncate">
                                {gc.name}
                              </h4>
                              {isOfficial && (
                                <span className="bg-amber-400 text-slate-950 text-[8px] font-black px-1.5 py-0.2 rounded-md shrink-0">
                                  Official
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                              {gc.lastMessage
                                ? `${gc.lastMessageSender ? gc.lastMessageSender + ': ' : ''}${gc.lastMessage}`
                                : gc.description || 'Group Chat'}
                            </p>
                            <span className="text-[9px] font-mono font-bold text-indigo-600">
                              👥 {(gc.members || []).length}{' '}
                              {language === 'tl' ? 'miyembro' : 'members'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[9px] font-mono font-bold text-slate-400">
                            {formatInboxTime(gc.lastMessageTime || gc.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'people' && (
              <div className="space-y-1">
                {loadingUsersList ? (
                  <div className="py-12 text-center space-y-2">
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-500">
                      {language === 'tl' ? 'Kinukuha ang direktoryo...' : 'Loading directory...'}
                    </p>
                  </div>
                ) : filteredDirectory.length === 0 ? (
                  <div className="py-12 text-center space-y-1">
                    <p className="text-xs font-bold text-slate-700">
                      {language === 'tl' ? 'Walang miyembrong nahanap' : 'No members found'}
                    </p>
                  </div>
                ) : (
                  filteredDirectory.map((u) => {
                    const isOnline = onlineUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleSelectDmUser(u)}
                        className="p-2.5 rounded-2xl hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            {renderAvatar(u.avatar, u.name, 'w-10 h-10', 'text-base')}
                            <span
                              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                                isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            />
                          </div>
                          <div className="min-w-0 text-left">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{u.name}</h4>
                            <p className="text-[10px] font-semibold text-slate-400">
                              {isOnline
                                ? language === 'tl'
                                  ? 'Aktibo Ngayon'
                                  : 'Active Now'
                                : 'Offline'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-black text-[10px] cursor-pointer transition shrink-0"
                        >
                          {language === 'tl' ? 'I-chat' : 'Message'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT PANE: ACTIVE DIRECT MESSAGE OR GROUP CHAT CONVERSATION */}
        <main
          className={`flex-1 flex flex-col h-full bg-slate-100 min-w-0 ${
            hasActiveConversation ? 'flex' : 'hidden md:flex'
          }`}
        >
          {/* CASE 1: ACTIVE DIRECT MESSAGE THREAD */}
          {activeDmUser ? (
            <div className="flex flex-col h-full w-full bg-slate-100">
              {/* DM Header */}
              <div className="h-16 px-3 sm:px-5 bg-white border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveDmUser(null)}
                    className="md:hidden p-2 -ml-1 rounded-xl hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title={language === 'tl' ? 'Bumalik sa Inbox' : 'Back to Inbox'}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative shrink-0">
                    {renderAvatar(activeDmUser.avatar, activeDmUser.name, 'w-10 h-10', 'text-base')}
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        onlineUserIds.includes(activeDmUser.id)
                          ? 'bg-emerald-500'
                          : 'bg-slate-300'
                      }`}
                    />
                  </div>

                  <div className="min-w-0 text-left">
                    <h2 className="font-black text-slate-900 text-xs sm:text-sm truncate">
                      {activeDmUser.name}
                    </h2>
                    {typingUsers[activeDmUser.id]?.isTyping ? (
                      <p className="text-[10px] text-emerald-600 font-extrabold animate-pulse">
                        ✍️ {language === 'tl' ? 'nagsusulat...' : 'typing...'}
                      </p>
                    ) : onlineUserIds.includes(activeDmUser.id) ? (
                      <p className="text-[10px] text-emerald-600 font-bold">
                        ● {language === 'tl' ? 'Aktibo Ngayon' : 'Active Now'}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 font-semibold">Offline</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowThreadSearch((prev) => !prev)}
                    className={`p-2.5 rounded-xl transition cursor-pointer ${
                      showThreadSearch
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                    title={language === 'tl' ? 'Maghanap sa usapan' : 'Search in conversation'}
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartCall('voice')}
                    className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 cursor-pointer transition active:scale-95"
                    title="Voice Call"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartCall('video')}
                    className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 cursor-pointer transition active:scale-95"
                    title="Video Call"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Optional In-Thread Search Bar */}
              {showThreadSearch && (
                <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={threadSearch}
                    onChange={(e) => setThreadSearch(e.target.value)}
                    placeholder={
                      language === 'tl'
                        ? 'Maghanap ng mensahe sa usapang ito...'
                        : 'Filter messages in this conversation...'
                    }
                    className="flex-1 text-xs font-semibold text-slate-800 outline-none bg-transparent"
                    autoFocus
                  />
                  {threadSearch && (
                    <button
                      type="button"
                      onClick={() => setThreadSearch('')}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* DM Messages Stream */}
              <div
                id="messenger-dm-scroll"
                className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-slate-100"
              >
                {(() => {
                  const allThreadMsgs = dmMessages.filter(
                    (m) =>
                      (m.senderId === user.id && m.receiverId === activeDmUser.id) ||
                      (m.senderId === activeDmUser.id && m.receiverId === user.id)
                  );
                  const filteredThreadMsgs = threadSearch.trim()
                    ? allThreadMsgs.filter((m) =>
                        (m.text || '').toLowerCase().includes(threadSearch.toLowerCase())
                      )
                    : allThreadMsgs;

                  const hasOlder = !threadSearch.trim() && filteredThreadMsgs.length > visibleDmCount;
                  const displayed = threadSearch.trim()
                    ? filteredThreadMsgs
                    : filteredThreadMsgs.slice(
                        Math.max(0, filteredThreadMsgs.length - visibleDmCount)
                      );

                  if (displayed.length === 0) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                        {renderAvatar(activeDmUser.avatar, activeDmUser.name, 'w-16 h-16', 'text-2xl')}
                        <h3 className="font-black text-sm text-slate-800">{activeDmUser.name}</h3>
                        <p className="text-xs text-slate-500 max-w-xs">
                          {threadSearch.trim()
                            ? language === 'tl'
                              ? 'Walang mensaheng tumutugma sa hinahanap.'
                              : 'No messages matched your search.'
                            : language === 'tl'
                              ? `Simulan ang usapan kay ${activeDmUser.name} gamit ang Z-oneMessenger.`
                              : `Say hello to ${activeDmUser.name} on Z-oneMessenger.`}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {hasOlder && (
                        <div className="text-center py-1">
                          <button
                            type="button"
                            onClick={() => setVisibleDmCount((prev) => prev + 35)}
                            className="text-[11px] font-extrabold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 rounded-full shadow-2xs cursor-pointer transition"
                          >
                            ↑ {language === 'tl' ? 'Mag-load ng mas lumang mensahe' : 'Load older messages'} (
                            {filteredThreadMsgs.length - visibleDmCount})
                          </button>
                        </div>
                      )}

                      {displayed.map((msg) => {
                        const isMe = msg.senderId === user.id;
                        const msgTime = new Date(msg.createdAt).getTime();
                        const canEditOrDelete = Date.now() - msgTime <= 120000;

                        return (
                          <div
                            key={msg.id}
                            className={`flex items-end gap-2 ${
                              isMe ? 'justify-end' : 'justify-start'
                            } group`}
                          >
                            {!isMe && (
                              <div className="shrink-0 mb-1">
                                {renderAvatar(
                                  activeDmUser.avatar,
                                  activeDmUser.name,
                                  'w-7 h-7',
                                  'text-xs'
                                )}
                              </div>
                            )}

                            <div
                              className={`max-w-[78%] sm:max-w-[68%] rounded-2xl px-3.5 py-2.5 text-xs font-semibold leading-relaxed shadow-2xs ${
                                isMe
                                  ? 'bg-blue-600 text-white rounded-br-xs'
                                  : 'bg-white text-slate-900 border border-slate-200/90 rounded-bl-xs'
                              }`}
                            >
                              {editingMessageId === msg.id ? (
                                <div className="space-y-2 min-w-[180px]">
                                  <input
                                    type="text"
                                    value={editingMessageText}
                                    onChange={(e) => setEditingMessageText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveMessageEdit(msg.id);
                                    }}
                                    className="w-full text-xs p-1.5 bg-white text-slate-900 rounded-lg outline-none"
                                    autoFocus
                                  />
                                  <div className="flex justify-end gap-2 text-[10px] font-black uppercase">
                                    <button
                                      type="button"
                                      onClick={() => setEditingMessageId(null)}
                                      className="text-blue-200 hover:text-white cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveMessageEdit(msg.id)}
                                      className="text-white underline cursor-pointer"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {msg.mediaUrl && (
                                    <div className="mb-2 rounded-xl overflow-hidden bg-black/5">
                                      {msg.mediaType === 'video' ||
                                      msg.mediaUrl.match(/\.(mp4|webm|mov|ogg|m4v)$/i) ? (
                                        <video
                                          src={msg.mediaUrl}
                                          controls
                                          playsInline
                                          className="max-w-full max-h-64 rounded-xl bg-black w-full"
                                        />
                                      ) : (
                                        <img
                                          src={msg.mediaUrl}
                                          alt="Attachment"
                                          onClick={() => {
                                            setLightboxMediaUrl(msg.mediaUrl!);
                                            setLightboxMediaType('image');
                                          }}
                                          className="max-w-full max-h-64 rounded-xl object-cover cursor-zoom-in hover:opacity-95 transition w-full"
                                        />
                                      )}
                                    </div>
                                  )}

                                  {msg.text && <p className="break-words whitespace-pre-wrap">{msg.text}</p>}

                                  <div className="flex items-center justify-between gap-2.5 mt-1">
                                    {isMe && canEditOrDelete ? (
                                      <div className="flex items-center gap-1.5 opacity-90 md:opacity-0 md:group-hover:opacity-100 transition">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingMessageId(msg.id);
                                            setEditingMessageText(msg.text || '');
                                          }}
                                          className="text-blue-200 hover:text-white cursor-pointer p-0.5"
                                          title="Edit"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setConfirmDeleteMsgId({ id: msg.id, isGroup: false })
                                          }
                                          className="text-blue-200 hover:text-rose-300 cursor-pointer p-0.5"
                                          title="Unsend"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <span />
                                    )}

                                    <div className="flex items-center gap-1 ml-auto shrink-0">
                                      <span
                                        className={`text-[9px] font-mono font-bold ${
                                          isMe ? 'text-blue-100' : 'text-slate-400'
                                        }`}
                                      >
                                        {new Date(msg.createdAt).toLocaleTimeString('fil-PH', {
                                          hour: 'numeric',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                      {isMe && (
                                        <span className="flex items-center">
                                          {msg.status === 'failed' ? (
                                            <button
                                              type="button"
                                              onClick={() => handleRetryDmMessage(msg)}
                                              className="text-[9px] bg-rose-500 text-white font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer ml-1"
                                            >
                                              <AlertCircle className="w-2.5 h-2.5" /> Retry
                                            </button>
                                          ) : msg.status === 'sending' ? (
                                            <Clock className="w-3 h-3 text-blue-200 animate-pulse" />
                                          ) : msg.status === 'read' ? (
                                            <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                                          ) : msg.status === 'delivered' ? (
                                            <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                                          ) : (
                                            <Check className="w-3.5 h-3.5 text-blue-200" />
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {typingUsers[activeDmUser.id]?.isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-white text-slate-700 border border-slate-200 rounded-2xl rounded-bl-xs px-3.5 py-2 shadow-2xs flex items-center gap-2 text-xs font-semibold">
                            <span className="text-[11px] text-slate-500 font-bold">
                              {activeDmUser.name.split(' ')[0]} is typing
                            </span>
                            <span className="flex items-center gap-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"
                                style={{ animationDelay: '150ms' }}
                              />
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"
                                style={{ animationDelay: '300ms' }}
                              />
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* DM Media Attachment Preview */}
              {dmMediaPreview && (
                <div className="p-2.5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-300 bg-slate-900 shrink-0">
                      {dmMediaType === 'video' ? (
                        <video src={dmMediaPreview} className="w-full h-full object-cover" />
                      ) : (
                        <img src={dmMediaPreview} alt="Preview" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">
                        {dmMediaType === 'video' ? '📹 Video Attachment' : '📷 Photo Attachment'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        {language === 'tl' ? 'Handa nang ipadala' : 'Ready to send'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDmMediaPreview(null);
                      if (dmFileInputRef.current) dmFileInputRef.current.value = '';
                    }}
                    className="p-1.5 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* DM Input Form */}
              <form
                onSubmit={handleSendDm}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
              >
                <input
                  type="file"
                  ref={dmFileInputRef}
                  onChange={handleDmFileSelect}
                  accept="image/*,video/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => dmFileInputRef.current?.click()}
                  className="p-2.5 rounded-2xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 cursor-pointer transition shrink-0"
                  title={language === 'tl' ? 'Mag-attach ng Larawan o Video' : 'Attach Photo or Video'}
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={newDmText}
                  onChange={(e) => {
                    setNewDmText(e.target.value);
                    chatSocket.handleTyping(activeDmUser.id);
                  }}
                  placeholder={
                    language === 'tl' ? 'Sumulat ng mensahe...' : 'Write a message...'
                  }
                  className="flex-1 bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-500 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!newDmText.trim() && !dmMediaPreview}
                  className="p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shadow-sm cursor-pointer transition shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : activeGroupChat ? (
            /* CASE 2: ACTIVE GROUP CHAT THREAD */
            <div className="flex flex-col h-full w-full bg-slate-100">
              {/* Group Header */}
              <div className="h-16 px-3 sm:px-5 bg-white border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveGroupChat(null)}
                    className="md:hidden p-2 -ml-1 rounded-xl hover:bg-slate-100 text-slate-700 cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center text-lg shrink-0 shadow-xs">
                    {activeGroupChat.avatar || '👥'}
                  </div>

                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-black text-slate-900 text-xs sm:text-sm truncate">
                        {activeGroupChat.name}
                      </h2>
                      {activeGroupChat.id === 'gc-community-main' && (
                        <span className="bg-amber-400 text-slate-950 text-[8px] font-black px-1.5 py-0.2 rounded-md shrink-0">
                          Official
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold truncate">
                      👥 {(activeGroupChat.members || []).length}{' '}
                      {language === 'tl' ? 'miyembro' : 'members'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowThreadSearch((prev) => !prev)}
                    className={`p-2.5 rounded-xl transition cursor-pointer ${
                      showThreadSearch
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGroupInfoModal(true);
                      fetchAllUsersList();
                    }}
                    className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {language === 'tl' ? 'Miyembro' : 'Members'}
                    </span>
                  </button>
                </div>
              </div>

              {showThreadSearch && (
                <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={threadSearch}
                    onChange={(e) => setThreadSearch(e.target.value)}
                    placeholder={
                      language === 'tl'
                        ? 'Maghanap sa Group Chat na ito...'
                        : 'Filter messages in this Group Chat...'
                    }
                    className="flex-1 text-xs font-semibold text-slate-800 outline-none bg-transparent"
                    autoFocus
                  />
                  {threadSearch && (
                    <button
                      type="button"
                      onClick={() => setThreadSearch('')}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Group Messages Stream */}
              <div
                id="messenger-gc-scroll"
                className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-slate-100"
              >
                {activeGroupChat.description && (
                  <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl p-2.5 text-center text-[11px] text-indigo-900 font-semibold">
                    <span className="font-black">📢 GC Topic:</span> {activeGroupChat.description}
                  </div>
                )}

                {(() => {
                  const allGcMsgs = groupMessages.filter((m) => m.groupId === activeGroupChat.id);
                  const msgs = threadSearch.trim()
                    ? allGcMsgs.filter(
                        (m) =>
                          (m.text || '').toLowerCase().includes(threadSearch.toLowerCase()) ||
                          (m.senderName || '').toLowerCase().includes(threadSearch.toLowerCase())
                      )
                    : allGcMsgs;

                  if (msgs.length === 0) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                        <span className="text-3xl">💬</span>
                        <p className="text-xs font-black text-slate-800">
                          {language === 'tl'
                            ? `Simulan ang kwentuhan sa ${activeGroupChat.name}!`
                            : `Say hello to ${activeGroupChat.name}!`}
                        </p>
                      </div>
                    );
                  }

                  return msgs.map((msg) => {
                    const isSystem = msg.senderId === 'system';
                    const isMe = msg.senderId === user.id;
                    const msgTime = new Date(msg.createdAt).getTime();
                    const canEditOrDelete = Date.now() - msgTime <= 120000;

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-1.5">
                          <span className="px-3 py-1 bg-slate-200/80 text-slate-600 text-[10px] font-bold rounded-full">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${
                          isMe ? 'justify-end' : 'justify-start'
                        } group`}
                      >
                        {!isMe && (
                          <div className="shrink-0 mb-1">
                            {renderAvatar(msg.senderAvatar, msg.senderName, 'w-7 h-7', 'text-xs')}
                          </div>
                        )}

                        <div
                          className={`max-w-[78%] sm:max-w-[68%] flex flex-col ${
                            isMe ? 'items-end' : 'items-start'
                          }`}
                        >
                          {!isMe && (
                            <span className="text-[10px] font-black text-indigo-900 ml-1 mb-0.5">
                              {msg.senderName}
                            </span>
                          )}

                          <div
                            className={`rounded-2xl px-3.5 py-2.5 text-xs font-semibold leading-relaxed shadow-2xs ${
                              isMe
                                ? 'bg-blue-600 text-white rounded-br-xs'
                                : 'bg-white text-slate-900 border border-slate-200/90 rounded-bl-xs'
                            }`}
                          >
                            {editingGroupMessageId === msg.id ? (
                              <div className="space-y-2 min-w-[180px]">
                                <input
                                  type="text"
                                  value={editingGroupMessageText}
                                  onChange={(e) => setEditingGroupMessageText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveGroupMessageEdit(msg.id);
                                  }}
                                  className="w-full text-xs p-1.5 bg-white text-slate-900 rounded-lg outline-none"
                                  autoFocus
                                />
                                <div className="flex justify-end gap-2 text-[10px] font-black uppercase">
                                  <button
                                    type="button"
                                    onClick={() => setEditingGroupMessageId(null)}
                                    className="text-blue-200 hover:text-white cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveGroupMessageEdit(msg.id)}
                                    className="text-white underline cursor-pointer"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {msg.mediaUrl && (
                                  <div className="mb-2 rounded-xl overflow-hidden bg-black/5">
                                    {msg.mediaType === 'video' ||
                                    msg.mediaUrl.match(/\.(mp4|webm|mov|ogg|m4v)$/i) ? (
                                      <video
                                        src={msg.mediaUrl}
                                        controls
                                        playsInline
                                        className="max-w-full max-h-64 rounded-xl bg-black w-full"
                                      />
                                    ) : (
                                      <img
                                        src={msg.mediaUrl}
                                        alt="Attachment"
                                        onClick={() => {
                                          setLightboxMediaUrl(msg.mediaUrl!);
                                          setLightboxMediaType('image');
                                        }}
                                        className="max-w-full max-h-64 rounded-xl object-cover cursor-zoom-in hover:opacity-95 transition w-full"
                                      />
                                    )}
                                  </div>
                                )}

                                {msg.text && <p className="break-words whitespace-pre-wrap">{msg.text}</p>}

                                <div className="flex items-center justify-between gap-2.5 mt-1">
                                  {isMe && canEditOrDelete ? (
                                    <div className="flex items-center gap-1.5 opacity-90 md:opacity-0 md:group-hover:opacity-100 transition">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingGroupMessageId(msg.id);
                                          setEditingGroupMessageText(msg.text || '');
                                        }}
                                        className="text-blue-200 hover:text-white cursor-pointer p-0.5"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setConfirmDeleteMsgId({ id: msg.id, isGroup: true })
                                        }
                                        className="text-blue-200 hover:text-rose-300 cursor-pointer p-0.5"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span />
                                  )}

                                  <span
                                    className={`text-[9px] font-mono font-bold ${
                                      isMe ? 'text-blue-100' : 'text-slate-400'
                                    }`}
                                  >
                                    {new Date(msg.createdAt).toLocaleTimeString('fil-PH', {
                                      hour: 'numeric',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* GC Media Attachment Preview */}
              {gcMediaPreview && (
                <div className="p-2.5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-300 bg-slate-900 shrink-0">
                      {gcMediaType === 'video' ? (
                        <video src={gcMediaPreview} className="w-full h-full object-cover" />
                      ) : (
                        <img src={gcMediaPreview} alt="Preview" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">
                        {gcMediaType === 'video' ? '📹 Video Attachment' : '📷 Photo Attachment'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        {language === 'tl' ? 'Isasama sa GC message' : 'Ready to send to group'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGcMediaPreview(null);
                      if (gcFileInputRef.current) gcFileInputRef.current.value = '';
                    }}
                    className="p-1.5 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* GC Input Form */}
              <form
                onSubmit={handleSendGroupMessage}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
              >
                <input
                  type="file"
                  ref={gcFileInputRef}
                  onChange={handleGcFileSelect}
                  accept="image/*,video/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => gcFileInputRef.current?.click()}
                  className="p-2.5 rounded-2xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 cursor-pointer transition shrink-0"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={newGroupMessageText}
                  onChange={(e) => setNewGroupMessageText(e.target.value)}
                  placeholder={
                    language === 'tl'
                      ? `Mensahe sa ${activeGroupChat.name}...`
                      : `Message ${activeGroupChat.name}...`
                  }
                  className="flex-1 bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-500 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!newGroupMessageText.trim() && !gcMediaPreview}
                  className="p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shadow-sm cursor-pointer transition shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            /* CASE 3: DESKTOP EMPTY STATE WHEN NO THREAD IS SELECTED */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <img
                src="/messenger-icon-192.png"
                alt="Z-oneMessenger"
                className="w-20 h-20 rounded-3xl shadow-xl border border-indigo-200"
              />
              <div className="space-y-1.5 max-w-sm">
                <h2 className="font-black text-lg text-slate-900">
                  {language === 'tl'
                    ? `Kumusta, ${user.name.split(' ')[0]}! 👋`
                    : `Welcome, ${user.name.split(' ')[0]}! 👋`}
                </h2>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {language === 'tl'
                    ? 'Pumili ng usapan sa kaliwa, magbukas ng Group Chat, o magsimula ng HD Voice/Video Call.'
                    : 'Select a conversation on the left, open a Group Chat, or place an HD Voice/Video Call.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('people')}
                  className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs cursor-pointer transition shadow-sm"
                >
                  {language === 'tl' ? 'Magsimula ng Bagong Chat' : 'Start New Conversation'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroupModal(true);
                    fetchAllUsersList();
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-black text-xs cursor-pointer transition"
                >
                  {language === 'tl' ? '+ Gumawa ng Group Chat' : '+ Create Group Chat'}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* UNSEND / DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmDeleteMsgId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xs w-full p-5 shadow-2xl border border-slate-100 text-center space-y-4"
            >
              <h4 className="font-black text-sm text-slate-900">
                {language === 'tl' ? 'I-unsend ang Mensahe?' : 'Unsend Message?'}
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                {language === 'tl'
                  ? 'Buburahin nito ang mensahe sa usapan.'
                  : 'This will remove the message from the conversation.'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteMsgId(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  {language === 'tl' ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = confirmDeleteMsgId;
                    setConfirmDeleteMsgId(null);
                    if (target.isGroup) {
                      handleDeleteGroupMessage(target.id);
                    } else {
                      handleDeleteMessage(target.id);
                    }
                  }}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer"
                >
                  {language === 'tl' ? 'I-delete' : 'Unsend'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE GROUP CHAT MODAL */}
      <AnimatePresence>
        {showCreateGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[88vh]"
            >
              <div className="p-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <h3 className="font-black text-sm">
                    {language === 'tl' ? 'Gumawa ng Bagong Group Chat' : 'Create New Group Chat'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="p-1 text-white/80 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="p-4 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                    {language === 'tl' ? 'Pangalan ng GC' : 'Group Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Z-one Squad PH 🚀"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                    {language === 'tl' ? 'Icon ng GC' : 'Group Icon'}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['👥', '🚀', '💎', '🇵🇭', '🌟', '🔥', '🏆', '💬', '🍕', '🎯', '⚡', '🥳'].map(
                      (emoji) => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() => setNewGroupAvatar(emoji)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg cursor-pointer transition ${
                            newGroupAvatar === emoji
                              ? 'bg-indigo-600 text-white scale-105 shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200'
                          }`}
                        >
                          {emoji}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                    {language === 'tl' ? 'Deskripsyon (Opsyonal)' : 'Description (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder={language === 'tl' ? 'Tungkol saan ang GC?' : 'Group topic...'}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                    {language === 'tl' ? 'Pumili ng Miyembro' : 'Select Members'} (
                    {newGroupMemberIds.length})
                  </label>
                  <div className="border border-slate-200 rounded-2xl max-h-44 overflow-y-auto p-1.5 space-y-1 bg-slate-50">
                    {allUsersList
                      .filter((u) => u.id !== user.id)
                      .map((u) => {
                        const selected = newGroupMemberIds.includes(u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={() =>
                              setNewGroupMemberIds((prev) =>
                                selected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                              )
                            }
                            className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition ${
                              selected ? 'bg-indigo-100 font-bold' : 'hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {renderAvatar(u.avatar, u.name, 'w-7 h-7', 'text-xs')}
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {u.name}
                              </span>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-lg flex items-center justify-center border ${
                                selected
                                  ? 'bg-indigo-600 border-indigo-600 text-white'
                                  : 'bg-white border-slate-300'
                              }`}
                            >
                              {selected && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroupModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    {language === 'tl' ? 'Kanselahin' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingGroup || !newGroupName.trim()}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs cursor-pointer"
                  >
                    {isCreatingGroup
                      ? language === 'tl'
                        ? 'Ginagawa...'
                        : 'Creating...'
                      : language === 'tl'
                        ? 'Gumawa ng GC'
                        : 'Create Group'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GROUP INFO & MEMBERS MODAL */}
      <AnimatePresence>
        {showGroupInfoModal && activeGroupChat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[88vh]"
            >
              <div className="p-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  <div>
                    <h3 className="font-black text-sm">{activeGroupChat.name}</h3>
                    <p className="text-[10px] text-indigo-100">
                      {(activeGroupChat.members || []).length}{' '}
                      {language === 'tl' ? 'miyembro' : 'members'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGroupInfoModal(false)}
                  className="p-1 text-white/80 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase">
                    {language === 'tl' ? 'Mga Miyembro' : 'Group Members'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMembersModal(true);
                      setAddMemberSelectedIds([]);
                      fetchAllUsersList();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>{language === 'tl' ? '+ Magdagdag' : '+ Add Members'}</span>
                  </button>
                </div>

                <div className="border border-slate-100 rounded-2xl max-h-60 overflow-y-auto p-1.5 space-y-1 bg-slate-50">
                  {(activeGroupChat.memberDetails && activeGroupChat.memberDetails.length > 0
                    ? activeGroupChat.memberDetails
                    : allUsersList.filter((u) => (activeGroupChat.members || []).includes(u.id))
                  ).map((m) => {
                    const isOnline = onlineUserIds.includes(m.id);
                    const isCreator = m.id === activeGroupChat.createdBy;
                    return (
                      <div
                        key={m.id}
                        className="p-2 rounded-xl bg-white border border-slate-100 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            {renderAvatar(m.avatar, m.name, 'w-8 h-8', 'text-xs')}
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white ${
                                isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            />
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-900 truncate">
                                {m.name}
                              </span>
                              {isCreator && (
                                <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1.5 py-0.2 rounded">
                                  Creator
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold">
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>

                        {m.id !== user.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowGroupInfoModal(false);
                              handleSelectDmUser({ id: m.id, name: m.name, avatar: m.avatar });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-[10px] cursor-pointer"
                          >
                            DM
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {activeGroupChat.id !== 'gc-community-main' && (
                  <div className="pt-2 border-t border-slate-100">
                    {confirmLeaveGroup ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmLeaveGroup(false)}
                          className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                        >
                          {language === 'tl' ? 'Kanselahin' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          onClick={handleLeaveGroup}
                          className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-black text-xs cursor-pointer"
                        >
                          {language === 'tl' ? 'Kumpirmahin ang Pag-alis' : 'Confirm Leave'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmLeaveGroup(true)}
                        className="w-full py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{language === 'tl' ? 'Umalis sa Group Chat' : 'Leave Group Chat'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD MEMBERS MODAL */}
      <AnimatePresence>
        {showAddMembersModal && activeGroupChat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
                <h3 className="font-black text-sm">
                  {language === 'tl' ? 'Magdagdag ng Miyembro' : 'Add Members'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddMembersModal(false)}
                  className="p-1 text-white/80 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                <div className="border border-slate-200 rounded-2xl max-h-56 overflow-y-auto p-1.5 space-y-1 bg-slate-50">
                  {allUsersList
                    .filter((u) => !(activeGroupChat.members || []).includes(u.id))
                    .map((u) => {
                      const selected = addMemberSelectedIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() =>
                            setAddMemberSelectedIds((prev) =>
                              selected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                            )
                          }
                          className={`p-2 rounded-xl flex items-center justify-between cursor-pointer ${
                            selected ? 'bg-indigo-100 font-bold' : 'hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {renderAvatar(u.avatar, u.name, 'w-7 h-7', 'text-xs')}
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {u.name}
                            </span>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center border ${
                              selected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white border-slate-300'
                            }`}
                          >
                            {selected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMembersModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isAddingMembers || addMemberSelectedIds.length === 0}
                    onClick={handleAddGroupMembers}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs cursor-pointer"
                  >
                    {isAddingMembers ? 'Adding...' : `Add (${addMemberSelectedIds.length})`}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VOICE & VIDEO CALL OVERLAY */}
      <AnimatePresence>
        {activeCallSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md">
            <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

            {activeCallSession.status === 'accepted' && activeCallSession.type === 'video' ? (
              <div className="relative w-full h-full flex flex-col justify-between overflow-hidden text-white">
                <div className="absolute inset-0 bg-slate-900">
                  {remoteStream ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                      <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-4xl shadow-2xl">
                        {activeCallSession.callerId === user.id
                          ? '👤'
                          : activeCallSession.callerAvatar || '👤'}
                      </div>
                      <h3 className="text-lg font-black">
                        {activeCallSession.callerId === user.id
                          ? activeCallSession.receiverName
                          : activeCallSession.callerName}
                      </h3>
                      <p className="text-xs text-indigo-300 font-bold animate-pulse">
                        Connecting WebRTC video stream...
                      </p>
                    </div>
                  )}
                </div>

                {!isVideoOff && (
                  <div className="absolute top-4 right-4 w-32 sm:w-44 aspect-video bg-slate-900 rounded-2xl overflow-hidden border-2 border-white/25 shadow-2xl z-20">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  </div>
                )}

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-slate-900/85 backdrop-blur-xl px-6 py-3.5 rounded-3xl flex items-center gap-4 border border-white/15 shadow-2xl">
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-3.5 rounded-2xl cursor-pointer ${
                      isMuted ? 'bg-rose-600 text-white' : 'bg-white/10 text-white'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsVideoOff(!isVideoOff)}
                    className={`p-3.5 rounded-2xl cursor-pointer ${
                      isVideoOff ? 'bg-rose-600 text-white' : 'bg-white/10 text-white'
                    }`}
                  >
                    {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeclineOrHangup}
                    className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-lg"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-sm w-full p-6 shadow-2xl flex flex-col items-center justify-between min-h-[380px] text-center">
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 text-indigo-200">
                  Z-oneMessenger {activeCallSession.type === 'video' ? 'Video' : 'Voice'} Call
                </span>

                <div className="space-y-4 my-auto py-6">
                  <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-4xl mx-auto shadow-xl border-4 border-slate-800">
                    {activeCallSession.callerId === user.id
                      ? '👤'
                      : activeCallSession.callerAvatar || '👤'}
                  </div>
                  <div>
                    <h3 className="font-black text-lg">
                      {activeCallSession.callerId === user.id
                        ? activeCallSession.receiverName
                        : activeCallSession.callerName}
                    </h3>
                    <p className="text-xs text-indigo-300 font-bold mt-1 animate-pulse">
                      {activeCallSession.status === 'ringing'
                        ? activeCallSession.callerId === user.id
                          ? language === 'tl'
                            ? 'Tinatawagan...'
                            : 'Calling...'
                          : language === 'tl'
                            ? 'Papasok na tawag...'
                            : 'Incoming call...'
                        : language === 'tl'
                          ? 'Konektado na (Voice)'
                          : 'Connected (Voice)'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full justify-center">
                  {activeCallSession.status === 'ringing' &&
                  activeCallSession.callerId !== user.id ? (
                    <>
                      <button
                        type="button"
                        onClick={handleAcceptCall}
                        className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Phone className="w-4 h-4" />
                        <span>{language === 'tl' ? 'Sagutin' : 'Accept'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDeclineOrHangup}
                        className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <PhoneOff className="w-4 h-4" />
                        <span>{language === 'tl' ? 'Tanggihan' : 'Decline'}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {activeCallSession.status === 'accepted' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setIsMuted(!isMuted)}
                            className={`p-3 rounded-2xl cursor-pointer ${
                              isMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200'
                            }`}
                          >
                            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsLoopbackOn(!isLoopbackOn)}
                            className={`px-3 py-2 rounded-2xl text-[10px] font-bold cursor-pointer ${
                              isLoopbackOn
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 text-slate-200'
                            }`}
                          >
                            Test Mic
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={handleDeclineOrHangup}
                        className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <PhoneOff className="w-4 h-4" />
                        <span>{language === 'tl' ? 'Ibaba' : 'Hang Up'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* MEDIA LIGHTBOX */}
      <AnimatePresence>
        {lightboxMediaUrl && (
          <div
            onClick={() => setLightboxMediaUrl(null)}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              type="button"
              onClick={() => setLightboxMediaUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            {lightboxMediaType === 'video' ? (
              <video
                src={lightboxMediaUrl}
                controls
                autoPlay
                playsInline
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-[90vh] rounded-2xl"
              />
            ) : (
              <img
                src={lightboxMediaUrl}
                alt="Attachment"
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-[90vh] object-contain rounded-2xl"
              />
            )}
          </div>
        )}
      </AnimatePresence>

      {/* INSTALL GUIDE MODAL */}
      <AnimatePresence>
        {showInstallGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/15 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/messenger-icon-192.png"
                    alt="Z-oneMessenger"
                    className="w-10 h-10 rounded-2xl"
                  />
                  <div>
                    <h3 className="font-black text-sm">Install Z-oneMessenger</h3>
                    <p className="text-[11px] text-slate-400">Standalone Messenger App</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInstallGuideModal(false)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1">
                  <p className="font-black text-indigo-300">📱 Android (Chrome / Edge / Brave):</p>
                  <p>
                    I-tap ang browser menu (<strong>⋮</strong>) at piliin ang{' '}
                    <strong>"Install app"</strong> o <strong>"Add to Home screen"</strong>.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1">
                  <p className="font-black text-sky-300">🍎 iPhone & iPad (Safari):</p>
                  <p>
                    I-tap ang <strong>Share</strong> icon sa ibaba ng Safari at piliin ang{' '}
                    <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowInstallGuideModal(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer"
              >
                {language === 'tl' ? 'Sige, Nakuha Ko!' : 'Got It'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
