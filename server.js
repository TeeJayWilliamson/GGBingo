const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();

// Define allowed origins
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://ggbingo.onrender.com'  // Add your production URL
];

const server = http.createServer(app);
// Configure Socket.IO with dynamic CORS
const io = socketIo(server, {
    cors: {
        origin: function(origin, callback) {
            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error('Port is already in use');
    } else {
      console.error('An error occurred:', error);
    }
  });

// Load environment variables
dotenv.config();

// Add CORS middleware
app.use(cors());

// Serve static files BEFORE other middleware
app.use(express.static(path.join(__dirname, 'public')));





const PORT = process.env.PORT || 3000;

// Configure CORS for Express (keep this part where it is in your middleware setup)
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Error handling middleware (keep this where it is in your middleware chain)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start server (place this at the end of your file)
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
    } else {
        console.error('Server error:', error);
    }
});

// Handle process errors (keep this at the end of your file)
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Optionally, you might want to exit the process after logging
    // process.exit(1);
});

// Configure Helmet security middleware
// Update Helmet CSP
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "'unsafe-eval'",
                    "https://maps.googleapis.com",
                    "https://maps.gstatic.com",
                    "https://ggbingo.onrender.com"  // Add your production URL
                ],
                connectSrc: [
                    "'self'", 
                    "https://*.googleapis.com",
                    "ws://localhost:3000",
                    "wss://ggbingo.onrender.com",  // Add WebSocket for production
                    "https://ggbingo.onrender.com"  // Add your production URL
                ],
                // ... rest of your CSP config ...
            },
        },
        crossOriginEmbedderPolicy: false
    })
);

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();

function createRoom(roomCode, hostUsername) {
  rooms.set(roomCode, { host: hostUsername, players: [hostUsername] });
}

function joinRoom(roomCode, username) {
  const room = rooms.get(roomCode);
  if (room && !room.players.includes(username)) {
    room.players.push(username);
    return true;
  }
  return false;
}


// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected', socket.id);
    
    // Handle room creation
    socket.on('createRoom', ({ username, roomCode }, callback = () => {}) => {
        console.log(`Create room attempt - Room: ${roomCode}, Username: ${username}`);
        try {
            if (rooms[roomCode] && rooms[roomCode].players.length === 0) {
                // Reuse empty room
                rooms[roomCode] = {
                    players: [username],
                    isGameStarted: false,
                    creator: username,
                    lastActive: Date.now()
                };
            } else if (rooms[roomCode]) {
                console.log(`Room ${roomCode} already exists`);
                callback(false, 'Room already exists');
                return;
            } else {
                // Create new room
                rooms[roomCode] = {
                    players: [username],
                    isGameStarted: false,
                    creator: username,
                    lastActive: Date.now()
                };
            }
            
            socket.join(roomCode);
            socket.username = username;
            socket.roomCode = roomCode;
            
            io.to(roomCode).emit('roomUpdate', {
                roomCode,
                players: rooms[roomCode].players,
                creator: rooms[roomCode].creator
            });
            callback(true);
            
            console.log(`Room created/joined successfully: ${roomCode} by ${username}`);
            console.log('Current rooms:', rooms);
        } catch (error) {
            console.error('Error in createRoom:', error);
            callback(false, 'An error occurred while creating the room');
        }
    });
    
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        if (socket.roomCode && rooms[socket.roomCode]) {
            // Only remove the specific user, not entire player list
            rooms[socket.roomCode].players = rooms[socket.roomCode].players.filter(p => p !== socket.username);
            
            // If room is now empty AND game is not in progress, you might want to clean it up
            if (rooms[socket.roomCode].players.length === 0 && !rooms[socket.roomCode].isGameStarted) {
                delete rooms[socket.roomCode];
            } else {
                // Notify other players about player removal
                io.to(socket.roomCode).emit('roomUpdate', {
                    roomCode: socket.roomCode,
                    players: rooms[socket.roomCode].players,
                    creator: rooms[socket.roomCode].creator
                });
            }
        }  // <-- This closing brace was missing
    });
    
    
    socket.on('startGame', (roomCode) => {
        console.log(`Attempt to start game in room ${roomCode}`);
        const room = rooms[roomCode];
        if (room && room.players.length > 0) {
            const seed = Math.floor(Math.random() * 1000000);
            
            // Critically, do NOT modify room.players or set room to empty
            room.isGameStarted = true;
            
            // Broadcast game start to ALL players in the room
            io.to(roomCode).emit('gameStarted', { 
                seed: seed,
                players: room.players,
                roomCode: roomCode
            });
            
            console.log(`Game started in room ${roomCode} with seed ${seed}`);
            console.log(`Players in room: ${room.players}`);
        }
    });
    
    // Add game sync request handler
    socket.on('requestGameSync', (data, callback) => {
        const room = rooms[data.roomCode];
        if (room) {
            callback({
                isGameStarted: room.isGameStarted,
                seed: room.gameSeed, // Store seed when game starts
                players: room.players
            });
        } else {
            callback(null);
        }
    });
    

    // Handle joining rooms
    socket.on('joinRoom', ({ username, roomCode }, callback = () => {}) => {
        console.log(`Join attempt - Room: ${roomCode}, Username: ${username}`);
        
        // Validate room exists and game hasn't started
        if (!rooms[roomCode]) {
            console.log(`Room ${roomCode} does not exist`);
            callback(false);
            socket.emit('roomError', 'Room does not exist');
            return;
        }
        
        if (rooms[roomCode].isGameStarted) {
            console.log(`Game already started in room ${roomCode}`);
            callback(false);
            socket.emit('roomError', 'Game has already started');
            return;
        }
        
        // Join room
        rooms[roomCode].players.push(username);
        rooms[roomCode].lastActive = Date.now();
        socket.join(roomCode);
        socket.username = username;
        socket.roomCode = roomCode;
        
        io.to(roomCode).emit('updatePlayers', rooms[roomCode].players);
        callback(true);
        
        console.log(`${username} joined room: ${roomCode}`);
        console.log(`Current players in room ${roomCode}:`, rooms[roomCode].players);
    });

    // Handle room existence checks
    socket.on('checkRoom', (roomCode, callback = () => {}) => {
        console.log(`Checking room ${roomCode}`);
        callback(!!rooms[roomCode]);
    });

    // Handle game start
    socket.on('startGame', (roomCode) => {
        console.log(`Attempt to start game in room ${roomCode}`);
        const room = rooms[roomCode];
        if (room && room.players.length > 0) {
            room.isGameStarted = true;
            
            // Generate a consistent seed for random location
            const seed = Math.floor(Math.random() * 1000000);
            
            // Broadcast game start to ALL players in the room with a seed
            io.to(roomCode).emit('gameStarted', { 
                seed: seed,
                players: room.players 
            });
            console.log(`Game started in room ${roomCode} with seed ${seed}`);
        }
    });

    socket.on('playerBingo', ({ roomCode, username }) => {
        console.log(`Bingo called in room ${roomCode} by ${username}`);
        io.to(roomCode).emit('bingoAnnouncement', {
            winner: username,
            roomCode
        });
        console.log(`Emitted bingoAnnouncement for room ${roomCode}, winner: ${username}`);
    });


    


    // Handle disconnections
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        if (socket.roomCode && rooms[socket.roomCode]) {
            rooms[socket.roomCode].players = rooms[socket.roomCode].players.filter(p => p !== socket.username);
            io.to(socket.roomCode).emit('updatePlayers', rooms[socket.roomCode].players);
            
            if (rooms[socket.roomCode].players.length === 0) {
                rooms[socket.roomCode].lastEmpty = Date.now();
            }
            
            console.log(`${socket.username} removed from room ${socket.roomCode}`);
            console.log(`Current players in room ${socket.roomCode}:`, rooms[socket.roomCode].players);
        }
    });
    

    // Handle game-specific events
    socket.on('markCell', ({ roomCode, cellIndex, username }) => {
        if (rooms[roomCode]) {
            io.to(roomCode).emit('playerMarkedCell', { cellIndex, username });
        }
    });
});

function cleanupEmptyRooms() {
    const now = Date.now();
    for (const [roomCode, room] of Object.entries(rooms)) {
        if (room.players.length === 0 && now - room.lastEmpty > 5 * 60 * 1000) { // 5 minutes
            delete rooms[roomCode];
            console.log(`Removed empty room: ${roomCode}`);
        }
    }
}

// Run cleanupEmptyRooms every 5 minutes
setInterval(cleanupEmptyRooms, 5 * 60 * 1000);


// Clean up inactive rooms periodically
setInterval(() => {
    const now = Date.now();
    for (const roomCode in rooms) {
        const room = rooms[roomCode];
        // Clean up rooms that have been empty for more than 5 minutes
        if (room.lastEmpty && (now - room.lastEmpty > 300000)) {
            delete rooms[roomCode];
            console.log(`Room ${roomCode} deleted during cleanup - inactive for 5 minutes`);
        }
    }
}, 60000); // Run every minute

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Handle process errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

