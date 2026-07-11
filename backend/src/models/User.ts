import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  firebaseUid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
}, {
  timestamps: true // Automatically manages createdAt and updatedAt
});

export default mongoose.model<IUser>('User', UserSchema);
