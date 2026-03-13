import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { MediaClientModule } from "../media-client/media-client.module.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { EvaluationsController } from "./evaluations.controller.js";
import { EvaluationsService } from "./evaluations.service.js";

@Module({
  imports: [AccessModule, SchoolsModule, MediaClientModule],
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
