export const envSchema = {
  NODE_ENV: ["development", "test", "production"] as const,
  API_PORT: "number",
  DATABASE_URL: "string",
  JWT_SECRET: "string",
  JWT_EXPIRES_IN: "number",
};

export type EnvSchema = typeof envSchema;
