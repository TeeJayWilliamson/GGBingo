let panorama;
const INITIAL_TIME = 20;
const bingoItems = [
    'Car', 'Tree', 'Building', 'Road Sign', 'Pedestrian', 'Bicycle',
    'Traffic Light', 'Bus Stop', 'Bridge', 'Park', 'Restaurant',
    'School', 'Church', 'Hospital', 'Police Station', 'Fire Hydrant',
    'Mailbox', 'Bench', 'Fountain', 'Statue', 'Flag',
    'Crosswalk', 'Billboard', 'Parking Meter', 'Street Lamp'
];
let currentItems = [];
let timer;
let timeLeft = INITIAL_TIME;
let gameInProgress = false;

console.log("Script loaded");

function initGame() {
    console.log("initGame called");
    if (typeof google === 'undefined') {
        console.error("Google Maps not loaded!");
        return;
    }
    createBingoBoard();
    initializeStreetView();
    const startButton = document.getElementById('start-game');
    startButton.removeEventListener('click', gameLoop);
    startButton.addEventListener('click', gameLoop);
}

function createBingoBoard() {
    const board = document.getElementById('bingo-board');
    if (!board) {
        console.error("Bingo board element not found!");
        return;
    }
    board.innerHTML = '';
    currentItems = shuffleArray([...bingoItems]).slice(0, 25);
    currentItems.forEach(item => {
        const cell = document.createElement('div');
        cell.textContent = item;
        cell.className = 'bingo-cell';
        cell.addEventListener('click', () => toggleCell(cell));
        board.appendChild(cell);
    });
}

function toggleCell(cell) {
    if (!gameInProgress) return;
    cell.classList.toggle('marked');
    checkForBingo();
}

function initializeStreetView() {
    try {
        const streetviewContainer = document.getElementById('streetview-container');
        if (!streetviewContainer) {
            console.error("Streetview container not found!");
            return;
        }
        
        panorama = new google.maps.StreetViewPanorama(
            streetviewContainer,
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
        
        panorama.addListener('status_changed', () => {
            if (panorama.getStatus() !== google.maps.StreetViewStatus.OK) {
                console.error('Failed to load Street View for current location');
                getRandomStreetView();
            }
        });
        
    } catch (error) {
        console.error("Error initializing Street View:", error);
    }
}

function getRandomStreetView() {
    const lat = (Math.random() * 170) - 85;
    const lng = (Math.random() * 360) - 180;
    
    const sv = new google.maps.StreetViewService();
    
    sv.getPanorama({location: {lat, lng}, radius: 100000}, (data, status) => {
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

function setTimer(duration) {
    timeLeft = Math.floor(duration / 1000);
    updateTimer();
    if (timer) clearInterval(timer);
    
    timer = setInterval(() => {
        if (!gameInProgress) {
            clearInterval(timer);
            return;
        }
        
        timeLeft--;
        updateTimer();
        
        if (timeLeft <= 0) {
            getRandomStreetView(); // Get new street view
            timeLeft = INITIAL_TIME; // Reset timer
            updateTimer();
        }
    }, 1000);
}

function showStreetView(duration) {
    return new Promise(resolve => {
        setTimer(duration);
        resolve(); // Resolve immediately to keep the game loop going
    });
}

function updateTimer() {
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.textContent = `Time left: ${timeLeft}s`;
    }
}

function checkForBingo() {
    const cells = Array.from(document.querySelectorAll('.bingo-cell'));
    
    const rows = [0, 1, 2, 3, 4].map(i => cells.slice(i * 5, (i + 1) * 5));
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
    if (window.gameLoopTimeout) {
        clearTimeout(window.gameLoopTimeout);
    }
    
    const startButton = document.getElementById('start-game');
    if (startButton) {
        startButton.removeEventListener('click', gameLoop);
    }
    
    const cells = document.querySelectorAll('.bingo-cell');
    cells.forEach(cell => {
        cell.style.pointerEvents = 'none';
    });
    
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    
    gameInProgress = false;
    timeLeft = 0;
    updateTimer();
    updateStartButton();
}

function updateStartButton() {
    const startButton = document.getElementById('start-game');
    if (!startButton) return;
    
    startButton.textContent = 'Restart Game';
    startButton.removeEventListener('click', gameLoop);
    startButton.addEventListener('click', restartGame);
}

function restartGame() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    
    gameInProgress = false;
    timeLeft = INITIAL_TIME;
    createBingoBoard();
    updateTimer();
    
    const startButton = document.getElementById('start-game');
    if (startButton) {
        startButton.textContent = 'Start Game';
        startButton.removeEventListener('click', restartGame);
        startButton.addEventListener('click', gameLoop);
    }
    
    if (panorama) {
        panorama.setVisible(false);
    }
}

function gameLoop() {
    if (gameInProgress) return;
    
    gameInProgress = true;
    console.log("gameLoop called");
    
    const cells = document.querySelectorAll('.bingo-cell');
    cells.forEach(cell => {
        cell.style.pointerEvents = 'auto';
        cell.classList.remove('marked');
    });
    
    getRandomStreetView();
    setTimer(20000); // Start initial timer
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function gm_authFailure() {
    console.error("Google Maps failed to load!");
    alert("Failed to load Google Maps. Please check your API key and try again.");
}

// Initialize the game when the Google Maps API is loaded
window.initGame = initGame;