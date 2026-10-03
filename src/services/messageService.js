// In-memory message store: roomId -> Array of messages
let messageStore = new Map();

class MessageService {
  static saveMessage({ roomId, senderId, senderName, text, clientMsgId = null }) {
    if (!roomId || !senderId || !text || text.trim().length === 0) {
      throw new Error('INVALID_MESSAGE_PAYLOAD: Room ID, sender ID, and non-empty text are required');
    }

    if (text.length > 4000) {
      throw new Error('MESSAGE_TOO_LONG: Text content exceeds maximum allowed length of 4000 characters');
    }

    const message = {
      messageId: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      clientMsgId: clientMsgId || null,
      roomId,
      senderId,
      senderName,
      text: text.trim(),
      timestamp: new Date().toISOString()
    };

    if (!messageStore.has(roomId)) {
      messageStore.set(roomId, []);
    }

    messageStore.get(roomId).push(message);

    return message;
  }

  static getRoomMessages(roomId, limit = 50, offset = 0) {
    if (!messageStore.has(roomId)) {
      return [];
    }

    const allMessages = messageStore.get(roomId);
    // Return sorted newest first or chronologically
    const start = Math.max(0, allMessages.length - offset - limit);
    const end = allMessages.length - offset;
    return allMessages.slice(start, end);
  }

  static resetMessages() {
    messageStore.clear();
  }
}

module.exports = MessageService;
