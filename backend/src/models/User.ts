import mongoose, { Schema, Document } from 'mongoose';

export interface IUserEncryption {
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

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  name: string;
  encryption?: IUserEncryption;
  createdAt: Date;
  updatedAt: Date;
}

const EncryptionSchema: Schema = new Schema({
  wrappedKey: { type: String, required: true, maxlength: 512 },
  wrapNonce: { type: String, required: true, maxlength: 64 },
  salt: { type: String, required: true, maxlength: 128 },
  kdf: {
    name: { type: String, enum: ['scrypt'], required: true },
    N: { type: Number, required: true },
    r: { type: Number, required: true },
    p: { type: Number, required: true },
  },
  recoveryWrappedKey: { type: String, maxlength: 512 },
  recoveryNonce: { type: String, maxlength: 64 },
  recoverySalt: { type: String, maxlength: 128 },
  keyVersion: { type: Number, required: true, default: 1 },
}, { _id: false });

const UserSchema: Schema = new Schema({
  firebaseUid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  encryption: { type: EncryptionSchema, required: false },
}, {
  timestamps: true // Automatically manages createdAt and updatedAt
});

export default mongoose.model<IUser>('User', UserSchema);
