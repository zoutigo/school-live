import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { MediaModule } from "./media/media.module.js";

async function bootstrap() {
  const app = await NestFactory.create(MediaModule);
  await app.listen(process.env.MEDIA_PORT ?? 3002);
}

void bootstrap();
