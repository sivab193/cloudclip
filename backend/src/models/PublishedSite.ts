import mongoose, { Schema, Document } from 'mongoose';

export type SiteVisibility = 'public' | 'password';
export type SiteStatus = 'active' | 'processing' | 'failed' | 'deleted';

export interface IPublishedSite extends Document {
  ownerId: string;                 // Firebase UID of the publisher
  slug: string;                    // globally unique, lowercase, immutable in V1
  displayName: string;
  visibility: SiteVisibility;
  // Argon2id would be ideal; the backend has no native argon2 dependency, so we
  // use scrypt (Node built-in) with a per-site salt. Never returned to clients.
  passwordHash?: string | null;
  passwordSalt?: string | null;
  region: 'us';
  status: SiteStatus;
  activeDeploymentId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const PublishedSiteSchema: Schema = new Schema({
  ownerId: { type: String, required: true },
  slug: { type: String, required: true, maxlength: 63, lowercase: true },
  displayName: { type: String, required: true, maxlength: 120 },
  visibility: { type: String, enum: ['public', 'password'], default: 'public' },
  passwordHash: { type: String, maxlength: 256, default: null, select: false },
  passwordSalt: { type: String, maxlength: 64, default: null, select: false },
  region: { type: String, enum: ['us'], default: 'us' },
  status: { type: String, enum: ['active', 'processing', 'failed', 'deleted'], default: 'processing' },
  activeDeploymentId: { type: Schema.Types.ObjectId, ref: 'SiteDeployment', default: null },
  deletedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

// Globally unique, case-insensitive slug. The collation makes the unique index
// case-insensitive so "Foo" and "foo" cannot both be claimed.
PublishedSiteSchema.index(
  { slug: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);
// Owner dashboards: most-recently-updated first.
PublishedSiteSchema.index({ ownerId: 1, updatedAt: -1 });

export default mongoose.model<IPublishedSite>('PublishedSite', PublishedSiteSchema);
