import { Request, Response, NextFunction } from 'express';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, DecodedIdToken, getAuth } from 'firebase-admin/auth';

// Lazily initialize Firebase Admin so importing this module (e.g. in tests
// that mock firebase-admin) doesn't require credentials in the environment.
export const getFirebaseAuth = (): Auth => {
    if (!getApps().length) {
        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            })
        });
    }
    return getAuth();
};

// Extend Express Request type to include user information
declare global {
    namespace Express {
        interface Request {
            user?: DecodedIdToken;
        }
    }
}

export const verifyFirebaseToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized: No token provided' });
            return;
        }

        const idToken = authHeader.split('Bearer ')[1];

        // Verify the token with Firebase Admin
        const decodedToken = await getFirebaseAuth().verifyIdToken(idToken, true);

        // Attach the decoded user to the request
        req.user = decodedToken;

        next();
    } catch (error) {
        if (!res.headersSent) res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

export const requireRecentLogin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user?.auth_time || Date.now() / 1000 - req.user.auth_time > 5 * 60) {
        res.status(403).json({ error: 'Please verify your password again before deleting data' });
        return;
    }
    next();
};
