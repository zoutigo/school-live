import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import type { JobsOptions } from "bullmq";
import { buildRedisConnection } from "./redis-connection.js";
import type { QueuePort } from "./queue.port.js";

@Injectable()
export class BullMqQueueAdapter implements QueuePort, OnModuleDestroy {
  private readonly queues = new Map<string, Queue>();

  constructor(private readonly configService: ConfigService) {}

  async add(
    queueName: string,
    jobName: string,
    payload: unknown,
    options?: JobsOptions,
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.add(jobName, payload, options);
  }

  async onModuleDestroy() {
    await Promise.all(
      Array.from(this.queues.values()).map((queue) => queue.close()),
    );
    this.queues.clear();
  }

  private getQueue(queueName: string) {
    const existing = this.queues.get(queueName);
    if (existing) {
      return existing;
    }

    const queue = new Queue(queueName, {
      connection: buildRedisConnection(this.configService),
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    });

    this.queues.set(queueName, queue);
    return queue;
  }
}
