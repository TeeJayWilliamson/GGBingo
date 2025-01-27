// Constants and Configuration
const CONFIG = {
    INITIAL_TIME: 30,
    API_KEY: 'AIzaSyA_hkv9NkNWUzNw23hx8b5qJ6DnuX1R35c',
    SOCKET_URL: 'http://localhost:3000',
    PING_INTERVAL: 25000,
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000
};

const BINGO_ITEMS = [
    'On a Boat', 'Inside', 'Trees', 'Hotel', 'Streetview Car Shadow', 
    'Beach', 'Cemetery', 'Car', 'Moped', 'Bicycle', 'Swimming Pool', 
    'Playground', 'Cruise Ship', 'Bridge', 'Animal', 'Airplane', 
    'Birds Eye View', 'Flag', 'Stop Sign', 'Lighthouse', 'Hospital', 
    'Church', 'Waterfall', 'Mountains', 'Billboard', 'Police Station', 
    'Fountain', 'Mailbox', 'Black Screen (Whoops Sorry!)', 'Statue', 
    'Traffic Lights', 'Graffiti', 'Ice Cream Truck', 'Windmill', 
    'Restaurant', 'Birds', 'Snow', 'Walking a Dog', 'Pedestrian'
];

// Game State
const GameState = {
    panorama: null,
    currentItems: [],
    timer: null,
    timeLeft: CONFIG.INITIAL_TIME,
    gameInProgress: false,
    socket: null,
    gameInitialized: false,
    locationQueue: [],
    isPreloading: false,
    minimumQueueSize: 3
};

const LocationQueue = {
    usedPanoramas: new Set(),

    async preloadLocations(count = 10) {
        if (GameState.isPreloading) return;
        GameState.isPreloading = true;

        try {
            while (GameState.locationQueue.length < count) {
                const location = await this.findValidLocation();
                if (location) {
                    GameState.locationQueue.push(location);
                    console.log(`Preloaded location. Queue size: ${GameState.locationQueue.length}`);
                }
            }
        } catch (error) {
            console.error('Error preloading locations:', error);
        } finally {
            GameState.isPreloading = false;
        }
    },

    async updateQueue() {
        const minQueueSize = 5;
        if (GameState.locationQueue.length < minQueueSize) {
            await this.preloadLocations(10 - GameState.locationQueue.length);
        }
    },

    getNextLocation() {
        const location = GameState.locationQueue.shift();
        this.updateQueue(); // Dynamically update the queue
        return location;
    },

    async findValidLocation() {
        const maxAttempts = 20;
        let attempts = 0;

        while (attempts < maxAttempts) {
            const regions = [
                { lat: 40.7128, lng: -74.0060, label: "New York" },
                { lat: 51.5074, lng: -0.1278, label: "London" },
                { lat: 48.8566, lng: 2.3522, label: "Paris" },
                { lat: 35.6762, lng: 139.6503, label: "Tokyo" },
                { lat: 37.7749, lng: -122.4194, label: "San Francisco" },
                { lat: 52.5200, lng: 13.4050, label: "Berlin" },
                { lat: 41.9028, lng: 12.4964, label: "Rome" },
                { lat: -33.8688, lng: 151.2093, label: "Sydney" },
                { lat: 55.7558, lng: 37.6173, label: "Moscow" },
                { lat: 40.4168, lng: -3.7038, label: "Madrid" },
                { lat: 43.6532, lng: -79.3832, label: "Toronto" },
                { lat: 34.0522, lng: -118.2437, label: "Los Angeles" },
                { lat: 19.4326, lng: -99.1332, label: "Mexico City" },
                { lat: 4.7110, lng: -74.0721, label: "Bogota" }
            ];

            const cryptoRandom = () => {
                const array = new Uint32Array(1);
                crypto.getRandomValues(array);
                return array[0] / (0xffffffff + 1);
            };

            const regionIndex = Math.floor(cryptoRandom() * regions.length);
            const region = regions[regionIndex];
            
            const latOffset = (cryptoRandom() - 0.5) * 0.7;
            const lngOffset = (cryptoRandom() - 0.5) * 0.7;

            const lat = region.lat + latOffset;
            const lng = region.lng + lngOffset;

            try {
                const result = await new Promise((resolve, reject) => {
                    const sv = new google.maps.StreetViewService();
                    sv.getPanorama({
                        location: { lat, lng },
                        radius: 75000,
                        source: google.maps.StreetViewSource.OUTDOOR,
                        preference: google.maps.StreetViewPreference.BEST
                    }, (data, status) => {
                        if (status === google.maps.StreetViewStatus.OK) {
                            resolve(data);
                        } else {
                            reject(status);
                        }
                    });
                });

                const panoId = result.location.pano;
                if (!this.usedPanoramas.has(panoId)) {
                    this.usedPanoramas.add(panoId);
                    if (this.usedPanoramas.size > 50) {
                        const oldestPano = this.usedPanoramas.values().next().value;
                        this.usedPanoramas.delete(oldestPano);
                    }

                    return {
                        pano: panoId,
                        lat: result.location.latLng.lat(),
                        lng: result.location.latLng.lng(),
                        originalCity: region.label
                    };
                }
            } catch (error) {
                console.log(`Attempt ${attempts + 1} failed: ${error}`);
            }

            attempts++;
        }

        console.error('Failed to find a valid location after maximum attempts');
        return null;
    }
};


