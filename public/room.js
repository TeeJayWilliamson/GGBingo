document.addEventListener('DOMContentLoaded', () => {
    const players = {}; // Store players per room
    let currentRoom = null;
    let isCreator = false;
  
    // Generate a unique room code
    function generateRoomCode() {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
  
    // Handle room creation
    document.getElementById('create-room').addEventListener('click', () => {
      currentRoom = generateRoomCode();
      players[currentRoom] = [];
      isCreator = true;
  
      // Display the room code and show the lobby
      document.getElementById('room-code').textContent = currentRoom;
      document.getElementById('room-code-container').classList.remove('hidden');
      document.getElementById('lobby-room-code').textContent = currentRoom;
      document.getElementById('lobby-container').classList.remove('hidden');
      document.getElementById('start-game').classList.remove('hidden');
  
      console.log(`Room created: ${currentRoom}`);
    });
  
    // Handle joining a room
    document.getElementById('join-room').addEventListener('click', () => {
      const inputCode = document.getElementById('room-code-input').value.trim();
      const username = prompt('Enter your username (max 12 characters):').trim().substring(0, 12);
  
      if (!inputCode || !username) {
        alert('Please enter a valid room code and username.');
        return;
      }
  
      if (!players[inputCode]) {
        players[inputCode] = [];
      }
  
      currentRoom = inputCode;
      players[inputCode].push(username);
  
      // Update the lobby UI
      document.getElementById('lobby-room-code').textContent = inputCode;
      document.getElementById('lobby-container').classList.remove('hidden');
  
      updatePlayerList(inputCode);
  
      alert(`${username} joined the room: ${inputCode}`);
      console.log(`${username} joined room: ${inputCode}`);
    });
  
    // Update player list in the lobby
    function updatePlayerList(room) {
      const playerList = document.getElementById('player-list');
      playerList.innerHTML = ''; // Clear existing list
  
      players[room].forEach((player) => {
        const li = document.createElement('li');
        li.textContent = player;
        playerList.appendChild(li);
      });
    }
  
    // Handle starting the game
    document.getElementById('start-game').addEventListener('click', () => {
      if (isCreator) {
        alert(`Game is starting! Players: ${players[currentRoom].join(', ')}`);
        console.log('Game started!');
      } else {
        alert('Only the room creator can start the game.');
      }
    });
  });
  