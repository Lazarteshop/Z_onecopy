/**
 * Real-Time Chat & Presence WebSocket Client for Z-oneApp
 * 
 * Features:
 * - Instant WebSocket transport with zero Firestore dependency
 * - Automatic exponential backoff reconnection
 * - Live / Reconnecting / Offline connection state
 * - Optimistic UI state with ACK reconciliation
 * - Ephemeral typing indicators (0 database/Firestore writes)
 * - Real-time in-memory presence tracking
 * - Read receipts and delivery confirmation
 * - Seamless fallback to HTTP polling if WebSocket is unavailable
 */

import { DirectMessage } from '../types';

export type ConnectionStatus = 'live' | 'reconnecting' | 'offline';

export interface TypingEvent {
  senderId: string;
  senderName: string;
  isTyping: boolean;
}

export interface PresenceEvent {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

type MessageCallback = (msg: DirectMessage) => void;
type AckCallback = (ack: { clientMessageId: string; serverMessageId: string; status: 'sent'; message: DirectMessage }) => void;
type DeliveredCallback = (delivered: { clientMessageId?: string; messageId: string; deliveredAt: string }) => void;
type ReadCallback = (read: { readerId: string; messageIds: string[]; readAt: string }) => void;
type TypingCallback = (event: TypingEvent) => void;
type PresenceCallback = (event: PresenceEvent) => void;
type StatusCallback = (status: ConnectionStatus) => void;

class ChatSocketManager {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private userId: string | null = null;
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 10000;
  private pingInterval: any = null;
  private isExplicitlyClosed = false;
  private status: ConnectionStatus = 'offline';

  // Typing debounce state
  private typingDebounceTimer: any = null;
  private currentTypingReceiverId: string | null = null;

  // Listeners
  private messageListeners = new Set<MessageCallback>();
  private ackListeners = new Set<AckCallback>();
  private deliveredListeners = new Set<DeliveredCallback>();
  private readListeners = new Set<ReadCallback>();
  private typingListeners = new Set<TypingCallback>();
  private presenceListeners = new Set<PresenceCallback>();
  private statusListeners = new Set<StatusCallback>();

