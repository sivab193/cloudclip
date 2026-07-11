import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { connectDB } from './config/db';
import { authenticateSocket, registerSocketHandlers } from './socket/handlers';

// Routes
import userRoutes from './routes/users';
import deviceRoutes from './routes/devices';
import clipboardRoutes from './routes/clipboards';
import sharedRoutes from './routes/shared';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Socket.io setup with Redis Adapter for multi-server scaling
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

if (process.env.REDIS_URL) {
  const pubClient = new Redis(process.env.REDIS_URL);
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
  console.log('Redis adapter configured for Socket.io');
}

// Connect to MongoDB
connectDB();

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/clipboards', clipboardRoutes);
app.use('/api/shared', sharedRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'CloudClip Backend is running' });
});

// Socket.io connection handling
io.use(authenticateSocket);

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);
  registerSocketHandlers(io, socket);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
