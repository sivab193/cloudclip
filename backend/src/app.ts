import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { authenticateSocket, registerSocketHandlers } from './socket/handlers';

// Routes
import userRoutes from './routes/users';
import deviceRoutes from './routes/devices';
import clipboardRoutes from './routes/clipboards';
import sharedRoutes from './routes/shared';

export interface AppBundle {
  app: express.Express;
  server: http.Server;
  io: Server;
}

export const createApp = (): AppBundle => {
  const app = express();
  const server = http.createServer(app);

  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:8081')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  // Native apps (and health checks) send no Origin header — only browser
  // origins are subject to the allowlist.
  const originCheck: cors.CorsOptions['origin'] = (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  };

  app.set('trust proxy', 1); // behind Caddy
  app.use(helmet());
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('tiny'));
  }
  app.use(cors({ origin: originCheck }));
  app.use(express.json({ limit: '256kb' }));

  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // API Routes
  app.use('/api/users', userRoutes);
  app.use('/api/devices', deviceRoutes);
  app.use('/api/clipboards', clipboardRoutes);
  app.use('/api/shared', sharedRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'CloudClip Backend is running' });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Central error handler (bad JSON bodies, CORS rejections, route throws)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(err);
    if (err?.message === 'Not allowed by CORS') {
      return res.status(403).json({ error: 'Origin not allowed' });
    }
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body too large' });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Server error' });
  });

  const io = new Server(server, {
    cors: {
      origin: originCheck,
      methods: ['GET', 'POST']
    },
    maxHttpBufferSize: 512 * 1024,
  });

  io.use(authenticateSocket);
  io.on('connection', (socket) => {
    registerSocketHandlers(io, socket);
  });

  return { app, server, io };
};
