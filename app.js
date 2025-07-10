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

const playersProgress = {};
let queue = [];
let currentPlayers = [];
let gameStatus = 'waiting'; // 'waiting', 'countdown', 'playing', 'finished'
let winner = null;
let countdownTimer = null;

function emitGameStatus() {
  io.to('display').emit('gameStatusUpdate', {
    gameStatus,
    currentPlayers,
    playersProgress,
    winner,
    queueLength: queue.length,
  });
  currentPlayers.forEach((userId) => {
    io.to(userId).emit('gameStatusUpdate', {
      gameStatus,
      currentPlayers,
      playersProgress,
      winner,
      queueLength: queue.length,
    });
  });
}

function startCountdown() {
  gameStatus = 'countdown';
  emitGameStatus();
  let count = 3;
  io.to('display').emit('countdown', count);
  currentPlayers.forEach((userId) => io.to(userId).emit('countdown', count));
  countdownTimer = setInterval(() => {
    count--;
    io.to('display').emit('countdown', count);
    currentPlayers.forEach((userId) => io.to(userId).emit('countdown', count));
    if (count === 0) {
      clearInterval(countdownTimer);
      startGame();
    }
  }, 1000);
}

function startGame() {
  gameStatus = 'playing';
  playersProgress[currentPlayers[0]] = 0;
  playersProgress[currentPlayers[1]] = 0;
  winner = null;
  emitGameStatus();
}

function finishGame(winnerId) {
  gameStatus = 'finished';
  winner = winnerId;
  emitGameStatus();
  io.to('display').emit('gameFinished', { winner });
  currentPlayers.forEach((userId) => io.to(userId).emit('gameFinished', { winner }));
  setTimeout(() => {
    // Reset for next game
    playersProgress[currentPlayers[0]] = 0;
    playersProgress[currentPlayers[1]] = 0;
    currentPlayers = [];
    winner = null;
    gameStatus = 'waiting';
    // Ambil dua pemain berikutnya dari queue
    while (currentPlayers.length < 2 && queue.length > 0) {
      currentPlayers.push(queue.shift());
    }
    if (currentPlayers.length === 2) {
      startCountdown();
    } else {
      emitGameStatus();
    }
  }, 3000);
}

io.on('connection', (socket) => {
  const { userId, role } = socket.handshake.query;

  console.log(`User connected: ${userId} as ${role}`);

  if (role === 'display') {
    socket.join('display');
    emitGameStatus();
    return;
  }

  if (role === 'player') {
    socket.join(userId); // biar bisa emit ke player tertentu
    // Masukkan ke queue jika belum ada di queue atau currentPlayers
    if (!queue.includes(userId) && !currentPlayers.includes(userId)) {
      queue.push(userId);
    }
    // Jika belum ada 2 pemain aktif, ambil dari queue
    while (currentPlayers.length < 2 && queue.length > 0) {
      currentPlayers.push(queue.shift());
    }
    emitGameStatus();
    // Jika sudah 2 pemain, mulai countdown jika status waiting
    if (currentPlayers.length === 2 && gameStatus === 'waiting') {
      startCountdown();
    }
  }

  socket.on('playerAction', () => {
    if (role === 'player' && gameStatus === 'playing' && currentPlayers.includes(userId)) {
      playersProgress[userId] = Math.min(1, (playersProgress[userId] || 0) + 0.05);
      emitGameStatus();
      if (playersProgress[userId] >= 1 && !winner) {
        finishGame(userId);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userId}`);
    if (role === 'player') {
      // Hapus dari queue
      queue = queue.filter((id) => id !== userId);
      // Jika sedang main, hapus dari currentPlayers
      if (currentPlayers.includes(userId)) {
        currentPlayers = currentPlayers.filter((id) => id !== userId);
        delete playersProgress[userId];
        // Jika game sedang berlangsung, langsung akhiri dan pemain lain menang
        if (gameStatus === 'playing' && currentPlayers.length === 1) {
          finishGame(currentPlayers[0]);
        } else {
          emitGameStatus();
        }
      } else {
        emitGameStatus();
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
