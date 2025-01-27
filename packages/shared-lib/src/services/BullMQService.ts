// src/utils/queueWorkerManager.ts
import { Queue, Worker, Job, JobScheduler } from "bullmq";
import IORedis from "ioredis";
import { createHash } from "crypto";

type QueueWorkerPair = {
  queue: Queue;
  worker: Worker | null; // Worker can be added dynamically
};

export class QueueWorkerManager {
  private static instance: QueueWorkerManager;
  private redisConnection: IORedis;
  private queues: Map<string, QueueWorkerPair>;

  private constructor(REDIS_HOST: string, REDIS_PORT: number) {
    this.redisConnection = new IORedis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      maxRetriesPerRequest: null
    });
    this.queues = new Map();
  }

  public static getInstance(
    REDIS_HOST: string,
    REDIS_PORT: number
  ): QueueWorkerManager {
    if (!QueueWorkerManager.instance) {
      QueueWorkerManager.instance = new QueueWorkerManager(
        REDIS_HOST,
        REDIS_PORT
      );
    }
    return QueueWorkerManager.instance;
  }

  public createQueue(queueName: string): Queue {
    if (this.queues.has(queueName)) {
      throw new Error(
        `[QueueWorkerManager] Queue with name "${queueName}" already exists.`
      );
    }

    const queue = new Queue(queueName, { connection: this.redisConnection });
    const scheduler = new JobScheduler(queueName, {
      connection: this.redisConnection,
    }); // Ensure jobs are retried when workers crash
    this.queues.set(queueName, { queue, worker: null });

    console.log(`[QueueWorkerManager] Queue created: ${queueName}`);
    return queue;
  }

  public createWorker(
    queueName: string,
    processor: (job: Job) => Promise<void>
  ): Worker {
    if (!this.queues.has(queueName)) {
      throw new Error(
        `[QueueWorkerManager] Queue with name "${queueName}" does not exist.`
      );
    }

    const worker = new Worker(queueName, processor, {
      connection: this.redisConnection,
    });

    worker.on("completed", (job) => {
      console.log(`[Worker:${queueName}] Job ${job.id} completed.`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[Worker:${queueName}] Job ${job?.id} failed:`, err);
    });

    this.queues.get(queueName)!.worker = worker;

    console.log(`[QueueWorkerManager] Worker created for queue: ${queueName}`);
    return worker;
  }

  public async isJobInQueue(
    queueName: string,
    jobId: string
  ): Promise<boolean> {
    const queuePair = this.queues.get(queueName);
    if (!queuePair) {
      throw new Error(
        `[QueueWorkerManager] Queue with name "${queueName}" does not exist.`
      );
    }
    try {
      const jobFound = await queuePair.queue.getJob(jobId);
      return jobFound;
    } catch (error: any) {
      console.log(
        `[QueueWorkerManager] Job with id '${jobId}' does not exist in the queue.`
      );
      return false;
    }
  }

  public async addJob(
    queueName: string,
    data: Record<string, any>
  ): Promise<string> {
    const queuePair = this.queues.get(queueName);
    if (!queuePair) {
      throw new Error(
        `[QueueWorkerManager] Queue with name "${queueName}" does not exist.`
      );
    }
    // const urlHash = createHash("md5").update(data.article).digest("hex");

    const job = await queuePair.queue.add(queueName, data, {
      jobId: data.jobId,
    });
    if (!job || !job.id) {
      throw new Error("Job ID is missing.");
    }

    return job.id; // Ensure job.id is returned as a string
  }
  public listQueues(): string[] {
    return Array.from(this.queues.keys());
  }

  public listWorkers(): string[] {
    return Array.from(this.queues.entries())
      .filter(([_, pair]) => pair.worker !== null)
      .map(([queueName]) => queueName);
  }

  public async stopWorker(queueName: string): Promise<void> {
    const queuePair = this.queues.get(queueName);
    if (!queuePair || !queuePair.worker) {
      throw new Error(
        `[QueueWorkerManager] No active worker found for queue: "${queueName}".`
      );
    }

    await queuePair.worker.close();
    queuePair.worker = null;
    console.log(`[QueueWorkerManager] Worker stopped for queue: ${queueName}`);
  }

  public async close(): Promise<void> {
    for (const [queueName, { queue, worker }] of this.queues.entries()) {
      if (worker) {
        await worker.close();
        console.log(
          `[QueueWorkerManager] Worker closed for queue: ${queueName}`
        );
      }
      await queue.close();
      console.log(`[QueueWorkerManager] Queue closed: ${queueName}`);
    }
    await this.redisConnection.quit();
    console.log("[QueueWorkerManager] All queues and workers shut down.");
  }
}
