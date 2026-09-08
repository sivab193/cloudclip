import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { createApp } from './app';
import { getFirebaseAuth } from './middleware/auth';

const start = async () => {
  const required = ['MONGODB_URI', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
  const missing = required.filter(name => !process.env[name]);
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(', ')}`);
  getFirebaseAuth();
  await connectDB();

  const { server, io } = createApp();

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    io.close();
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
    // Force-exit if connections refuse to drain
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch(() => {
  console.error('Backend startup failed. Check database connectivity, indexes and Firebase configuration.');
  process.exit(1);
});
