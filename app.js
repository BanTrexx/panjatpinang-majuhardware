require('dotenv').config();
const db = require('./backend/models');
const express = require('express')
const http = require('http')
const { Server } = require("socket.io");
const path = require('path')
const cors = require('cors')
const session = require('express-session');
const ClientRoutes = require('./backend/routes/client')
const DisplayRoutes = require('./backend/routes/display')

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = 4000

app.use(session({
  secret: 'rahasia_aman',
  resave: false,
  saveUninitialized: true
}));

app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "ejs")

app.use(ClientRoutes)
app.use(DisplayRoutes)



let queue = [];
let currentPlayers = [];
let playerScores = {};

function emitQueueStatus() {
  io.to('display').emit('queueStatus', {
    queue,
    currentPlayers,
  });
}

io.on('connection', (socket) => {
  const { name, role } = socket.handshake.query;

  console.log(`User connected: ${name} as ${role}`);

  if (role === 'display') {
    socket.join('display');
    // Kirim status antrian dan pemain aktif
    emitQueueStatus();
    // Listen for game state updates from display and relay to players
    socket.on('gameStatusUpdate', (data) => {
      // Relay to all players in currentPlayers
      currentPlayers.forEach((playerName) => {
        io.to(playerName).emit('gameStatusUpdate', data);
      });
      // Also relay to display (for sync)
      io.to('display').emit('gameStatusUpdate', data);
    });
    // Listen for countdown event from display and relay to players
    socket.on('countdown', (count) => {
      currentPlayers.forEach((playerName) => {
        io.to(playerName).emit('countdown', count);
      });
      io.to('display').emit('countdown', count);
    });
    socket.on('gameFinished', (data) => {
      currentPlayers.forEach((playerName) => {
        io.to(playerName).emit('gameFinished', {
          ...data,
          score: playerScores[playerName] || 0 // tambahkan score untuk masing-masing player
        });
      });
      io.to('display').emit('gameFinished', data); // display tetap pakai data asli
    });
    // Listen for request to reset players (for next game)
    socket.on('resetPlayers', () => {
      currentPlayers = [];
      // Ambil dua pemain berikutnya dari queue
      while (currentPlayers.length < 2 && queue.length > 0) {
        currentPlayers.push(queue.shift());
      }
      emitQueueStatus();
      // Notify display of new players
      io.to('display').emit('newPlayers', { currentPlayers });
    });
    return;
  }

  if (role === 'player') {
    socket.join(name); // biar bisa emit ke player tertentu
    // Masukkan ke queue jika belum ada di queue atau currentPlayers
    if (!queue.includes(name) && !currentPlayers.includes(name)) {
      queue.push(name);
    }
    // Jika belum ada 2 pemain aktif, ambil dari queue
    while (currentPlayers.length < 2 && queue.length > 0) {
      currentPlayers.push(queue.shift());
    }
    emitQueueStatus();
    // Notify display of new players
    io.to('display').emit('newPlayers', { currentPlayers });
  }

  // Relay player action to display
  socket.on('playerClimb', () => {
    if (role === 'player' && currentPlayers.includes(name)) {

      playerScores[name] = (playerScores[name] || 0) + 10;
      io.to(name).emit('scoreUpdate', playerScores[name]);
      io.to('display').emit('scoreUpdate', { name, score: playerScores[name] });
      io.to('display').emit('playerClimb', { name });
    }
  });

  socket.on("playerDodge", () => {
    if (role === "player" && currentPlayers.includes(name)) {
      io.to("display").emit("playerDodge", { name });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${name}`);
    if (role === 'player') {
      // Hapus dari queue
      queue = queue.filter((n) => n !== name);
      // Jika sedang main, hapus dari currentPlayers
      if (currentPlayers.includes(name)) {
        currentPlayers = currentPlayers.filter((n) => n !== name);
        // Notify display player left
        io.to('display').emit('playerLeft', { name });
        // Reset players if less than 2
        if (currentPlayers.length < 2) {
          io.to('display').emit('notEnoughPlayers');
        }
      }
      emitQueueStatus();
    }
  });
});

db.sequelize.sync().then(() => {
  server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
});
