import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { MediaClientModule } from "../media-client/media-client.module.js";
import { InlineMediaService } from "../media/inline-media.service.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { FeedController } from "./feed.controller.js";
import { FeedService } from "./feed.service.js";

@Module({
  imports: [AccessModule, SchoolsModule, MediaClientModule],
  controllers: [FeedController],
  providers: [FeedService, InlineMediaService],
})
export class FeedModule {}
