import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { verifyFirebaseToken } from '../middleware/auth';
import { verifyPublisherKey } from '../middleware/publisherAuth';
import { validate } from '../middleware/validate';
import { objectIdSchema } from '../services/clipboard';
import PublishedSite from '../models/PublishedSite';
import SiteDeployment from '../models/SiteDeployment';
import PublisherKey from '../models/PublisherKey';
import {
  SiteError,
  MAX_ARCHIVE_BYTES,
  hashPassword,
  generatePublisherKey,
} from '../services/sites';
import {
  createSiteWithDeployment,
  redeploySite,
  publicSite,
  siteUrl,
} from '../services/sitePublisher';

const router = express.Router();

// In-memory multipart handling; files are small and validated/extracted
// synchronously before anything is stored.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ARCHIVE_BYTES, files: 1 },
});

// Translate a thrown SiteError into its stable HTTP status.
const statusForCode = (code: string): number => {
  switch (code) {
    case 'slug_taken':
    case 'slug_reserved':
      return 409;
    case 'site_limit':
      return 403;
    case 'not_found':
      return 404;
    case 'region_unavailable':
      return 503;
    default:
      return 422; // invalid_archive, missing_index, archive_limit, invalid_slug, ...
  }
};

const handleSiteError = (error: unknown, res: express.Response, next: express.NextFunction): void => {
  if (error instanceof SiteError) {
    res.status(statusForCode(error.code)).json({ error: error.message, code: error.code });
    return;
  }
  next(error);
};

// Multer surfaces upload-size violations as an error with a known code.
const handleUpload = (field: string) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  upload.single(field)(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(422).json({ error: 'Upload exceeds the size limit.', code: 'archive_limit' });
      }
      return res.status(400).json({ error: 'Invalid upload.', code: 'invalid_upload' });
    }
    next();
  });
};

const publishLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Owner routes (Firebase auth) ──────────────────────────────────────────────

// List the caller's sites.
router.get('/', verifyFirebaseToken, async (req, res, next) => {
  try {
    const sites = await PublishedSite.find({ ownerId: req.user!.uid, status: { $ne: 'deleted' } })
      .sort({ updatedAt: -1 });
    res.json(sites.map(publicSite));
  } catch (error) {
    next(error);
  }
});

const createMetaSchema = z.object({
  slug: z.string().max(63).optional(),
  displayName: z.string().max(120).optional(),
  visibility: z.enum(['public', 'password']).optional(),
  password: z.string().min(1).max(256).optional(),
});

// Create a new site from an uploaded HTML/ZIP (multipart: field "source").
router.post('/', verifyFirebaseToken, publishLimiter, handleUpload('source'), async (req, res, next) => {
  try {
    const meta = createMetaSchema.safeParse(req.body);
    if (!meta.success) {
      return res.status(400).json({ error: 'Invalid request body', details: meta.error.issues.map(i => i.message) });
    }
    if (!req.file) return res.status(400).json({ error: 'Attach an HTML file or ZIP build.', code: 'missing_source' });

    const result = await createSiteWithDeployment({
      ownerId: req.user!.uid,
      filename: req.file.originalname,
      buffer: req.file.buffer,
      slug: meta.data.slug,
      displayName: meta.data.displayName,
      visibility: meta.data.visibility,
      password: meta.data.password,
    });
    res.status(201).json(result);
  } catch (error) {
    handleSiteError(error, res, next);
  }
});

// Fetch one owned site + its deployment summary.
router.get('/:id', verifyFirebaseToken, async (req, res, next) => {
  try {
    if (!objectIdSchema.safeParse(req.params.id).success) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }
    const site = await PublishedSite.findOne({ _id: req.params.id, ownerId: req.user!.uid, status: { $ne: 'deleted' } });
    if (!site) return res.status(404).json({ error: 'Site not found' });
    res.json(publicSite(site));
  } catch (error) {
    next(error);
  }
});

const patchSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  visibility: z.enum(['public', 'password']).optional(),
  password: z.string().min(1).max(256).optional(),
}).refine(d => d.displayName !== undefined || d.visibility !== undefined || d.password !== undefined, {
  message: 'Nothing to update',
});

// Update display name, visibility, or password.
router.patch('/:id', verifyFirebaseToken, validate(patchSchema), async (req, res, next) => {
  try {
    if (!objectIdSchema.safeParse(req.params.id).success) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }
    const site = await PublishedSite.findOne({ _id: req.params.id, ownerId: req.user!.uid, status: { $ne: 'deleted' } })
      .select('+passwordHash +passwordSalt');
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const { displayName, visibility, password } = req.body as z.infer<typeof patchSchema>;
    if (displayName !== undefined) site.displayName = displayName;

    const nextVisibility = visibility ?? site.visibility;
    if (nextVisibility === 'password') {
      if (password) {
        const pw = hashPassword(password);
        site.passwordHash = pw.hash;
        site.passwordSalt = pw.salt;
      } else if (site.visibility !== 'password') {
        return res.status(400).json({ error: 'A password is required to enable password protection.', code: 'password_required' });
      }
      site.visibility = 'password';
    } else if (nextVisibility === 'public') {
      site.visibility = 'public';
      site.passwordHash = null;
      site.passwordSalt = null;
    }

    await site.save();
    res.json(publicSite(site));
  } catch (error) {
    next(error);
  }
});

