let panorama;
let bingoItems = ['Car', 'Tree', 'Building', 'Road Sign', 'Pedestrian', 'Bicycle', 'Traffic Light', 'Bus Stop', 'Bridge', 'Park', 'Restaurant', 'School', 'Church', 'Hospital', 'Police Station', 'Fire Hydrant', 'Mailbox', 'Bench', 'Fountain', 'Statue', 'Flag', 'Crosswalk', 'Billboard', 'Parking Meter', 'Street Lamp'];
let currentItems = [];
let timer;
let timeLeft = 30;
let gameInProgress = false;

console.log("Script loaded");

function initGame() {
    console.log("initGame called");
    createBingoBoard();
    initializeStreetView();
    document.getElementById('start-game').addEventListener('click', gameLoop);
}

function createBingoBoard() {
    const board = document.getElementById('bingo-board');
    board.innerHTML = '';
    currentItems = shuffleArray(bingoItems).slice(0, 25);
    currentItems.forEach(item => {
        const cell = document.createElement('div');
        cell.textContent = item;
        cell.className = 'bingo-cell';
        cell.addEventListener('click', () => toggleCell(cell));
        board.appendChild(cell);
    });
}

function toggleCell(cell) {
    cell.classList.toggle('marked');
    checkForBingo();
}

function initializeStreetView() {
    panorama = new google.maps.StreetViewPanorama(
        document.getElementById('streetview-container'),
        {
            position: {lat: 37.869260, lng: -122.254811},
            pov: {heading: 165, pitch: 0},
            zoom: 1,
            addressControl: false,
            linksControl: false,
            panControl: false,
            enableCloseButton: false
        }
    );
}

function getRandomStreetView() {
    const lat = (Math.random() * 170) - 85;
    const lng = (Math.random() * 360) - 180;
    const sv = new google.maps.StreetViewService();
    sv.getPanorama({location: {lat: lat, lng: lng}, radius: 100000}, (data, status) => {
        if (status === google.maps.StreetViewStatus.OK) {
            panorama.setPano(data.location.pano);
            panorama.setPov({heading: 270, pitch: 0});
            panorama.setVisible(true);
        } else {
            console.error('Street View data not found for this location.');
            getRandomStreetView(); // Try again
        }
    });
}

function showStreetView(duration) {
    return new Promise(resolve => {
        timeLeft = duration / 1000;
        updateTimer();
        timer = setInterval(() => {
            timeLeft--;
            updateTimer();
            if (timeLeft <= 0) {
                clearInterval(timer);
                panorama.setVisible(false);
                resolve();
            }
        }, 1000);
    });
}

function updateTimer() {
    document.getElementById('timer').textContent = `Time left: ${timeLeft}s`;
}

function checkForBingo() {
    const cells = Array.from(document.querySelectorAll('.bingo-cell'));
    const rows = [0, 1, 2, 3, 4].map(i => cells.slice(i*5, (i+1)*5));
    const cols = [0, 1, 2, 3, 4].map(i => cells.filter((_, index) => index % 5 === i));
    const diags = [
        [cells[0], cells[6], cells[12], cells[18], cells[24]],
        [cells[4], cells[8], cells[12], cells[16], cells[20]]
    ];

    const lines = [...rows, ...cols, ...diags];
    const bingo = lines.some(line => line.every(cell => cell.classList.contains('marked')));

    if (bingo) {
        alert('BINGO! You won!');
        stopGame();
    }
}

function stopGame() {
    clearTimeout(window.gameLoopTimeout);
    document.getElementById('start-game').removeEventListener('click', gameLoop);
    const cells = document.querySelectorAll('.bingo-cell');
    cells.forEach(cell => {
        cell.style.pointerEvents = 'none';
    });
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    updateStartButton();
}

function updateStartButton() {
    const startButton = document.getElementById('start-game');
    startButton.textContent = 'Restart Game';
    startButton.removeEventListener('click', gameLoop);
    startButton.addEventListener('click', restartGame);
}

function restartGame() {
    location.reload();
}

function gameLoop() {
    if (gameInProgress) return;
    gameInProgress = true;
    console.log("gameLoop called");
    getRandomStreetView();
    panorama.setVisible(true);
    showStreetView(30000).then(() => {
        console.log("Street view finished");
        gameInProgress = false;
        updateStartButton();
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function gm_authFailure() {
    console.error("Google Maps failed to load!");
    alert("Failed to load Google Maps. Please check your API key and try again.");
}

// Initialize the game when the Google Maps API is loaded
window.initGame = initGame;
