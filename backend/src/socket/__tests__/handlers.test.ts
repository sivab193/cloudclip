import { createServer } from 'http';
import { Server } from 'socket.io';
import Client, { Socket as ClientSocket } from 'socket.io-client';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { authenticateSocket, registerSocketHandlers } from '../handlers';
import Clipboard from '../../models/Clipboard';

jest.mock('firebase-admin', () => {
  return {
    auth: jest.fn().mockReturnValue({
      verifyIdToken: jest.fn((token) => {
        if (token === 'valid_token') {
          return Promise.resolve({ uid: 'test_user_id' });
        }
        if (token === 'valid_token_2') {
          return Promise.resolve({ uid: 'test_user_id_2' });
        }
        return Promise.reject(new Error('Invalid token'));
      }),
    }),
  };
});

describe('Socket.io Handlers Integration', () => {
  let io: Server;
  let serverSocket: any;
  let clientSocketA: ClientSocket;
  let clientSocketB: ClientSocket; // Same user as A
  let clientSocketC: ClientSocket; // Different user
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const httpServer = createServer();
    io = new Server(httpServer);

    io.use(authenticateSocket);
    io.on('connection', (socket) => {
      serverSocket = socket;
      registerSocketHandlers(io, socket);
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        const port = (httpServer.address() as any).port;
        const connectClient = (token: string) => Client(`http://localhost:${port}`, {
          auth: { token }
        });
        
        clientSocketA = connectClient('valid_token');
        clientSocketB = connectClient('valid_token');
        clientSocketC = connectClient('valid_token_2');

        let connectedCount = 0;
        const checkConnected = () => {
          connectedCount++;
          if (connectedCount === 3) resolve();
        };

        clientSocketA.on('connect', checkConnected);
        clientSocketB.on('connect', checkConnected);
        clientSocketC.on('connect', checkConnected);
      });
    });
  });

  afterAll(async () => {
    io.close();
    clientSocketA.disconnect();
    clientSocketB.disconnect();
    clientSocketC.disconnect();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Clipboard.deleteMany({});
  });

  it('should authenticate a valid token and join the correct room', (done) => {
    expect(clientSocketA.connected).toBe(true);
    // There isn't a direct way to verify room membership from the client side without emitting an event,
    // but we can verify it via broadcasting in the next test.
    done();
  });

  it('should reject invalid tokens', (done) => {
    const port = (io.httpServer.address() as any).port;
    const badClient = Client(`http://localhost:${port}`, { auth: { token: 'invalid_token' } });
    
    badClient.on('connect_error', (err) => {
      expect(err.message).toBe('Authentication error: Invalid token');
      badClient.disconnect();
      done();
    });
  });

  it('should broadcast clipboard:new only to devices of the same user', (done) => {
    const testClip = {
      deviceId: 'device_a',
      deviceName: 'MacBook',
      content: 'Hello World',
    };

    let callCount = 0;

    clientSocketB.on('clipboard:new', (data) => {
      expect(data.content).toBe(testClip.content);
      expect(data.userId).toBe('test_user_id');
      callCount++;
      if (callCount === 1) {
        done();
      }
    });

    clientSocketC.on('clipboard:new', () => {
      // User C should NOT receive this event
      done.fail('Broadcast leaked to wrong user');
    });

    clientSocketA.emit('clipboard:create', testClip);
  });

  it('should save the clipboard entry to the database', async () => {
    const testClip = {
      deviceId: 'device_a',
      deviceName: 'MacBook',
      content: 'Database Test',
    };

    const ackPromise = new Promise(resolve => {
      clientSocketA.on('clipboard:created', resolve);
    });

    clientSocketA.emit('clipboard:create', testClip);
    
    await ackPromise;

    const clips = await Clipboard.find({ userId: 'test_user_id' });
    expect(clips.length).toBe(1);
    expect(clips[0].content).toBe('Database Test');
  });

  it('should broadcast clipboard:deleted correctly', async () => {
    const clip = new Clipboard({
      userId: 'test_user_id',
      deviceId: 'device_a',
      deviceName: 'MacBook',
      content: 'To be deleted',
    });
    await clip.save();

    const deletePromise = new Promise(resolve => {
      clientSocketB.on('clipboard:deleted', resolve);
    });

    clientSocketA.emit('clipboard:delete', { id: clip._id.toString() });

    const data: any = await deletePromise;
    expect(data.id).toBe(clip._id.toString());

    const found = await Clipboard.findById(clip._id);
    expect(found).toBeNull();
  });
});