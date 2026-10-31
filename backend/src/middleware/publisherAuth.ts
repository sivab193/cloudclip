import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import PublisherKey from '../models/PublisherKey';
import { hashPublisherKey, isPublisherKeyFormat, publisherKeyPrefix } from '../services/sites';

// Attaches the resolved publisher-key owner to the request for agent routes.
declare global {
  namespace Express {
    interface Request {
      publisher?: { ownerId: string; keyId: string };
    }
  }
}

/**
 * Authenticate an agent/API request carrying `Authorization: Bearer cc_pub_...`.
 * On success sets `req.publisher = { ownerId, keyId }` and bumps lastUsedAt.
 * Revoked keys are rejected immediately.
 */
export const verifyPublisherKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: publisher key required' });
      return;
    }
    const raw = header.slice('Bearer '.length).trim();
    if (!isPublisherKeyFormat(raw)) {
      res.status(401).json({ error: 'Unauthorized: invalid publisher key' });
      return;
    }

    // Look up by prefix (indexed), then constant-time-compare the full hash.
    const candidates = await PublisherKey.find({ keyPrefix: publisherKeyPrefix(raw), revokedAt: null });
    const expectedHash = hashPublisherKey(raw);
    const expectedBuf = Buffer.from(expectedHash);
    const match = candidates.find(k => {
      const actual = Buffer.from(k.keyHash);
      return actual.length === expectedBuf.length && timingSafeEqual(actual, expectedBuf);
    });
    if (!match) {
      res.status(401).json({ error: 'Unauthorized: invalid or revoked publisher key' });
      return;
    }

    req.publisher = { ownerId: match.ownerId, keyId: String(match._id) };
    // Best-effort last-used tracking; never block publishing on it.
    PublisherKey.updateOne({ _id: match._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
    next();
  } catch {
    if (!res.headersSent) res.status(401).json({ error: 'Unauthorized: publisher key check failed' });
  }
};
