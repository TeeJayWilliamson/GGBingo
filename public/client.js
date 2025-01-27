const socket = io();
let isHost = false;
let roomCode = null;

function createRoom(username) {
  roomCode = generateRoomCode();
  socket.emit('createRoom', { username, roomCode });
}

function joinRoom(username, code) {
  roomCode = code;
  socket.emit('joinRoom', { username, roomCode });
}

socket.on('roomUpdate', (data) => {
  isHost = data.creator === socket.username;
  updateUI(data);
});

socket.on('bingoAnnouncement', (data) => {
  showWinner(data.winner);
});

function updateUI(roomData) {
  // Update UI based on room data and whether the player is host or not
  document.getElementById('startGameButton').style.display = isHost ? 'block' : 'none';
  // Update player list, room code display, etc.
}

function initializeGame() {
  // Initialize game UI and logic
}

function showWinner(winnerId) {
  // Display the winner and end the game
}

function generateRoomCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}
