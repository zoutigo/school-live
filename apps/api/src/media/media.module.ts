import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ImageStorageService } from "../files/image-storage.service.js";
import { MediaController } from "./media.controller.js";
import { MediaHealthController } from "./media-health.controller.js";
import { MobileBuildsMediaController } from "./mobile-builds-media.controller.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../docker/.env", ".env"],
    }),
  ],
  controllers: [
    MediaController,
    MediaHealthController,
    MobileBuildsMediaController,
  ],
  providers: [ImageStorageService],
})
export class MediaModule {}
