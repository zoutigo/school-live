import { ConfigService } from "@nestjs/config";
import {
  MAIL_JOB_SEND_INTERNAL_MESSAGE_NOTIFICATION,
  MAIL_JOB_SEND_STUDENT_LIFE_EVENT_NOTIFICATION,
  MAIL_JOB_SEND_TEMPORARY_PASSWORD,
  MAIL_QUEUE_NAME,
} from "../src/mail/mail.types";
import { MailJobsWorker } from "../src/worker/mail-jobs.worker";

type WorkerProcessor = (job: { name: string; data: unknown }) => Promise<void>;

type WorkerMockInstance = {
  queueName: string;
  processor: WorkerProcessor;
  onHandlers: Record<string, (...args: unknown[]) => void>;
  close: jest.Mock<Promise<void>, []>;
};

const getWorkerInstances = () =>
  (globalThis as { __mailWorkerInstances?: WorkerMockInstance[] })
    .__mailWorkerInstances ?? [];

jest.mock("bullmq", () => {
  class Worker {
    readonly onHandlers: Record<string, (...args: unknown[]) => void> = {};
    readonly close = jest.fn(async () => undefined);

    constructor(
      readonly queueName: string,
      readonly processor: WorkerProcessor,
    ) {
      const globalScope = globalThis as {
        __mailWorkerInstances?: WorkerMockInstance[];
      };
      if (!globalScope.__mailWorkerInstances) {
        globalScope.__mailWorkerInstances = [];
      }
      globalScope.__mailWorkerInstances.push({
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

describe("MailJobsWorker", () => {
  const emailPort = {
    sendTemporaryPasswordEmail: jest.fn(),
    sendStudentLifeEventNotification: jest.fn(),
    sendInternalMessageNotification: jest.fn(),
  };

  const config = {} as ConfigService;

  beforeEach(() => {
    const globalScope = globalThis as {
      __mailWorkerInstances?: WorkerMockInstance[];
    };
    globalScope.__mailWorkerInstances = [];
    emailPort.sendTemporaryPasswordEmail.mockReset();
    emailPort.sendStudentLifeEventNotification.mockReset();
    emailPort.sendInternalMessageNotification.mockReset();
  });

  it("creates a worker on init and routes jobs to email port", async () => {
    const worker = new MailJobsWorker(config, emailPort as never);
    worker.onModuleInit();

    const instances = getWorkerInstances();
    expect(instances).toHaveLength(1);
    expect(instances[0]?.queueName).toBe(MAIL_QUEUE_NAME);

    await instances[0]?.processor({
      name: MAIL_JOB_SEND_TEMPORARY_PASSWORD,
      data: { to: "admin@example.test" },
    });
    expect(emailPort.sendTemporaryPasswordEmail).toHaveBeenCalledWith({
      to: "admin@example.test",
    });

    await instances[0]?.processor({
      name: MAIL_JOB_SEND_STUDENT_LIFE_EVENT_NOTIFICATION,
      data: { to: "parent@example.test" },
    });
    expect(emailPort.sendStudentLifeEventNotification).toHaveBeenCalledWith({
      to: "parent@example.test",
    });

    await instances[0]?.processor({
      name: MAIL_JOB_SEND_INTERNAL_MESSAGE_NOTIFICATION,
      data: { to: "teacher@example.test" },
    });
    expect(emailPort.sendInternalMessageNotification).toHaveBeenCalledWith({
      to: "teacher@example.test",
    });
  });

  it("closes worker on destroy", async () => {
    const worker = new MailJobsWorker(config, emailPort as never);
    worker.onModuleInit();

    const instances = getWorkerInstances();
    expect(instances).toHaveLength(1);

    await worker.onModuleDestroy();

    expect(instances[0]?.close).toHaveBeenCalledTimes(1);
  });
});
