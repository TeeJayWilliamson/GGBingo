let panorama;
const INITIAL_TIME = 20;
const bingoItems = [
    'On a Boat', 'Inside', 'Trees', 'Hotel', 'Streetview Car Shadow', 
    'Beach', 'Cemetery', 'Car', 'Moped', 'Bicycle', 'Swimming Pool', 
    'Playground', 'Cruise Ship', 'Bridge', 'Animal', 'Airplane', 
    'Birds Eye View', 'Flag', 'Stop Sign', 'Lighthouse', 'Hospital', 
    'Church', 'Waterfall', 'Mountains', 'Billboard', 'Police Station', 
    'Fountain', 'Mailbox', 'Black Screen (Whoops Sorry!)', 'Statue', 
    'Traffic Lights', 'Graffiti', 'Ice Cream Truck', 'Windmill', 
    'Restaurant', 'Birds', 'Snow', 'Walking a Dog'
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
    togglePlaceholderImage(true); // Show the placeholder image initially
    createBingoBoard();
    initializeStreetView();

    const startButton = document.getElementById('start-game');
    startButton.removeEventListener('click', gameLoop);
    startButton.addEventListener('click', gameLoop);
}

document.addEventListener('DOMContentLoaded', () => {
    const logo = document.getElementById('logo');
    const startGameButton = document.getElementById('start-game'); // "Start Game" button
    let gameStarted = false; // Flag to track if the game has started

    // Function to hide the logo
    function hideLogo() {
        if (logo) {
            console.log("Hiding logo");
            logo.classList.add('hidden'); // Add the 'hidden' class to fade out the logo
        }
    }

    // Function to show the logo
    function showLogo() {
        if (logo) {
            console.log("Showing logo");
            logo.classList.remove('hidden'); // Remove the 'hidden' class to bring the logo back
        }
    }

    // Event listener for "Start Game" / "Restart Game"
    startGameButton.addEventListener('click', () => {
        if (!gameStarted) {
            console.log("Start Game clicked");
            hideLogo(); // Hide the logo when the game starts
            gameStarted = true; // Set the flag to true indicating the game has started
            startGameButton.textContent = 'Restart Game'; // Change button text to "Restart Game"
        
            gameLoop(); // Start the game logic here
        } else {
            console.log("Restart Game clicked");
            showLogo(); // Show the logo when restarting the game
        
            // Reset the game state and stop the current game loop (if needed)
            restartGame(); // Now stops the game and resets it
        
            gameStarted = false; // Reset the game state
            startGameButton.textContent = 'Start Game'; // Change button text back to "Start Game"
        }
    });
    
    
});

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
    timeLeft = Math.floor(duration / 1000); // Convert milliseconds to seconds
    updateTimer(); // Update the UI to show the timer
    if (timer) clearInterval(timer); // Stop any existing timer
    
    timer = setInterval(() => {
        if (!gameInProgress) { // If the game is not in progress, stop the timer
            clearInterval(timer);
            return;
        }

        timeLeft--;
        updateTimer();

        if (timeLeft <= 0) {
            getRandomStreetView(); // Get new street view
            timeLeft = INITIAL_TIME; // Reset the timer
            updateTimer();
        }
    }, 1000); // Update every second
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
    stopGame(); // Stop the game first

    // Reset the game state
    gameInProgress = false;
    timeLeft = INITIAL_TIME; // Reset the time for the new game
    createBingoBoard(); // Reset the bingo board
    updateTimer(); // Update the timer display

    const startButton = document.getElementById('start-game');
    if (startButton) {
        startButton.textContent = 'Start Game'; // Change button back to "Start Game"
        startButton.removeEventListener('click', restartGame); // Remove the restart game listener
        startButton.addEventListener('click', gameLoop); // Attach gameLoop to start the game
    }

    if (panorama) {
        panorama.setVisible(false); // Hide the panorama
    }

    togglePlaceholderImage(true); // Show the placeholder image
}





function gameLoop() {
    if (gameInProgress) return; // Don't start a new game if one is already in progress

    gameInProgress = true;
    console.log("gameLoop called");

    togglePlaceholderImage(false); // Hide the placeholder image

    // Reset the bingo board and allow user interaction
    const cells = document.querySelectorAll('.bingo-cell');
    cells.forEach(cell => {
        cell.style.pointerEvents = 'auto'; // Enable clicks
        cell.classList.remove('marked'); // Reset markings
    });

    getRandomStreetView(); // Get a random street view
    setTimer(20000); // Start the timer with 20 seconds
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

function togglePlaceholderImage(show) {
    const placeholderImage = document.getElementById('./img/GGBingo Logo.png');
    if (placeholderImage) {
        placeholderImage.style.display = show ? 'block' : 'none';
    }
}

// Initialize the game when the Google Maps API is loaded
window.initGame = initGame;
