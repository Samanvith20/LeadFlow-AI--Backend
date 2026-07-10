import Redis from 'ioredis';
import { env } from './env';

export const redisConnection = new Redis(env.UPSTASH_URL, {
  tls: {},
});

redisConnection.on('error', (err) => {
  console.error('Redis connection error:', err);
});
