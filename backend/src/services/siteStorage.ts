import mongoose from 'mongoose';
import SiteDeployment, { ISiteDeployment, IStoredFile } from '../models/SiteDeployment';
import { ExtractedFile } from './sites';

// Storage seam for hosted-site files. Today the bytes live inside the
// SiteDeployment document in MongoDB (base64). To move to R2/S3 later, swap the
// bodies of these functions to put/get objects under `objectPrefix` — the
// routes and model metadata do not change.

export const objectPrefixFor = (siteId: string, deploymentId: string): string =>
  `sites/${siteId}/${deploymentId}/`;

/** Persist all extracted files onto a deployment (atomic per-document write). */
export const storeDeploymentFiles = async (
  deploymentId: mongoose.Types.ObjectId,
  files: ExtractedFile[],
): Promise<void> => {
  const stored: IStoredFile[] = files.map(f => ({
    path: f.path,
    contentType: f.contentType,
    bytes: f.bytes,
    data: f.data,
  }));
  await SiteDeployment.updateOne({ _id: deploymentId }, { $set: { files: stored } });
};

export interface ServableFile {
  contentType: string;
  body: Buffer;
  bytes: number;
}

/**
 * Fetch a single file from a deployment by its normalized relative path.
 * Returns null when the deployment or file is absent.
 */
export const readDeploymentFile = async (
  deploymentId: mongoose.Types.ObjectId | string,
  path: string,
): Promise<ServableFile | null> => {
  const deployment = await SiteDeployment.findById(deploymentId)
    .select('+files')
    .lean<Pick<ISiteDeployment, 'files'>>();
  if (!deployment) return null;
  const file = deployment.files.find(f => f.path === path);
  if (!file) return null;
  return {
    contentType: file.contentType,
    body: Buffer.from(file.data, 'base64'),
    bytes: file.bytes,
  };
};

/** True when a deployment contains a file at the exact path. */
export const deploymentHasFile = async (
  deploymentId: mongoose.Types.ObjectId | string,
  path: string,
): Promise<boolean> => {
  const deployment = await SiteDeployment.findById(deploymentId)
    .select('+files')
    .lean<Pick<ISiteDeployment, 'files'>>();
  return Boolean(deployment?.files.some(f => f.path === path));
};
