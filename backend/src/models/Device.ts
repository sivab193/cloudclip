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
  deviceId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  deviceName: { type: String, required: true },
  os: { type: String, required: true },
  sync: { type: Boolean, default: true },
}, {
  timestamps: true
});

export default mongoose.model<IDevice>('Device', DeviceSchema);
