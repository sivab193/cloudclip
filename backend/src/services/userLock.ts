// One backend process owns writes for a user. Account deletion/reset must not
// race an already authenticated clipboard write. Horizontal scaling requires
// replacing this with a distributed lock (see docs/ARCHITECTURE.md).
const queues = new Map<string, Promise<unknown>>();

export async function withUserLock<T>(uid: string, work: () => Promise<T>): Promise<T> {
  const previous = queues.get(uid) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(work);
  queues.set(uid, current);
  try {
    return await current;
  } finally {
    if (queues.get(uid) === current) queues.delete(uid);
  }
}
