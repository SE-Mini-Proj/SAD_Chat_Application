// Maps socketId -> { userId, username, email, connectedAt }
const onlineSockets = new Map();

// Maps roomId -> Map(userId -> { username, isTyping, lastUpdated })
const typingState = new Map();

class PresenceService {
  static setUserOnline(socketId, userDetails) {
    onlineSockets.set(socketId, {
      userId: userDetails.id,
      username: userDetails.username,
      email: userDetails.email,
      connectedAt: new Date().toISOString()
    });

    return this.getOnlineUsers();
  }

  static setUserOffline(socketId) {
    const user = onlineSockets.get(socketId);
    onlineSockets.delete(socketId);

    // Clean up typing indicators for this user
    if (user) {
      typingState.forEach((roomUsers, roomId) => {
        if (roomUsers.has(user.userId)) {
          roomUsers.delete(user.userId);
        }
      });
    }

    return user ? { user, remainingOnline: this.getOnlineUsers() } : null;
  }

  static getOnlineUsers() {
    const userMap = new Map();
    onlineSockets.forEach((val) => {
      userMap.set(val.userId, {
        userId: val.userId,
        username: val.username,
        status: 'online',
        connectedAt: val.connectedAt
      });
    });
    return Array.from(userMap.values());
  }

  static setTypingStatus(roomId, userId, username, isTyping) {
    if (!typingState.has(roomId)) {
      typingState.set(roomId, new Map());
    }

    const roomTyping = typingState.get(roomId);

    if (isTyping) {
      roomTyping.set(userId, { username, isTyping: true, lastUpdated: Date.now() });
    } else {
      roomTyping.delete(userId);
    }

    return Array.from(roomTyping.values()).map(u => u.username);
  }

  static getActiveTypingInRoom(roomId) {
    if (!typingState.has(roomId)) return [];
    return Array.from(typingState.get(roomId).values()).map(u => u.username);
  }

  static resetPresence() {
    onlineSockets.clear();
    typingState.clear();
  }
}

module.exports = PresenceService;
