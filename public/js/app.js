document.addEventListener('DOMContentLoaded', () => {
  // STATE
  let currentUser = null;
  let token = localStorage.getItem('chat_token');
  let currentRoom = 'general';
  let socket = null;
  let typingTimeout = null;

  // DOM ELEMENTS
  const authOverlay = document.getElementById('auth-overlay');
  const chatApp = document.getElementById('chat-app');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginError = document.getElementById('login-error');
  const regError = document.getElementById('reg-error');

  const currentUsername = document.getElementById('current-username');
  const currentAvatar = document.getElementById('current-avatar');
  const btnLogout = document.getElementById('btn-logout');

  const roomsList = document.getElementById('rooms-list');
  const onlineUsersList = document.getElementById('online-users-list');
  const onlineCountBadge = document.getElementById('online-count-badge');

  const activeRoomName = document.getElementById('active-room-name');
  const activeRoomDesc = document.getElementById('active-room-desc');
  const messagesContainer = document.getElementById('messages-container');
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');

  const typingBar = document.getElementById('typing-bar');
  const typingText = document.getElementById('typing-text');
  const socketStatusDot = document.getElementById('socket-status-dot');
  const socketStatusText = document.getElementById('socket-status-text');

  const modalCreateRoom = document.getElementById('modal-create-room');
  const btnNewRoom = document.getElementById('btn-new-room');
  const btnCancelRoom = document.getElementById('btn-cancel-room');
  const formCreateRoom = document.getElementById('form-create-room');

  // TAB SWITCHING
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.classList.add('active');
    formRegister.classList.remove('active');
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.classList.add('active');
    formLogin.classList.remove('active');
  });

  // LOGIN SUBMIT
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error?.message || 'Login failed');

      token = data.token;
      currentUser = data.user;
      localStorage.setItem('chat_token', token);
      localStorage.setItem('chat_user', JSON.stringify(currentUser));
      initApp();
    } catch (err) {
      loginError.textContent = err.message;
    }
  });

  // REGISTER SUBMIT
  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    regError.textContent = '';
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error?.message || 'Registration failed');

      token = data.token;
      currentUser = data.user;
      localStorage.setItem('chat_token', token);
      localStorage.setItem('chat_user', JSON.stringify(currentUser));
      initApp();
    } catch (err) {
      regError.textContent = err.message;
    }
  });

  // LOGOUT
  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('chat_token');
    localStorage.removeItem('chat_user');
    if (socket) socket.disconnect();
    location.reload();
  });

  // INITIALIZE APP AFTER AUTH
  function initApp() {
    const cachedUser = localStorage.getItem('chat_user');
    if (cachedUser) currentUser = JSON.parse(cachedUser);

    if (!token || !currentUser) {
      authOverlay.classList.remove('hidden');
      chatApp.classList.add('hidden');
      return;
    }

    authOverlay.classList.add('hidden');
    chatApp.classList.remove('hidden');

    currentUsername.textContent = currentUser.username;
    currentAvatar.textContent = currentUser.username.charAt(0).toUpperCase();

    fetchRooms();
    connectSocket();
  }

  // SOCKET.IO CONNECTION
  function connectSocket() {
    socket = io({
      auth: { token }
    });

    socket.on('connect', () => {
      socketStatusDot.className = 'dot connected';
      socketStatusText.textContent = 'Connected via WSS';
      joinRoom('general');
    });

    socket.on('disconnect', () => {
      socketStatusDot.className = 'dot';
      socketStatusText.textContent = 'Disconnected';
    });

    socket.on('message:receive', (msg) => {
      if (msg.roomId === currentRoom) {
        appendMessage(msg);
      }
    });

    socket.on('presence:update', (users) => {
      renderOnlineUsers(users);
    });

    socket.on('typing:update', ({ roomId, typingUsers }) => {
      if (roomId === currentRoom) {
        const others = typingUsers.filter(u => u !== currentUser.username);
        if (others.length > 0) {
          typingText.textContent = `${others.join(', ')} is typing...`;
          typingBar.classList.remove('hidden');
        } else {
          typingBar.classList.add('hidden');
        }
      }
    });
  }

  // FETCH ROOMS
  async function fetchRooms() {
    try {
      const res = await fetch('/api/rooms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        renderRooms(data.rooms);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  }

  function renderRooms(rooms) {
    roomsList.innerHTML = '';
    rooms.forEach(r => {
      const div = document.createElement('div');
      div.className = `room-item ${r.id === currentRoom ? 'active' : ''}`;
      div.innerHTML = `
        <span>${r.isPrivate ? '🔒' : '#'} ${r.name}</span>
        ${r.isPrivate ? '<span class="badge">Private</span>' : ''}
      `;
      div.addEventListener('click', () => {
        joinRoom(r.id);
      });
      roomsList.appendChild(div);
    });
  }

  function joinRoom(roomId) {
    currentRoom = roomId;
    fetchRooms();

    socket.emit('room:join', { roomId }, (response) => {
      if (response && response.status === 'ok') {
        activeRoomName.textContent = response.roomInfo ? response.roomInfo.name : roomId;
        messagesContainer.innerHTML = '';
        if (response.history) {
          response.history.forEach(appendMessage);
        }
      }
    });
  }

  function renderOnlineUsers(users) {
    onlineUsersList.innerHTML = '';
    onlineCountBadge.textContent = users.length;
    users.forEach(u => {
      const div = document.createElement('div');
      div.className = 'user-item';
      div.innerHTML = `
        <div class="user-badge">
          <div class="avatar" style="width:28px;height:28px;font-size:12px;">${u.username.charAt(0).toUpperCase()}</div>
          <span style="font-size:13px;">${u.username}</span>
        </div>
        <span class="status-indicator">●</span>
      `;
      onlineUsersList.appendChild(div);
    });
  }

  function appendMessage(msg) {
    const isSentByMe = msg.senderId === currentUser.id;
    const div = document.createElement('div');
    div.className = `message-bubble ${isSentByMe ? 'sent' : 'received'}`;
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
      <div class="message-meta">
        <strong>${isSentByMe ? 'You' : msg.senderName}</strong>
        <span>${time}</span>
      </div>
      <div>${escapeHtml(msg.text)}</div>
    `;

    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // MESSAGE SUBMIT
  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    socket.emit('message:send', { roomId: currentRoom, text }, (ack) => {
      if (ack && ack.status === 'ok') {
        messageInput.value = '';
        socket.emit('typing:stop', { roomId: currentRoom });
      }
    });
  });

  // TYPING DETECTOR
  messageInput.addEventListener('input', () => {
    socket.emit('typing:start', { roomId: currentRoom });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit('typing:stop', { roomId: currentRoom });
    }, 2000);
  });

  // CREATE ROOM MODAL
  btnNewRoom.addEventListener('click', () => modalCreateRoom.classList.remove('hidden'));
  btnCancelRoom.addEventListener('click', () => modalCreateRoom.classList.add('hidden'));

  formCreateRoom.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('room-name').value;
    const description = document.getElementById('room-desc').value;
    const isPrivate = document.getElementById('room-private').checked;

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, description, isPrivate })
      });
      const data = await res.json();

      if (res.ok) {
        modalCreateRoom.classList.add('hidden');
        formCreateRoom.reset();
        fetchRooms();
        joinRoom(data.room.id);
      }
    } catch (err) {
      alert('Error creating room: ' + err.message);
    }
  });

  // START
  initApp();
});
