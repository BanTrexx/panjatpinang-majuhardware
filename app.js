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

const players = {};

io.on('connection', (socket) => {
  const { userId, role } = socket.handshake.query;

  console.log(`User connected: ${userId} as ${role}`);

  if (role === 'display') {
    socket.join('display');
  }

  if (role === 'player') {
    players[userId] = 0;  // Progress awal 0
  }

  socket.on('playerAction', () => {
    if (role === 'player') {
      players[userId] = Math.min(1, players[userId] + 0.05);  // Tambah progress max 100%
      console.log(`Progress ${userId}: ${players[userId]}`);

      // Kirim update ke display
      io.to('display').emit('playersProgress', players);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userId}`);
    if (role === 'player') {
      delete players[userId];
      io.to('display').emit('playersProgress', players);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
