import { Worker, Job } from 'bullmq';
import { IMPORT_QUEUE_NAME } from '../queues/importQueue';
import { redisConnection } from '../config/redis';

const worker = new Worker(
  IMPORT_QUEUE_NAME,
  async (job: Job) => {
    const { importId } = job.data;
    console.log(`Processing importId: ${importId}`);
  },
  {
    connection: redisConnection,
  }
);

worker.on('ready', () => {
  console.log('Worker is ready and listening for jobs...');
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error: ${err.message}`);
});
