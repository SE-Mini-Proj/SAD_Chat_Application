const request = require('supertest');
const app = require('../../src/app');
const AuthService = require('../../src/services/authService');
const RoomService = require('../../src/services/roomService');
const MessageService = require('../../src/services/messageService');

describe('REST API Integration Tests', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    AuthService.resetUsers();
    RoomService.resetRooms();
    MessageService.resetMessages();

    // Register test user
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'api_user@example.com',
        username: 'apiUser',
        password: 'password123'
      });

    authToken = res.body.token;
    testUser = res.body.user;
  });

  describe('GET /api/health', () => {
    test('should return 200 OK with server health metadata', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  describe('POST /api/auth/register & login', () => {
    test('should register a new user via REST', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          username: 'newUser',
          password: 'password123'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.username).toBe('newUser');
    });

    test('should login user with correct credentials via REST', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'api_user@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    test('should return 401 for invalid login credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'api_user@example.com',
          password: 'WrongPassword'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Protected Room & Message Endpoints', () => {
    test('should reject request without Bearer token with 401', async () => {
      const res = await request(app).get('/api/rooms');
      expect(res.statusCode).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('should return room list when authorized', async () => {
      const res = await request(app)
        .get('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.rooms)).toBe(true);
      expect(res.body.rooms.length).toBeGreaterThanOrEqual(2);
    });

    test('should create a new room when authorized', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Integration Room',
          description: 'Testing via supertest',
          isPrivate: false
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.room.name).toBe('Integration Room');
    });

    test('should retrieve room message history', async () => {
      // Save dummy message
      MessageService.saveMessage({
        roomId: 'general',
        senderId: testUser.id,
        senderName: testUser.username,
        text: 'Hello integration test'
      });

      const res = await request(app)
        .get('/api/rooms/general/messages')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.messages[0].text).toBe('Hello integration test');
    });
  });
});
