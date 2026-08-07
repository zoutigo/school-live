import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { MailModule } from "../mail/mail.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { SchoolsModule } from "../schools/schools.module.js";
import { StudentHealthController } from "./student-health.controller.js";
import { StudentHealthService } from "./student-health.service.js";

@Module({
  imports: [AccessModule, SchoolsModule, MailModule, NotificationsModule],
  controllers: [StudentHealthController],
  providers: [StudentHealthService],
  exports: [StudentHealthService],
})
export class StudentHealthModule {}
