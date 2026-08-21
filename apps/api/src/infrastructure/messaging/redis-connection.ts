import { ConfigService } from "@nestjs/config";
import type { ConnectionOptions } from "bullmq";

// Force ioredis to drop and reopen the connection when the server it is
// talking to reports READONLY (e.g. it was demoted to a replica or
// recreated). Without this the client keeps retrying commands against the
// same stale connection forever instead of recovering on its own.
function reconnectOnError(err: Error): boolean {
  return err.message.includes("READONLY");
}

export function buildRedisConnection(
  configService: ConfigService,
): ConnectionOptions {
  const redisUrl = configService.get<string>("REDIS_URL");

  if (redisUrl) {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 6379,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db: parsed.pathname ? Number(parsed.pathname.slice(1) || "0") : 0,
      maxRetriesPerRequest: null,
      reconnectOnError,
    };
  }

  return {
    host: configService.get<string>("REDIS_HOST") ?? "127.0.0.1",
    port: Number(configService.get<string>("REDIS_PORT") ?? 6379),
    password: configService.get<string>("REDIS_PASSWORD") ?? undefined,
    db: Number(configService.get<string>("REDIS_DB") ?? 0),
    maxRetriesPerRequest: null,
    reconnectOnError,
  };
}
