let rooms = [
  {
    id: 'general',
    name: 'General Chat',
    description: 'Default public room for general discussion',
    isPrivate: false,
    members: [],
    createdBy: 'system',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tech',
    name: 'Tech & Engineering',
    description: 'Discussions on software architecture and socket design',
    isPrivate: false,
    members: [],
    createdBy: 'system',
    createdAt: new Date().toISOString()
  }
];

class RoomService {
  static getAllRooms() {
    return rooms.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isPrivate: r.isPrivate,
      memberCount: r.members.length,
      createdBy: r.createdBy,
      createdAt: r.createdAt
    }));
  }

  static getRoomById(roomId) {
    return rooms.find(r => r.id === roomId) || null;
  }

  static createRoom({ name, description, isPrivate = false, inviteCode = null, createdBy }) {
    if (!name || name.trim().length === 0) {
      throw new Error('MISSING_ROOM_NAME: Room name is required');
    }

    const roomId = `rm_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const newRoom = {
      id: roomId,
      name: name.trim(),
      description: description || '',
      isPrivate: Boolean(isPrivate),
      inviteCode: isPrivate ? (inviteCode || `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`) : null,
      members: [createdBy],
      createdBy,
      createdAt: new Date().toISOString()
    };

    rooms.push(newRoom);
    return newRoom;
  }

  static joinRoom(roomId, userId, inviteCode = null) {
    const room = this.getRoomById(roomId);
    if (!room) {
      throw new Error('ROOM_NOT_FOUND: Chat room does not exist');
    }

    if (room.isPrivate) {
      if (!inviteCode || inviteCode !== room.inviteCode) {
        throw new Error('INVALID_INVITE_CODE: Valid invite code is required to join private room');
      }
    }

    if (!room.members.includes(userId)) {
      room.members.push(userId);
    }

    return {
      roomId: room.id,
      name: room.name,
      isPrivate: room.isPrivate,
      memberCount: room.members.length
    };
  }

  static leaveRoom(roomId, userId) {
    const room = this.getRoomById(roomId);
    if (!room) return false;

    room.members = room.members.filter(id => id !== userId);
    return true;
  }

  static isUserInRoom(roomId, userId) {
    const room = this.getRoomById(roomId);
    if (!room) return false;
    if (!room.isPrivate) return true; // Public rooms allow anyone to view/send
    return room.members.includes(userId);
  }

  static resetRooms() {
    rooms = [
      {
        id: 'general',
        name: 'General Chat',
        description: 'Default public room for general discussion',
        isPrivate: false,
        members: [],
        createdBy: 'system',
        createdAt: new Date().toISOString()
      },
      {
        id: 'tech',
        name: 'Tech & Engineering',
        description: 'Discussions on software architecture and socket design',
        isPrivate: false,
        members: [],
        createdBy: 'system',
        createdAt: new Date().toISOString()
      }
    ];
  }
}

module.exports = RoomService;
