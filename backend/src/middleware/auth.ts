import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// This should really be in an initialization file, but for simplicity we'll keep it here
// Make sure environment variables are set
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
    });
}

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
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        // Attach the decoded user to the request
        req.user = decodedToken;
        
        next();
    } catch (error) {
        console.error('Error verifying Firebase token:', error);
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
