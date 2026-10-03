const PresenceService = require('../../src/services/presenceService');

describe('PresenceService Unit Tests', () => {
  beforeEach(() => {
    PresenceService.resetPresence();
  });

  test('should track user online status on connection', () => {
    const onlineList = PresenceService.setUserOnline('socket_100', {
      id: 'usr_alice',
      username: 'Alice',
      email: 'alice@example.com'
    });

    expect(onlineList.length).toBe(1);
    expect(onlineList[0].username).toBe('Alice');
    expect(onlineList[0].status).toBe('online');
  });

  test('should handle user disconnect and clean presence state', () => {
    PresenceService.setUserOnline('socket_100', {
      id: 'usr_alice',
      username: 'Alice'
    });

    const offlineResult = PresenceService.setUserOffline('socket_100');
    expect(offlineResult.user.userId).toBe('usr_alice');
    expect(offlineResult.remainingOnline.length).toBe(0);
  });

  test('should update and query typing status per room', () => {
    PresenceService.setTypingStatus('room_1', 'usr_alice', 'Alice', true);
    let typingUsers = PresenceService.getActiveTypingInRoom('room_1');
    expect(typingUsers).toContain('Alice');

    PresenceService.setTypingStatus('room_1', 'usr_alice', 'Alice', false);
    typingUsers = PresenceService.getActiveTypingInRoom('room_1');
    expect(typingUsers).not.toContain('Alice');
  });
});
