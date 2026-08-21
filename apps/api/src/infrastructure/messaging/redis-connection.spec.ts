import { ConfigService } from "@nestjs/config";
import { buildRedisConnection } from "./redis-connection.js";

function configServiceWith(values: Record<string, string>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe("buildRedisConnection", () => {
  it("parses REDIS_URL and reconnects on READONLY errors", () => {
    const connection = buildRedisConnection(
      configServiceWith({
        REDIS_URL: "redis://user:pass@redis-host:6380/2",
      }),
    ) as {
      host: string;
      port: number;
      username?: string;
      password?: string;
      db: number;
      reconnectOnError: (err: Error) => boolean;
    };

    expect(connection.host).toBe("redis-host");
    expect(connection.port).toBe(6380);
    expect(connection.username).toBe("user");
    expect(connection.password).toBe("pass");
    expect(connection.db).toBe(2);
    expect(
      connection.reconnectOnError(
        new Error("READONLY You can't write against a read only replica."),
      ),
    ).toBe(true);
    expect(connection.reconnectOnError(new Error("ECONNRESET"))).toBe(false);
  });

  it("falls back to discrete REDIS_* vars and still wires reconnectOnError", () => {
    const connection = buildRedisConnection(
      configServiceWith({
        REDIS_HOST: "127.0.0.1",
        REDIS_PORT: "6379",
      }),
    ) as {
      host: string;
      port: number;
      db: number;
      reconnectOnError: (err: Error) => boolean;
    };

    expect(connection.host).toBe("127.0.0.1");
    expect(connection.port).toBe(6379);
    expect(connection.db).toBe(0);
    expect(connection.reconnectOnError(new Error("READONLY"))).toBe(true);
  });
});
