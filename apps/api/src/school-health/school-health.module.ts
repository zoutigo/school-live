import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { SchoolHealthController } from "./school-health.controller.js";
import { SchoolHealthService } from "./school-health.service.js";

@Module({
  imports: [AccessModule, SchoolsModule],
  controllers: [SchoolHealthController],
  providers: [SchoolHealthService],
  exports: [SchoolHealthService],
})
export class SchoolHealthModule {}
