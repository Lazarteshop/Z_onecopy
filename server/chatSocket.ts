import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { DirectMessage } from '../src/types';

interface SocketSession {
  userId: string;
  userName: string;
  avatar: string;
  isAlive: boolean;
  connectedAt: number;
  lastPing: number;
}

interface ChatSocketDeps {
  loadDB: () => any;
  saveDB: (data: any, immediate?: boolean) => void;
  safeCloudSync: (op: 'set' | 'update' | 'delete', collection: string, docId: string, data?: any) => Promise<any>;
  isUserBanned: (db: any, userId: string) => boolean;
  filterSwearWords: (text: string) => string;
  findUserInSystem: (rawUserId: string, db: any) => any;
  activeUsersMap: Record<string, number>;
  sendPushNotificationToUser?: (userId: string, payload: any) => Promise<any>;
  handleAdminAutoReply?: (userId: string, text: string) => Promise<any>;
  verifyToken?: (token: string) => { valid: boolean; userId?: string; error?: string };
}

// In-Memory Real-Time State (ZERO Firestore writes for ephemeral events)
const userSockets = new Map<string, Set<WebSocket>>();
const socketSessions = new WeakMap<WebSocket, SocketSession>();
const typingTimers = new Map<string, NodeJS.Timeout>(); // key: `${senderId}:${receiverId}`
const userPresence = new Map<string, { isOnline: boolean; lastSeen: number }>();

// Lightweight Real-Time Diagnostics (No sensitive message content)
const diagnostics = {
  totalConnectionsEver: 0,
  reconnectCount: 0,
  failedDeliveries: 0,
  messagesDeliveredRealtime: 0,
  typingEventsRelayed: 0,
  readReceiptsProcessed: 0,
  startTime: Date.now()
};

let deps: ChatSocketDeps | null = null;
let wssInstance: WebSocketServer | null = null;

/**
 * Safely send a JSON message to a WebSocket
 */
function sendToSocket(ws: WebSocket, data: any): boolean {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
      return true;
    } catch (err) {
      console.warn('[ChatWS] Send failed:', err);
      return false;
    }
  }
  return false;
}

/**
 * Send a message to all connected sockets of a user
 */
function sendToUser(userId: string, data: any): number {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) return 0;
  let sentCount = 0;
  sockets.forEach((ws) => {
    if (sendToSocket(ws, data)) {
      sentCount++;
    }
  });
  return sentCount;
}

/**
 * Broadcast presence change to active clients
 */
function broadcastPresence(userId: string, isOnline: boolean, lastSeen: number) {
  const payload = {
    type: 'presence_update',
    userId,
    isOnline,
    lastSeen: new Date(lastSeen).toISOString()
  };

  // Broadcast to all connected sockets
  userSockets.forEach((sockets) => {
    sockets.forEach((ws) => {
      sendToSocket(ws, payload);
    });
  });
}

/**
 * Initialize the WebSocket Server attached to the HTTP Server
 */
export function initChatWebSocket(server: http.Server, dependencies: ChatSocketDeps): WebSocketServer {
  deps = dependencies;

  const wss = new WebSocketServer({ noServer: true });
  wssInstance = wss;

  server.on('upgrade', (request, socket, head) => {
    const host = request.headers.host || 'localhost';
    let pathname = '';
    try {
      const parsedUrl = new URL(request.url || '', `http://${host}`);
      pathname = parsedUrl.pathname;
    } catch {
      pathname = (request.url || '').split('?')[0];
    }

    if (pathname === '/api/chat/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
    // If not /api/chat/ws, do nothing so other upgrade listeners or Vite dev server can handle
  });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    diagnostics.totalConnectionsEver++;

    // Try to extract token from query param on handshake: /api/chat/ws?token=...
    let initialToken = '';
    try {
      const host = req.headers.host || 'localhost';
      const parsedUrl = new URL(req.url || '', `http://${host}`);
      initialToken = parsedUrl.searchParams.get('token') || '';
    } catch {}

    const session: SocketSession = {
      userId: '',
      userName: '',
      avatar: '👤',
      isAlive: true,
      connectedAt: Date.now(),
      lastPing: Date.now()
    };
    socketSessions.set(ws, session);

    // If token passed in URL, authenticate immediately
    if (initialToken) {
      authenticateSocket(ws, initialToken);
    }

    ws.on('message', (rawData: any) => {
      handleSocketMessage(ws, rawData);
    });

    ws.on('pong', () => {
      const s = socketSessions.get(ws);
      if (s) {
        s.isAlive = true;
        s.lastPing = Date.now();
      }
    });

    ws.on('close', () => {
      handleSocketClose(ws);
    });

    ws.on('error', (err) => {
      console.warn('[ChatWS] Socket error:', err);
    });
  });

  // Heartbeat & dead socket cleanup interval (every 25 seconds)
  const heartbeatInterval = setInterval(() => {
    const now = Date.now();
    wss.clients.forEach((ws) => {
      const s = socketSessions.get(ws);
      if (!s) {
        ws.terminate();
        return;
      }

      if (!s.isAlive || now - s.lastPing > 65000) {
        // Socket timed out
        ws.terminate();
        handleSocketClose(ws);
        return;
      }

      s.isAlive = false;
      try {
        ws.ping();
      } catch {
        ws.terminate();
      }
    });
  }, 25000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  console.log('⚡ [ChatWS] Real-time WebSocket server initialized on path /api/chat/ws');
  return wss;
}

