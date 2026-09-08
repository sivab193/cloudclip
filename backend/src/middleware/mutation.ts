import { RequestHandler } from 'express';
import { getFirebaseAuth } from './auth';
import { withUserLock } from '../services/userLock';

// Hold the user lock until the async handler finishes, even if the client
// disconnects while a database write is in flight.
export const mutation = (handler: RequestHandler): RequestHandler => async (req, res, next) => {
  try {
    await withUserLock(req.user!.uid, async () => {
      try {
        await getFirebaseAuth().verifyIdToken(req.headers.authorization!.slice(7), true);
      } catch {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
        return;
      }
      await handler(req, res, next);
    });
  } catch (error) { next(error); }
};
