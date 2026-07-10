import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

export const IMPORT_QUEUE_NAME = 'csv-import-queue';

export const importQueue = new Queue(IMPORT_QUEUE_NAME, {
  connection: redisConnection,
});
