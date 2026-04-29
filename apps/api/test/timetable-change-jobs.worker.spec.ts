import { ConfigService } from "@nestjs/config";
import {
  TIMETABLE_CHANGE_JOB_DISPATCH,
  TIMETABLE_CHANGE_QUEUE_NAME,
} from "../src/notifications/timetable-change.types";
import { TimetableChangeJobsWorker } from "../src/worker/timetable-change-jobs.worker";

type WorkerProcessor = (job: { name: string; data: unknown }) => Promise<void>;

type WorkerMockInstance = {
  queueName: string;
  processor: WorkerProcessor;
  onHandlers: Record<string, (...args: unknown[]) => void>;
  close: jest.Mock<Promise<void>, []>;
};

const getWorkerInstances = () =>
  (globalThis as { __timetableWorkerInstances?: WorkerMockInstance[] })
    .__timetableWorkerInstances ?? [];

jest.mock("bullmq", () => {
  class Worker {
    readonly onHandlers: Record<string, (...args: unknown[]) => void> = {};
    readonly close = jest.fn(async () => undefined);

    constructor(
      readonly queueName: string,
      readonly processor: WorkerProcessor,
    ) {
      const globalScope = globalThis as {
        __timetableWorkerInstances?: WorkerMockInstance[];
      };
      if (!globalScope.__timetableWorkerInstances) {
        globalScope.__timetableWorkerInstances = [];
      }
      globalScope.__timetableWorkerInstances.push({
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

describe("TimetableChangeJobsWorker", () => {
  const projectionService = {
    project: jest.fn(),
  };

  const config = {} as ConfigService;

  beforeEach(() => {
    const globalScope = globalThis as {
      __timetableWorkerInstances?: WorkerMockInstance[];
    };
    globalScope.__timetableWorkerInstances = [];
    projectionService.project.mockReset();
  });

  it("creates a worker on init and routes jobs to the projection service", async () => {
    const worker = new TimetableChangeJobsWorker(
      config,
      projectionService as never,
    );
    worker.onModuleInit();

    const instances = getWorkerInstances();
    expect(instances).toHaveLength(1);
    expect(instances[0]?.queueName).toBe(TIMETABLE_CHANGE_QUEUE_NAME);

    await instances[0]?.processor({
      name: TIMETABLE_CHANGE_JOB_DISPATCH,
      data: { classId: "class-1" },
    });
    expect(projectionService.project).toHaveBeenCalledWith({
      classId: "class-1",
    });
  });

  it("closes worker on destroy", async () => {
    const worker = new TimetableChangeJobsWorker(
      config,
      projectionService as never,
    );
    worker.onModuleInit();

    const instances = getWorkerInstances();
    expect(instances).toHaveLength(1);

    await worker.onModuleDestroy();

    expect(instances[0]?.close).toHaveBeenCalledTimes(1);
  });
});