/**
 * Authenticate socket with user token
 */
function authenticateSocket(ws: WebSocket, token: string): boolean {
  if (!deps) return false;
  const db = deps.loadDB();

  let targetUserId = token;
  if (deps.verifyToken) {
    const verif = deps.verifyToken(token);
    if (!verif.valid || !verif.userId) {
      sendToSocket(ws, { type: 'auth_error', message: 'Hindi valid o expired ang authentication token.' });
      ws.close(4001, 'Unauthorized');
      return false;
    }
    targetUserId = verif.userId;
  }

  const user = deps.findUserInSystem(targetUserId, db);

  if (!user) {
    sendToSocket(ws, { type: 'auth_error', message: 'Hindi kilala ang user o invalid ang token.' });
    ws.close(4001, 'Unauthorized');
    return false;
  }

  if (deps.isUserBanned(db, user.id)) {
    sendToSocket(ws, { type: 'auth_error', message: 'Banned ang iyong account sa system.' });
    ws.close(4003, 'User banned');
    return false;
  }

  const session = socketSessions.get(ws);
  if (session) {
    session.userId = user.id;
    session.userName = user.name;
    session.avatar = user.avatar || '👤';
    session.isAlive = true;
    session.lastPing = Date.now();
  }

  // Register in userSockets
  let sockets = userSockets.get(user.id);
  if (!sockets) {
    sockets = new Set<WebSocket>();
    userSockets.set(user.id, sockets);
  } else {
    diagnostics.reconnectCount++;
  }
  sockets.add(ws);

  // Update in-memory presence
  const now = Date.now();
  userPresence.set(user.id, { isOnline: true, lastSeen: now });
  if (deps.activeUsersMap) {
    deps.activeUsersMap[user.id] = now;
  }

  // Gather online user IDs
  const onlineUserIds = Array.from(userPresence.entries())
    .filter(([_, val]) => val.isOnline || (now - val.lastSeen < 60000))
    .map(([uid]) => uid);
  if (!onlineUserIds.includes('admin-rosco')) onlineUserIds.push('admin-rosco');
  if (!onlineUserIds.includes('user-juan')) onlineUserIds.push('user-juan');

  // Send ACK to client
  sendToSocket(ws, {
    type: 'auth_success',
    userId: user.id,
    userName: user.name,
    onlineUserIds,
    serverTime: new Date().toISOString()
  });

  // Broadcast presence to others
  broadcastPresence(user.id, true, now);
  return true;
}

/**
 * Handle incoming socket message
 */
