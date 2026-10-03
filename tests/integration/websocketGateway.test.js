const http = require('http');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const app = require('../../src/app');
const setupSocketGateway = require('../../src/gateway/socketGateway');
const AuthService = require('../../src/services/authService');
const RoomService = require('../../src/services/roomService');
const MessageService = require('../../src/services/messageService');
const PresenceService = require('../../src/services/presenceService');

describe('WebSocket Gateway Integration Tests', () => {
  let server, io, serverUrl, clientSocket1, clientSocket2, authToken1, authToken2;

  beforeAll((done) => {
    server = http.createServer(app);
    io = new Server(server, { cors: { origin: '*' } });
    setupSocketGateway(io);

    server.listen(0, () => {
      const port = server.address().port;
      serverUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll((done) => {
    io.close();
    server.close(done);
  });

  beforeEach(async () => {
    AuthService.resetUsers();
    RoomService.resetRooms();
    MessageService.resetMessages();
    PresenceService.resetPresence();

    const reg1 = await AuthService.register({
      email: 'alice_ws@example.com',
      username: 'aliceWS',
      password: 'password123'
    });

    const reg2 = await AuthService.register({
      email: 'bob_ws@example.com',
      username: 'bobWS',
      password: 'password123'
    });

    authToken1 = reg1.token;
    authToken2 = reg2.token;
  });

  afterEach(() => {
    if (clientSocket1 && clientSocket1.connected) clientSocket1.disconnect();
    if (clientSocket2 && clientSocket2.connected) clientSocket2.disconnect();
  });

  test('should reject WebSocket connection without valid token', (done) => {
    const unauthSocket = ioClient(serverUrl, {
      auth: { token: 'invalid_token' },
      reconnection: false
    });

    unauthSocket.on('connect_error', (err) => {
      expect(err.message).toContain('AUTHENTICATION_ERROR');
      unauthSocket.disconnect();
      done();
    });
  });

  test('should establish WSS connection with valid JWT token', (done) => {
    clientSocket1 = ioClient(serverUrl, {
      auth: { token: authToken1 }
    });

    clientSocket1.on('connect', () => {
      expect(clientSocket1.connected).toBe(true);
      done();
    });
  });

  test('should join room and broadcast message:send event to recipient', (done) => {
    clientSocket1 = ioClient(serverUrl, { auth: { token: authToken1 } });
    clientSocket2 = ioClient(serverUrl, { auth: { token: authToken2 } });

    let connectedCount = 0;
    const onConnect = () => {
      connectedCount++;
      if (connectedCount === 2) {
        clientSocket1.emit('message:send', {
          roomId: 'general',
          text: 'Hello from Alice to Bob!',
          clientMsgId: 'msg_uuid_101'
        }, (ack) => {
          expect(ack.status).toBe('ok');
          expect(ack.message.text).toBe('Hello from Alice to Bob!');
        });
      }
    };

    clientSocket1.on('connect', onConnect);
    clientSocket2.on('connect', onConnect);

    clientSocket2.on('message:receive', (msg) => {
      expect(msg.text).toBe('Hello from Alice to Bob!');
      expect(msg.senderName).toBe('aliceWS');
      done();
    });
  });

  test('should emit and receive typing indicator updates between room members', (done) => {
    clientSocket1 = ioClient(serverUrl, { auth: { token: authToken1 } });
    clientSocket2 = ioClient(serverUrl, { auth: { token: authToken2 } });

    let connectedCount = 0;
    const onConnect = () => {
      connectedCount++;
      if (connectedCount === 2) {
        clientSocket1.emit('typing:start', { roomId: 'general' });
      }
    };

    clientSocket1.on('connect', onConnect);
    clientSocket2.on('connect', onConnect);

    clientSocket2.on('typing:update', (data) => {
      expect(data.roomId).toBe('general');
      expect(data.typingUsers).toContain('aliceWS');
      done();
    });
  });
});
