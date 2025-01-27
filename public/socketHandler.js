// socketHandler.js
let socket;
let gameState = {
    isStarted: false,
    currentRoom: null,
    isCreator: false
};

function initializeSocket() {
    socket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling']
    });

    // Connection handlers
    socket.on('connect', () => {
        console.log('Connected to server');
        const roomCode = localStorage.getItem('roomCode');
        const username = localStorage.getItem('username');
        if (roomCode && username) {
            rejoinRoom(roomCode, username);
        }
    });

    // Room update handlers
    socket.on('roomUpdate', (roomInfo) => {
        gameState.currentRoom = roomInfo;
        updatePlayerList(roomInfo.players);
        updateGameControls(roomInfo);
    });

    socket.on('updatePlayers', (players) => {
        updatePlayerList(players);
    });

    // Game state handlers
    socket.on('gameStarted', (data) => {
        console.log("Game started event received", data);
        gameState.isStarted = true;
        
        // Hide lobby elements
        document.querySelector('.lobby-container')?.classList.add('hidden');
        
        // Show game elements
        document.querySelector('.game-container')?.classList.remove('hidden');
        
        // Initialize game with seed
        if (typeof initializeStreetView === 'function') {
            initializeStreetView(data.seed);
        }
        if (typeof gameLoop === 'function') {
            gameLoop(data.seed);
        }
    });

    socket.on('gameEnded', () => {
        gameState.isStarted = false;
        resetGameUI();
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
        showToast(error.message || 'An error occurred');
    });

    return socket;
}

function startGame() {
    const roomCode = localStorage.getItem('roomCode');
    const isCreator = localStorage.getItem('isCreator') === 'true';

    if (!isCreator) {
        showToast('Only the room creator can start the game');
        return;
    }

    socket.emit('startGame', roomCode, (response) => {
        if (!response.success) {
            showToast(response.message || 'Failed to start game');
        }
    });
}

function updatePlayerList(players) {
    const listContainer = document.getElementById('player-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');
        li.className = 'player-item';
        li.textContent = player;
        if (player === localStorage.getItem('username')) {
            li.classList.add('current-player');
        }
        listContainer.appendChild(li);
    });
}

function updateGameControls(roomInfo) {
    const startButton = document.getElementById('start-game');
    if (!startButton) return;

    const isCreator = localStorage.getItem('username') === roomInfo.creator;
    startButton.style.display = isCreator ? 'block' : 'none';
    startButton.disabled = gameState.isStarted;
}

function resetGameUI() {
    document.querySelector('.lobby-container')?.classList.remove('hidden');
    document.querySelector('.game-container')?.classList.add('hidden');
    if (typeof restartGame === 'function') {
        restartGame();
    }
}

function rejoinRoom(roomCode, username) {
    socket.emit('rejoinRoom', { roomCode, username }, (response) => {
        if (!response.success) {
            window.location.href = 'index.html';
        }
    });
}

export {
    initializeSocket,
    startGame,
    gameState
};