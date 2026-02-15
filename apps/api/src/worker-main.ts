import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker/worker.module.js";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ["log", "error", "warn"],
  });

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void bootstrap();
