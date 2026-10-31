import mongoose, { Schema, Document } from 'mongoose';

// A scoped API credential an owner can hand to an agent/CLI to publish sites
// without their Firebase session. The raw key (cc_pub_<secret>) is shown once
// at creation; only a hash is stored.
export interface IPublisherKey extends Document {
  ownerId: string;
  label: string;
  keyPrefix: string;   // first chars of the raw key, used for fast lookup + display
  keyHash: string;     // sha-256 of the full raw key
  scopes: string[];
  lastUsedAt?: Date | null;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PublisherKeySchema: Schema = new Schema({
  ownerId: { type: String, required: true },
  label: { type: String, required: true, maxlength: 80 },
  keyPrefix: { type: String, required: true, maxlength: 32 },
  keyHash: { type: String, required: true, maxlength: 128 },
  scopes: { type: [String], default: ['sites:publish'] },
  lastUsedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

// Fast lookup by prefix during authentication; revokedAt lets us skip dead keys.
PublisherKeySchema.index({ keyPrefix: 1, revokedAt: 1 });
PublisherKeySchema.index({ ownerId: 1, createdAt: -1 });

export default mongoose.model<IPublisherKey>('PublisherKey', PublisherKeySchema);
