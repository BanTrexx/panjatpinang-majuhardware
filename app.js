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
  currentPlayers.forEach((name) => {
    io.to(name).emit('gameStatusUpdate', {
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
  currentPlayers.forEach((name) => io.to(name).emit('countdown', count));
  countdownTimer = setInterval(() => {
    count--;
    io.to('display').emit('countdown', count);
    currentPlayers.forEach((name) => io.to(name).emit('countdown', count));
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

function finishGame(winnerName) {
  gameStatus = 'finished';
  winner = winnerName;
  emitGameStatus();
  io.to('display').emit('gameFinished', { winner });
  currentPlayers.forEach((name) => io.to(name).emit('gameFinished', { winner }));
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
  const { name, role } = socket.handshake.query;

  console.log(`User connected: ${name} as ${role}`);

  if (role === 'display') {
    socket.join('display');
    emitGameStatus();
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
    emitGameStatus();
    // Jika sudah 2 pemain, mulai countdown jika status waiting
    if (currentPlayers.length === 2 && gameStatus === 'waiting') {
      startCountdown();
    }
  }

  socket.on('playerAction', () => {
    if (role === 'player' && gameStatus === 'playing' && currentPlayers.includes(name)) {
      playersProgress[name] = Math.min(1, (playersProgress[name] || 0) + 0.05);
      emitGameStatus();
      if (playersProgress[name] >= 1 && !winner) {
        finishGame(name);
      }
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
        delete playersProgress[name];
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