function handleSocketMessage(ws: WebSocket, rawData: any) {
  if (!deps) return;

  let msg: any = null;
  try {
    const text = typeof rawData === 'string' ? rawData : rawData.toString();
    msg = JSON.parse(text);
  } catch {
    return; // Ignore malformed frames
  }

  if (!msg || typeof msg.type !== 'string') return;

  const session = socketSessions.get(ws);

  // 1. AUTHENTICATION
  if (msg.type === 'auth') {
    const token = msg.token || '';
    if (token) {
      authenticateSocket(ws, token);
    }
    return;
  }

  // Guard all subsequent events with authenticated session
  if (!session || !session.userId) {
    sendToSocket(ws, { type: 'auth_error', message: 'Kailangan mag-authenticate muna.' });
    return;
  }

  const senderId = session.userId;
  const now = Date.now();

  // Update heartbeat
  session.isAlive = true;
  session.lastPing = now;
  userPresence.set(senderId, { isOnline: true, lastSeen: now });
  if (deps.activeUsersMap) {
    deps.activeUsersMap[senderId] = now;
  }

  // 2. PING / HEARTBEAT
  if (msg.type === 'ping') {
    sendToSocket(ws, { type: 'pong', serverTime: new Date().toISOString() });
    return;
  }

  // 3. TYPING START / STOP (EPHEMERAL - 0 FIRESTORE WRITES)
  if (msg.type === 'typing_start') {
    const receiverId = msg.receiverId;
    if (!receiverId || receiverId === senderId) return;

    diagnostics.typingEventsRelayed++;
    const timerKey = `${senderId}:${receiverId}`;

    // Clear existing auto-stop timer if any
    const existingTimer = typingTimers.get(timerKey);
    if (existingTimer) clearTimeout(existingTimer);

    // Relay typing indicator to receiver
    sendToUser(receiverId, {
      type: 'user_typing',
      senderId,
      senderName: session.userName,
      isTyping: true
    });

    // Auto-stop typing after 3.5 seconds of silence
    const timer = setTimeout(() => {
      typingTimers.delete(timerKey);
      sendToUser(receiverId, {
        type: 'user_typing',
        senderId,
        senderName: session.userName,
        isTyping: false
      });
    }, 3500);
    typingTimers.set(timerKey, timer);
    return;
  }

  if (msg.type === 'typing_stop') {
    const receiverId = msg.receiverId;
    if (!receiverId) return;

    const timerKey = `${senderId}:${receiverId}`;
    const existingTimer = typingTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      typingTimers.delete(timerKey);
    }

    sendToUser(receiverId, {
      type: 'user_typing',
      senderId,
      senderName: session.userName,
      isTyping: false
    });
    return;
  }

  // 4. SEND MESSAGE (RELIABLE DELIVERY & ACK)
  if (msg.type === 'send_message') {
    const payload = msg.payload || {};
    const { receiverId, text, mediaUrl, mediaType, clientMessageId } = payload;

    if (!receiverId || ((!text || !text.trim()) && !mediaUrl)) {
      sendToSocket(ws, {
        type: 'error',
        error: 'Kinakailangan ang receiver at mensahe o media.',
        clientMessageId
      });
      diagnostics.failedDeliveries++;
      return;
    }

    const db = deps.loadDB();

    if (deps.isUserBanned(db, senderId)) {
      sendToSocket(ws, {
        type: 'error',
        error: 'Banned ang iyong account sa system.',
        clientMessageId
      });
      return;
    }

    // Server-Side Idempotency Check: prevent duplicate messages on reconnects/retries
    const dedupId = clientMessageId ? String(clientMessageId).trim() : '';
    if (dedupId && Array.isArray(db.directMessages)) {
      const existing = db.directMessages.find(
        (m: any) => (m.clientMessageId === dedupId || m.id === dedupId) && m.senderId === senderId
      );
      if (existing) {
        sendToSocket(ws, {
          type: 'message_ack',
          clientMessageId: dedupId,
          serverMessageId: existing.id,
          status: 'sent',
          createdAt: existing.createdAt,
          message: existing,
          deduped: true
        });
        return;
      }
    }

    const sender = deps.findUserInSystem(senderId, db);
    const receiver = deps.findUserInSystem(receiverId, db);

    if (!sender || !receiver) {
      sendToSocket(ws, {
        type: 'error',
        error: 'Hindi mahanap ang sender o receiver.',
        clientMessageId
      });
      diagnostics.failedDeliveries++;
      return;
    }

    const filteredText = text ? deps.filterSwearWords(text) : '';
    const newMsg: DirectMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
      clientMessageId: dedupId || undefined,
      senderId,
      senderName: sender.name,
      senderAvatar: sender.avatar || '👤',
      receiverId,
      receiverName: receiver.name,
      receiverAvatar: receiver.avatar || '👤',
      text: filteredText,
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaType || (mediaUrl ? (mediaUrl.match(/\.(mp4|webm|mov|ogg)$/i) ? 'video' : 'image') : undefined),
      createdAt: new Date().toISOString()
    };

    if (!db.directMessages) {
      db.directMessages = [];
    }
    db.directMessages.push(newMsg);
    deps.saveDB(db, true);

    // Secondary Cloud Sync (Queue-backed, quota safe)
    const { id: _, ...dmWithoutId } = newMsg;
    deps.safeCloudSync('set', 'direct_messages', newMsg.id, dmWithoutId);

    // 1. Send ACK back to sender
    sendToUser(senderId, {
      type: 'message_ack',
      clientMessageId: dedupId,
      serverMessageId: newMsg.id,
      status: 'sent',
      createdAt: newMsg.createdAt,
      message: newMsg
    });

    // 2. Deliver in real-time to receiver if connected
    const deliveredCount = sendToUser(receiverId, {
      type: 'new_message',
      message: newMsg
    });

    if (deliveredCount > 0) {
      diagnostics.messagesDeliveredRealtime++;
      // Notify sender that message was delivered
      sendToUser(senderId, {
        type: 'message_delivered',
        clientMessageId: dedupId,
        messageId: newMsg.id,
        deliveredAt: new Date().toISOString()
      });
    }

    // 3. Clear typing indicator for this conversation
    const timerKey = `${senderId}:${receiverId}`;
    const timer = typingTimers.get(timerKey);
    if (timer) {
      clearTimeout(timer);
      typingTimers.delete(timerKey);
      sendToUser(receiverId, {
        type: 'user_typing',
        senderId,
        senderName: session.userName,
        isTyping: false
      });
    }

    // 4. Send background push notification if enabled
    if (deps.sendPushNotificationToUser) {
      deps.sendPushNotificationToUser(receiverId, {
        title: `💬 ${sender.name}`,
        body: filteredText || (newMsg.mediaType === 'video' ? '📹 Nagpadala ng video' : '📷 Nagpadala ng litrato'),
        url: '/?tab=zone&zoneTab=messages',
        tag: `dm-${senderId}`
      });
    }

    // 5. Automated AI Admin response if chatting with admin
    if (receiverId === 'admin-rosco' && deps.handleAdminAutoReply) {
      deps.handleAdminAutoReply(senderId, text || 'Nagpadala ng media attachment').catch((err) => {
        console.error('Error generating admin auto reply in socket:', err);
      });
    }
    return;
  }

  // 5. MARK MESSAGES AS READ (COALESCED - 0 INSTANT FIRESTORE WRITES)
  if (msg.type === 'mark_read') {
    const senderIdToMark = msg.senderId; // The partner whose messages I am reading
    const messageIds = Array.isArray(msg.messageIds) ? msg.messageIds : [];

    if (!senderIdToMark) return;

    diagnostics.readReceiptsProcessed++;
    const readAt = new Date().toISOString();

    // Broadcast to sender that their messages were read
    sendToUser(senderIdToMark, {
      type: 'messages_read',
      readerId: senderId,
      messageIds,
      readAt
    });

    // Update in-memory DB without hammering disk on every frame
    const db = deps.loadDB();
    if (Array.isArray(db.directMessages)) {
      let updated = false;
      db.directMessages.forEach((m: any) => {
        if (m.senderId === senderIdToMark && m.receiverId === senderId) {
          if (!m.readAt) {
            m.readAt = readAt;
            updated = true;
          }
        }
      });
      if (updated) {
        deps.saveDB(db, false); // Debounced/deferred save
      }
    }
    return;
  }
}

