import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { MediaClientModule } from "../media-client/media-client.module.js";
import { InlineMediaService } from "../media/inline-media.service.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { HomeworkController } from "./homework.controller.js";
import { HomeworkService } from "./homework.service.js";

@Module({
  imports: [AccessModule, SchoolsModule, MediaClientModule],
  controllers: [HomeworkController],
  providers: [HomeworkService, InlineMediaService],
  exports: [HomeworkService],
})
export class HomeworkModule {}