// Redeploy: upload a new build, keep the same slug/URL.
router.post('/:id/deployments', verifyFirebaseToken, publishLimiter, handleUpload('source'), async (req, res, next) => {
  try {
    if (!objectIdSchema.safeParse(req.params.id).success) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }
    if (!req.file) return res.status(400).json({ error: 'Attach an HTML file or ZIP build.', code: 'missing_source' });
    const result = await redeploySite(String(req.params.id), req.user!.uid, req.file.originalname, req.file.buffer);
    res.status(201).json(result);
  } catch (error) {
    handleSiteError(error, res, next);
  }
});

// List a site's deployments (metadata only; file blobs are excluded).
router.get('/:id/deployments', verifyFirebaseToken, async (req, res, next) => {
  try {
    if (!objectIdSchema.safeParse(req.params.id).success) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }
    const site = await PublishedSite.findOne({ _id: req.params.id, ownerId: req.user!.uid });
    if (!site) return res.status(404).json({ error: 'Site not found' });
    const deployments = await SiteDeployment.find({ siteId: site._id }).sort({ version: -1 });
    res.json(deployments);
  } catch (error) {
    next(error);
  }
});

// Delete a site: revoke serving first (status=deleted), then drop deployments.
router.delete('/:id', verifyFirebaseToken, async (req, res, next) => {
  try {
    if (!objectIdSchema.safeParse(req.params.id).success) {
      return res.status(400).json({ error: 'Invalid site ID' });
    }
    const site = await PublishedSite.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user!.uid, status: { $ne: 'deleted' } },
      { $set: { status: 'deleted', activeDeploymentId: null, deletedAt: new Date() } },
    );
    if (!site) return res.status(404).json({ error: 'Site not found' });
    // Serving is already revoked (status flipped); clean objects afterward.
    SiteDeployment.deleteMany({ siteId: site._id }).catch(() => {});
    res.json({ message: 'Site deleted' });
  } catch (error) {
    next(error);
  }
});

// ── Publisher keys (Firebase auth) ────────────────────────────────────────────

router.get('/keys/list', verifyFirebaseToken, async (req, res, next) => {
  try {
    const keys = await PublisherKey.find({ ownerId: req.user!.uid, revokedAt: null }).sort({ createdAt: -1 });
    res.json(keys.map(k => ({
      id: String(k._id),
      label: k.label,
      keyPrefix: k.keyPrefix,
      scopes: k.scopes,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    })));
  } catch (error) {
    next(error);
  }
});

const createKeySchema = z.object({ label: z.string().min(1).max(80) });

router.post('/keys', verifyFirebaseToken, validate(createKeySchema), async (req, res, next) => {
  try {
    const generated = generatePublisherKey();
    const key = await PublisherKey.create({
      ownerId: req.user!.uid,
      label: req.body.label,
      keyPrefix: generated.keyPrefix,
      keyHash: generated.keyHash,
      scopes: ['sites:publish'],
    });
    // The raw key is revealed exactly once.
    res.status(201).json({
      id: String(key._id),
      label: key.label,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      createdAt: key.createdAt,
      key: generated.raw,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/keys/:id', verifyFirebaseToken, async (req, res, next) => {
  try {
    if (!objectIdSchema.safeParse(req.params.id).success) {
      return res.status(400).json({ error: 'Invalid key ID' });
    }
    const result = await PublisherKey.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user!.uid, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    if (!result) return res.status(404).json({ error: 'Publisher key not found' });
    res.json({ message: 'Publisher key revoked' });
  } catch (error) {
    next(error);
  }
});

// ── Agent publish (publisher key auth) ────────────────────────────────────────

const agentPublishLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/publish', agentPublishLimiter, verifyPublisherKey, handleUpload('source'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Attach an HTML file or ZIP build.', code: 'missing_source' });
    const meta = createMetaSchema.safeParse(req.body);
    if (!meta.success) {
      return res.status(400).json({ error: 'Invalid request body', details: meta.error.issues.map(i => i.message) });
    }
    const result = await createSiteWithDeployment({
      ownerId: req.publisher!.ownerId,
      filename: req.file.originalname,
      buffer: req.file.buffer,
      slug: meta.data.slug,
      displayName: meta.data.displayName,
      visibility: meta.data.visibility,
      password: meta.data.password,
    });
    res.status(201).json(result);
  } catch (error) {
    handleSiteError(error, res, next);
  }
});

export { siteUrl };
export default router;
