import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { TimetableController } from "./timetable.controller.js";
import { TimetableService } from "./timetable.service.js";

@Module({
  imports: [AccessModule, SchoolsModule, NotificationsModule],
  controllers: [TimetableController],
  providers: [TimetableService],
})
export class TimetableModule {}
