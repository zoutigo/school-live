import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { InfrastructureModule } from "../infrastructure/infrastructure.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { MailJobsWorker } from "./mail-jobs.worker.js";
import { PushJobsWorker } from "./push-jobs.worker.js";
import { TimetableChangeJobsWorker } from "./timetable-change-jobs.worker.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../docker/.env", ".env"],
    }),
    InfrastructureModule,
    NotificationsModule,
  ],
  providers: [MailJobsWorker, PushJobsWorker, TimetableChangeJobsWorker],
})
export class WorkerModule {}
