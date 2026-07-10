import { Worker, Job } from 'bullmq';
import path from 'path';
import { IMPORT_QUEUE_NAME } from '../queues/importQueue.js';
import { redisConnection } from '../config/redis.js';
import { CsvReaderService } from '../services/CsvReaderService.js';

const worker = new Worker(
  IMPORT_QUEUE_NAME,
  async (job: Job) => {
    const { importId } = job.data;
    console.log(`Processing importId: ${importId}`);

    const filePath = path.join(process.cwd(), 'uploads', 'temp', `${importId}.csv`);
    const batchSize = 25;

    const { totalRows, totalBatches } = await CsvReaderService.processInBatches(
      filePath,
      batchSize,
      async (batch, batchIndex) => {
        console.log('--------------------------------');
        console.log(`Batch Number: ${batchIndex}`);
        console.log(`Rows: ${batch.length}`);
        console.log('--------------------------------');
      },
    );

    console.log('--------------------------------');
    console.log('Import Summary\n');
    console.log(`Total Rows: ${totalRows}\n`);
    console.log(`Total Batches: ${totalBatches}`);
    console.log('--------------------------------');
  },
  {
    connection: redisConnection,
  },
);

worker.on('ready', () => {
  console.log('Worker is ready and listening for jobs...');
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error: ${err.message}`);
});
