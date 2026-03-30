import { Module } from "@nestjs/common";
import { MediaClientModule } from "../media-client/media-client.module.js";
import { MobileBuildsController } from "./mobile-builds.controller.js";
import { MobileBuildsService } from "./mobile-builds.service.js";

@Module({
  imports: [MediaClientModule],
  controllers: [MobileBuildsController],
  providers: [MobileBuildsService],
})
export class MobileBuildsModule {}