/**
 * Handle socket disconnection and presence update
 */
function handleSocketClose(ws: WebSocket) {
  const session = socketSessions.get(ws);
  if (!session || !session.userId) return;

  const userId = session.userId;
  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.delete(ws);
    if (sockets.size === 0) {
      userSockets.delete(userId);
      const now = Date.now();
      userPresence.set(userId, { isOnline: false, lastSeen: now });
      broadcastPresence(userId, false, now);
    }
  }
}

/**
 * External hook called by HTTP POST /api/zone/messages or offline sync worker
 * Ensures messages sent via HTTP fallback are also broadcast over WebSockets!
 */
export function notifyNewDirectMessage(newMsg: DirectMessage) {
  if (!newMsg || !newMsg.receiverId) return;

  // Deliver to receiver
  const delivered = sendToUser(newMsg.receiverId, {
    type: 'new_message',
    message: newMsg
  });

  if (delivered > 0) {
    diagnostics.messagesDeliveredRealtime++;
    // Notify sender that message was delivered
    if (newMsg.senderId) {
      sendToUser(newMsg.senderId, {
        type: 'message_delivered',
        clientMessageId: newMsg.clientMessageId,
        messageId: newMsg.id,
        deliveredAt: new Date().toISOString()
      });
    }
  }
}

/**
 * Get real-time diagnostics for admin monitoring (No sensitive message contents)
 */
export function getChatDiagnostics() {
  const now = Date.now();
  const onlineUsers = Array.from(userPresence.entries())
    .filter(([_, val]) => val.isOnline)
    .map(([uid]) => uid);

  return {
    status: 'operational',
    connectedClients: wssInstance ? wssInstance.clients.size : 0,
    uniqueConnectedUsers: userSockets.size,
    onlineUsersCount: onlineUsers.length,
    activeTypingTimers: typingTimers.size,
    totalConnectionsEver: diagnostics.totalConnectionsEver,
    reconnectCount: diagnostics.reconnectCount,
    failedDeliveries: diagnostics.failedDeliveries,
    messagesDeliveredRealtime: diagnostics.messagesDeliveredRealtime,
    typingEventsRelayed: diagnostics.typingEventsRelayed,
    readReceiptsProcessed: diagnostics.readReceiptsProcessed,
    uptimeSeconds: Math.floor((now - diagnostics.startTime) / 1000),
    serverTimestamp: new Date().toISOString()
  };
}
