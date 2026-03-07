import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { InfrastructureModule } from "../infrastructure/infrastructure.module.js";
import { MailJobsWorker } from "./mail-jobs.worker.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../docker/.env", ".env"],
    }),
    InfrastructureModule,
  ],
  providers: [MailJobsWorker],
})
export class WorkerModule {}
