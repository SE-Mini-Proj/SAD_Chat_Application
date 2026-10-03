const express = require('express');
const cors = require('cors');
const path = require('path');
const AuthService = require('./services/authService');
const RoomService = require('./services/roomService');
const MessageService = require('./services/messageService');
const PresenceService = require('./services/presenceService');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SAD Real-Time Chat Application Server',
    uptime: process.uptime()
  });
});

// AUTH ENDPOINTS
app.post('/api/auth/register', async (req, res) => {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    const isValidationError = err.message.startsWith('MISSING_FIELDS') || 
                            err.message.startsWith('INVALID_EMAIL') || 
                            err.message.startsWith('WEAK_PASSWORD') || 
                            err.message.startsWith('EMAIL_EXISTS') || 
                            err.message.startsWith('USERNAME_EXISTS');
    res.status(isValidationError ? 400 : 500).json({
      error: {
        code: err.message.split(':')[0] || 'REGISTRATION_FAILED',
        message: err.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const result = await AuthService.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    const isAuthError = err.message.startsWith('INVALID_CREDENTIALS') || err.message.startsWith('MISSING_FIELDS');
    res.status(isAuthError ? 401 : 500).json({
      error: {
        code: err.message.split(':')[0] || 'LOGIN_FAILED',
        message: err.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ROOM ENDPOINTS (Protected)
app.get('/api/rooms', authMiddleware, (req, res) => {
  try {
    const rooms = RoomService.getAllRooms();
    res.json({ status: 'ok', rooms });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.post('/api/rooms', authMiddleware, (req, res) => {
  try {
    const { name, description, isPrivate, inviteCode } = req.body;
    const room = RoomService.createRoom({
      name,
      description,
      isPrivate,
      inviteCode,
      createdBy: req.user.id
    });
    res.status(201).json({ status: 'ok', room });
  } catch (err) {
    res.status(400).json({ error: { code: err.message.split(':')[0], message: err.message } });
  }
});

app.post('/api/rooms/:roomId/join', authMiddleware, (req, res) => {
  try {
    const { inviteCode } = req.body;
    const roomInfo = RoomService.joinRoom(req.params.roomId, req.user.id, inviteCode);
    res.json({ status: 'ok', roomInfo });
  } catch (err) {
    const isForbidden = err.message.startsWith('INVALID_INVITE_CODE');
    const isNotFound = err.message.startsWith('ROOM_NOT_FOUND');
    res.status(isForbidden ? 403 : (isNotFound ? 404 : 400)).json({
      error: { code: err.message.split(':')[0], message: err.message }
    });
  }
});

// MESSAGE HISTORY ENDPOINT (Protected)
app.get('/api/rooms/:roomId/messages', authMiddleware, (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    if (!RoomService.isUserInRoom(roomId, req.user.id)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You must join this room to access message history' }
      });
    }

    const messages = MessageService.getRoomMessages(roomId, limit, offset);
    res.json({ status: 'ok', roomId, count: messages.length, messages });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// ONLINE USERS ENDPOINT (Protected)
app.get('/api/users/online', authMiddleware, (req, res) => {
  const users = PresenceService.getOnlineUsers();
  res.json({ status: 'ok', count: users.length, users });
});

module.exports = app;
