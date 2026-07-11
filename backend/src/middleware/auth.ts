import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

// Lazily initialize Firebase Admin so importing this module (e.g. in tests
// that mock firebase-admin) doesn't require credentials in the environment.
export const getFirebaseAuth = (): admin.auth.Auth => {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            })
        });
    }
    return admin.auth();
};

// Extend Express Request type to include user information
declare global {
    namespace Express {
        interface Request {
            user?: admin.auth.DecodedIdToken;
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
        const decodedToken = await getFirebaseAuth().verifyIdToken(idToken);

        // Attach the decoded user to the request
        req.user = decodedToken;

        next();
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
