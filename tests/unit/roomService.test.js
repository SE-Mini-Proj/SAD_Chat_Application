const RoomService = require('../../src/services/roomService');

describe('RoomService Unit Tests', () => {
  beforeEach(() => {
    RoomService.resetRooms();
  });

  test('should return default rooms initially', () => {
    const rooms = RoomService.getAllRooms();
    expect(rooms.length).toBe(2);
    expect(rooms.map(r => r.id)).toContain('general');
    expect(rooms.map(r => r.id)).toContain('tech');
  });

  test('should create a public chat room', () => {
    const room = RoomService.createRoom({
      name: 'Architecture Circle',
      description: 'System design discussions',
      isPrivate: false,
      createdBy: 'usr_123'
    });

    expect(room).toHaveProperty('id');
    expect(room.name).toBe('Architecture Circle');
    expect(room.isPrivate).toBe(false);
    expect(room.members).toContain('usr_123');
  });

  test('should create a private chat room with generated invite code', () => {
    const room = RoomService.createRoom({
      name: 'Secret Council',
      description: 'Private room',
      isPrivate: true,
      createdBy: 'usr_owner'
    });

    expect(room.isPrivate).toBe(true);
    expect(room.inviteCode).toBeDefined();
    expect(room.inviteCode.startsWith('INV-')).toBe(true);
  });

  test('should fail creating room without name', () => {
    expect(() => {
      RoomService.createRoom({ name: '', createdBy: 'usr_123' });
    }).toThrow('MISSING_ROOM_NAME');
  });

  test('should join public room without invite code', () => {
    const result = RoomService.joinRoom('general', 'usr_new_member');
    expect(result.roomId).toBe('general');
    expect(RoomService.isUserInRoom('general', 'usr_new_member')).toBe(true);
  });

  test('should enforce invite code for private room', () => {
    const privateRoom = RoomService.createRoom({
      name: 'VIP Room',
      isPrivate: true,
      inviteCode: 'SECRET123',
      createdBy: 'usr_admin'
    });

    // Attempt joining without invite code -> fail
    expect(() => {
      RoomService.joinRoom(privateRoom.id, 'usr_intruder');
    }).toThrow('INVALID_INVITE_CODE');

    // Attempt joining with correct invite code -> pass
    const joined = RoomService.joinRoom(privateRoom.id, 'usr_guest', 'SECRET123');
    expect(joined.roomId).toBe(privateRoom.id);
  });

  test('should handle leaving room correctly', () => {
    RoomService.joinRoom('tech', 'usr_dev');
    expect(RoomService.isUserInRoom('tech', 'usr_dev')).toBe(true);

    const left = RoomService.leaveRoom('tech', 'usr_dev');
    expect(left).toBe(true);
  });
});
