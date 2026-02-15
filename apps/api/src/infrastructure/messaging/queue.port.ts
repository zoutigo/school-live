import type { JobsOptions } from "bullmq";

export const QUEUE_PORT = Symbol("QUEUE_PORT");

export type QueuePort = {
  add(
    queueName: string,
    jobName: string,
    payload: unknown,
    options?: JobsOptions,
  ): Promise<void>;
};
