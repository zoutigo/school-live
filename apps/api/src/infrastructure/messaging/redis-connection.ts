import { ConfigService } from "@nestjs/config";
import type { ConnectionOptions } from "bullmq";

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
    };
  }

  return {
    host: configService.get<string>("REDIS_HOST") ?? "127.0.0.1",
    port: Number(configService.get<string>("REDIS_PORT") ?? 6379),
    password: configService.get<string>("REDIS_PASSWORD") ?? undefined,
    db: Number(configService.get<string>("REDIS_DB") ?? 0),
    maxRetriesPerRequest: null,
  };
}
