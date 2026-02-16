import { Module } from "@nestjs/common";
import { MediaClientService } from "./media-client.service.js";

@Module({
  providers: [MediaClientService],
  exports: [MediaClientService],
})
export class MediaClientModule {}
