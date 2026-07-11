import mongoose, { Schema, Document } from 'mongoose';

export interface IDevice extends Document {
  deviceId: string;
  userId: string;
  deviceName: string;
  os: string;
  sync: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema: Schema = new Schema({
  deviceId: { type: String, required: true, maxlength: 256 },
  userId: { type: String, required: true },
  deviceName: { type: String, required: true, maxlength: 256 },
  os: { type: String, required: true, maxlength: 64 },
  sync: { type: Boolean, default: true },
}, {
  timestamps: true
});

// Unique per user, not globally — a deviceId collision across users must not
// let one user re-claim (take over) another user's device record.
DeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export default mongoose.model<IDevice>('Device', DeviceSchema);
