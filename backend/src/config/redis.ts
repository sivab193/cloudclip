import { createClient, RedisClientType } from 'redis';

export interface RedisConnections {
  command: RedisClientType;
  publisher: RedisClientType;
  subscriber: RedisClientType;
}

export async function connectRedis(): Promise<RedisConnections | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  const command = createClient({ url });
  const publisher = command.duplicate();
  const subscriber = command.duplicate();
  const clients = [command, publisher, subscriber];

  for (const client of clients) {
    client.on('error', () => console.error('Redis connection error'));
  }

  try {
    await Promise.all(clients.map(client => client.connect()));
    return { command, publisher, subscriber };
  } catch (error) {
    await Promise.allSettled(clients.map(client => client.isOpen ? client.quit() : Promise.resolve()));
    throw error;
  }
}

export async function closeRedis(redis: RedisConnections | null): Promise<void> {
  if (!redis) return;
  await Promise.allSettled(
    [redis.command, redis.publisher, redis.subscriber].map(client =>
      client.isOpen ? client.quit() : Promise.resolve()
    )
  );
}
