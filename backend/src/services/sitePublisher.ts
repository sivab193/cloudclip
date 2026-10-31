import mongoose from 'mongoose';
import PublishedSite, { IPublishedSite, SiteVisibility } from '../models/PublishedSite';
import SiteDeployment from '../models/SiteDeployment';
import {
  SiteError,
  assertPublishableSlug,
  extractUpload,
  hashPassword,
  isValidSlug,
} from './sites';
import { objectPrefixFor, storeDeploymentFiles } from './siteStorage';
import { randomBytes } from 'crypto';

const MAX_SITES_PER_OWNER = 25;

const randomSlug = (): string => `site-${randomBytes(5).toString('hex')}`;

export interface PublishInput {
  ownerId: string;
  filename: string;
  buffer: Buffer;
  slug?: string;
  displayName?: string;
  visibility?: SiteVisibility;
  password?: string;
}

export interface PublishResult {
  siteId: string;
  slug: string;
  url: string;
  deploymentId: string;
  status: 'ready';
  visibility: SiteVisibility;
}

export const siteUrl = (slug: string): string => {
  const base = (process.env.SITES_PUBLIC_ORIGIN || 'https://cclip.cc').replace(/\/+$/, '');
  return `${base}/s/${slug}`;
};

const publicSite = (site: IPublishedSite) => ({
  id: String(site._id),
  slug: site.slug,
  displayName: site.displayName,
  visibility: site.visibility,
  region: site.region,
  status: site.status,
  activeDeploymentId: site.activeDeploymentId ? String(site.activeDeploymentId) : null,
  url: siteUrl(site.slug),
  createdAt: site.createdAt,
  updatedAt: site.updatedAt,
});

export type PublicSite = ReturnType<typeof publicSite>;
export { publicSite };

/**
 * Create a brand-new site + its first deployment. Validates & extracts the
 * upload, reserves the slug, stores files, and only then marks the site active.
 * A failure before activation leaves no live site.
 */
export const createSiteWithDeployment = async (input: PublishInput): Promise<PublishResult> => {
  const extracted = extractUpload(input.filename, input.buffer); // throws SiteError

  const count = await PublishedSite.countDocuments({ ownerId: input.ownerId, status: { $ne: 'deleted' } });
  if (count >= MAX_SITES_PER_OWNER) {
    throw new SiteError('site_limit', `You can host at most ${MAX_SITES_PER_OWNER} sites.`);
  }

  // Resolve slug (explicit or generated).
  let slug = (input.slug ?? '').trim().toLowerCase();
  if (slug) {
    assertPublishableSlug(slug);
  } else {
    slug = randomSlug();
    while (!isValidSlug(slug)) slug = randomSlug();
  }

  const visibility: SiteVisibility = input.visibility ?? 'public';
  if (visibility === 'password' && !input.password) {
    throw new SiteError('password_required', 'A password is required for password-protected sites.');
  }
  const pw = visibility === 'password' ? hashPassword(input.password!) : null;

  const site = new PublishedSite({
    ownerId: input.ownerId,
    slug,
    displayName: input.displayName?.trim() || slug,
    visibility,
    passwordHash: pw?.hash ?? null,
    passwordSalt: pw?.salt ?? null,
    status: 'processing',
  });
  try {
    await site.save();
  } catch (error: any) {
    if (error?.code === 11000) throw new SiteError('slug_taken', 'That slug is already in use.');
    throw error;
  }

  try {
    const result = await deploy(site, input, extracted);
    return result;
  } catch (error) {
    // Roll back the half-created site so the slug is freed.
    await PublishedSite.deleteOne({ _id: site._id }).catch(() => {});
    await SiteDeployment.deleteMany({ siteId: site._id }).catch(() => {});
    throw error;
  }
};

/**
 * Redeploy an existing owned site. The prior active deployment keeps serving
 * until the new one is fully stored and swapped in.
 */
export const redeploySite = async (
  siteId: string,
  ownerId: string,
  filename: string,
  buffer: Buffer,
): Promise<PublishResult> => {
  const extracted = extractUpload(filename, buffer); // throws SiteError
  const site = await PublishedSite.findOne({ _id: siteId, ownerId, status: { $ne: 'deleted' } });
  if (!site) throw new SiteError('not_found', 'Site not found.');
  return deploy(site, { ownerId, filename, buffer }, extracted);
};

// Shared deployment transaction: write deployment doc → store files → flip
// active pointer. Never exposes a partial upload.
const deploy = async (
  site: IPublishedSite,
  input: { ownerId: string; filename: string; buffer: Buffer },
  extracted: ReturnType<typeof extractUpload>,
): Promise<PublishResult> => {
  const latest = await SiteDeployment.findOne({ siteId: site._id }).sort({ version: -1 }).select('version');
  const version = (latest?.version ?? 0) + 1;
  const deploymentId = new mongoose.Types.ObjectId();

  const deployment = new SiteDeployment({
    _id: deploymentId,
    siteId: site._id,
    ownerId: input.ownerId,
    version,
    sourceFilename: input.filename,
    sourceType: extracted.sourceType,
    sourceBytes: input.buffer.byteLength,
    extractedBytes: extracted.extractedBytes,
    fileCount: extracted.fileCount,
    objectPrefix: objectPrefixFor(String(site._id), String(deploymentId)),
    entryPath: extracted.entryPath,
    status: 'processing',
  });
  await deployment.save();

  try {
    await storeDeploymentFiles(deploymentId, extracted.files);
    await SiteDeployment.updateOne({ _id: deploymentId }, { $set: { status: 'ready' } });
  } catch (error) {
    await SiteDeployment.updateOne(
      { _id: deploymentId },
      { $set: { status: 'failed', errorCode: 'store_failed', errorMessage: 'Failed to store deployment files.' } },
    ).catch(() => {});
    throw new SiteError('deploy_failed', 'Failed to store the deployment.');
  }

  // Atomic swap: point the site at the new deployment.
  site.activeDeploymentId = deploymentId;
  site.status = 'active';
  await site.save();

  return {
    siteId: String(site._id),
    slug: site.slug,
    url: siteUrl(site.slug),
    deploymentId: String(deploymentId),
    status: 'ready',
    visibility: site.visibility,
  };
};