// Update StreetViewManager to use the queue
const StreetViewManager = {
    initialize() {
        try {
            const streetViewDiv = document.getElementById('streetview-container');
            if (!streetViewDiv) throw new Error('Street view container not found');

            GameState.panorama = new google.maps.StreetViewPanorama(streetViewDiv, {
                addressControl: false,
                fullscreenControl: false,
                motionTracking: false,
                motionTrackingControl: false,
                showRoadLabels: false,
                linksControl: false,
                panControl: false,
                enableCloseButton: false
            });

            // Start preloading locations immediately
            LocationQueue.preloadLocations();
            
            console.log('Street View initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing Street View:', error);
            return false;
        }
    },

    async getRandomLocation() {
        // Check if we need to preload more locations
        if (GameState.locationQueue.length < GameState.minimumQueueSize) {
            LocationQueue.preloadLocations();
        }

        // Get the next location from the queue
        if (GameState.locationQueue.length > 0) {
            const nextLocation = GameState.locationQueue.shift();
            this.updatePanorama(nextLocation);
            return;
        }

        // Fallback to direct search if queue is empty
        const location = await LocationQueue.findValidLocation();
        if (location) {
            this.updatePanorama(location);
        }
    },

    updatePanorama(locationData) {
        try {
            GameState.panorama.setPano(locationData.pano);
            GameState.panorama.setPov({
                heading: Math.random() * 360,
                pitch: 0
            });
            GameState.panorama.setVisible(true);
            console.log(`Showing location near ${locationData.originalCity}`);
        } catch (error) {
            console.error('Error setting panorama:', error);
            this.getRandomLocation();
        }
    }
};

// UI Manager
const UI = {
    showToast(message) {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = this.createToastContainer();
        }

        const toast = this.createToastElement(message);
        container.appendChild(toast);
        
        setTimeout(() => this.removeToast(toast, container), 5000);
    },

    createToastContainer() {
        const container = document.createElement('div');
        container.classList.add('toast-container');
        Object.assign(container.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '1000'
        });
        document.body.appendChild(container);
        return container;
    },

    createToastElement(message) {
        const toast = document.createElement('div');
        toast.classList.add('toast');
        Object.assign(toast.style, {
            backgroundColor: '#333',
            color: 'white',
            padding: '1rem',
            marginBottom: '10px',
            borderRadius: '4px',
            opacity: '0',
            transition: 'opacity 0.3s ease-in'
        });
        toast.textContent = message;
        
        requestAnimationFrame(() => toast.style.opacity = '1');
        return toast;
    },

    removeToast(toast, container) {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    },

    togglePlaceholderImage(show) {
        const logo = document.getElementById('logo');
        if (logo) {
            logo.style.display = show ? 'block' : 'none';
        }
    },

    updateTimer() {
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = `Time left: ${GameState.timeLeft}s`;
        }
    }
};

// Bingo Board Manager
const BingoBoard = {
    createBoard() {
        const board = document.getElementById('bingo-board');
        if (!board) {
            console.error("Bingo board element not found!");
            return;
        }

        board.innerHTML = '';
        GameState.currentItems = this.shuffleItems(BINGO_ITEMS).slice(0, 25);
        
        GameState.currentItems.forEach(item => {
            const cell = document.createElement('div');
            cell.textContent = item;
            cell.className = 'bingo-cell';
            cell.addEventListener('click', () => this.toggleCell(cell));
            board.appendChild(cell);
        });
    },

    shuffleItems(items) {
        const newArray = [...items];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    },

    toggleCell(cell) {
        if (!GameState.gameInProgress) return;
        cell.classList.toggle('marked');
        if (this.checkForBingo()) {
            GameController.stopGame();
        }
    },

    checkForBingo() {
        const cells = Array.from(document.querySelectorAll('.bingo-cell'));
        const lines = this.getBingoLines();
        
        const bingo = lines.some(line => 
            line.every(index => cells[index].classList.contains('marked'))
        );

        if (bingo) {
            this.handleBingo();
        }

        return bingo;
    },

    getBingoLines() {
        const rows = [
            [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14],
            [15,16,17,18,19], [20,21,22,23,24]
        ];
        const cols = [
            [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22],
            [3,8,13,18,23], [4,9,14,19,24]
        ];
        const diags = [
            [0,6,12,18,24], [4,8,12,16,20]
        ];
        return [...rows, ...cols, ...diags];
    },

    handleBingo() {
        const username = localStorage.getItem('username');
        const roomCode = localStorage.getItem('roomCode');

        if (GameState.socket?.connected) {
            GameState.socket.emit('playerBingo', { roomCode, username });
        }
    }
};

