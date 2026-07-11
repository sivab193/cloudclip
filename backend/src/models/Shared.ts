import mongoose, { Schema, Document } from 'mongoose';

export interface IShared extends Document {
  clipboardId?: string;
  content: string;
  userId: string;
  code: string;
  expiryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SharedSchema: Schema = new Schema({
  clipboardId: { type: String },
  content: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  code: { type: String, required: true, unique: true },
  expiryAt: { type: Date },
}, {
  timestamps: true
});

export default mongoose.model<IShared>('Shared', SharedSchema);
