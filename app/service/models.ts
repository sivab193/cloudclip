// Interface for Users Collection
export interface User {
    email: string;
    name: string;
    createdAt?: string;
    updatedAt?: string;
}

// Wrapped-key material stored server-side (server can never decrypt)
export interface EncryptionKeys {
    wrappedKey: string;
    wrapNonce: string;
    salt: string;
    kdf: {
        name: 'scrypt';
        N: number;
        r: number;
        p: number;
    };
    recoveryWrappedKey?: string;
    recoveryNonce?: string;
    recoverySalt?: string;
    keyVersion: number;
}

// Interface for Devices Collection
export interface Device {
    id?: string;
    _id?: string; // MongoDB ID
    deviceId: string;
    userId: string;
    deviceName: string;
    os: string;
    sync: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// Interface for Clipboards Collection (content is an E2E ciphertext envelope)
export interface CustomClipboard {
    id?: string;
    _id?: string; // MongoDB ID
    userId: string;
    deviceId: string;
    deviceName: string;
    content: string;
    createdAt?: string;
    updatedAt?: string;
}

// Interface for Shared Collection (content encrypted with a share-token key)
export interface Shared {
    id?: string;
    _id?: string; // MongoDB ID
    clipboardId?: string;
    content: string;
    userId?: string;
    createdAt?: string;
    updatedAt?: string;
    code: string;
    // Full share token wrapped with the owner's master key, so the owner's
    // devices can rebuild the link/code later.
    ownerWrappedKey?: string;
    ownerWrapNonce?: string;
    expiryAt?: string;
}

// Public shape returned by GET /api/shared/:code
export interface PublicShared {
    content: string;
    createdAt?: string;
    expiryAt?: string;
}
