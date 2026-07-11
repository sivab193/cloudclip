import mongoose, { Schema, Document } from 'mongoose';

export interface IShared extends Document {
  clipboardId?: string;
  // Opaque E2E-encrypted envelope, encrypted with a key derived from the full
  // share token. The server only ever stores the 8-char lookup code, which by
  // itself cannot decrypt the content.
  content: string;
  userId: string;
  code: string;
  // Share-link key wrapped with the owner's master key, so the owner's own
  // devices can re-display the link/token later.
  ownerWrappedKey?: string;
  ownerWrapNonce?: string;
  expiryAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const SharedSchema: Schema = new Schema({
  clipboardId: { type: String, maxlength: 64 },
  content: { type: String, required: true, maxlength: 200_000 },
  userId: { type: String, required: true },
  code: { type: String, required: true, unique: true, maxlength: 32 },
  ownerWrappedKey: { type: String, maxlength: 512 },
  ownerWrapNonce: { type: String, maxlength: 64 },
  expiryAt: { type: Date, required: true, default: () => new Date(Date.now() + SEVEN_DAYS_MS) },
}, {
  timestamps: true
});

SharedSchema.index({ userId: 1, createdAt: -1 });
// Mongo TTL sweep (runs ~every 60s; routes must still filter expiryAt > now).
SharedSchema.index({ expiryAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IShared>('Shared', SharedSchema);
