import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { GradesController } from "./grades.controller.js";
import { GradesService } from "./grades.service.js";

@Module({
  imports: [AccessModule, SchoolsModule],
  controllers: [GradesController],
  providers: [GradesService],
})
export class GradesModule {}
