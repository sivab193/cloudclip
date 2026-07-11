# CloudClip Backend 🚀

High-performance real-time synchronization backend for CloudClip.

## Tech Stack
- **Runtime**: Node.js (v20+)
- **Language**: TypeScript
- **Framework**: Express
- **Real-time**: Socket.io with Redis Adapter
- **Database**: MongoDB (Mongoose)
- **Auth**: Firebase Admin SDK

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create a `.env` file based on `.env.example`. You will need:
   - MongoDB Atlas connection string.
   - Firebase Service Account JSON fields.
   - Redis URL (or use Docker).

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Run via Docker**:
   ```bash
   docker-compose up --build
   ```

## API Architecture

### REST Endpoints
- `GET /api/users/profile`: Get/Sync user profile.
- `GET /api/devices`: List registered devices.
- `POST /api/clipboards`: Create a clipboard entry.
- `GET /api/shared/:code`: Public endpoint to fetch shared contents.

### WebSocket Events
- `clipboard:create`: Sync new content.
- `clipboard:delete`: Delete entry.
- `clipboard:clearAll`: Wipe history.
