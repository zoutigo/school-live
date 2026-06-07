import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { SchoolUsersController } from "./school-users.controller.js";
import { SchoolUsersService } from "./school-users.service.js";

@Module({
  imports: [AccessModule, SchoolsModule],
  controllers: [SchoolUsersController],
  providers: [SchoolUsersService],
  exports: [SchoolUsersService],
})
export class SchoolUsersModule {}
