// Interface for Users Collection
export interface User {
    email: string;
    name: string;
    createdAt?: string;
    updatedAt?: string;
}

// Interface for Devices Collection
export interface Device {
    id?: string;
    deviceId: string;
    userId: string;
    deviceName: string;
    os: string;
    sync: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// Interface for Clipboards Collection
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

// Interface for Shared Collection
export interface Shared {
    id?: string;
    _id?: string; // MongoDB ID
    clipboardId?: string;
    content: string;
    userId: string;
    createdAt?: string;
    updatedAt?: string;
    code: string;
    expiryAt?: string;
}