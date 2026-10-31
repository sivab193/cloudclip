import mongoose, { Schema, Document } from 'mongoose';

export type DeploymentSourceType = 'html' | 'zip';
export type DeploymentStatus = 'processing' | 'ready' | 'failed';

// A single stored file belonging to a deployment. Content is held as a base64
// string so the deployment is a self-contained MongoDB document. This keeps the
// feature infra-free today; `services/siteStorage.ts` is the seam to move the
// bytes to R2/S3 later without touching the routes.
export interface IStoredFile {
  path: string;          // normalized relative path, e.g. "assets/app-abc.js"
  contentType: string;   // resolved from a strict extension map
  bytes: number;         // decoded byte length
  data: string;          // base64-encoded file contents
}

export interface ISiteDeployment extends Document {
  siteId: mongoose.Types.ObjectId;
  ownerId: string;
  version: number;
  sourceFilename: string;
  sourceType: DeploymentSourceType;
  sourceBytes: number;
  extractedBytes: number;
  fileCount: number;
  objectPrefix: string;        // logical prefix: sites/<siteId>/<deploymentId>/
  entryPath: string;           // always "index.html" in V1
  status: DeploymentStatus;
  errorCode?: string | null;
  errorMessage?: string | null; // safe to show the owner
  files: IStoredFile[];
  createdAt: Date;
}

const StoredFileSchema = new Schema<IStoredFile>({
  path: { type: String, required: true, maxlength: 1024 },
  contentType: { type: String, required: true, maxlength: 128 },
  bytes: { type: Number, required: true },
  data: { type: String, required: true },
}, { _id: false });

const SiteDeploymentSchema: Schema = new Schema({
  siteId: { type: Schema.Types.ObjectId, ref: 'PublishedSite', required: true },
  ownerId: { type: String, required: true },
  version: { type: Number, required: true },
  sourceFilename: { type: String, required: true, maxlength: 256 },
  sourceType: { type: String, enum: ['html', 'zip'], required: true },
  sourceBytes: { type: Number, required: true },
  extractedBytes: { type: Number, required: true },
  fileCount: { type: Number, required: true },
  objectPrefix: { type: String, required: true, maxlength: 256 },
  entryPath: { type: String, required: true, default: 'index.html', maxlength: 256 },
  status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing' },
  errorCode: { type: String, maxlength: 64, default: null },
  errorMessage: { type: String, maxlength: 512, default: null },
  // Files are only needed when actually serving a deployment; keep them out of
  // list/metadata queries by default.
  files: { type: [StoredFileSchema], default: [], select: false },
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

// One version number per site.
SiteDeploymentSchema.index({ siteId: 1, version: 1 }, { unique: true });
SiteDeploymentSchema.index({ ownerId: 1, createdAt: -1 });

export default mongoose.model<ISiteDeployment>('SiteDeployment', SiteDeploymentSchema);
