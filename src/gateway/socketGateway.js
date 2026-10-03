const AuthService = require('../services/authService');
const RoomService = require('../services/roomService');
const MessageService = require('../services/messageService');
const PresenceService = require('../services/presenceService');

function setupSocketGateway(io) {
  // Authentication middleware for Socket.IO handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('AUTHENTICATION_ERROR: Token is required for WebSocket connection'));
    }

    try {
      const decoded = AuthService.verifyToken(token);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('AUTHENTICATION_ERROR: Invalid or expired JWT token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    
    // Track user presence
    PresenceService.setUserOnline(socket.id, user);
    io.emit('presence:update', PresenceService.getOnlineUsers());

    // Join default room
    socket.join('general');

    // Handle room join request
    socket.on('room:join', ({ roomId, inviteCode }, callback) => {
      try {
        const roomInfo = RoomService.joinRoom(roomId, user.id, inviteCode);
        socket.join(roomId);

        // Fetch past messages for this room
        const history = MessageService.getRoomMessages(roomId, 50, 0);

        if (typeof callback === 'function') {
          callback({ status: 'ok', roomInfo, history });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ status: 'error', message: err.message });
        }
      }
    });

    // Handle sending message
    socket.on('message:send', ({ roomId, text, clientMsgId }, callback) => {
      try {
        if (!RoomService.isUserInRoom(roomId, user.id)) {
          throw new Error('FORBIDDEN: You must be a member of this room to send messages');
        }

        const savedMessage = MessageService.saveMessage({
          roomId,
          senderId: user.id,
          senderName: user.username,
          text,
          clientMsgId
        });

        // Broadcast to all sockets in room
        io.to(roomId).emit('message:receive', savedMessage);

        if (typeof callback === 'function') {
          callback({ status: 'ok', message: savedMessage });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ status: 'error', message: err.message });
        }
      }
    });

    // Handle typing indicators
    socket.on('typing:start', ({ roomId }) => {
      if (!roomId) return;
      const activeTyping = PresenceService.setTypingStatus(roomId, user.id, user.username, true);
      socket.to(roomId).emit('typing:update', { roomId, typingUsers: activeTyping });
    });

    socket.on('typing:stop', ({ roomId }) => {
      if (!roomId) return;
      const activeTyping = PresenceService.setTypingStatus(roomId, user.id, user.username, false);
      socket.to(roomId).emit('typing:update', { roomId, typingUsers: activeTyping });
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
      PresenceService.setUserOffline(socket.id);
      io.emit('presence:update', PresenceService.getOnlineUsers());
    });
  });
}

module.exports = setupSocketGateway;
