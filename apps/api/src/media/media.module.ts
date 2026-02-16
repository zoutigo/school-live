import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ImageStorageService } from "../files/image-storage.service.js";
import { MediaController } from "./media.controller.js";
import { MediaHealthController } from "./media-health.controller.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["apps/api/.env", ".env"],
    }),
  ],
  controllers: [MediaController, MediaHealthController],
  providers: [ImageStorageService],
})
export class MediaModule {}
