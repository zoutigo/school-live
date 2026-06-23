import { ConfigService } from "@nestjs/config";
import {
  ROOM_STATUS_CHANGE_JOB_DISPATCH,
  ROOM_STATUS_CHANGE_QUEUE_NAME,
} from "../src/notifications/room-status-change.types";
import { RoomStatusChangeJobsWorker } from "../src/worker/room-status-change-jobs.worker";

type WorkerProcessor = (job: { name: string; data: unknown }) => Promise<void>;

type WorkerMockInstance = {
  queueName: string;
  processor: WorkerProcessor;
  onHandlers: Record<string, (...args: unknown[]) => void>;
  close: jest.Mock<Promise<void>, []>;
};

const getWorkerInstances = () =>
  (globalThis as { __roomStatusWorkerInstances?: WorkerMockInstance[] })
    .__roomStatusWorkerInstances ?? [];

jest.mock("bullmq", () => {
  class Worker {
    readonly onHandlers: Record<string, (...args: unknown[]) => void> = {};
    readonly close = jest.fn(async () => undefined);

    constructor(
      readonly queueName: string,
      readonly processor: WorkerProcessor,
    ) {
      const globalScope = globalThis as {
        __roomStatusWorkerInstances?: WorkerMockInstance[];
      };
      if (!globalScope.__roomStatusWorkerInstances) {
        globalScope.__roomStatusWorkerInstances = [];
      }
      globalScope.__roomStatusWorkerInstances.push({
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

describe("RoomStatusChangeJobsWorker", () => {
  const projectionService = {
    project: jest.fn(),
  };

  const config = {} as ConfigService;

  beforeEach(() => {
    const globalScope = globalThis as {
      __roomStatusWorkerInstances?: WorkerMockInstance[];
    };
    globalScope.__roomStatusWorkerInstances = [];
    projectionService.project.mockReset();
  });

  it("creates a worker on init and routes jobs to the projection service", async () => {
    const worker = new RoomStatusChangeJobsWorker(
      config,
      projectionService as never,
    );
    worker.onModuleInit();

    const instances = getWorkerInstances();
    expect(instances).toHaveLength(1);
    expect(instances[0]?.queueName).toBe(ROOM_STATUS_CHANGE_QUEUE_NAME);

    await instances[0]?.processor({
      name: ROOM_STATUS_CHANGE_JOB_DISPATCH,
      data: { roomId: "room-1" },
    });
    expect(projectionService.project).toHaveBeenCalledWith({
      roomId: "room-1",
    });
  });

  it("logs a warning and does not call the projection service for unknown jobs", async () => {
    const worker = new RoomStatusChangeJobsWorker(
      config,
      projectionService as never,
    );
    worker.onModuleInit();

    const instances = getWorkerInstances();
    await instances[0]?.processor({ name: "unknown-job", data: {} });

    expect(projectionService.project).not.toHaveBeenCalled();
  });

  it("closes worker on destroy", async () => {
    const worker = new RoomStatusChangeJobsWorker(
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