  // In-memory state
  private onlineUsers = new Set<string>();
  private typingMap: Record<string, boolean> = {};

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.status !== 'live' && this.token) {
          this.reconnectAttempts = 0;
          this.connect();
        }
      });

      window.addEventListener('offline', () => {
        this.setStatus('offline');
      });
    }
  }

  public init(token: string, userId?: string) {
    if (this.token === token && this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.token = token;
    this.userId = userId || null;
    this.isExplicitlyClosed = false;
    this.reconnectAttempts = 0;
    this.connect();
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    this.clearTimers();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.setStatus('offline');
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  public isUserTyping(userId: string): boolean {
    return !!this.typingMap[userId];
  }

  private setStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach(cb => {
        try { cb(newStatus); } catch (e) { console.warn(e); }
      });
    }
  }

  private clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.typingDebounceTimer) {
      clearTimeout(this.typingDebounceTimer);
      this.typingDebounceTimer = null;
    }
  }

  private connect() {
    if (typeof window === 'undefined' || !this.token || this.isExplicitlyClosed) return;

    if (!navigator.onLine) {
      this.setStatus('offline');
      return;
    }

    this.clearTimers();
    this.setStatus('reconnecting');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const url = `${protocol}//${host}/api/chat/ws?token=${encodeURIComponent(this.token)}`;

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.setStatus('live');
        this.reconnectAttempts = 0;

        // Send explicit auth frame as well for maximum proxy compatibility
        this.send({ type: 'auth', token: this.token });

        // Start heartbeat ping
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.send({ type: 'ping' });
          }
        }, 25000);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        } else {
          this.setStatus('offline');
        }
      };

      this.ws.onerror = () => {
        if (this.ws) {
          try { this.ws.close(); } catch {}
        }
      };
    } catch (err) {
      console.warn('[ChatSocket] Connection attempt error:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.isExplicitlyClosed) return;
    this.setStatus(navigator.onLine ? 'reconnecting' : 'offline');

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private send(data: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (err) {
        console.warn('[ChatSocket] Send error:', err);
      }
    }
    return false;
  }

  private handleMessage(rawData: any) {
    let msg: any = null;
    try {
      msg = JSON.parse(rawData);
    } catch {
      return;
    }

    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'auth_success': {
        this.setStatus('live');
        if (Array.isArray(msg.onlineUserIds)) {
          this.onlineUsers = new Set(msg.onlineUserIds);
          msg.onlineUserIds.forEach((uid: string) => {
            this.presenceListeners.forEach(cb => cb({ userId: uid, isOnline: true }));
          });
        }
        break;
      }

      case 'presence_update': {
        if (msg.isOnline) {
          this.onlineUsers.add(msg.userId);
        } else {
          this.onlineUsers.delete(msg.userId);
        }
        this.presenceListeners.forEach(cb => {
          try { cb({ userId: msg.userId, isOnline: msg.isOnline, lastSeen: msg.lastSeen }); } catch (e) { console.warn(e); }
        });
        break;
      }

      case 'new_message': {
        if (msg.message) {
          const directMsg: DirectMessage = {
            ...msg.message,
            status: 'delivered'
          };
          this.messageListeners.forEach(cb => {
            try { cb(directMsg); } catch (e) { console.warn(e); }
          });
        }
        break;
      }

      case 'message_ack': {
        this.ackListeners.forEach(cb => {
          try {
            cb({
              clientMessageId: msg.clientMessageId,
              serverMessageId: msg.serverMessageId,
              status: msg.status || 'sent',
              message: msg.message
            });
          } catch (e) { console.warn(e); }
        });
        break;
      }

      case 'message_delivered': {
        this.deliveredListeners.forEach(cb => {
          try {
            cb({
              clientMessageId: msg.clientMessageId,
              messageId: msg.messageId,
              deliveredAt: msg.deliveredAt
            });
          } catch (e) { console.warn(e); }
        });
        break;
      }

      case 'messages_read': {
        this.readListeners.forEach(cb => {
          try {
            cb({
              readerId: msg.readerId,
              messageIds: msg.messageIds || [],
              readAt: msg.readAt
            });
          } catch (e) { console.warn(e); }
        });
        break;
      }

      case 'user_typing': {
        this.typingMap[msg.senderId] = !!msg.isTyping;
        this.typingListeners.forEach(cb => {
          try {
            cb({
              senderId: msg.senderId,
              senderName: msg.senderName,
              isTyping: !!msg.isTyping
            });
          } catch (e) { console.warn(e); }
        });
        break;
      }

      case 'pong':
        // Heartbeat ACK received
        break;
    }
  }

  // === Public Actions ===

  /**
   * Send a direct message through the real-time WebSocket connection.
   * Returns true if queued or sent over socket, false if offline (caller should use HTTP fallback).
   */
  public sendMessage(payload: {
    clientMessageId: string;
    receiverId: string;
    text: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
  }): boolean {
    if (this.status === 'live' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return this.send({
        type: 'send_message',
        payload
      });
    }
    return false;
  }

  /**
   * Send typing notification with automatic debounce and auto-stop
   */
  public handleTyping(receiverId: string) {
    if (this.status !== 'live') return;

    // If typing for a new receiver, stop old one
    if (this.currentTypingReceiverId && this.currentTypingReceiverId !== receiverId) {
      this.send({ type: 'typing_stop', receiverId: this.currentTypingReceiverId });
    }

    this.currentTypingReceiverId = receiverId;
    this.send({ type: 'typing_start', receiverId });

    if (this.typingDebounceTimer) {
      clearTimeout(this.typingDebounceTimer);
    }

    // Auto-stop typing after 2.5 seconds of inactivity
    this.typingDebounceTimer = setTimeout(() => {
      if (this.currentTypingReceiverId === receiverId) {
        this.send({ type: 'typing_stop', receiverId });
        this.currentTypingReceiverId = null;
      }
    }, 2500);
  }

  /**
   * Explicitly stop typing indicator
   */
  public stopTyping(receiverId?: string) {
    const target = receiverId || this.currentTypingReceiverId;
    if (target && this.status === 'live') {
      this.send({ type: 'typing_stop', receiverId: target });
    }
    if (this.typingDebounceTimer) {
      clearTimeout(this.typingDebounceTimer);
      this.typingDebounceTimer = null;
    }
    this.currentTypingReceiverId = null;
  }

  /**
   * Mark messages as read
   */
  public markAsRead(senderId: string, messageIds: string[]) {
    if (this.status === 'live' && senderId && messageIds.length > 0) {
      this.send({
        type: 'mark_read',
        senderId,
        messageIds
      });
    }
  }

  // === Event Subscription Helpers ===

  public onMessage(cb: MessageCallback) {
    this.messageListeners.add(cb);
    return () => { this.messageListeners.delete(cb); };
  }

  public onAck(cb: AckCallback) {
    this.ackListeners.add(cb);
    return () => { this.ackListeners.delete(cb); };
  }

  public onDelivered(cb: DeliveredCallback) {
    this.deliveredListeners.add(cb);
    return () => { this.deliveredListeners.delete(cb); };
  }

  public onRead(cb: ReadCallback) {
    this.readListeners.add(cb);
    return () => { this.readListeners.delete(cb); };
  }

  public onTyping(cb: TypingCallback) {
    this.typingListeners.add(cb);
    return () => { this.typingListeners.delete(cb); };
  }

  public onPresence(cb: PresenceCallback) {
    this.presenceListeners.add(cb);
    return () => { this.presenceListeners.delete(cb); };
  }

  public onStatusChange(cb: StatusCallback) {
    this.statusListeners.add(cb);
    return () => { this.statusListeners.delete(cb); };
  }
}

// Singleton Instance
export const chatSocket = new ChatSocketManager();
