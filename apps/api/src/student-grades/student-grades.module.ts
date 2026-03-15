import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { StudentGradesController } from "./student-grades.controller.js";
import { StudentGradesService } from "./student-grades.service.js";

@Module({
  imports: [AccessModule, SchoolsModule],
  controllers: [StudentGradesController],
  providers: [StudentGradesService],
})
export class StudentGradesModule {}
