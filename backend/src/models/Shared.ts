import mongoose, { Schema, Document } from 'mongoose';

export interface IShared extends Document {
  clipboardId?: string;
  // Opaque client-encrypted envelope, encrypted with a key derived from the full
  // share token.
  content: string;
  userId?: string;
  code: string;
  // Share-link key wrapped with the owner's master key, so the owner's own
  // devices can re-display the link/token later.
  ownerWrappedKey?: string;
  ownerWrapNonce?: string;
  // Full share token encrypted with a server-side key. This enables short-code
  // retrieval without storing the token in plaintext.
  serverWrappedToken?: string;
  expiryAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const SharedSchema: Schema = new Schema({
  clipboardId: { type: String, maxlength: 64 },
  content: { type: String, required: true, maxlength: 200_000 },
  userId: { type: String },
  code: { type: String, required: true, unique: true, maxlength: 32 },
  ownerWrappedKey: { type: String, maxlength: 512 },
  ownerWrapNonce: { type: String, maxlength: 64 },
  serverWrappedToken: { type: String, maxlength: 512, select: false },
  expiryAt: { type: Date, required: true, default: () => new Date(Date.now() + SEVEN_DAYS_MS) },
}, {
  timestamps: true
});

SharedSchema.index({ userId: 1, createdAt: -1 });
// Mongo TTL sweep (runs ~every 60s; routes must still filter expiryAt > now).
SharedSchema.index({ expiryAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IShared>('Shared', SharedSchema);
