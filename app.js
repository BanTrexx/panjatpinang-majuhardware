const express = require('express')
const http = require('http')
const { Server } = require("socket.io");
const path = require('path')
const cors = require('cors')
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

const PORT = 3000

app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "ejs")

app.use(ClientRoutes)
app.use(DisplayRoutes)

let queue = [];
let currentPlayers = [];

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
    // Listen for gameFinished event from display and relay to players
    socket.on('gameFinished', (data) => {
      currentPlayers.forEach((playerName) => {
        io.to(playerName).emit('gameFinished', data);
      });
      io.to('display').emit('gameFinished', data);
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
  socket.on('playerAction', () => {
    if (role === 'player' && currentPlayers.includes(name)) {
      io.to('display').emit('playerAction', { name });
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

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
