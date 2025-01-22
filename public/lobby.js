const SOCKET_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : 'https://ggbingo.onrender.com';  // Your production URL

const socket = io(SOCKET_URL);

let currentRoom = {
    roomCode: null,
    players: [],
    creator: null
};

document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username');
    const roomCode = localStorage.getItem('roomCode');
    const isCreator = localStorage.getItem('isCreator') === 'true';

    if (!username || !roomCode) {
        alert('Missing room or username. Redirecting to landing page.');
        window.location.href = 'index.html';
        return;
    }

    // Display room code
    document.getElementById('room-code').textContent = roomCode;

    // Join or create room
    socket.emit(isCreator ? 'createRoom' : 'joinRoom', { username, roomCode }, (success, message) => {
        if (!success) {
            alert(message || 'Failed to join/create room');
            window.location.href = 'index.html';
        }
    });

    // Update room information in real-time
    socket.on('roomUpdate', (roomInfo) => {
        currentRoom = roomInfo;
        updateUI();
    });

    socket.on('updatePlayers', (players) => {
        currentRoom.players = players;
        updateUI();
    });

    socket.on('roomCreationFailed', ({ message }) => {
        alert(message);
        window.location.href = 'index.html';
    });

    socket.on('joinFailed', ({ message }) => {
        alert(message);
        window.location.href = 'index.html';
    });

    // Handle starting the game
    document.getElementById('start-game').addEventListener('click', () => {
        if (currentRoom.creator === username) {
            socket.emit('startGame', currentRoom.roomCode);
        } else {
            alert('Only the room creator can start the game.');
        }
    });

    // Redirect to game page when the game starts
    socket.on('gameStarted', () => {
      console.log('Game started event received');
      alert('The game has started!');
      window.location.href = 'game.html';
  });
  
});

function updateUI() {
    // Update player list
    const listContainer = document.getElementById('player-list');
    listContainer.innerHTML = '';
    currentRoom.players.forEach((player) => {
        const li = document.createElement('li');
        li.textContent = player;
        listContainer.appendChild(li);
    });

    // Update start game button visibility
    const startButton = document.getElementById('start-game');
    startButton.style.display = (currentRoom.creator === localStorage.getItem('username')) ? 'block' : 'none';
}

console.log('username from localStorage:', localStorage.getItem('username'));
console.log('roomCode from localStorage:', localStorage.getItem('roomCode'));
