import mongoose, { Schema, Document } from 'mongoose';

export interface IClipboard extends Document {
  userId: string;
  deviceId: string;
  deviceName: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClipboardSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  deviceId: { type: String, required: true },
  deviceName: { type: String, required: true },
  content: { type: String, required: true },
}, {
  timestamps: true
});

export default mongoose.model<IClipboard>('Clipboard', ClipboardSchema);
