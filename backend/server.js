require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes/index');
const connectDB = require('./lib/connectDB');

const app = express();
const httpServer = http.createServer(app);
const roomUsers = new Map();

app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Increase payload limit to 50mb to allow Base64 Image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cors());

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const getRoomUsers = (roomId) => Array.from(roomUsers.get(roomId)?.values() || []);

const emitRoomUsers = (roomId) => {
  const users = getRoomUsers(roomId);
  io.to(`room:${roomId}`).emit('room-users-updated', { roomId, users });
  io.to(`dashboard:${roomId}`).emit('room-users-updated', { roomId, users });
};

io.on('connection', (socket) => {
  socket.on('join-room', (payload) => {
    const roomId = typeof payload === 'string' ? payload : payload?.roomId;
    const teamName = typeof payload === 'string' ? null : payload?.teamName?.trim();
    const role = typeof payload === 'string' ? 'viewer' : payload?.role || 'terminal';

    if (!roomId) return;

    socket.data.roomId = roomId;
    socket.data.role = role;
    socket.join(`room:${roomId}`);

    if (role === 'terminal' && teamName) {
      const usersForRoom = roomUsers.get(roomId) || new Map();
      usersForRoom.set(socket.id, { socketId: socket.id, teamName });
      roomUsers.set(roomId, usersForRoom);
      socket.data.teamName = teamName;
      emitRoomUsers(roomId);
    }
  });

  socket.on('watch-room', (roomId) => {
    if (!roomId) return;
    socket.data.dashboardRoomId = roomId;
    socket.join(`dashboard:${roomId}`);
    emitRoomUsers(roomId);
  });

  socket.on('leave-room', (roomId) => {
    const targetRoomId = roomId || socket.data.roomId;
    if (!targetRoomId) return;

    socket.leave(`room:${targetRoomId}`);

    const usersForRoom = roomUsers.get(targetRoomId);
    if (usersForRoom?.delete(socket.id)) {
      if (usersForRoom.size === 0) {
        roomUsers.delete(targetRoomId);
      }
      emitRoomUsers(targetRoomId);
    }
  });

  socket.on('disconnect', () => {
    const disconnectedSocketId = socket.id;
    const activeRoomId = socket.data.roomId;

    if (!activeRoomId) return;

    const usersForRoom = roomUsers.get(activeRoomId);
    if (!usersForRoom) return;

    usersForRoom.delete(disconnectedSocketId);

    if (usersForRoom.size === 0) {
      roomUsers.delete(activeRoomId);
    }

    emitRoomUsers(activeRoomId);
  });
});

// Health check
app.get('/', (req, res) => {
  res.status(200).json({
    status: "Active",
    engine: "HackClock Core",
    message: "Master Backend is operational. Use /api routes for data."
  });
});


// Connect Master Router
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('MongoDB Cluster Connection Error:', error);
    res.status(500).json({ error: 'Database connection failed.' });
  }
});

app.use('/api', routes);

const PORT = process.env.PORT || 5000;

if (process.env.VERCEL !== '1') {
  httpServer.listen(PORT, async () => {
    try {
      await connectDB();
      console.log(`Core Backend Engine Online: Port ${PORT}`);
    } catch (error) {
      console.error('MongoDB Cluster Connection Error:', error);
      process.exit(1);
    }
  });
}

module.exports = app;
