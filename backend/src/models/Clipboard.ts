import mongoose, { Schema, Document } from 'mongoose';

export interface IClipboard extends Document {
  userId: string;
  deviceId: string;
  deviceName: string;
  // Opaque E2E-encrypted envelope: {"v":1,"alg":"A256GCM","n":"<b64>","ct":"<b64>"}.
  // The server never parses or decrypts this.
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClipboardSchema: Schema = new Schema({
  userId: { type: String, required: true },
  deviceId: { type: String, required: true, maxlength: 256 },
  deviceName: { type: String, required: true, maxlength: 256 },
  content: { type: String, required: true, maxlength: 200_000 },
}, {
  timestamps: true
});

// Every query is find({userId}).sort({createdAt:-1}) — index it as a pair.
ClipboardSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IClipboard>('Clipboard', ClipboardSchema);
