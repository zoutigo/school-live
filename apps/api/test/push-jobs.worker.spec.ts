import { ConfigService } from "@nestjs/config";
import {
  PUSH_JOB_SEND_TIMETABLE_CHANGE,
  PUSH_QUEUE_NAME,
} from "../src/notifications/push.types";
import { PushJobsWorker } from "../src/worker/push-jobs.worker";

type WorkerProcessor = (job: { name: string; data: unknown }) => Promise<void>;

type WorkerMockInstance = {
  queueName: string;
  processor: WorkerProcessor;
  onHandlers: Record<string, (...args: unknown[]) => void>;
  close: jest.Mock<Promise<void>, []>;
};

const getWorkerInstances = () =>
  (globalThis as { __pushWorkerInstances?: WorkerMockInstance[] })
    .__pushWorkerInstances ?? [];

jest.mock("bullmq", () => {
  class Worker {
    readonly onHandlers: Record<string, (...args: unknown[]) => void> = {};
    readonly close = jest.fn(async () => undefined);

    constructor(
      readonly queueName: string,
      readonly processor: WorkerProcessor,
    ) {
      const globalScope = globalThis as {
        __pushWorkerInstances?: WorkerMockInstance[];
      };
      if (!globalScope.__pushWorkerInstances) {
        globalScope.__pushWorkerInstances = [];
      }
      globalScope.__pushWorkerInstances.push({
        queueName,
        processor,
        onHandlers: this.onHandlers,
        close: this.close,
      });
    }

    on(event: string, handler: (...args: unknown[]) => void) {
      this.onHandlers[event] = handler;
    }
  }

  return { Worker };
});

jest.mock("../src/infrastructure/messaging/redis-connection.js", () => ({
  buildRedisConnection: jest.fn(() => ({ host: "redis", port: 6379 })),
}));

describe("PushJobsWorker", () => {
  const pushPort = {
    sendTimetableChangeNotification: jest.fn(),
  };

  const config = {} as ConfigService;

  beforeEach(() => {
    const globalScope = globalThis as {
      __pushWorkerInstances?: WorkerMockInstance[];
    };
    globalScope.__pushWorkerInstances = [];
    pushPort.sendTimetableChangeNotification.mockReset();
  });

  it("creates a worker on init and routes jobs to push port", async () => {
    const worker = new PushJobsWorker(config, pushPort as never);
    worker.onModuleInit();

    const instances = getWorkerInstances();
    expect(instances).toHaveLength(1);
    expect(instances[0]?.queueName).toBe(PUSH_QUEUE_NAME);

    await instances[0]?.processor({
      name: PUSH_JOB_SEND_TIMETABLE_CHANGE,
      data: { tokens: ["ExponentPushToken[a]"] },
    });
    expect(pushPort.sendTimetableChangeNotification).toHaveBeenCalledWith({
      tokens: ["ExponentPushToken[a]"],
    });
  });

  it("closes worker on destroy", async () => {
    const worker = new PushJobsWorker(config, pushPort as never);
    worker.onModuleInit();

    const instances = getWorkerInstances();
    expect(instances).toHaveLength(1);

    await worker.onModuleDestroy();

    expect(instances[0]?.close).toHaveBeenCalledTimes(1);
  });
});
