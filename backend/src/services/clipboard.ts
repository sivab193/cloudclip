import { z } from 'zod';
import Clipboard from '../models/Clipboard';
import { assertEncryptionKey } from './encryption';

export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/);
export const createClipboardSchema = z.object({
  deviceId: z.string().trim().min(1).max(256),
  deviceName: z.string().trim().min(1).max(256),
  content: z.string().min(1).max(200_000),
  requestId: z.uuid().optional(),
  keyId: z.uuid().nullable().optional(),
});

export async function createClipboard(userId: string, input: z.infer<typeof createClipboardSchema>) {
  await assertEncryptionKey(userId, input.keyId);
  // The same encrypted request can be retried after a lost HTTP response/ack.
  if (input.requestId) {
    const existing = await Clipboard.findOne({ userId, requestId: input.requestId });
    if (existing) return existing;
  }
  const { keyId: _keyId, ...document } = input;
  return Clipboard.create({ ...document, userId });
}
