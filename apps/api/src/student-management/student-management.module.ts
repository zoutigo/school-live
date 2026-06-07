import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { SchoolUsersModule } from "../school-users/school-users.module.js";
import { StudentManagementController } from "./student-management.controller.js";
import { StudentManagementService } from "./student-management.service.js";

@Module({
  imports: [AccessModule, SchoolsModule, SchoolUsersModule],
  controllers: [StudentManagementController],
  providers: [StudentManagementService],
  exports: [StudentManagementService],
})
export class StudentManagementModule {}