// Game Controller
const GameController = {
    async initGame() {
        if (window.gameInitialized) {
            console.log('Game already initialized');
            return;
        }
        
        try {
            const roomCode = localStorage.getItem('roomCode');
            const username = localStorage.getItem('username');
            
            if (!roomCode || !username) {
                console.error("Missing room code or username");
                window.location.href = 'index.html';
                return;
            }

            if (!StreetViewManager.initialize()) {
                throw new Error('Failed to initialize Street View');
            }

            SocketManager.initialize();
            BingoBoard.createBoard();
            UI.togglePlaceholderImage(true);
            this.setupEventListeners();

            window.gameInitialized = true;
            console.log("Game initialization completed successfully");

        } catch (error) {
            console.error('Game initialization failed:', error);
            UI.showToast('Failed to initialize game. Please refresh the page.');
        }
    },

    setupEventListeners() {
        const startButton = document.getElementById('start-game');
        if (startButton) {
            startButton.addEventListener('click', () => {
                if (!GameState.gameInProgress) {
                    this.startGame();
                } else {
                    this.restartGame();
                }
            });
        }
    },

    async startGame() {
        if (GameState.gameInProgress) return;

        // Ensure we have locations preloaded before starting
        if (GameState.locationQueue.length === 0) {
            UI.showToast("Preparing locations...");
            await LocationQueue.preloadLocations();
        }

        GameState.gameInProgress = true;
        BingoBoard.createBoard();
        UI.togglePlaceholderImage(false);
        
        StreetViewManager.getRandomLocation();
        this.startTimer();
    },

    stopGame() {
        GameState.gameInProgress = false;
        if (GameState.timer) {
            clearInterval(GameState.timer);
            GameState.timer = null;
        }
        
        GameState.timeLeft = 0;
        UI.updateTimer();
        
        const cells = document.querySelectorAll('.bingo-cell');
        cells.forEach(cell => cell.style.pointerEvents = 'none');
    },

    restartGame() {
        this.stopGame();
        GameState.timeLeft = CONFIG.INITIAL_TIME;
        BingoBoard.createBoard();
        UI.updateTimer();
        UI.togglePlaceholderImage(true);
        
        if (GameState.panorama) {
            GameState.panorama.setVisible(false);
        }
    },

    startTimer() {
        GameState.timeLeft = CONFIG.INITIAL_TIME;
        UI.updateTimer();

        if (GameState.timer) clearInterval(GameState.timer);
        
        GameState.timer = setInterval(() => {
            if (!GameState.gameInProgress) {
                clearInterval(GameState.timer);
                return;
            }

            GameState.timeLeft--;
            UI.updateTimer();

            if (GameState.timeLeft <= 0) {
                StreetViewManager.getRandomLocation();
                GameState.timeLeft = CONFIG.INITIAL_TIME;
                UI.updateTimer();
            }
        }, 1000);
    },

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
};

// Socket Manager
const SocketManager = {
    initialize() {
        if (GameState.socket?.connected) {
            console.log('Socket already initialized');
            return;
        }

        GameState.socket = io(CONFIG.SOCKET_URL, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.setupEventHandlers();
    },

    setupEventHandlers() {
        GameState.socket.on('connect', () => {
            const roomCode = localStorage.getItem('roomCode');
            if (roomCode) {
                GameState.socket.emit('joinRoom', roomCode);
            }
        });

        GameState.socket.on('gameStarted', data => {
            console.log('Received game start data:', data);
            const seed = data.seed || Date.now();
            UI.togglePlaceholderImage(false);
            BingoBoard.createBoard();
            StreetViewManager.getRandomLocation(seed);
            GameController.startTimer();
        });

        GameState.socket.on('updatePlayers', players => {
            const listContainer = document.getElementById('player-list');
            if (!listContainer) return;

            listContainer.innerHTML = '';
            players.forEach(player => {
                const li = document.createElement('li');
                li.textContent = player;
                listContainer.appendChild(li);
            });
        });

        setInterval(() => GameState.socket.emit('ping'), CONFIG.PING_INTERVAL);
    }
};

// Initialize map callback
window.initMap = function() {
    console.log("Google Maps API loaded");
    GameController.initGame();
};

// Handle Google Maps authentication failure
window.gm_authFailure = () => {
    console.error("Google Maps failed to load!");
    UI.showToast("Failed to load Google Maps. Please check your API key and try again.");
};