import { config } from './config.js';
const socket = io(config.URL, {
    withCredentials: true,
    transports: ['websocket', 'polling']
});

// Add error handling
socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
  alert('Unable to connect to game server. Please try again later.');
});

const SOCKET_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : 'https://ggbingo.onrender.com';  // Your production URL


document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('create-room').addEventListener('click', () => {
    const username = document.getElementById('username').value.trim().substring(0, 12);
    if (!username) {
      alert('Please enter a valid username.');
      return;
    }
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    socket.emit('createRoom', { username, roomCode }, (success) => {
      if (success) {
        localStorage.setItem('username', username);
        localStorage.setItem('roomCode', roomCode);
        localStorage.setItem('isCreator', 'true');
        window.location.href = 'lobby.html';
      } else {
        alert('Failed to create room. Please try again.');
      }
    });
  });

  document.getElementById('join-room').addEventListener('click', () => {
    const username = document.getElementById('username').value.trim().substring(0, 12);
    const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (!username || !roomCode) {
      alert('Please enter a valid username and room code.');
      return;
    }
    
    socket.emit('joinRoom', { username, roomCode }, (success) => {
      if (success) {
        localStorage.setItem('username', username);
        localStorage.setItem('roomCode', roomCode);
        localStorage.setItem('isCreator', 'false');
        window.location.href = 'lobby.html';
      } else {
        alert('Failed to join room. Please check the room code and try again.');
      }
    });
  });
});
